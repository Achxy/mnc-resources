import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { admin, username } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { APIError } from "better-auth";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { Env } from "./types";
import * as schema from "./auth-schema";
import { verificationOtpEmail } from "./email-template";

export const generateOTP = () => {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 900000 + 100000).toString();
};

export const sendEmail = async (
  apiKey: string,
  to: string,
  subject: string,
  html: string,
) => {
  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      sender: "MnC Resources <noreply@mnc.achus.casa>",
      to: [to],
      subject,
      html_body: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMTP2GO error ${res.status}: ${body}`);
  }
};

export const storeOTP = async (
  db: D1Database,
  email: string,
  purpose: string,
  code: string,
) => {
  const id = crypto.randomUUID();
  const identifier = `otp-${purpose}:${email}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Delete any existing OTP for this email+purpose
  await db.prepare('DELETE FROM "verification" WHERE "identifier" = ?')
    .bind(identifier)
    .run();

  await db.prepare(
    'INSERT INTO "verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, identifier, code, expiresAt, now, now)
    .run();
};

export const verifyOTP = async (
  db: D1Database,
  email: string,
  purpose: string,
  code: string,
): Promise<boolean> => {
  const identifier = `otp-${purpose}:${email}`;
  const row = await db.prepare(
    'SELECT id, value, "expiresAt" FROM "verification" WHERE "identifier" = ?'
  )
    .bind(identifier)
    .first<{ id: string; value: string; expiresAt: string }>();

  if (!row || row.value !== code) return false;
  if (new Date(row.expiresAt) < new Date()) {
    await db.prepare('DELETE FROM "verification" WHERE id = ?').bind(row.id).run();
    return false;
  }

  // Consume the OTP
  await db.prepare('DELETE FROM "verification" WHERE id = ?').bind(row.id).run();
  return true;
};

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

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
        hash: hashPassword,
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
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user }) => {
        const code = generateOTP();
        await storeOTP(env.DB, user.email, "verify", code);
        await sendEmail(
          env.SMTP2GO_API_KEY,
          user.email,
          "Your verification code — MnC Resources",
          verificationOtpEmail(user.name, code),
        );
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const body = ctx.body as Record<string, unknown> | undefined;
        const email = body?.email;
        if (!email || typeof email !== "string") return;

        // Check allowlist
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

        // Purge any existing unverified account so the real owner can reclaim
        const unverified = await env.DB.prepare(
          'SELECT id FROM "user" WHERE email = ? AND "emailVerified" = 0'
        )
          .bind(email)
          .first<{ id: string }>();
        if (unverified) {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM "session" WHERE "userId" = ?').bind(unverified.id),
            env.DB.prepare('DELETE FROM "account" WHERE "userId" = ?').bind(unverified.id),
            env.DB.prepare('DELETE FROM "verification" WHERE "identifier" = ?').bind(email),
            env.DB.prepare('DELETE FROM "verification" WHERE "identifier" = ?').bind(`otp-verify:${email}`),
            env.DB.prepare('DELETE FROM "user" WHERE id = ?').bind(unverified.id),
          ]);
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
