// Factory functions for D1/R2 test data seeding
// Currently unused — integration tests are skipped until
// @cloudflare/vitest-pool-workers supports vitest 4.x

type D1Database = {
	prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<void> } };
	exec: (sql: string) => Promise<void>;
};

type R2Bucket = {
	put: (key: string, value: string, opts?: unknown) => Promise<void>;
	list: () => Promise<{ objects: { key: string }[] }>;
	delete: (key: string) => Promise<void>;
};

export const seedUser = async (db: D1Database, overrides: Record<string, unknown> = {}) => {
	const id = (overrides.id as string) ?? crypto.randomUUID().replace(/-/g, "");
	const data = {
		id,
		name: "Test User",
		email: `${id}@example.com`,
		emailVerified: 1,
		role: "user",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};

	await db
		.prepare(
			`INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.id,
			data.name,
			data.email,
			data.emailVerified,
			data.role,
			data.createdAt,
			data.updatedAt,
		)
		.run();

	return data;
};

export const seedAdminUser = async (db: D1Database, overrides: Record<string, unknown> = {}) => {
	return seedUser(db, { role: "admin", ...overrides });
};

export const seedSession = async (
	db: D1Database,
	userId: string,
	overrides: Record<string, unknown> = {},
) => {
	const id = (overrides.id as string) ?? crypto.randomUUID().replace(/-/g, "");
	const token = (overrides.token as string) ?? crypto.randomUUID();
	const expiresAt =
		(overrides.expiresAt as string) ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

	await db
		.prepare(
			`INSERT INTO "session" (id, "expiresAt", token, "userId", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		)
		.bind(id, expiresAt, token, userId)
		.run();

	return { id, token, expiresAt, userId };
};

export const seedAccount = async (db: D1Database, userId: string, password: string) => {
	const id = crypto.randomUUID().replace(/-/g, "");
	await db
		.prepare(
			`INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES (?, ?, 'credential', ?, ?, datetime('now'), datetime('now'))`,
		)
		.bind(id, userId, userId, password)
		.run();
	return { id };
};

export const seedAllowedStudent = async (
	db: D1Database,
	rollNumber: string,
	name: string,
	email: string,
) => {
	await db
		.prepare("INSERT INTO allowed_students (roll_number, name, email) VALUES (?, ?, ?)")
		.bind(rollNumber, name, email)
		.run();
};

export const seedChangeRequest = async (
	db: D1Database,
	overrides: Record<string, unknown> = {},
) => {
	const id = (overrides.id as string) ?? crypto.randomUUID().replace(/-/g, "");
	const data = {
		id,
		user_id: "user-1",
		type: "upload",
		status: "pending",
		target_path: "/contents/test.pdf",
		staged_r2_key: null,
		original_filename: null,
		mime_type: null,
		file_size: null,
		source_path: null,
		...overrides,
	};

	await db
		.prepare(
			`INSERT INTO change_requests (id, user_id, type, status, target_path, source_path, staged_r2_key, original_filename, mime_type, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.id,
			data.user_id,
			data.type,
			data.status,
			data.target_path,
			data.source_path,
			data.staged_r2_key,
			data.original_filename,
			data.mime_type,
			data.file_size,
		)
		.run();

	return data;
};

export const seedR2Object = async (
	bucket: R2Bucket,
	key: string,
	body: string,
	contentType = "text/plain",
) => {
	await bucket.put(key, body, { httpMetadata: { contentType } });
};

export const cleanupDB = async (db: D1Database) => {
	await db.exec(`
    DELETE FROM audit_log;
    DELETE FROM change_requests;
    DELETE FROM "verification";
    DELETE FROM "account";
    DELETE FROM "session";
    DELETE FROM allowed_students;
    DELETE FROM "user";
  `);
};

export const cleanupR2 = async (bucket: R2Bucket) => {
	const listed = await bucket.list();
	for (const obj of listed.objects) {
		await bucket.delete(obj.key);
	}
};
