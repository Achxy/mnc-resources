import type { ManifestNode } from "@mnc/shared";
import { fetchAndCache } from "./cache";
import { PASSIVE_LOAD_DELAY, THROTTLE_MS } from "./config";
import { resolveContentUrl } from "./url";

const collectAllAssets = (nodes: ManifestNode[]): ManifestNode[] => {
	const assets: ManifestNode[] = [];
	const stack = [...nodes];
	while (stack.length) {
		const node = stack.pop();
		if (!node) continue;
		if (node.type === "file") {
			assets.push(node);
		} else if (node.children) {
			stack.push(...node.children);
		}
	}
	return assets;
};

const shouldPassiveLoad = (): boolean => {
	if ("connection" in navigator) {
		const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
			.connection;
		if (conn?.saveData) return false;
		if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return false;
	}
	return true;
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class PassiveLoader {
	private queue: ManifestNode[] = [];
	private processing = false;
	private queuedPaths = new Set<string>();

	private scheduleProcessing() {
		if ("requestIdleCallback" in window) {
			requestIdleCallback(() => this.processNext());
		} else {
			setTimeout(() => this.processNext(), 200);
		}
	}

	private async processNext() {
		if (this.queue.length === 0) {
			this.processing = false;
			return;
		}
		this.processing = true;

		const node = this.queue.shift();
		if (!node) return;

		const url = resolveContentUrl(node.path);
		try {
			const wasCached = await fetchAndCache(url);
			if (!wasCached) {
				await delay(THROTTLE_MS);
			}
		} catch (err) {
			console.warn("Passive load failed for", url, err);
		}

		if (this.queue.length > 0) {
			this.scheduleProcessing();
		} else {
			this.processing = false;
		}
	}

	queuePriority(children: ManifestNode[]) {
		if (!shouldPassiveLoad()) return;

		const nearby = collectAllAssets(children);
		const newAssets = nearby.filter((n) => !this.queuedPaths.has(n.path));
		for (const n of newAssets) this.queuedPaths.add(n.path);
		this.queue.unshift(...newAssets);

		if (!this.processing) this.scheduleProcessing();
	}

	start(manifestChildren: ManifestNode[]) {
		if (!shouldPassiveLoad()) return;

		const allAssets = collectAllAssets(manifestChildren);
		for (const n of allAssets) this.queuedPaths.add(n.path);
		this.queue.push(...allAssets);

		setTimeout(() => {
			if (!this.processing && this.queue.length > 0) this.scheduleProcessing();
		}, PASSIVE_LOAD_DELAY);
	}
}
