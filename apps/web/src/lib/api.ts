import { CMS_API_URL } from "./config";

export const apiUrl = (path: string): string => `${CMS_API_URL || ""}${path}`;

export const apiFetch = (path: string, opts: RequestInit = {}): Promise<Response> => {
	const headers: Record<string, string> = {
		...(opts.headers as Record<string, string>),
	};
	if (opts.body && !(opts.body instanceof FormData)) {
		headers["Content-Type"] = "application/json";
	}
	return fetch(apiUrl(path), {
		credentials: "include",
		...opts,
		headers,
	});
};

export const formatFileSize = (bytes: number | null | undefined): string => {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
