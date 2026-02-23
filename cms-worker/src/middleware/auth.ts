import { createMiddleware } from "hono/factory";
import type { AuthEnv, SessionData } from "../types";
import { createAuth } from "../auth";

const getValidatedSession = async (c: { env: AuthEnv["Bindings"]; req: { raw: Request } }) => {
  const auth = createAuth(c.env);
  const response = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!response) return null;

  const data = response as unknown as SessionData;
  if (!data.user.emailVerified) return null;

  return data;
};

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const data = await getValidatedSession(c);
  if (!data) return c.json({ error: "Unauthorized" }, 401);

  c.set("user", data.user);
  c.set("session", data.session);
  await next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const data = await getValidatedSession(c);
  if (!data) return c.json({ error: "Unauthorized" }, 401);
  if (data.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  c.set("user", data.user);
  c.set("session", data.session);
  await next();
});
