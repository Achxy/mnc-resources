import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { admin, username } from "better-auth/plugins";
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
