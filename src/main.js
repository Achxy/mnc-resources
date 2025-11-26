import "./styles.css";
import logoUrl from "./assets/mnc-logo.png";

const treeContainer = document.getElementById("tree-container");
const previewPane = document.getElementById("preview-pane");
const previewPlaceholder = document.getElementById("preview-placeholder");
const siteLogo = document.getElementById("site-logo");
const resizeNote = document.getElementById("resize-note");
const MIN_FULL_WIDTH = 1000; // minimum viewport width (in px) for showing tree + preview

const isMobileDevice = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
};

const applyLayoutMode = () => {
  if (!document.body) return;

  // Mobile devices are handled separately and should not reach here
  if (isMobileDevice()) {
    return;
  }

  const isNarrow = window.innerWidth < MIN_FULL_WIDTH;
  if (isNarrow) {
    document.body.dataset.layout = "tree-only";
    if (resizeNote) {
      resizeNote.hidden = false;
    }
  } else {
    document.body.dataset.layout = "full";
    if (resizeNote) {
      resizeNote.hidden = true;
    }
  }
};
if (siteLogo) {
  siteLogo.src = logoUrl;
}
const COURSE_PLAN_KEYWORD = "course plan";

const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
};

const fetchManifest = async () => {
  const response = await fetch("/resources-manifest.json");
  if (!response.ok) {
    throw new Error("Failed to load manifest");
  }
  return response.json();
};

const isPdfFile = (node) => node.type === "file" && node.extension === "pdf";

const prefetchPdfs = (pdfNodes) => {
  pdfNodes.forEach((pdf) => {
    fetch(pdf.path, { method: "GET" }).catch(() => {});
  });
};

const collectNearbyPdfNodes = (directoryNode) => {
  const found = [];
  const children = directoryNode.children || [];
  children.forEach((child) => {
    if (isPdfFile(child)) {
      found.push(child);
    } else if (child.type === "directory" && Array.isArray(child.children)) {
      child.children.forEach((grandChild) => {
        if (isPdfFile(grandChild)) {
          found.push(grandChild);
        }
      });
    }
  });
  return found;
};

const prefetchNearbyPdfs = (directoryNode) => {
  const pdfNodes = collectNearbyPdfNodes(directoryNode);
  if (pdfNodes.length) {
    prefetchPdfs(pdfNodes);
  }
};

const prefetchCoursePlanPdfs = (manifestRoot) => {
  const stack = [...(manifestRoot.children || [])];
  const targets = [];

  while (stack.length) {
    const node = stack.pop();
    if (node.type === "file") {
      if (isPdfFile(node) && node.name.toLowerCase().includes(COURSE_PLAN_KEYWORD)) {
        targets.push(node);
      }
    } else if (node.type === "directory" && Array.isArray(node.children)) {
      stack.push(...node.children);
    }
  }

  if (targets.length) {
    prefetchPdfs(targets);
  }
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

const clearPreview = () => {
  if (!previewPane) return;
  const existing = previewPane.querySelector(".preview-content");
  if (existing) {
    existing.remove();
  }
};

const ensurePlaceholderVisible = (visible) => {
  if (!previewPlaceholder) return;
  previewPlaceholder.style.display = visible ? "" : "none";
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

const showPreviewForNode = (node) => {
  if (!previewPane) return;

  clearPreview();

  const container = document.createElement("div");
  container.className = "preview-content";

  // Folder preview: show a "tree" style listing
  if (node.type === "directory") {
    const pre = document.createElement("pre");
    pre.className = "preview-tree-text";
    const lines = [node.name];
    lines.push(...buildFolderTreeLines(node, ""));
    pre.textContent = lines.join("\n");
    container.appendChild(pre);
    previewPane.appendChild(container);
    ensurePlaceholderVisible(false);
    return;
  }

  // File preview
  if (node.type === "file") {
    const ext = node.extension ? node.extension.toLowerCase() : "";

    if (isPdfFile(node)) {
      const iframe = document.createElement("iframe");
      iframe.src = node.path;
      iframe.setAttribute("title", node.name);
      container.appendChild(iframe);
      previewPane.appendChild(container);
      ensurePlaceholderVisible(false);
      return;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      const img = document.createElement("img");
      img.src = node.path;
      img.alt = node.name;
      container.appendChild(img);
      previewPane.appendChild(container);
      ensurePlaceholderVisible(false);
      return;
    }
  }

  // Fallback: unsupported preview
  const fallback = document.createElement("p");
  fallback.textContent = "No preview available for this item.";
  container.appendChild(fallback);
  previewPane.appendChild(container);
  ensurePlaceholderVisible(false);
};

const toggleDirectory = (itemElement, directoryNode) => {
  const isExpanded = itemElement.getAttribute("aria-expanded") === "true";
  const nextExpanded = !isExpanded;
  itemElement.setAttribute("aria-expanded", String(nextExpanded));

  let childList = itemElement.nextElementSibling;
  const isChildList =
    childList && childList.classList.contains("tree-children") && childList.dataset.parentPath === directoryNode.path;

  if (nextExpanded) {
    if (!isChildList) {
      childList = createChildrenList(directoryNode.children || []);
      childList.dataset.parentPath = directoryNode.path;
      itemElement.insertAdjacentElement("afterend", childList);
    } else {
      childList.hidden = false;
    }
    prefetchNearbyPdfs(directoryNode);
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
  item.tabIndex = 0;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  const handleToggle = () => toggleDirectory(item, node);

  item.addEventListener("click", (event) => {
    event.stopPropagation();
    handleToggle();
  });

  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  });

  item.addEventListener("mouseenter", () => {
    showPreviewForNode(node);
  });

  item.appendChild(indicator);
  item.appendChild(label);
  return item;
};

const createFileItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-file";
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-selected", "false");
  item.dataset.path = node.path;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.style.visibility = "hidden";

  const link = document.createElement("a");
  link.className = "tree-file-link";
  link.href = node.path;
  link.target = "_blank";
  link.rel = "noopener";

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  item.addEventListener("mouseenter", () => {
    showPreviewForNode(node);
  });

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
    const childItem = node.type === "directory" ? createDirectoryItem(node) : createFileItem(node);
    list.appendChild(childItem);
  });

  return list;
};

const renderTree = (children) => {
  treeContainer.innerHTML = "";
  const rootList = createChildrenList(children);
  treeContainer.appendChild(rootList);
  applyTreeStriping();
};

const applyTreeStriping = () => {
  if (!treeContainer) return;
  const items = treeContainer.querySelectorAll(".tree-item");
  let visibleIndex = 0;

  items.forEach((item) => {
    item.classList.remove("striped-odd", "striped-even");

    const hiddenAncestor = item.closest(".tree-children[hidden]");
    if (hiddenAncestor) {
      return;
    }

    // Offset parent will be null if the element (or a parent) is display: none
    if (item.offsetParent === null) {
      return;
    }

    if (visibleIndex % 2 === 0) {
      item.classList.add("striped-odd");
    } else {
      item.classList.add("striped-even");
    }
    visibleIndex += 1;
  });
};

const init = async () => {
  // Mark the app as loading so the main content is hidden until everything is ready
  document.body.dataset.loading = "true";

  registerServiceWorker();
  try {
    const manifest = await fetchManifest();
    renderTree(manifest.children || []);

    // Main UI is ready – show the content panel
    document.body.dataset.loading = "false";

    // Defer heavy PDF prefetch until after initial paint
    const startPrefetch = () => prefetchCoursePlanPdfs(manifest);

    if ("requestIdleCallback" in window) {
      requestIdleCallback(startPrefetch);
    } else {
      window.addEventListener("load", startPrefetch, { once: true });
    }
  } catch (error) {
    console.error("Unable to initialize app", error);
    // Even on error, avoid leaving the page in a permanently hidden state
    document.body.dataset.loading = "false";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // If the user is on a mobile device, do not load the app – show plaintext only.
  if (isMobileDevice()) {
    if (document.body) {
      document.body.innerHTML = "I haven't got the time to develop the mobile version yet.";
    }
    return;
  }

  // Desktop: apply initial layout mode and listen to resizes
  applyLayoutMode();
  window.addEventListener("resize", applyLayoutMode);

  init();
});
