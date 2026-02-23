import { isAdmin } from "./auth.js";
import { CMS_API_URL } from "./config.js";

const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
};

const apiUrl = (path) => `${CMS_API_URL || ""}${path}`;

const apiFetch = (path, opts = {}) =>
  fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

let modalContainer;

export const initAdminUI = (modalContainerEl) => {
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

export const showAdminPanel = async () => {
  if (!isAdmin()) return;

  const modal = createModal(
    "Admin Panel",
    `
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="queue">Review Queue</button>
      <button class="admin-tab" data-tab="audit">Audit Log</button>
    </div>
    <div id="admin-tab-content">
      <p class="loading-text">Loading...</p>
    </div>
  `
  );

  modal.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      modal.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      if (tab.dataset.tab === "queue") loadQueue(modal);
      else loadAuditLog(modal);
    });
  });

  await loadQueue(modal);
};

const loadQueue = async (modal) => {
  const content = modal.querySelector("#admin-tab-content");
  content.innerHTML = '<p class="loading-text">Loading...</p>';

  try {
    const res = await apiFetch("/api/admin/queue");
    if (!res.ok) throw new Error("Failed to load queue");
    const { queue } = await res.json();

    if (!queue.length) {
      content.innerHTML = '<p class="empty-text">No pending requests.</p>';
      return;
    }

    content.innerHTML = `
      <div class="queue-list">
        ${queue
          .map(
            (cr) => `
          <div class="queue-item" data-id="${esc(cr.id)}">
            <div class="queue-item-header">
              <span class="submission-type">${esc(cr.type)}</span>
              <span class="queue-user">${esc(cr.user_name || cr.user_email)}</span>
            </div>
            <p class="submission-path">${esc(cr.target_path)}</p>
            ${cr.source_path ? `<p class="submission-path">from: ${esc(cr.source_path)}</p>` : ""}
            ${cr.original_filename ? `<p class="submission-filename">${esc(cr.original_filename)} (${formatSize(cr.file_size)})</p>` : ""}
            <p class="submission-date">${new Date(cr.created_at).toLocaleDateString()}</p>
            <div class="queue-actions">
              <button class="queue-approve" data-id="${cr.id}">Approve</button>
              <button class="queue-reject" data-id="${cr.id}">Reject</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    content.querySelectorAll(".queue-approve").forEach((btn) => {
      btn.addEventListener("click", () => reviewAction(btn.dataset.id, "approve", modal));
    });
    content.querySelectorAll(".queue-reject").forEach((btn) => {
      btn.addEventListener("click", () => reviewAction(btn.dataset.id, "reject", modal));
    });
  } catch (err) {
    content.innerHTML = `<p class="auth-error">${err.message}</p>`;
  }
};

const reviewAction = async (id, action, modal) => {
  const note = action === "reject" ? prompt("Rejection reason (optional):") : null;

  try {
    const res = await apiFetch(`/api/admin/review/${id}`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) throw new Error(`${action} failed`);

    const result = await res.json();

    if (result.status === "approved") {
      if (confirm("Approved. Publish now?")) {
        await publishChange(id);
      }
    }

    await loadQueue(modal);
  } catch (err) {
    alert(err.message);
  }
};

const publishChange = async (id) => {
  try {
    const res = await apiFetch(`/api/admin/publish/${id}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Publish failed");

    // Dispatch event so tree refreshes automatically
    document.dispatchEvent(new CustomEvent("cms:manifest-changed"));
  } catch (err) {
    alert(err.message);
  }
};

const loadAuditLog = async (modal) => {
  const content = modal.querySelector("#admin-tab-content");
  content.innerHTML = '<p class="loading-text">Loading...</p>';

  try {
    const res = await apiFetch("/api/admin/audit");
    if (!res.ok) throw new Error("Failed to load audit log");
    const { audit } = await res.json();

    if (!audit.length) {
      content.innerHTML = '<p class="empty-text">No audit entries.</p>';
      return;
    }

    content.innerHTML = `
      <div class="audit-list">
        ${audit
          .map(
            (entry) => `
          <div class="audit-item">
            <span class="audit-action">${esc(entry.action)}</span>
            <span class="audit-user">${esc(entry.user_name || entry.user_id)}</span>
            <span class="audit-target">${esc(entry.target_type)}:${esc(entry.target_id?.slice(0, 8) || "")}</span>
            <span class="audit-date">${new Date(entry.created_at).toLocaleDateString()}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p class="auth-error">${err.message}</p>`;
  }
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
