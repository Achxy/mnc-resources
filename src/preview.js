import { IMAGE_EXTENSIONS } from "./config.js";
import { resolveContentUrl } from "./url.js";
import { checkCached } from "./cache.js";

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
    updatePreviewStatus("");
    return;
  }

  if (node.type === "file") {
    const ext = node.extension || "";
    const contentUrl = resolveContentUrl(node.path);
    let isCached = await checkCached(contentUrl);

    // Abort if a newer hover triggered a different preview
    if (thisGeneration !== previewGeneration) return;

    const reportTime = (startTime) => {
      if (thisGeneration !== previewGeneration) return;
      const duration = Math.round(performance.now() - startTime);
      updatePreviewStatus(
        isCached
          ? `Preview restored from cache. (${duration}ms)`
          : `Preview loaded from network. (${duration}ms)`
      );
    };

    if (!isCached) {
      updatePreviewStatus("Loading...");
    }

    if (isPdfFile(node)) {
      const loadStart = performance.now();
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", node.name);
      iframe.onload = () => reportTime(loadStart);
      iframe.src = contentUrl;
      container.appendChild(iframe);
      previewPane.insertBefore(container, previewStatusEl);
      ensurePlaceholderVisible(false);
      return;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      const loadStart = performance.now();
      const img = document.createElement("img");
      img.alt = node.name;
      img.onload = () => reportTime(loadStart);
      img.src = contentUrl;
      container.appendChild(img);
      previewPane.insertBefore(container, previewStatusEl);
      ensurePlaceholderVisible(false);
      return;
    }
  }

  // Fallback: unsupported preview
  const fallback = document.createElement("p");
  fallback.textContent = "No preview available for this item.";
  container.appendChild(fallback);
  previewPane.insertBefore(container, previewStatusEl);
  ensurePlaceholderVisible(false);
  updatePreviewStatus("");
};

