import { resolveContentUrl } from "./url.js";
import { queuePriorityAssets } from "./passive-loader.js";

// Node lookup for event delegation
export const nodesByPath = new Map();

let treeContainer;

export const initTree = (container) => {
  treeContainer = container;
};

const applyTreeStriping = () => {
  if (!treeContainer) return;
  const items = treeContainer.querySelectorAll(".tree-item");
  let visibleIndex = 0;

  items.forEach((item) => {
    item.classList.remove("striped-odd", "striped-even");
    if (item.closest(".tree-children[hidden]")) return;
    item.classList.add(visibleIndex % 2 === 0 ? "striped-odd" : "striped-even");
    visibleIndex += 1;
  });
};

const createChildrenList = (nodes) => {
  const list = document.createElement("ul");
  list.className = "tree-children";
  list.setAttribute("role", "group");

  nodes.forEach((node) => {
    list.appendChild(
      node.type === "directory" ? createDirectoryItem(node) : createFileItem(node)
    );
  });

  return list;
};

export const toggleDirectory = (itemElement, directoryNode) => {
  const isExpanded = itemElement.getAttribute("aria-expanded") === "true";
  const nextExpanded = !isExpanded;
  itemElement.setAttribute("aria-expanded", String(nextExpanded));

  let childList = itemElement.nextElementSibling;
  const isChildList =
    childList &&
    childList.classList.contains("tree-children") &&
    childList.dataset.parentPath === directoryNode.path;

  if (nextExpanded) {
    if (!isChildList) {
      childList = createChildrenList(directoryNode.children || []);
      childList.dataset.parentPath = directoryNode.path;
      itemElement.insertAdjacentElement("afterend", childList);
    } else {
      childList.hidden = false;
    }
    queuePriorityAssets(directoryNode);
  } else if (isChildList && childList) {
    childList.hidden = true;
  }

  applyTreeStriping();
};

const createDirectoryItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-folder";
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-expanded", "false");
  item.dataset.path = node.path;
  item.tabIndex = -1;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  nodesByPath.set(node.path, node);

  item.appendChild(indicator);
  item.appendChild(label);
  return item;
};

const createFileItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-file";
  item.setAttribute("role", "treeitem");
  item.dataset.path = node.path;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const link = document.createElement("a");
  link.className = "tree-file-link";
  link.href = resolveContentUrl(node.path);
  link.target = "_blank";
  link.rel = "noopener";

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  nodesByPath.set(node.path, node);

  link.appendChild(label);
  item.appendChild(indicator);
  item.appendChild(link);
  return item;
};

export const renderTree = (children) => {
  if (!treeContainer) return;
  nodesByPath.clear();
  treeContainer.innerHTML = "";
  const rootList = createChildrenList(children);
  treeContainer.appendChild(rootList);

  // Roving tabindex: only the first item is in the tab order
  const firstItem = treeContainer.querySelector(".tree-item");
  if (firstItem) firstItem.tabIndex = 0;

  applyTreeStriping();
};
