import { CACHE_NAME } from "./config";
import { isCrossOrigin } from "./url";

const openCache = () => caches.open(CACHE_NAME);

export const fetchAndCache = async (url: string): Promise<boolean> => {
	const cache = await openCache();
	const existing = await cache.match(url);
	if (existing) return true;

	const opts: RequestInit = isCrossOrigin() ? { mode: "cors" } : {};
	const response = await fetch(url, opts);
	if (response.ok) {
		await cache.put(url, response);
	}
	return false;
};
