import { CDN_BASE_URL } from "./config";

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export const resolveContentUrl = (manifestPath: string): string => {
	const stripped = manifestPath.replace(/^\/contents\//, "");
	const encoded = encodePath(stripped);
	return CDN_BASE_URL ? `${CDN_BASE_URL}/${encoded}` : `/contents/${encoded}`;
};

export const isCrossOrigin = () => CDN_BASE_URL !== "";
