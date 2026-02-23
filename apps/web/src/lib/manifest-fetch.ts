import type { ManifestRoot } from "@mnc/shared";
import { CDN_BASE_URL } from "./config";

const MANIFEST_URL = CDN_BASE_URL
	? `${CDN_BASE_URL}/resources-manifest.json`
	: "/resources-manifest.json";

export const fetchManifest = async (): Promise<ManifestRoot> => {
	const response = await fetch(MANIFEST_URL);
	if (!response.ok) {
		throw new Error(`Failed to load manifest (HTTP ${response.status})`);
	}
	return response.json();
};
