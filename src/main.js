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

  if (siteLogo) siteLogo.src = logoUrl;

  initLayout(resizeNote);
  initPreview(previewPane, previewPlaceholder, previewStatusEl);
  initTree(treeContainer);
  setupTreeDelegation(treeContainer);
  init(treeContainer);
});
