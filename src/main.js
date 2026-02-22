import "./styles.css";
import logoUrl from "./assets/mnc-logo.png";

import { registerServiceWorker } from "./sw-register.js";
import { initLayout } from "./layout.js";
import { fetchManifest } from "./manifest.js";
import { initPreview } from "./preview.js";
import { initTree, renderTree } from "./tree.js";
import { setupTreeDelegation } from "./tree-interaction.js";
import { startPassiveLoading } from "./passive-loader.js";
import { showError } from "./error.js";
import { initAuthUI } from "./auth-ui.js";
import { initCmsUI, addCmsContextMenu } from "./cms-ui.js";
import { isAdmin, onAuthChange } from "./auth.js";

const init = async (treeContainer) => {
  document.body.dataset.loading = "true";
  registerServiceWorker();

  try {
    const manifest = await fetchManifest();
    renderTree(manifest.children || []);
    document.body.dataset.loading = "false";
    startPassiveLoading(manifest.children || []);
  } catch (error) {
    console.error("Unable to initialize app", error);
    document.body.dataset.loading = "false";
    showError(treeContainer, "Failed to load resources. Please refresh the page.");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const treeContainer = document.getElementById("tree-container");
  const previewPane = document.getElementById("preview-pane");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const previewStatusEl = document.getElementById("preview-status");
  const resizeNote = document.getElementById("resize-note");
  const siteLogo = document.getElementById("site-logo");
  const siteHeader = document.getElementById("site-header");
  const modalContainer = document.getElementById("modal-container");
  const adminPanel = document.getElementById("admin-panel");

  if (siteLogo) siteLogo.src = logoUrl;

  initLayout(resizeNote);
  initPreview(previewPane, previewPlaceholder, previewStatusEl);
  initTree(treeContainer);
  setupTreeDelegation(treeContainer);

  // Auth and CMS
  initAuthUI(siteHeader, modalContainer);
  initCmsUI(modalContainer);
  addCmsContextMenu(treeContainer);

  // Dynamically load admin UI for admins
  onAuthChange((user) => {
    if (user && isAdmin()) {
      import("./admin-ui.js").then((m) => m.initAdminUI(modalContainer, adminPanel));
      if (adminPanel) adminPanel.hidden = false;
    } else {
      if (adminPanel) adminPanel.hidden = true;
    }
  });

  init(treeContainer);
});
