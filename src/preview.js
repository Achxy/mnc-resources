import { IMAGE_EXTENSIONS, CACHE_NAME } from "./config.js";
import { resolveContentUrl, isCrossOrigin } from "./url.js";

let previewPane;
let previewPlaceholder;
let previewStatusEl;
let previewGeneration = 0;

export const initPreview = (pane, placeholder, statusEl) => {
  previewPane = pane;
  previewPlaceholder = placeholder;
  previewStatusEl = statusEl;
};

const clearPreview = () => {
  if (!previewPane) return;
  for (const el of previewPane.querySelectorAll(".preview-content")) {
    const iframe = el.querySelector("iframe");
    if (iframe) iframe.src = "about:blank";
    el.remove();
  }
};

const ensurePlaceholderVisible = (visible) => {
  if (!previewPlaceholder) return;
  previewPlaceholder.style.display = visible ? "" : "none";
};

const updatePreviewStatus = (message) => {
  if (previewStatusEl) previewStatusEl.textContent = message;
};

/**
 * Fetch a resource via Cache API (cache-first), falling back to network.
 * Returns { blob, fromCache, duration } or null on failure.
 * Timing covers the full wait: cache lookup or network download + body read.
 */
const fetchResource = async (url) => {
  const cache = await caches.open(CACHE_NAME);
  const start = performance.now();

  const cached = await cache.match(url);
  if (cached) {
    const blob = await cached.blob();
    return { blob, fromCache: true, duration: Math.round(performance.now() - start) };
  }

  const opts = isCrossOrigin() ? { mode: "cors" } : {};
  const response = await fetch(url, opts);
  if (!response.ok) return null;

  const blob = await response.clone().blob();
  cache.put(url, response);
  return { blob, fromCache: false, duration: Math.round(performance.now() - start) };
};

const buildFolderTreeLines = (node, indent = "") => {
  const lines = [];
  const children = node.children || [];
  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    const branch = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const nextIndent = indent + (isLast ? "    " : "\u2502   ");
    lines.push(indent + branch + child.name);
    if (child.type === "directory" && Array.isArray(child.children) && child.children.length > 0) {
      lines.push(...buildFolderTreeLines(child, nextIndent));
    }
  });
  return lines;
};

const isPdfFile = (node) => node.type === "file" && node.extension === "pdf";

export const showPreviewForNode = async (node) => {
  if (!previewPane) return;

  const thisGeneration = ++previewGeneration;

  clearPreview();
  updatePreviewStatus("");

  const container = document.createElement("div");
  container.className = "preview-content";

  if (node.type === "directory") {
    const pre = document.createElement("pre");
    pre.className = "preview-tree-text";
    const lines = [node.name, ...buildFolderTreeLines(node, "")];
    pre.textContent = lines.join("\n");
    container.appendChild(pre);
    previewPane.insertBefore(container, previewStatusEl);
    ensurePlaceholderVisible(false);
    return;
  }

  if (node.type === "file") {
    const ext = node.extension || "";
    const contentUrl = resolveContentUrl(node.path);

    updatePreviewStatus("Loading\u2026");

    const result = await fetchResource(contentUrl);

    if (thisGeneration !== previewGeneration) return;

    if (!result) {
      updatePreviewStatus("Failed to load preview.");
      ensurePlaceholderVisible(false);
      return;
    }

    const { blob, fromCache, duration } = result;
    const blobUrl = URL.createObjectURL(blob);
    const source = fromCache ? "cache" : "network";

    if (isPdfFile(node)) {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", node.name);
      iframe.src = blobUrl;
      container.appendChild(iframe);
      previewPane.insertBefore(container, previewStatusEl);
      ensurePlaceholderVisible(false);
      updatePreviewStatus(`Loaded from ${source}. (${duration}ms)`);
      return;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      const img = document.createElement("img");
      img.alt = node.name;
      img.src = blobUrl;
      container.appendChild(img);
      previewPane.insertBefore(container, previewStatusEl);
      ensurePlaceholderVisible(false);
      updatePreviewStatus(`Loaded from ${source}. (${duration}ms)`);
      return;
    }

    URL.revokeObjectURL(blobUrl);
  }

  // Fallback: unsupported preview
  const fallback = document.createElement("p");
  fallback.textContent = "No preview available for this item.";
  container.appendChild(fallback);
  previewPane.insertBefore(container, previewStatusEl);
  ensurePlaceholderVisible(false);
  updatePreviewStatus("");
};
