import type { ManifestDirectory, ManifestNode } from "@mnc/shared";
import { For, createSignal } from "solid-js";
import s from "../../styles/tree.module.css";
import { TreeDirectoryItem } from "./TreeDirectoryItem";
import { TreeFileItem } from "./TreeFileItem";

type TreeContainerProps = {
	children: ManifestNode[];
	onHover: (node: ManifestNode) => void;
	onToggleDirectory: (node: ManifestDirectory) => void;
};

export const TreeContainer = (props: TreeContainerProps) => {
	let containerRef!: HTMLDivElement;
	const [lastHoveredPath, setLastHoveredPath] = createSignal<string | null>(null);

	const handleKeyDown = (e: KeyboardEvent) => {
		const item = (e.target as HTMLElement).closest("[role='treeitem']") as HTMLElement | null;
		if (!item) return;

		const getVisibleItems = () =>
			[...containerRef.querySelectorAll<HTMLElement>("[role='treeitem']")].filter(
				(el) => !el.closest("[data-hidden='true']"),
			);

		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			const visible = getVisibleItems();
			const idx = visible.indexOf(item);
			const next =
				e.key === "ArrowDown" ? Math.min(idx + 1, visible.length - 1) : Math.max(idx - 1, 0);
			if (next !== idx && visible[next]) {
				item.tabIndex = -1;
				visible[next].tabIndex = 0;
				visible[next].focus();
			}
		}

		if (e.key === "ArrowRight" && item.dataset.isFolder === "true") {
			e.preventDefault();
			const expanded = item.getAttribute("aria-expanded") === "true";
			if (!expanded) {
				item.click();
			} else {
				const visible = getVisibleItems();
				const idx = visible.indexOf(item);
				if (idx + 1 < visible.length) {
					item.tabIndex = -1;
					visible[idx + 1].tabIndex = 0;
					visible[idx + 1].focus();
				}
			}
		}

		if (e.key === "ArrowLeft") {
			e.preventDefault();
			if (item.dataset.isFolder === "true" && item.getAttribute("aria-expanded") === "true") {
				item.click();
			} else {
				const parent = item.closest("[role='group']");
				if (parent) {
					const parentItem = parent.previousElementSibling as HTMLElement | null;
					if (parentItem?.getAttribute("role") === "treeitem") {
						item.tabIndex = -1;
						parentItem.tabIndex = 0;
						parentItem.focus();
					}
				}
			}
		}

		if (e.key === "Enter" || e.key === " ") {
			if (item.dataset.isFolder === "true") {
				e.preventDefault();
				item.click();
			}
		}
	};

	const handleMouseOver = (e: MouseEvent) => {
		const item = (e.target as HTMLElement).closest("[role='treeitem']") as HTMLElement | null;
		if (!item) return;
		const path = item.dataset.path;
		if (!path || path === lastHoveredPath()) return;
		setLastHoveredPath(path);
		const nodeData = item.dataset.nodeJson;
		if (nodeData) {
			props.onHover(JSON.parse(nodeData));
		}
	};

	const handleMouseLeave = () => {
		setLastHoveredPath(null);
	};

	return (
		<div
			ref={containerRef}
			class={s.treeContainer}
			role="tree"
			aria-label="Contents tree"
			onKeyDown={handleKeyDown}
			onMouseOver={handleMouseOver}
			onMouseLeave={handleMouseLeave}
			onFocus={() => {}}
		>
			<TreeNodeList nodes={props.children} onToggleDirectory={props.onToggleDirectory} isFirst />
		</div>
	);
};

export const TreeNodeList = (props: {
	nodes: ManifestNode[];
	onToggleDirectory: (node: ManifestDirectory) => void;
	isFirst?: boolean;
	hidden?: boolean;
}) => {
	return (
		<ul
			class={s.children}
			role="group"
			data-hidden={props.hidden ? "true" : undefined}
			style={props.hidden ? { display: "none" } : undefined}
		>
			<For each={props.nodes}>
				{(node, index) =>
					node.type === "directory" ? (
						<TreeDirectoryItem
							node={node}
							index={index()}
							onToggle={props.onToggleDirectory}
							isFirstOfTree={props.isFirst && index() === 0}
						/>
					) : (
						<TreeFileItem
							node={node}
							index={index()}
							isFirstOfTree={props.isFirst && index() === 0}
						/>
					)
				}
			</For>
		</ul>
	);
};
