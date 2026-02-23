import { getUser } from "./auth.js";
import { showMultiUploadForm, showRenameForm, showDeleteConfirm } from "./cms-ui.js";

let abortController = null;
let itemObserver = null;
let treeContainerRef = null;
let treePaneRef = null;

// Get parent path from a file path: /contents/a/b.pdf → /contents/a
const getParentPath = (path) => {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.substring(0, i) : "/contents";
};

// Inject action buttons into a single tree item
const injectActions = (item) => {
  if (item.querySelector(".cms-item-actions")) return;
  const actions = document.createElement("span");
  actions.className = "cms-item-actions";

  const uploadBtn = document.createElement("button");
  uploadBtn.className = "cms-action-btn";
  uploadBtn.dataset.action = "upload";
  uploadBtn.title = item.classList.contains("tree-item-folder")
    ? "Upload to this folder"
    : "Upload alongside this file";
  uploadBtn.textContent = "+";

  const renameBtn = document.createElement("button");
  renameBtn.className = "cms-action-btn";
  renameBtn.dataset.action = "rename";
  renameBtn.title = "Rename";
  renameBtn.textContent = "\u270E"; // pencil

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "cms-action-btn cms-action-danger";
  deleteBtn.dataset.action = "delete";
  deleteBtn.title = "Delete";
  deleteBtn.textContent = "\u00D7"; // ×

  actions.append(uploadBtn, renameBtn, deleteBtn);
  item.appendChild(actions);
};

const injectAllActions = (container) => {
  container.querySelectorAll(".tree-item").forEach(injectActions);
};

const removeAllActions = (container) => {
  container.querySelectorAll(".cms-item-actions").forEach((el) => el.remove());
};

// DOMStringList.includes() doesn't exist in all browsers; DOMStringList uses .contains()
const hasDragFiles = (e) => {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return typeof types.contains === "function"
    ? types.contains("Files")
    : Array.prototype.includes.call(types, "Files");
};

export const initCmsTreeActions = (treePane) => {
  if (abortController) return;

  const treeContainer = treePane.querySelector("#tree-container");
  treeContainerRef = treeContainer;
  treePaneRef = treePane;
  abortController = new AbortController();
  const signal = abortController.signal;

  // --- Per-item action buttons ---
  injectAllActions(treeContainer);

  // Event delegation for action button clicks
  treeContainer.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".cms-action-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const item = btn.closest(".tree-item");
      const path = item?.dataset.path;
      if (!path) return;

      const action = btn.dataset.action;
      if (action === "upload") {
        const target = item.classList.contains("tree-item-folder")
          ? path
          : getParentPath(path);
        showMultiUploadForm(target);
      } else if (action === "rename") {
        showRenameForm(path);
      } else if (action === "delete") {
        showDeleteConfirm(path);
      }
    },
    { signal }
  );

  // MutationObserver for new tree items (expanded directories)
  itemObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains("tree-item")) {
          injectActions(node);
        }
        node.querySelectorAll?.(".tree-item").forEach(injectActions);
      }
    }
  });
  itemObserver.observe(treeContainer, { childList: true, subtree: true });

  // --- Drag-and-drop ---
  // Attach to treePane (wider target area)
  treePaneRef.addEventListener(
    "dragenter",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
    },
    { signal }
  );

  treePaneRef.addEventListener(
    "dragover",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      // Clear previous highlights
      treePaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
        el.classList.remove("cms-drop-target")
      );

      // Highlight closest folder, or the whole tree container for root
      const folder = e.target.closest(".tree-item-folder");
      if (folder) {
        folder.classList.add("cms-drop-target");
      } else if (treeContainer.contains(e.target) || e.target === treeContainer) {
        treeContainer.classList.add("cms-drop-target");
      }
    },
    { signal }
  );

  treePaneRef.addEventListener(
    "dragleave",
    (e) => {
      if (!treePaneRef.contains(e.relatedTarget)) {
        treePaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
          el.classList.remove("cms-drop-target")
        );
        treeContainer.classList.remove("cms-drop-target");
      }
    },
    { signal }
  );

  treePaneRef.addEventListener(
    "drop",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();

      treePaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
        el.classList.remove("cms-drop-target")
      );
      treeContainer.classList.remove("cms-drop-target");

      const files = e.dataTransfer.files;
      if (!files.length) return;

      const folder = e.target.closest(".tree-item-folder");
      const targetPath = folder?.dataset.path || "/contents";
      showMultiUploadForm(targetPath, Array.from(files));
    },
    { signal }
  );
};

export const destroyCmsTreeActions = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  if (itemObserver) {
    itemObserver.disconnect();
    itemObserver = null;
  }

  if (treeContainerRef) {
    removeAllActions(treeContainerRef);
    treeContainerRef.classList.remove("cms-drop-target");
    treeContainerRef = null;
  }

  treePaneRef = null;
};
