export interface Env {
	DB: D1Database;
	R2_BUCKET: R2Bucket;
	BETTER_AUTH_SECRET: string;
	SMTP2GO_API_KEY: string;
}

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	role: string | null;
	emailVerified: boolean;
};

export type SessionData = {
	user: SessionUser;
	session: { id: string };
};

export type AuthEnv = {
	Bindings: Env;
	Variables: {
		user: SessionUser;
		session: { id: string };
	};
};

export const generateId = () => crypto.randomUUID().replace(/-/g, "");
