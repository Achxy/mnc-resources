import { nodesByPath, toggleDirectory } from "./tree.js";
import { showPreviewForNode } from "./preview.js";

let treeContainer;

const getVisibleItems = () =>
  [...treeContainer.querySelectorAll(".tree-item")].filter(
    (el) => !el.closest(".tree-children[hidden]")
  );

export const setupTreeDelegation = (container) => {
  treeContainer = container;

  // Click: toggle folders
  treeContainer.addEventListener("click", (event) => {
    const folder = event.target.closest(".tree-item-folder");
    if (!folder) return;
    if (event.target.closest("a")) return;
    event.stopPropagation();
    const node = nodesByPath.get(folder.dataset.path);
    if (node) toggleDirectory(folder, node);
  });

  // Keyboard: Enter/Space to toggle, arrow keys for roving tabindex
  treeContainer.addEventListener("keydown", (event) => {
    const item = event.target.closest(".tree-item");
    if (!item) return;

    if (event.key === "Enter" || event.key === " ") {
      const folder = item.closest(".tree-item-folder");
      if (folder) {
        event.preventDefault();
        const node = nodesByPath.get(folder.dataset.path);
        if (node) toggleDirectory(folder, node);
      }
    }

    // Arrow navigation (WAI-ARIA Tree pattern)
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const visible = getVisibleItems();
      const idx = visible.indexOf(item);
      const next =
        event.key === "ArrowDown"
          ? Math.min(idx + 1, visible.length - 1)
          : Math.max(idx - 1, 0);
      if (next !== idx && visible[next]) {
        item.tabIndex = -1;
        visible[next].tabIndex = 0;
        visible[next].focus();
      }
    }

    // ArrowRight: expand folder or move to first child
    if (event.key === "ArrowRight" && item.classList.contains("tree-item-folder")) {
      event.preventDefault();
      const expanded = item.getAttribute("aria-expanded") === "true";
      const node = nodesByPath.get(item.dataset.path);
      if (!expanded && node) {
        toggleDirectory(item, node);
      } else {
        const visible = getVisibleItems();
        const idx = visible.indexOf(item);
        if (idx + 1 < visible.length) {
          item.tabIndex = -1;
          visible[idx + 1].tabIndex = 0;
          visible[idx + 1].focus();
        }
      }
    }

    // ArrowLeft: collapse folder or move to parent
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (
        item.classList.contains("tree-item-folder") &&
        item.getAttribute("aria-expanded") === "true"
      ) {
        const node = nodesByPath.get(item.dataset.path);
        if (node) toggleDirectory(item, node);
      } else {
        const parentGroup = item.closest(".tree-children");
        if (parentGroup) {
          const parentItem = parentGroup.previousElementSibling;
          if (parentItem && parentItem.classList.contains("tree-item-folder")) {
            item.tabIndex = -1;
            parentItem.tabIndex = 0;
            parentItem.focus();
          }
        }
      }
    }
  });

  // Mouseover delegation for preview
  let lastHoveredPath = null;
  treeContainer.addEventListener("mouseover", (event) => {
    const item = event.target.closest(".tree-item");
    if (!item || item.dataset.path === lastHoveredPath) return;
    lastHoveredPath = item.dataset.path;
    const node = nodesByPath.get(item.dataset.path);
    if (node) showPreviewForNode(node);
  });

  // Reset hover tracking when mouse leaves the tree (preview stays visible)
  treeContainer.addEventListener("mouseleave", () => {
    lastHoveredPath = null;
  });
};
