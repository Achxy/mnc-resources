import { CACHE_NAME } from "./config.js";
import { isCrossOrigin } from "./url.js";

const openCache = () => caches.open(CACHE_NAME);

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
