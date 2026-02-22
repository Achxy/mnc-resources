import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../middleware/auth";
import { regenerateManifest } from "../lib/manifest";

type AdminEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; email: string; name: string; role: string | null };
    session: { id: string };
  };
};

const admin = new Hono<AdminEnv>();

admin.use("/*", requireAdmin);

// List pending change requests (admin queue)
admin.get("/queue", async (c) => {
  const status = c.req.query("status") || "pending";

  const result = await c.env.DB.prepare(
    `SELECT cr.*, u.name as user_name, u.email as user_email
     FROM change_requests cr
     JOIN user u ON u.id = cr.user_id
     WHERE cr.status = ?
     ORDER BY cr.created_at ASC`
  )
    .bind(status)
    .all();

  return c.json({ queue: result.results });
});

// Approve or reject a change request
admin.post("/review/:id", async (c) => {
  const reviewer = c.get("user");
  const id = c.req.param("id");
  const { action, note } = await c.req.json<{
    action: "approve" | "reject";
    note?: string;
  }>();

  if (action !== "approve" && action !== "reject") {
    return c.json({ error: "action must be 'approve' or 'reject'" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM change_requests WHERE id = ? AND status = 'pending'"
  )
    .bind(id)
    .first();

  if (!existing) {
    return c.json({ error: "Not found or not pending" }, 404);
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  await c.env.DB.prepare(
    `UPDATE change_requests
     SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(newStatus, reviewer.id, note || null, id)
    .run();

  // Audit log
  await c.env.DB.prepare(
    `INSERT INTO audit_log (id, user_id, action, target_type, target_id, details)
     VALUES (?, ?, ?, 'change_request', ?, ?)`
  )
    .bind(
      crypto.randomUUID().replace(/-/g, ""),
      reviewer.id,
      action,
      id,
      note || null
    )
    .run();

  // If rejected and it was an upload, clean up staged file
  if (action === "reject" && existing.staged_r2_key) {
    await c.env.R2_BUCKET.delete(existing.staged_r2_key as string);
  }

  return c.json({ id, status: newStatus });
});

// Publish an approved change request
admin.post("/publish/:id", async (c) => {
  const publisher = c.get("user");
  const id = c.req.param("id");

  const cr = await c.env.DB.prepare(
    "SELECT * FROM change_requests WHERE id = ? AND status = 'approved'"
  )
    .bind(id)
    .first();

  if (!cr) {
    return c.json({ error: "Not found or not approved" }, 404);
  }

  const type = cr.type as string;
  const targetPath = (cr.target_path as string).replace(/^\/contents\//, "");

  try {
    if (type === "upload") {
      // Copy from staging to final location
      const stagingKey = cr.staged_r2_key as string;
      const staged = await c.env.R2_BUCKET.get(stagingKey);
      if (!staged) {
        return c.json({ error: "Staged file not found" }, 500);
      }
      await c.env.R2_BUCKET.put(targetPath, staged.body, {
        httpMetadata: staged.httpMetadata,
      });
      await c.env.R2_BUCKET.delete(stagingKey);
    } else if (type === "rename") {
      const sourcePath = (cr.source_path as string).replace(/^\/contents\//, "");
      const source = await c.env.R2_BUCKET.get(sourcePath);
      if (!source) {
        return c.json({ error: "Source file not found" }, 500);
      }
      await c.env.R2_BUCKET.put(targetPath, source.body, {
        httpMetadata: source.httpMetadata,
      });
      await c.env.R2_BUCKET.delete(sourcePath);
    } else if (type === "delete") {
      await c.env.R2_BUCKET.delete(targetPath);
    }

    // Regenerate manifest
    await regenerateManifest(c.env.R2_BUCKET);

    // Update status
    await c.env.DB.prepare(
      `UPDATE change_requests SET status = 'published', updated_at = datetime('now') WHERE id = ?`
    )
      .bind(id)
      .run();

    // Audit log
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, action, target_type, target_id, details)
       VALUES (?, ?, 'publish', 'change_request', ?, ?)`
    )
      .bind(
        crypto.randomUUID().replace(/-/g, ""),
        publisher.id,
        id,
        JSON.stringify({ type, targetPath })
      )
      .run();

    return c.json({ id, status: "published" });
  } catch (err) {
    console.error("Publish failed:", err);
    return c.json({ error: "Publish failed" }, 500);
  }
});

// Paginated audit log
admin.get("/audit", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const result = await c.env.DB.prepare(
    `SELECT al.*, u.name as user_name
     FROM audit_log al
     LEFT JOIN user u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all();

  return c.json({ audit: result.results });
});

export default admin;
