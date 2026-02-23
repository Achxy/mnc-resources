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
import { setModalContainer } from "./modal.js";
import { initAuthUI } from "./auth-ui.js";
import { addCmsContextMenu } from "./cms-ui.js";
import { onAuthChange } from "./auth.js";
import { initDownloadButtons, initCmsTreeActions, destroyCmsTreeActions } from "./cms-toolbar.js";

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
  const treePane = document.getElementById("tree-pane");
  const previewPane = document.getElementById("preview-pane");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const previewStatusEl = document.getElementById("preview-status");
  const resizeNote = document.getElementById("resize-note");
  const siteLogo = document.getElementById("site-logo");
  const siteHeader = document.getElementById("site-header");
  const modalContainer = document.getElementById("modal-container");

  if (siteLogo) siteLogo.src = logoUrl;

  initLayout(resizeNote);
  initPreview(previewPane, previewPlaceholder, previewStatusEl);
  initTree(treeContainer);
  setupTreeDelegation(treeContainer);

  // Download buttons for all users
  initDownloadButtons(treeContainer);

  // Shared modal container
  setModalContainer(modalContainer);

  // Auth and CMS
  initAuthUI(siteHeader);
  addCmsContextMenu(treeContainer);

  // Tree refresh after publish
  document.addEventListener("cms:manifest-changed", async () => {
    try {
      const manifest = await fetchManifest();
      renderTree(manifest.children || []);
    } catch (err) {
      console.error("Failed to refresh tree after publish", err);
    }
  });

  // Per-item tree actions on auth change
  onAuthChange((user) => {
    if (user) {
      initCmsTreeActions(treePane);
    } else {
      destroyCmsTreeActions();
    }
  });

  init(treeContainer);
});
