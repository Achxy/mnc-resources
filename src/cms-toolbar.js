import { getUser } from "./auth.js";
import { showMultiUploadForm, showRenameForm, showDeleteConfirm } from "./cms-ui.js";
import { resolveContentUrl } from "./url.js";
import { nodesByPath } from "./tree.js";

// --- Download (no auth required) ---

let dlAbort = null;
let dlObserver = null;
let dlTreeRef = null;

const downloadFile = async (path) => {
  const url = resolveContentUrl(path);
  const filename = path.split("/").pop();
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
};

const collectFiles = (node) => {
  const files = [];
  for (const child of node.children || []) {
    if (child.type === "directory") files.push(...collectFiles(child));
    else files.push(child.path);
  }
  return files;
};

const downloadFolder = async (path) => {
  const node = nodesByPath.get(path);
  if (!node) return;
  const files = collectFiles(node);
  for (const filePath of files) {
    await downloadFile(filePath);
  }
};

const ensureActionsContainer = (item) => {
  let actions = item.querySelector(".cms-item-actions");
  if (!actions) {
    actions = document.createElement("span");
    actions.className = "cms-item-actions";
    item.appendChild(actions);
  }
  return actions;
};

const injectDownloadBtn = (item) => {
  const actions = ensureActionsContainer(item);
  if (actions.querySelector(".cms-dl-btn")) return;
  const isFolder = item.classList.contains("tree-item-folder");
  const btn = document.createElement("button");
  btn.className = "cms-action-btn cms-dl-btn";
  btn.dataset.action = "download";
  btn.title = isFolder ? "Download folder" : "Download";
  btn.textContent = "\u2193"; // ↓
  actions.prepend(btn);
};

const injectAllDownloadBtns = (container) => {
  container.querySelectorAll(".tree-item").forEach(injectDownloadBtn);
};

export const initDownloadButtons = (treeContainer) => {
  if (dlAbort) return;
  dlTreeRef = treeContainer;
  dlAbort = new AbortController();
  const signal = dlAbort.signal;

  injectAllDownloadBtns(treeContainer);

  // Click delegation for download
  treeContainer.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".cms-dl-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const item = btn.closest(".tree-item");
      const path = item?.dataset.path;
      if (!path) return;
      if (item.classList.contains("tree-item-folder")) downloadFolder(path);
      else downloadFile(path);
    },
    { signal }
  );

  // Observer for expanded directories
  dlObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains("tree-item")) injectDownloadBtn(node);
        node.querySelectorAll?.(".tree-item").forEach(injectDownloadBtn);
      }
    }
  });
  dlObserver.observe(treeContainer, { childList: true, subtree: true });
};

// --- CMS edit actions (auth required) ---

let cmsAbort = null;
let cmsObserver = null;
let cmsTreeRef = null;
let cmsPaneRef = null;

const injectCmsActions = (item) => {
  const actions = ensureActionsContainer(item);
  if (actions.querySelector(".cms-edit-btn")) return;
  const isFolder = item.classList.contains("tree-item-folder");

  if (isFolder) {
    const uploadBtn = document.createElement("button");
    uploadBtn.className = "cms-action-btn cms-edit-btn";
    uploadBtn.dataset.action = "upload";
    uploadBtn.title = "Upload to this folder";
    uploadBtn.textContent = "+";
    actions.appendChild(uploadBtn);
  }

  const renameBtn = document.createElement("button");
  renameBtn.className = "cms-action-btn cms-edit-btn";
  renameBtn.dataset.action = "rename";
  renameBtn.title = "Rename";
  renameBtn.textContent = "\u270E";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "cms-action-btn cms-edit-btn cms-action-danger";
  deleteBtn.dataset.action = "delete";
  deleteBtn.title = "Delete";
  deleteBtn.textContent = "\u00D7";

  actions.append(renameBtn, deleteBtn);
};

const injectAllCmsActions = (container) => {
  container.querySelectorAll(".tree-item").forEach(injectCmsActions);
};

const removeAllCmsActions = (container) => {
  container.querySelectorAll(".cms-edit-btn").forEach((btn) => btn.remove());
};

const hasDragFiles = (e) => {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return typeof types.contains === "function"
    ? types.contains("Files")
    : Array.prototype.includes.call(types, "Files");
};

export const initCmsTreeActions = (treePane) => {
  if (cmsAbort) return;

  const treeContainer = treePane.querySelector("#tree-container");
  cmsTreeRef = treeContainer;
  cmsPaneRef = treePane;
  cmsAbort = new AbortController();
  const signal = cmsAbort.signal;

  injectAllCmsActions(treeContainer);

  // Click delegation for CMS actions
  treeContainer.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".cms-edit-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const item = btn.closest(".tree-item");
      const path = item?.dataset.path;
      if (!path) return;

      const action = btn.dataset.action;
      if (action === "upload") showMultiUploadForm(path);
      else if (action === "rename") showRenameForm(path);
      else if (action === "delete") showDeleteConfirm(path);
    },
    { signal }
  );

  // Observer for expanded directories
  cmsObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains("tree-item")) injectCmsActions(node);
        node.querySelectorAll?.(".tree-item").forEach(injectCmsActions);
      }
    }
  });
  cmsObserver.observe(treeContainer, { childList: true, subtree: true });

  // --- Drag-and-drop ---
  cmsPaneRef.addEventListener(
    "dragenter",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
    },
    { signal }
  );

  cmsPaneRef.addEventListener(
    "dragover",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      cmsPaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
        el.classList.remove("cms-drop-target")
      );

      const folder = e.target.closest(".tree-item-folder");
      if (folder) {
        folder.classList.add("cms-drop-target");
      } else if (treeContainer.contains(e.target) || e.target === treeContainer) {
        treeContainer.classList.add("cms-drop-target");
      }
    },
    { signal }
  );

  cmsPaneRef.addEventListener(
    "dragleave",
    (e) => {
      if (!cmsPaneRef.contains(e.relatedTarget)) {
        cmsPaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
          el.classList.remove("cms-drop-target")
        );
        treeContainer.classList.remove("cms-drop-target");
      }
    },
    { signal }
  );

  cmsPaneRef.addEventListener(
    "drop",
    (e) => {
      if (!getUser() || !hasDragFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();

      cmsPaneRef.querySelectorAll(".cms-drop-target").forEach((el) =>
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
  if (cmsAbort) {
    cmsAbort.abort();
    cmsAbort = null;
  }

  if (cmsObserver) {
    cmsObserver.disconnect();
    cmsObserver = null;
  }

  if (cmsTreeRef) {
    removeAllCmsActions(cmsTreeRef);
    cmsTreeRef.classList.remove("cms-drop-target");
    cmsTreeRef = null;
  }

  cmsPaneRef = null;
};
