import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, generateOTP, hashPassword, sendEmail, storeOTP, verifyOTP } from "./auth";
import { config } from "./config";
import { resetOtpEmail } from "./email-template";
import admin from "./routes/admin";
import changes from "./routes/changes";
import roster from "./routes/roster";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"/*",
	cors({
		origin: (origin) => {
			if (origin === config.appOrigin || origin === config.devOrigin) {
				return origin;
			}
			return "";
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		maxAge: 86400,
	}),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/auth/verify-and-setup", async (c) => {
	const { email, code, password } = await c.req.json<{
		email: string;
		code: string;
		password: string;
	}>();

	if (!email || !code || !password || password.length < 8) {
		return c.json({ error: "Invalid request" }, 400);
	}

	const valid = await verifyOTP(c.env.DB, email, "verify", code);
	if (!valid) {
		return c.json({ error: "Invalid or expired code" }, 400);
	}

	await c.env.DB.prepare('UPDATE "user" SET "emailVerified" = 1 WHERE email = ?').bind(email).run();

	const user = await c.env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
		.bind(email)
		.first<{ id: string }>();
	if (!user) return c.json({ error: "User not found" }, 404);

	const hashed = await hashPassword(password);
	await c.env.DB.prepare(
		'UPDATE "account" SET password = ? WHERE "userId" = ? AND "providerId" = ?',
	)
		.bind(hashed, user.id, "credential")
		.run();

	return c.json({ ok: true });
});

app.post("/api/auth/send-reset-otp", async (c) => {
	const { email } = await c.req.json<{ email: string }>();

	if (!email) return c.json({ ok: true });

	const user = await c.env.DB.prepare(
		'SELECT id, name FROM "user" WHERE email = ? AND "emailVerified" = 1',
	)
		.bind(email)
		.first<{ id: string; name: string }>();

	if (!user) return c.json({ ok: true });

	const code = generateOTP();
	await storeOTP(c.env.DB, email, "reset", code);
	await sendEmail(
		c.env.SMTP2GO_API_KEY,
		email,
		"Your password reset code \u2014 MnC Resources",
		resetOtpEmail(user.name, code),
	);

	return c.json({ ok: true });
});

app.post("/api/auth/reset-with-otp", async (c) => {
	const { email, code, password } = await c.req.json<{
		email: string;
		code: string;
		password: string;
	}>();

	if (!email || !code || !password || password.length < 8) {
		return c.json({ error: "Invalid request" }, 400);
	}

	const valid = await verifyOTP(c.env.DB, email, "reset", code);
	if (!valid) {
		return c.json({ error: "Invalid or expired code" }, 400);
	}

	const user = await c.env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
		.bind(email)
		.first<{ id: string }>();
	if (!user) return c.json({ error: "User not found" }, 404);

	const hashed = await hashPassword(password);
	await c.env.DB.prepare(
		'UPDATE "account" SET password = ? WHERE "userId" = ? AND "providerId" = ?',
	)
		.bind(hashed, user.id, "credential")
		.run();

	return c.json({ ok: true });
});

app.all("/api/auth/*", async (c) => {
	const auth = createAuth(c.env);
	return auth.handler(c.req.raw);
});

app.route("/api/changes", changes);
app.route("/api/admin", admin);
app.route("/api/roster", roster);

export default app;
