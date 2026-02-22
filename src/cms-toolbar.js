import { getUser, isAdmin } from "./auth.js";
import { CMS_API_URL } from "./config.js";
import { showMultiUploadForm, showSubmissions } from "./cms-ui.js";

const apiUrl = (path) => `${CMS_API_URL || ""}${path}`;

let toolbar = null;
let dragAbort = null;
let folderObserver = null;
let treeContainerRef = null;

// Fetch badge counts from API
const fetchCounts = async () => {
  const counts = { submissions: 0, queue: 0 };
  try {
    const res = await fetch(apiUrl("/api/changes/count?status=pending"), {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      counts.submissions = data.count;
    }
  } catch { /* ignore */ }

  if (isAdmin()) {
    try {
      const res = await fetch(apiUrl("/api/admin/queue/count"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        counts.queue = data.count;
      }
    } catch { /* ignore */ }
  }
  return counts;
};

export const refreshToolbarBadges = async () => {
  if (!toolbar) return;
  const counts = await fetchCounts();

  const subBadge = toolbar.querySelector("#cms-badge-submissions");
  if (subBadge) {
    subBadge.textContent = counts.submissions;
    subBadge.hidden = counts.submissions === 0;
  }

  const queueBadge = toolbar.querySelector("#cms-badge-queue");
  if (queueBadge) {
    queueBadge.textContent = counts.queue;
    queueBadge.hidden = counts.queue === 0;
  }
};

// Make available globally for cms-ui.js upload callback
window.__refreshToolbarBadges = refreshToolbarBadges;

// Get the selected folder path from the tree, or fall back to root
const getSelectedFolderPath = () => {
  if (!treeContainerRef) return "/contents";
  const expanded = treeContainerRef.querySelector('.tree-item-folder[aria-expanded="true"]');
  return expanded?.dataset.path || "/contents";
};

// Inject "+" button into a single folder element
const injectButtonIntoFolder = (folderEl) => {
  if (folderEl.querySelector(".cms-folder-upload-btn")) return;
  const btn = document.createElement("button");
  btn.className = "cms-folder-upload-btn";
  btn.setAttribute("aria-label", "Upload to this folder");
  btn.textContent = "+";
  folderEl.appendChild(btn);
};

// Inject buttons into all folders in container
const injectFolderUploadButtons = (container) => {
  container.querySelectorAll(".tree-item-folder").forEach(injectButtonIntoFolder);
};

// Remove all injected folder buttons
const removeFolderUploadButtons = (container) => {
  container.querySelectorAll(".cms-folder-upload-btn").forEach((btn) => btn.remove());
};

export const initCmsToolbar = (treePane, modalContainer, adminPanel) => {
  if (toolbar) return; // Already initialized

  const treeContainer = treePane.querySelector("#tree-container");
  treeContainerRef = treeContainer;

  // Create toolbar
  toolbar = document.createElement("div");
  toolbar.className = "cms-toolbar";
  toolbar.innerHTML = `
    <button class="cms-toolbar-btn cms-toolbar-upload" id="cms-btn-upload">Upload</button>
    <button class="cms-toolbar-btn" id="cms-btn-submissions">
      My Submissions
      <span class="cms-toolbar-badge" id="cms-badge-submissions" hidden>0</span>
    </button>
    ${
      isAdmin()
        ? `<button class="cms-toolbar-btn" id="cms-btn-queue">
            Review Queue
            <span class="cms-toolbar-badge" id="cms-badge-queue" hidden>0</span>
          </button>`
        : ""
    }
  `;

  treePane.insertBefore(toolbar, treePane.firstChild);

  // Toolbar button handlers
  toolbar.querySelector("#cms-btn-upload").addEventListener("click", () => {
    showMultiUploadForm(getSelectedFolderPath());
  });

  toolbar.querySelector("#cms-btn-submissions").addEventListener("click", () => {
    showSubmissions();
  });

  const queueBtn = toolbar.querySelector("#cms-btn-queue");
  if (queueBtn && adminPanel) {
    queueBtn.addEventListener("click", () => {
      adminPanel.hidden = !adminPanel.hidden;
      if (!adminPanel.hidden) {
        // Trigger render if admin-ui is loaded
        document.dispatchEvent(new CustomEvent("cms:toggle-admin-panel"));
      }
    });
  }

  // Fetch initial badge counts
  refreshToolbarBadges();

  // --- Drag-and-drop ---
  dragAbort = new AbortController();
  const signal = dragAbort.signal;

  const isDragFiles = (e) => e.dataTransfer?.types?.includes("Files");

  treeContainer.addEventListener(
    "dragenter",
    (e) => {
      if (!getUser() || !isDragFiles(e)) return;
      e.preventDefault();
    },
    { signal }
  );

  treeContainer.addEventListener(
    "dragover",
    (e) => {
      if (!getUser() || !isDragFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      // Visual feedback on closest folder
      treeContainer.querySelectorAll(".cms-drop-target").forEach((el) =>
        el.classList.remove("cms-drop-target")
      );
      const folder = e.target.closest(".tree-item-folder");
      if (folder) {
        folder.classList.add("cms-drop-target");
      } else {
        treeContainer.classList.add("cms-drop-target");
      }
    },
    { signal }
  );

  treeContainer.addEventListener(
    "dragleave",
    (e) => {
      // Only remove when leaving treeContainer entirely
      if (!treeContainer.contains(e.relatedTarget)) {
        treeContainer.querySelectorAll(".cms-drop-target").forEach((el) =>
          el.classList.remove("cms-drop-target")
        );
        treeContainer.classList.remove("cms-drop-target");
      }
    },
    { signal }
  );

  treeContainer.addEventListener(
    "drop",
    (e) => {
      if (!getUser() || !isDragFiles(e)) return;
      e.preventDefault();

      treeContainer.querySelectorAll(".cms-drop-target").forEach((el) =>
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

  // --- Per-folder upload buttons ---
  injectFolderUploadButtons(treeContainer);

  // Event delegation for folder upload button clicks
  treeContainer.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".cms-folder-upload-btn");
      if (!btn) return;
      e.stopPropagation();
      const folder = btn.closest(".tree-item-folder");
      if (folder?.dataset.path) {
        showMultiUploadForm(folder.dataset.path);
      }
    },
    { signal }
  );

  // MutationObserver to inject buttons into new folder elements
  folderObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains("tree-item-folder")) {
          injectButtonIntoFolder(node);
        }
        // Also check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll(".tree-item-folder").forEach(injectButtonIntoFolder);
        }
      }
    }
  });
  folderObserver.observe(treeContainer, { childList: true, subtree: true });
};

export const destroyCmsToolbar = () => {
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
  }

  if (dragAbort) {
    dragAbort.abort();
    dragAbort = null;
  }

  if (folderObserver) {
    folderObserver.disconnect();
    folderObserver = null;
  }

  if (treeContainerRef) {
    removeFolderUploadButtons(treeContainerRef);
    treeContainerRef.classList.remove("cms-drop-target");
    treeContainerRef = null;
  }

  window.__refreshToolbarBadges = () => {};
};
