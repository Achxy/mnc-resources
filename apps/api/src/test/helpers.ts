// Request helper for integration tests
// Currently unused — integration tests are skipped until
// @cloudflare/vitest-pool-workers supports vitest 4.x

import app from "../index";

type RequestOptions = {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	sessionToken?: string;
};

export const makeRequest = async (
	path: string,
	env: Record<string, unknown>,
	opts: RequestOptions = {},
) => {
	const { method = "GET", body, headers = {}, sessionToken } = opts;

	const url = `https://cms.achus.casa${path}`;
	const init: RequestInit = {
		method,
		headers: { ...headers },
	};

	if (sessionToken) {
		(init.headers as Record<string, string>).cookie = `better-auth.session_token=${sessionToken}`;
	}

	if (body !== undefined) {
		if (body instanceof FormData) {
			init.body = body;
		} else {
			(init.headers as Record<string, string>)["Content-Type"] = "application/json";
			init.body = JSON.stringify(body);
		}
	}

	return app.fetch(new Request(url, init), env);
};
