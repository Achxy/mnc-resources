import { Hono } from "hono";
import { cors } from "hono/cors";
import { scryptSync, randomBytes } from "node:crypto";
import type { Env } from "./types";
import { createAuth } from "./auth";
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

// Set initial password — only for freshly verified accounts (within 24h of creation)
app.post("/api/auth/set-initial-password", async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const { password } = await c.req.json<{ password: string }>();
  if (!password || typeof password !== "string" || password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  // Only allow within 24 hours of account creation
  const created = new Date(session.user.createdAt).getTime();
  if (Date.now() - created > 24 * 60 * 60 * 1000) {
    return c.json({ error: "Setup window expired. Use forgot password instead." }, 403);
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const hashed = `${salt}:${hash}`;

  await c.env.DB.prepare(
    'UPDATE "account" SET password = ? WHERE "userId" = ? AND "providerId" = ?'
  )
    .bind(hashed, session.user.id, "credential")
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
