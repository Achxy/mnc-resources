export const showError = (treeContainer, message) => {
  treeContainer.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = message;
  treeContainer.appendChild(p);
};
