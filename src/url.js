import { CDN_BASE_URL } from "./config.js";

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

/**
 * Maps a manifest path (e.g. "/contents/3rd Semester/file.pdf")
 * to a full URL on the R2 CDN (or same-origin for local dev).
 * R2 keys omit the "/contents/" prefix.
 */
export const resolveContentUrl = (manifestPath) => {
  const stripped = manifestPath.replace(/^\/contents\//, "");
  const encoded = encodePath(stripped);
  return CDN_BASE_URL ? `${CDN_BASE_URL}/${encoded}` : `/contents/${encoded}`;
};

export const isCrossOrigin = () => CDN_BASE_URL !== "";
