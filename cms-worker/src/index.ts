import { Hono } from "hono";
import { cors } from "hono/cors";
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
