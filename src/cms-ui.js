import { getUser, isAdmin } from "./auth.js";
import { CMS_API_URL } from "./config.js";

const apiUrl = (path) => `${CMS_API_URL || ""}${path}`;

const apiFetch = (path, opts = {}) =>
  fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

let modalContainer;

export const initCmsUI = (modalContainerEl) => {
  modalContainer = modalContainerEl;
};

const createModal = (title, contentHTML) => {
  modalContainer.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">${contentHTML}</div>
  `;
  modal.querySelector(".modal-close").addEventListener("click", closeModal);

  overlay.appendChild(modal);
  modalContainer.appendChild(overlay);
  modalContainer.hidden = false;
  return modal;
};

const closeModal = () => {
  modalContainer.innerHTML = "";
  modalContainer.hidden = true;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Multi-file upload modal
export const showMultiUploadForm = (targetDirectory = "/contents", preloadedFiles = []) => {
  if (!getUser()) return;

  const modal = createModal(
    "Upload Files",
    `
    <form id="upload-form" class="auth-form">
      <label class="auth-label">
        Target Directory
        <input type="text" name="targetDir" value="${targetDirectory}" required class="auth-input" />
      </label>
      <div class="upload-file-list" id="upload-file-list"></div>
      <div class="upload-add-area" id="upload-add-area">
        <button type="button" class="upload-add-btn" id="upload-add-btn">+ Add files</button>
        <input type="file" multiple hidden id="upload-file-input" />
      </div>
      <p id="upload-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit" id="upload-submit" disabled>Select files to upload</button>
    </form>
  `
  );

  const fileList = modal.querySelector("#upload-file-list");
  const fileInput = modal.querySelector("#upload-file-input");
  const addBtn = modal.querySelector("#upload-add-btn");
  const submitBtn = modal.querySelector("#upload-submit");
  const errorEl = modal.querySelector("#upload-error");

  // Track files with unique IDs
  let files = [];
  let nextId = 0;

  const updateSubmitBtn = () => {
    const count = files.length;
    if (count === 0) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Select files to upload";
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = `Submit for Review (${count} file${count > 1 ? "s" : ""})`;
    }
  };

  const renderFileList = () => {
    fileList.innerHTML = "";
    files.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "upload-file-item";
      item.dataset.fileId = entry.id;
      item.innerHTML = `
        <div class="upload-file-info">
          <span class="upload-file-name">${entry.file.name}</span>
          <span class="upload-file-size">${formatFileSize(entry.file.size)}</span>
        </div>
        <div class="upload-file-progress" hidden>
          <div class="upload-file-progress-bar"></div>
        </div>
        <button type="button" class="upload-file-remove" aria-label="Remove">&times;</button>
      `;
      item.querySelector(".upload-file-remove").addEventListener("click", () => {
        files = files.filter((f) => f.id !== entry.id);
        renderFileList();
        updateSubmitBtn();
      });
      fileList.appendChild(item);
    });
  };

  const addFiles = (newFiles) => {
    for (const file of newFiles) {
      files.push({ id: nextId++, file });
    }
    renderFileList();
    updateSubmitBtn();
  };

  addBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = "";
  });

  // Pre-load files from drag-and-drop
  if (preloadedFiles.length) addFiles(preloadedFiles);

  // Submit handler
  modal.querySelector("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!files.length) return;

    const targetDir = modal.querySelector('[name="targetDir"]').value.replace(/\/$/, "");
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";

    // Disable remove buttons and add btn during upload
    fileList.querySelectorAll(".upload-file-remove").forEach((btn) => (btn.disabled = true));
    addBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    const uploadFile = (entry) =>
      new Promise((resolve) => {
        const item = fileList.querySelector(`[data-file-id="${entry.id}"]`);
        const progressWrap = item?.querySelector(".upload-file-progress");
        const progressBar = item?.querySelector(".upload-file-progress-bar");
        if (progressWrap) progressWrap.hidden = false;

        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl("/api/changes/upload"));
        xhr.withCredentials = true;

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable && progressBar) {
            progressBar.style.width = `${Math.round((ev.loaded / ev.total) * 100)}%`;
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            successCount++;
            if (item) item.classList.add("upload-success");
          } else {
            failCount++;
            if (item) item.classList.add("upload-failed");
          }
          resolve();
        });

        xhr.addEventListener("error", () => {
          failCount++;
          if (item) item.classList.add("upload-failed");
          resolve();
        });

        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("targetPath", `${targetDir}/${entry.file.name}`);
        xhr.send(formData);
      });

    // Upload sequentially to avoid overwhelming the server
    for (const entry of files) {
      await uploadFile(entry);
    }

    // Summary
    if (failCount > 0) {
      errorEl.textContent = `${failCount} upload(s) failed. ${successCount} succeeded.`;
      errorEl.hidden = false;
    }

    submitBtn.textContent =
      failCount > 0
        ? `Done (${successCount} ok, ${failCount} failed)`
        : `Done (${successCount} uploaded)`;

    // Refresh toolbar badges if available
    if (typeof window.__refreshToolbarBadges === "function") {
      window.__refreshToolbarBadges();
    }
  });
};

// Show user's submissions
export const showSubmissions = async () => {
  if (!getUser()) return;

  const modal = createModal("My Submissions", '<p class="loading-text">Loading...</p>');

  try {
    const res = await apiFetch("/api/changes");
    if (!res.ok) throw new Error("Failed to load submissions");
    const { changes } = await res.json();

    const body = modal.querySelector(".modal-body");
    if (!changes.length) {
      body.innerHTML = '<p class="empty-text">No submissions yet.</p>';
      return;
    }

    const statusClass = (s) =>
      ({ pending: "status-pending", approved: "status-approved", rejected: "status-rejected", published: "status-published" })[s] || "";

    body.innerHTML = `
      <div class="submissions-list">
        ${changes
          .map(
            (cr) => `
          <div class="submission-item">
            <div class="submission-header">
              <span class="submission-type">${cr.type}</span>
              <span class="submission-status ${statusClass(cr.status)}">${cr.status}</span>
            </div>
            <p class="submission-path">${cr.target_path}</p>
            ${cr.original_filename ? `<p class="submission-filename">${cr.original_filename}</p>` : ""}
            ${cr.review_note ? `<p class="submission-note">Note: ${cr.review_note}</p>` : ""}
            <p class="submission-date">${new Date(cr.created_at).toLocaleDateString()}</p>
            ${
              cr.status === "pending"
                ? `<button class="submission-cancel" data-id="${cr.id}">Cancel</button>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    `;

    body.querySelectorAll(".submission-cancel").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          const res = await apiFetch(`/api/changes/${btn.dataset.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Cancel failed");
          showSubmissions(); // Refresh
        } catch {
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    modal.querySelector(".modal-body").innerHTML = `<p class="auth-error">${err.message}</p>`;
  }
};

// Context menu for rename/delete on tree items
export const addCmsContextMenu = (treeContainer) => {
  treeContainer.addEventListener("contextmenu", (e) => {
    if (!getUser()) return;

    const treeItem = e.target.closest(".tree-item");
    if (!treeItem) return;

    const path = treeItem.dataset.path;
    if (!path) return;

    e.preventDefault();

    // Remove any existing context menu
    document.querySelectorAll(".cms-context-menu").forEach((el) => el.remove());

    const menu = document.createElement("div");
    menu.className = "cms-context-menu";
    menu.innerHTML = `
      ${treeItem.classList.contains("tree-item-folder") ? `<button class="cms-ctx-item" data-action="upload">Upload here</button>` : ""}
      <button class="cms-ctx-item" data-action="rename">Rename</button>
      <button class="cms-ctx-item cms-ctx-danger" data-action="delete">Delete</button>
    `;
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.addEventListener("click", (ev) => {
      const action = ev.target.dataset.action;
      menu.remove();

      if (action === "upload") {
        showMultiUploadForm(path);
      } else if (action === "rename") {
        showRenameForm(path);
      } else if (action === "delete") {
        showDeleteConfirm(path);
      }
    });

    document.body.appendChild(menu);

    const dismiss = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener("click", dismiss);
      }
    };
    setTimeout(() => document.addEventListener("click", dismiss), 0);
  });
};

const showRenameForm = (sourcePath) => {
  const modal = createModal(
    "Rename",
    `
    <form id="rename-form" class="auth-form">
      <label class="auth-label">
        Current Path
        <input type="text" value="${sourcePath}" disabled class="auth-input" />
      </label>
      <label class="auth-label">
        New Path
        <input type="text" name="targetPath" value="${sourcePath}" required class="auth-input" />
      </label>
      <p id="rename-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Submit Rename</button>
    </form>
  `
  );

  modal.querySelector("#rename-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#rename-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      const res = await apiFetch("/api/changes/rename", {
        method: "POST",
        body: JSON.stringify({
          sourcePath,
          targetPath: form.targetPath.value,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Rename failed");
      }
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
};

const showDeleteConfirm = (targetPath) => {
  const modal = createModal(
    "Delete",
    `
    <div class="auth-form">
      <p>Request deletion of:</p>
      <p><strong>${targetPath}</strong></p>
      <p id="delete-error" class="auth-error" hidden></p>
      <div class="modal-actions">
        <button class="auth-submit cms-ctx-danger" id="confirm-delete">Request Deletion</button>
        <button class="auth-submit" id="cancel-delete">Cancel</button>
      </div>
    </div>
  `
  );

  modal.querySelector("#cancel-delete").addEventListener("click", closeModal);
  modal.querySelector("#confirm-delete").addEventListener("click", async () => {
    const errorEl = modal.querySelector("#delete-error");
    const btn = modal.querySelector("#confirm-delete");
    btn.disabled = true;

    try {
      const res = await apiFetch("/api/changes/delete", {
        method: "POST",
        body: JSON.stringify({ targetPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete request failed");
      }
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      btn.disabled = false;
    }
  });
};
