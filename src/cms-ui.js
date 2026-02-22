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

// Upload form
export const showUploadForm = (targetDirectory = "/contents") => {
  if (!getUser()) return;

  const modal = createModal(
    "Upload File",
    `
    <form id="upload-form" class="auth-form">
      <label class="auth-label">
        Target Directory
        <input type="text" name="targetDir" value="${targetDirectory}" required class="auth-input" />
      </label>
      <label class="auth-label">
        File
        <input type="file" name="file" required class="auth-input" />
      </label>
      <p id="upload-error" class="auth-error" hidden></p>
      <p id="upload-success" class="auth-success" hidden></p>
      <button type="submit" class="auth-submit">Submit for Review</button>
    </form>
  `
  );

  modal.querySelector("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#upload-error");
    const successEl = form.querySelector("#upload-success");
    const submitBtn = form.querySelector(".auth-submit");
    const file = form.file.files[0];
    const targetDir = form.targetDir.value.replace(/\/$/, "");

    if (!file) return;

    errorEl.hidden = true;
    successEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetPath", `${targetDir}/${file.name}`);

      const res = await fetch(apiUrl("/api/changes/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      successEl.textContent = "Upload submitted for review!";
      successEl.hidden = false;
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit for Review";
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
        showUploadForm(path);
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
