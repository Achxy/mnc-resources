import { MIN_FULL_WIDTH } from "./config.js";

let resizeNote;
let resizeTimer;

const updateLayout = () => {
  const isNarrow = window.innerWidth < MIN_FULL_WIDTH;
  document.body.dataset.layout = isNarrow ? "tree-only" : "full";
  if (resizeNote) resizeNote.hidden = !isNarrow;
};

const onResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateLayout, 100);
};

export const initLayout = (resizeNoteEl) => {
  resizeNote = resizeNoteEl;
  updateLayout();
  window.addEventListener("resize", onResize);
};
