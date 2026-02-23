import { CMS_API_URL } from "./config.js";

export const apiUrl = (path) => `${CMS_API_URL || ""}${path}`;

export const apiFetch = (path, opts = {}) =>
  fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

export const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
