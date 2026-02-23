import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { admin, username } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { APIError } from "better-auth";
import { Resend } from "resend";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { Env } from "./types";
import * as schema from "./auth-schema";

export const createAuth = (env: Env) => {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: "https://cms.achus.casa",
    basePath: "/api/auth",
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      password: {
        hash: async (password: string) => {
          const salt = randomBytes(16).toString("hex");
          const hash = scryptSync(password, salt, 64).toString("hex");
          return `${salt}:${hash}`;
        },
        verify: async ({ hash, password }: { hash: string; password: string }) => {
          const [salt, key] = hash.split(":");
          const keyBuffer = Buffer.from(key, "hex");
          const hashBuffer = scryptSync(password, salt, 64);
          return timingSafeEqual(keyBuffer, hashBuffer);
        },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from: "MnC Resources <noreply@achus.casa>",
          to: user.email,
          subject: "Verify your email — MnC Resources",
          html: `<p>Hi ${user.name},</p><p>Click the link below to verify your email:</p><p><a href="${url}">Verify Email</a></p>`,
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const body = ctx.body as Record<string, unknown> | undefined;
        const email = body?.email;
        if (!email || typeof email !== "string") return;
        const row = await env.DB.prepare(
          "SELECT 1 FROM allowed_students WHERE email = ?"
        )
          .bind(email)
          .first();
        if (!row) {
          throw new APIError("BAD_REQUEST", {
            message: "Registration is restricted to approved students only",
          });
        }
      }),
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: ".achus.casa",
      },
    },
    trustedOrigins: ["https://mnc.achus.casa"],
    plugins: [
      admin(),
      username(),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;
