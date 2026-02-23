import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { createAuth } from "../auth";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  emailVerified: boolean;
};

type SessionData = {
  user: SessionUser;
  session: { id: string };
};

type AuthEnv = {
  Bindings: Env;
  Variables: {
    user: SessionUser;
    session: { id: string };
  };
};

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const response = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!response) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const data = response as unknown as SessionData;

  if (!data.user.emailVerified) {
    return c.json({ error: "Email not verified" }, 403);
  }

  c.set("user", data.user);
  c.set("session", data.session);
  await next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const response = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!response) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const data = response as unknown as SessionData;

  if (!data.user.emailVerified) {
    return c.json({ error: "Email not verified" }, 403);
  }

  if (data.user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.set("user", data.user);
  c.set("session", data.session);
  await next();
});
