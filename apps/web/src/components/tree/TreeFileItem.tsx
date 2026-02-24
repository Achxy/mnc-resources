import type { ManifestFile } from "@mnc/shared";
import { useAuth } from "../../features/auth/auth-context";
import { resolveContentUrl } from "../../lib/url";
import s from "../../styles/tree.module.css";
import { TreeItemActions } from "./TreeItemActions";

type TreeFileItemProps = {
	node: ManifestFile;
	index: number;
	isFirstOfTree?: boolean;
};

export const TreeFileItem = (props: TreeFileItemProps) => {
	const { user } = useAuth();

	return (
		<li
			class={`${s.treeItem} tree-item ${props.index % 2 === 0 ? s.stripedOdd : s.stripedEven}`}
			role="treeitem"
			data-path={props.node.path}
			data-node-json={JSON.stringify(props.node)}
			tabIndex={props.isFirstOfTree ? 0 : -1}
		>
			<span class={`${s.toggle} ${s.fileToggle}`} aria-hidden="true">
				{"\u25B8"}
			</span>
			<a
				class={s.fileLink}
				href={resolveContentUrl(props.node.path)}
				target="_blank"
				rel="noreferrer noopener"
			>
				<span class={s.label}>{props.node.name}</span>
			</a>
			<TreeItemActions node={props.node} isFolder={false} user={user()} />
		</li>
	);
};
