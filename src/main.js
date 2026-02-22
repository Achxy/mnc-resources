import "./styles.css";
import logoUrl from "./assets/mnc-logo.png";

const CACHE_NAME = "mnc-resource-cache-v1";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const MIN_FULL_WIDTH = 1000;

// DOM references (initialized in DOMContentLoaded)
let treeContainer;
let previewPane;
let previewPlaceholder;
let previewStatusEl;
let resizeNote;

// Generation counter to cancel stale async previews
let previewGeneration = 0;

// Node lookup for event delegation
const nodesByPath = new Map();

// --- URL Encoding ---

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

// --- Layout ---

const updateLayout = () => {
  const isNarrow = window.innerWidth < MIN_FULL_WIDTH;
  document.body.dataset.layout = isNarrow ? "tree-only" : "full";
  if (resizeNote) resizeNote.hidden = !isNarrow;
};

let resizeTimer;
const onResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateLayout, 100);
};

// --- Service Worker ---

const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  }
};

// --- Manifest ---

const fetchManifest = async () => {
  const response = await fetch("/resources-manifest.json");
  if (!response.ok) {
    throw new Error(`Failed to load manifest (HTTP ${response.status})`);
  }
  return response.json();
};

// --- Preview ---

const isPdfFile = (node) => node.type === "file" && node.extension === "pdf";

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
    const branch = isLast ? "└── " : "├── ";
    const nextIndent = indent + (isLast ? "    " : "│   ");
    lines.push(indent + branch + child.name);
    if (child.type === "directory" && Array.isArray(child.children) && child.children.length > 0) {
      lines.push(...buildFolderTreeLines(child, nextIndent));
    }
  });
  return lines;
};

const showPreviewForNode = async (node) => {
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
    const encodedPath = encodePath(node.path);
    let isCached = false;

    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(encodedPath);
      if (cachedResponse) isCached = true;
    } catch (e) {
      console.warn("Cache check failed", e);
    }

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
      iframe.src = encodedPath;
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
      img.src = encodedPath;
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

// --- Tree Rendering ---

const toggleDirectory = (itemElement, directoryNode) => {
  const isExpanded = itemElement.getAttribute("aria-expanded") === "true";
  const nextExpanded = !isExpanded;
  itemElement.setAttribute("aria-expanded", String(nextExpanded));

  let childList = itemElement.nextElementSibling;
  const isChildList =
    childList &&
    childList.classList.contains("tree-children") &&
    childList.dataset.parentPath === directoryNode.path;

  if (nextExpanded) {
    if (!isChildList) {
      childList = createChildrenList(directoryNode.children || []);
      childList.dataset.parentPath = directoryNode.path;
      itemElement.insertAdjacentElement("afterend", childList);
    } else {
      childList.hidden = false;
    }
    queuePriorityAssets(directoryNode);
  } else if (isChildList && childList) {
    childList.hidden = true;
  }

  applyTreeStriping();
};

const createDirectoryItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-folder";
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-expanded", "false");
  item.dataset.path = node.path;
  item.tabIndex = -1;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  nodesByPath.set(node.path, node);

  item.appendChild(indicator);
  item.appendChild(label);
  return item;
};

const createFileItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-file";
  item.setAttribute("role", "treeitem");
  item.dataset.path = node.path;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const link = document.createElement("a");
  link.className = "tree-file-link";
  link.href = encodePath(node.path);
  link.target = "_blank";
  link.rel = "noopener";

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  nodesByPath.set(node.path, node);

  link.appendChild(label);
  item.appendChild(indicator);
  item.appendChild(link);
  return item;
};

const createChildrenList = (nodes) => {
  const list = document.createElement("ul");
  list.className = "tree-children";
  list.setAttribute("role", "group");

  nodes.forEach((node) => {
    list.appendChild(
      node.type === "directory" ? createDirectoryItem(node) : createFileItem(node)
    );
  });

  return list;
};

const renderTree = (children) => {
  if (!treeContainer) return;
  nodesByPath.clear();
  treeContainer.innerHTML = "";
  const rootList = createChildrenList(children);
  treeContainer.appendChild(rootList);

  // Roving tabindex: only the first item is in the tab order
  const firstItem = treeContainer.querySelector(".tree-item");
  if (firstItem) firstItem.tabIndex = 0;

  applyTreeStriping();
};

const applyTreeStriping = () => {
  if (!treeContainer) return;
  const items = treeContainer.querySelectorAll(".tree-item");
  let visibleIndex = 0;

  items.forEach((item) => {
    item.classList.remove("striped-odd", "striped-even");

    if (item.closest(".tree-children[hidden]")) {
      return;
    }

    item.classList.add(visibleIndex % 2 === 0 ? "striped-odd" : "striped-even");
    visibleIndex += 1;
  });
};

// --- Event Delegation ---

const getVisibleItems = () =>
  [...treeContainer.querySelectorAll(".tree-item")].filter(
    (el) => !el.closest(".tree-children[hidden]")
  );

const setupTreeDelegation = () => {
  if (!treeContainer) return;

  // Click: toggle folders
  treeContainer.addEventListener("click", (event) => {
    const folder = event.target.closest(".tree-item-folder");
    if (!folder) return;
    // Don't toggle if the click was on a child link
    if (event.target.closest("a")) return;
    event.stopPropagation();
    const node = nodesByPath.get(folder.dataset.path);
    if (node) toggleDirectory(folder, node);
  });

  // Keyboard: Enter/Space to toggle, arrow keys for roving tabindex
  treeContainer.addEventListener("keydown", (event) => {
    const item = event.target.closest(".tree-item");
    if (!item) return;

    if (event.key === "Enter" || event.key === " ") {
      const folder = item.closest(".tree-item-folder");
      if (folder) {
        event.preventDefault();
        const node = nodesByPath.get(folder.dataset.path);
        if (node) toggleDirectory(folder, node);
      }
    }

    // Arrow navigation (WAI-ARIA Tree pattern)
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const visible = getVisibleItems();
      const idx = visible.indexOf(item);
      const next =
        event.key === "ArrowDown"
          ? Math.min(idx + 1, visible.length - 1)
          : Math.max(idx - 1, 0);
      if (next !== idx && visible[next]) {
        item.tabIndex = -1;
        visible[next].tabIndex = 0;
        visible[next].focus();
      }
    }

    // ArrowRight: expand folder or move to first child
    if (event.key === "ArrowRight" && item.classList.contains("tree-item-folder")) {
      event.preventDefault();
      const expanded = item.getAttribute("aria-expanded") === "true";
      const node = nodesByPath.get(item.dataset.path);
      if (!expanded && node) {
        toggleDirectory(item, node);
      } else {
        // Move to first visible child
        const visible = getVisibleItems();
        const idx = visible.indexOf(item);
        if (idx + 1 < visible.length) {
          item.tabIndex = -1;
          visible[idx + 1].tabIndex = 0;
          visible[idx + 1].focus();
        }
      }
    }

    // ArrowLeft: collapse folder or move to parent
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (
        item.classList.contains("tree-item-folder") &&
        item.getAttribute("aria-expanded") === "true"
      ) {
        const node = nodesByPath.get(item.dataset.path);
        if (node) toggleDirectory(item, node);
      } else {
        // Move to parent folder
        const parentGroup = item.closest(".tree-children");
        if (parentGroup) {
          const parentItem = parentGroup.previousElementSibling;
          if (parentItem && parentItem.classList.contains("tree-item-folder")) {
            item.tabIndex = -1;
            parentItem.tabIndex = 0;
            parentItem.focus();
          }
        }
      }
    }
  });

  // Mouseover delegation for preview (mouseover bubbles, mouseenter does not)
  let lastHoveredPath = null;
  treeContainer.addEventListener("mouseover", (event) => {
    const item = event.target.closest(".tree-item");
    if (!item || item.dataset.path === lastHoveredPath) return;
    lastHoveredPath = item.dataset.path;
    const node = nodesByPath.get(item.dataset.path);
    if (node) showPreviewForNode(node);
  });

  // Restore placeholder when mouse leaves the tree
  treeContainer.addEventListener("mouseleave", () => {
    lastHoveredPath = null;
    clearPreview();
    ensurePlaceholderVisible(true);
    updatePreviewStatus("");
  });
};

// --- Passive Loading ---

let assetQueue = [];
let isProcessingQueue = false;
const queuedPaths = new Set();

const collectAllAssets = (nodes) => {
  const assets = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === "file") {
      assets.push(node);
    } else if (node.children) {
      stack.push(...node.children);
    }
  }
  return assets;
};

const shouldPassiveLoad = () => {
  if ("connection" in navigator) {
    const conn = navigator.connection;
    if (conn.saveData) return false;
    if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g") return false;
  }
  return true;
};

const queuePriorityAssets = (directoryNode) => {
  if (!shouldPassiveLoad()) return;

  const nearby = collectAllAssets(directoryNode.children || []);
  const newAssets = nearby.filter((n) => !queuedPaths.has(n.path));
  for (const n of newAssets) queuedPaths.add(n.path);
  assetQueue.unshift(...newAssets);

  if (!isProcessingQueue) scheduleProcessing();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleProcessing = () => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(processNextAsset);
  } else {
    setTimeout(processNextAsset, 200);
  }
};

const processNextAsset = async () => {
  if (assetQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;

  const node = assetQueue.shift();
  const path = encodePath(node.path);
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(path);
    if (!match) {
      const response = await fetch(path);
      if (response.ok) {
        await cache.put(path, response);
      }
      await delay(1000);
    }
  } catch (err) {
    console.warn("Passive load failed for", path, err);
  }

  if (assetQueue.length > 0) {
    scheduleProcessing();
  } else {
    isProcessingQueue = false;
  }
};

// --- Error UI ---

const showError = (message) => {
  if (!treeContainer) return;
  treeContainer.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = message;
  treeContainer.appendChild(p);
};

// --- Init ---

const init = async () => {
  document.body.dataset.loading = "true";

  registerServiceWorker();
  try {
    const manifest = await fetchManifest();
    renderTree(manifest.children || []);

    document.body.dataset.loading = "false";

    if (shouldPassiveLoad()) {
      const allAssets = collectAllAssets(manifest.children || []);
      for (const n of allAssets) queuedPaths.add(n.path);
      assetQueue.push(...allAssets);

      setTimeout(() => {
        if (!isProcessingQueue && assetQueue.length > 0) scheduleProcessing();
      }, 5000);
    }
  } catch (error) {
    console.error("Unable to initialize app", error);
    document.body.dataset.loading = "false";
    showError("Failed to load resources. Please refresh the page.");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Initialize DOM references
  treeContainer = document.getElementById("tree-container");
  previewPane = document.getElementById("preview-pane");
  previewPlaceholder = document.getElementById("preview-placeholder");
  previewStatusEl = document.getElementById("preview-status");
  resizeNote = document.getElementById("resize-note");

  const siteLogo = document.getElementById("site-logo");
  if (siteLogo) siteLogo.src = logoUrl;

  updateLayout();
  window.addEventListener("resize", onResize);

  setupTreeDelegation();
  init();
});
