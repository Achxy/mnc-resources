import type { ManifestNode } from "@mnc/shared";
import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { fetchAndCache } from "../../lib/cache";
import { CACHE_NAME, IMAGE_EXTENSIONS } from "../../lib/config";
import { buildFolderTreeLines } from "../../lib/tree-utils";
import { resolveContentUrl } from "../../lib/url";
import s from "../../styles/preview.module.css";

type PreviewPaneProps = {
	node: ManifestNode | null;
};

type FetchResult = {
	blob: Blob;
	fromCache: boolean;
	duration: number;
};

const fetchResource = async (url: string): Promise<FetchResult | null> => {
	const start = performance.now();
	const wasCached = await fetchAndCache(url);
	const cache = await caches.open(CACHE_NAME);
	const response = await cache.match(url);
	if (!response) return null;

	const blob = await response.blob();
	return { blob, fromCache: wasCached, duration: Math.round(performance.now() - start) };
};

export const PreviewPane = (props: PreviewPaneProps) => {
	const [blobUrl, setBlobUrl] = createSignal<string | null>(null);
	const [status, setStatus] = createSignal("");
	const [previewType, setPreviewType] = createSignal<
		"none" | "pdf" | "image" | "directory" | "unsupported"
	>("none");
	const [directoryText, setDirectoryText] = createSignal("");

	createEffect(() => {
		const node = props.node;
		if (!node) {
			setPreviewType("none");
			setStatus("");
			return;
		}

		// Revoke old blob
		const oldUrl = blobUrl();
		if (oldUrl) URL.revokeObjectURL(oldUrl);
		setBlobUrl(null);

		if (node.type === "directory") {
			const lines = [node.name, ...buildFolderTreeLines(node, "")];
			setDirectoryText(lines.join("\n"));
			setPreviewType("directory");
			setStatus("");
			return;
		}

		if (node.type === "file") {
			const ext = node.extension || "";
			const contentUrl = resolveContentUrl(node.path);
			let cancelled = false;

			setStatus("Loading\u2026");
			setPreviewType("none");

			fetchResource(contentUrl).then((result) => {
				if (cancelled) return;

				if (!result) {
					setStatus("Failed to load preview.");
					setPreviewType("unsupported");
					return;
				}

				const { blob, fromCache, duration } = result;
				const url = URL.createObjectURL(blob);
				setBlobUrl(url);

				const source = fromCache ? "cache" : "network";
				setStatus(`Loaded from ${source}. (${duration}ms)`);

				if (ext === "pdf") {
					setPreviewType("pdf");
				} else if (IMAGE_EXTENSIONS.has(ext)) {
					setPreviewType("image");
				} else {
					URL.revokeObjectURL(url);
					setBlobUrl(null);
					setPreviewType("unsupported");
					setStatus("");
				}
			});

			onCleanup(() => {
				cancelled = true;
				const url = blobUrl();
				if (url) URL.revokeObjectURL(url);
			});
		}
	});

	return (
		<>
			<Show when={previewType() === "none"}>
				<div class={s.placeholder}>Hover over an item on the left to preview it.</div>
			</Show>

			<Show when={previewType() === "directory"}>
				<div class={s.content}>
					<pre class={s.treeText}>{directoryText()}</pre>
				</div>
			</Show>

			<Show when={previewType() === "pdf" && blobUrl()}>
				<div class={s.content}>
					<iframe title={props.node?.name || "Preview"} src={blobUrl() as string} />
				</div>
			</Show>

			<Show when={previewType() === "image" && blobUrl()}>
				<div class={s.content}>
					<img alt={props.node?.name || "Preview"} src={blobUrl() as string} />
				</div>
			</Show>

			<Show when={previewType() === "unsupported"}>
				<div class={s.content}>
					<p>No preview available for this item.</p>
				</div>
			</Show>

			<div class={s.status}>{status()}</div>
		</>
	);
};
