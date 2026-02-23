import type { ManifestDirectory } from "@mnc/shared";
import { Show, createSignal } from "solid-js";
import { useAuth } from "../../features/auth/auth-context";
import s from "../../styles/tree.module.css";
import { TreeNodeList } from "./TreeContainer";
import { TreeItemActions } from "./TreeItemActions";

type TreeDirectoryItemProps = {
	node: ManifestDirectory;
	index: number;
	onToggle: (node: ManifestDirectory) => void;
	isFirstOfTree?: boolean;
};

export const TreeDirectoryItem = (props: TreeDirectoryItemProps) => {
	const [expanded, setExpanded] = createSignal(false);
	const { user } = useAuth();

	const handleClick = (e: MouseEvent) => {
		if ((e.target as HTMLElement).closest(".cms-item-actions")) return;
		setExpanded((prev) => !prev);
		props.onToggle(props.node);
	};

	return (
		<>
			<li
				class={`${s.treeItem} ${s.folder} ${props.index % 2 === 0 ? s.stripedOdd : s.stripedEven}`}
				role="treeitem"
				aria-expanded={expanded()}
				data-path={props.node.path}
				data-is-folder="true"
				data-node-json={JSON.stringify(props.node)}
				tabIndex={props.isFirstOfTree ? 0 : -1}
				onClick={handleClick}
			>
				<span class={s.toggle} aria-hidden="true">
					{expanded() ? "\u25BE" : "\u25B8"}
				</span>
				<span class={s.label}>{props.node.name}</span>
				<TreeItemActions node={props.node} isFolder user={user()} />
			</li>
			<Show when={props.node.children.length > 0}>
				<TreeNodeList
					nodes={props.node.children}
					onToggleDirectory={props.onToggle}
					hidden={!expanded()}
				/>
			</Show>
		</>
	);
};
