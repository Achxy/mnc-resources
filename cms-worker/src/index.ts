import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import {
  createAuth,
  generateOTP,
  storeOTP,
  verifyOTP,
  hashPassword,
  sendEmail,
} from "./auth";
import { resetOtpEmail } from "./email-template";
import changes from "./routes/changes";
import admin from "./routes/admin";
import roster from "./routes/roster";

const app = new Hono<{ Bindings: Env }>();

// CORS for cross-subdomain requests
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (
        origin === "https://mnc.achus.casa" ||
        origin === "http://localhost:5173"
      ) {
        return origin;
      }
      return "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// Health check
app.get("/api/health", (c) => c.json({ ok: true }));

// Verify signup OTP + set password (completes registration)
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

  // Mark email as verified
  await c.env.DB.prepare('UPDATE "user" SET "emailVerified" = 1 WHERE email = ?')
    .bind(email)
    .run();

  // Set the real password
  const user = await c.env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  if (!user) return c.json({ error: "User not found" }, 404);

  const hashed = await hashPassword(password);
  await c.env.DB.prepare(
    'UPDATE "account" SET password = ? WHERE "userId" = ? AND "providerId" = ?'
  )
    .bind(hashed, user.id, "credential")
    .run();

  return c.json({ ok: true });
});

// Send password reset OTP
app.post("/api/auth/send-reset-otp", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email) return c.json({ ok: true }); // silent for missing email

  // Check user exists and is verified
  const user = await c.env.DB.prepare(
    'SELECT id, name FROM "user" WHERE email = ? AND "emailVerified" = 1'
  )
    .bind(email)
    .first<{ id: string; name: string }>();

  // Always return success to prevent user enumeration
  if (!user) return c.json({ ok: true });

  const code = generateOTP();
  await storeOTP(c.env.DB, email, "reset", code);
  await sendEmail(
    c.env.SMTP2GO_API_KEY,
    email,
    "Your password reset code — MnC Resources",
    resetOtpEmail(user.name, code),
  );

  return c.json({ ok: true });
});

// Verify reset OTP + set new password
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
    'UPDATE "account" SET password = ? WHERE "userId" = ? AND "providerId" = ?'
  )
    .bind(hashed, user.id, "credential")
    .run();

  return c.json({ ok: true });
});

// Mount better-auth — handles all /api/auth/* routes
app.all("/api/auth/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Mount business routes
app.route("/api/changes", changes);
app.route("/api/admin", admin);
app.route("/api/roster", roster);

export default app;
