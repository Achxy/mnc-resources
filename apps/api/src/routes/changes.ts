import { Hono } from "hono";
import { requireSession } from "../middleware/auth";
import type { AuthEnv } from "../types";
import { generateId } from "../types";

const changes = new Hono<AuthEnv>();

changes.use("/*", requireSession);

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

	const id = generateId();
	const stagingKey = `_staging/${id}/${file.name}`;

	await c.env.R2_BUCKET.put(stagingKey, file.stream(), {
		httpMetadata: { contentType: file.type },
	});

	await c.env.DB.prepare(
		`INSERT INTO change_requests (id, user_id, type, target_path, staged_r2_key, original_filename, mime_type, file_size)
     VALUES (?, ?, 'upload', ?, ?, ?, ?, ?)`,
	)
		.bind(id, user.id, targetPath, stagingKey, file.name, file.type, file.size)
		.run();

	return c.json({ id, status: "pending" }, 201);
});

changes.post("/rename", async (c) => {
	const user = c.get("user");
	const { sourcePath, targetPath } = await c.req.json<{
		sourcePath: string;
		targetPath: string;
	}>();

	if (!sourcePath || !targetPath) {
		return c.json({ error: "sourcePath and targetPath are required" }, 400);
	}

	const id = generateId();

	await c.env.DB.prepare(
		`INSERT INTO change_requests (id, user_id, type, target_path, source_path)
     VALUES (?, ?, 'rename', ?, ?)`,
	)
		.bind(id, user.id, targetPath, sourcePath)
		.run();

	return c.json({ id, status: "pending" }, 201);
});

changes.post("/delete", async (c) => {
	const user = c.get("user");
	const { targetPath } = await c.req.json<{ targetPath: string }>();

	if (!targetPath) {
		return c.json({ error: "targetPath is required" }, 400);
	}

	const id = generateId();

	await c.env.DB.prepare(
		`INSERT INTO change_requests (id, user_id, type, target_path)
     VALUES (?, ?, 'delete', ?)`,
	)
		.bind(id, user.id, targetPath)
		.run();

	return c.json({ id, status: "pending" }, 201);
});

changes.get("/count", async (c) => {
	const user = c.get("user");
	const status = c.req.query("status") || "pending";

	const result = await c.env.DB.prepare(
		"SELECT COUNT(*) as count FROM change_requests WHERE user_id = ? AND status = ?",
	)
		.bind(user.id, status)
		.first<{ count: number }>();

	return c.json({ count: result?.count ?? 0 });
});

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

changes.delete("/:id", async (c) => {
	const user = c.get("user");
	const id = c.req.param("id");

	const existing = await c.env.DB.prepare(
		"SELECT * FROM change_requests WHERE id = ? AND user_id = ? AND status = 'pending'",
	)
		.bind(id, user.id)
		.first();

	if (!existing) {
		return c.json({ error: "Not found or not cancellable" }, 404);
	}

	if (existing.staged_r2_key) {
		await c.env.R2_BUCKET.delete(existing.staged_r2_key as string);
	}

	await c.env.DB.prepare("DELETE FROM change_requests WHERE id = ?").bind(id).run();

	return c.json({ success: true });
});

export default changes;
