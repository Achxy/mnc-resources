import { CDN_BASE_URL } from "./config.js";

const MANIFEST_URL = CDN_BASE_URL
  ? `${CDN_BASE_URL}/resources-manifest.json`
  : "/resources-manifest.json";

export const fetchManifest = async () => {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to load manifest (HTTP ${response.status})`);
  }
  return response.json();
};
