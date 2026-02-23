import { http, HttpResponse } from "msw";

export const handlers = [
	// Default: no session
	http.get("*/api/auth/get-session", () => {
		return HttpResponse.json(null);
	}),

	// Default: empty manifest
	http.get("*/resources-manifest.json", () => {
		return HttpResponse.json({
			rootLabel: "Contents",
			rootPath: "/contents",
			children: [],
		});
	}),
];
