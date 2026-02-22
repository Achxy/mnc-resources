import { CACHE_NAME } from "./config.js";
import { isCrossOrigin } from "./url.js";

export const openCache = () => caches.open(CACHE_NAME);

export const checkCached = async (url) => {
  try {
    const cache = await openCache();
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
};

export const fetchAndCache = async (url) => {
  const cache = await openCache();
  const existing = await cache.match(url);
  if (existing) return true;

  const opts = isCrossOrigin() ? { mode: "cors" } : {};
  const response = await fetch(url, opts);
  if (response.ok) {
    await cache.put(url, response);
  }
  return false;
};
