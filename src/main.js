import "./styles.css";
import logoUrl from "./assets/mnc-logo.png";

const treeContainer = document.getElementById("tree-container");
const siteLogo = document.getElementById("site-logo");
if (siteLogo) {
  siteLogo.src = logoUrl;
}
const COURSE_PLAN_KEYWORD = "course plan";

const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
};

const fetchManifest = async () => {
  const response = await fetch("/resources-manifest.json");
  if (!response.ok) {
    throw new Error("Failed to load manifest");
  }
  return response.json();
};

const isPdfFile = (node) => node.type === "file" && node.extension === "pdf";

const prefetchPdfs = (pdfNodes) => {
  pdfNodes.forEach((pdf) => {
    fetch(pdf.path, { method: "GET" }).catch(() => {});
  });
};

const collectNearbyPdfNodes = (directoryNode) => {
  const found = [];
  const children = directoryNode.children || [];
  children.forEach((child) => {
    if (isPdfFile(child)) {
      found.push(child);
    } else if (child.type === "directory" && Array.isArray(child.children)) {
      child.children.forEach((grandChild) => {
        if (isPdfFile(grandChild)) {
          found.push(grandChild);
        }
      });
    }
  });
  return found;
};

const prefetchNearbyPdfs = (directoryNode) => {
  const pdfNodes = collectNearbyPdfNodes(directoryNode);
  if (pdfNodes.length) {
    prefetchPdfs(pdfNodes);
  }
};

const prefetchCoursePlanPdfs = (manifestRoot) => {
  const stack = [...(manifestRoot.children || [])];
  const targets = [];

  while (stack.length) {
    const node = stack.pop();
    if (node.type === "file") {
      if (isPdfFile(node) && node.name.toLowerCase().includes(COURSE_PLAN_KEYWORD)) {
        targets.push(node);
      }
    } else if (node.type === "directory" && Array.isArray(node.children)) {
      stack.push(...node.children);
    }
  }

  if (targets.length) {
    prefetchPdfs(targets);
  }
};

const toggleDirectory = (itemElement, directoryNode) => {
  const isExpanded = itemElement.getAttribute("aria-expanded") === "true";
  const nextExpanded = !isExpanded;
  itemElement.setAttribute("aria-expanded", String(nextExpanded));

  let childList = itemElement.nextElementSibling;
  const isChildList =
    childList && childList.classList.contains("tree-children") && childList.dataset.parentPath === directoryNode.path;

  if (nextExpanded) {
    if (!isChildList) {
      childList = createChildrenList(directoryNode.children || []);
      childList.dataset.parentPath = directoryNode.path;
      itemElement.insertAdjacentElement("afterend", childList);
    } else {
      childList.hidden = false;
    }
    prefetchNearbyPdfs(directoryNode);
  } else if (isChildList && childList) {
    childList.hidden = true;
  }
};

const createDirectoryItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-folder";
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-expanded", "false");
  item.dataset.path = node.path;
  item.tabIndex = 0;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  const handleToggle = () => toggleDirectory(item, node);

  item.addEventListener("click", (event) => {
    event.stopPropagation();
    handleToggle();
  });

  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  });

  item.appendChild(indicator);
  item.appendChild(label);
  return item;
};

const createFileItem = (node) => {
  const item = document.createElement("li");
  item.className = "tree-item tree-item-file";
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-selected", "false");
  item.dataset.path = node.path;

  const indicator = document.createElement("span");
  indicator.className = "tree-toggle-indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.style.visibility = "hidden";

  const link = document.createElement("a");
  link.className = "tree-file-link";
  link.href = node.path;
  link.target = "_blank";
  link.rel = "noopener";

  const label = document.createElement("span");
  label.className = "tree-item-label";
  label.textContent = node.name;

  link.appendChild(label);
  item.appendChild(indicator);
  item.appendChild(link);
  return item;
};

const createChildrenList = (nodes) => {
  const list = document.createElement("ul");
  list.className = "tree-children";
  list.setAttribute("role", "group");

  nodes.forEach((node) => {
    const childItem = node.type === "directory" ? createDirectoryItem(node) : createFileItem(node);
    list.appendChild(childItem);
  });

  return list;
};

const renderTree = (children) => {
  treeContainer.innerHTML = "";
  const rootList = createChildrenList(children);
  treeContainer.appendChild(rootList);
};

const init = async () => {
  registerServiceWorker();
  try {
    const manifest = await fetchManifest();
    renderTree(manifest.children || []);
    prefetchCoursePlanPdfs(manifest);
  } catch (error) {
    console.error("Unable to initialize app", error);
  }
};

document.addEventListener("DOMContentLoaded", init);
