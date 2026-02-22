import { Hono } from "hono";
import type { Env } from "../types";
import { requireSession } from "../middleware/auth";

type ChangesEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; email: string; name: string; role: string | null };
    session: { id: string };
  };
};

const changes = new Hono<ChangesEnv>();

changes.use("/*", requireSession);

// Upload a file — stages to _staging/{id}/ in R2
changes.post("/upload", async (c) => {
  const user = c.get("user");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const targetPath = formData.get("targetPath") as string | null;

  if (!file || !targetPath) {
    return c.json({ error: "file and targetPath are required" }, 400);
  }

  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: "File too large (max 50MB)" }, 400);
  }

  // Generate change request ID
  const id = crypto.randomUUID().replace(/-/g, "");
  const stagingKey = `_staging/${id}/${file.name}`;

  // Upload to R2 staging
  await c.env.R2_BUCKET.put(stagingKey, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Insert change request
  await c.env.DB.prepare(
    `INSERT INTO change_requests (id, user_id, type, target_path, staged_r2_key, original_filename, mime_type, file_size)
     VALUES (?, ?, 'upload', ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, targetPath, stagingKey, file.name, file.type, file.size)
    .run();

  return c.json({ id, status: "pending" }, 201);
});

// Propose a rename
changes.post("/rename", async (c) => {
  const user = c.get("user");
  const { sourcePath, targetPath } = await c.req.json<{
    sourcePath: string;
    targetPath: string;
  }>();

  if (!sourcePath || !targetPath) {
    return c.json({ error: "sourcePath and targetPath are required" }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, "");

  await c.env.DB.prepare(
    `INSERT INTO change_requests (id, user_id, type, target_path, source_path)
     VALUES (?, ?, 'rename', ?, ?)`
  )
    .bind(id, user.id, targetPath, sourcePath)
    .run();

  return c.json({ id, status: "pending" }, 201);
});

// Propose a deletion
changes.post("/delete", async (c) => {
  const user = c.get("user");
  const { targetPath } = await c.req.json<{ targetPath: string }>();

  if (!targetPath) {
    return c.json({ error: "targetPath is required" }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, "");

  await c.env.DB.prepare(
    `INSERT INTO change_requests (id, user_id, type, target_path)
     VALUES (?, ?, 'delete', ?)`
  )
    .bind(id, user.id, targetPath)
    .run();

  return c.json({ id, status: "pending" }, 201);
});

// Count own change requests by status
changes.get("/count", async (c) => {
  const user = c.get("user");
  const status = c.req.query("status") || "pending";

  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM change_requests WHERE user_id = ? AND status = ?"
  )
    .bind(user.id, status)
    .first<{ count: number }>();

  return c.json({ count: result?.count ?? 0 });
});

// List own change requests
changes.get("/", async (c) => {
  const user = c.get("user");
  const status = c.req.query("status");

  let query = "SELECT * FROM change_requests WHERE user_id = ?";
  const params: string[] = [user.id];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " ORDER BY created_at DESC";

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json({ changes: result.results });
});

// Cancel own pending change request
changes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT * FROM change_requests WHERE id = ? AND user_id = ? AND status = 'pending'"
  )
    .bind(id, user.id)
    .first();

  if (!existing) {
    return c.json({ error: "Not found or not cancellable" }, 404);
  }

  // Clean up staged file if upload
  if (existing.staged_r2_key) {
    await c.env.R2_BUCKET.delete(existing.staged_r2_key as string);
  }

  await c.env.DB.prepare("DELETE FROM change_requests WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true });
});

export default changes;
