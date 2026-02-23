import { THROTTLE_MS, PASSIVE_LOAD_DELAY } from "./config.js";
import { resolveContentUrl } from "./url.js";
import { fetchAndCache } from "./cache.js";

let assetQueue = [];
let isProcessingQueue = false;
const queuedPaths = new Set();

const collectAllAssets = (nodes) => {
  const assets = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === "file") {
      assets.push(node);
    } else if (node.children) {
      stack.push(...node.children);
    }
  }
  return assets;
};

const shouldPassiveLoad = () => {
  if ("connection" in navigator) {
    const conn = navigator.connection;
    if (conn.saveData) return false;
    if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g") return false;
  }
  return true;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleProcessing = () => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(processNextAsset);
  } else {
    setTimeout(processNextAsset, 200);
  }
};

const processNextAsset = async () => {
  if (assetQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;

  const node = assetQueue.shift();
  const url = resolveContentUrl(node.path);
  try {
    const wasCached = await fetchAndCache(url);
    if (!wasCached) {
      await delay(THROTTLE_MS);
    }
  } catch (err) {
    console.warn("Passive load failed for", url, err);
  }

  if (assetQueue.length > 0) {
    scheduleProcessing();
  } else {
    isProcessingQueue = false;
  }
};

export const queuePriorityAssets = (directoryNode) => {
  if (!shouldPassiveLoad()) return;

  const nearby = collectAllAssets(directoryNode.children || []);
  const newAssets = nearby.filter((n) => !queuedPaths.has(n.path));
  for (const n of newAssets) queuedPaths.add(n.path);
  assetQueue.unshift(...newAssets);

  if (!isProcessingQueue) scheduleProcessing();
};

export const startPassiveLoading = (manifestChildren) => {
  if (!shouldPassiveLoad()) return;

  const allAssets = collectAllAssets(manifestChildren);
  for (const n of allAssets) queuedPaths.add(n.path);
  assetQueue.push(...allAssets);

  setTimeout(() => {
    if (!isProcessingQueue && assetQueue.length > 0) scheduleProcessing();
  }, PASSIVE_LOAD_DELAY);
};
