import { createAuthClient } from "better-auth/client";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { CMS_API_URL } from "./config";

export const authClient = createAuthClient({
	baseURL: CMS_API_URL || window.location.origin,
	basePath: "/api/auth",
	plugins: [adminClient(), usernameClient()],
});
