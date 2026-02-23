import type { ManifestNode } from "@mnc/shared";
import { Show } from "solid-js";
import type { User } from "../../features/auth/auth-context";
import { useModal } from "../../features/auth/modal-context";
import { resolveContentUrl } from "../../lib/url";

type TreeItemActionsProps = {
	node: ManifestNode;
	isFolder: boolean;
	user: User | null;
};

const downloadFile = async (path: string) => {
	const url = resolveContentUrl(path);
	const filename = path.split("/").pop() || "download";
	try {
		const res = await fetch(url, { mode: "cors" });
		if (!res.ok) throw new Error();
		const blob = await res.blob();
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		a.click();
		URL.revokeObjectURL(a.href);
	} catch {
		window.open(url, "_blank");
	}
};

export const TreeItemActions = (props: TreeItemActionsProps) => {
	const { openModal } = useModal();

	const handleAction = (e: MouseEvent, action: string) => {
		e.preventDefault();
		e.stopPropagation();

		if (action === "download") {
			downloadFile(props.node.path);
		} else if (action === "upload") {
			openModal("upload", { targetDirectory: props.node.path });
		} else if (action === "rename") {
			openModal("rename", { sourcePath: props.node.path });
		} else if (action === "delete") {
			openModal("delete", { targetPath: props.node.path });
		}
	};

	return (
		<span class="cms-item-actions">
			<button
				type="button"
				class="cms-action-btn"
				title={props.isFolder ? "Download folder" : "Download"}
				onClick={(e) => handleAction(e, "download")}
			>
				{"\u2193"}
			</button>
			<Show when={props.user}>
				<Show when={props.isFolder}>
					<button
						type="button"
						class="cms-action-btn"
						title="Upload to this folder"
						onClick={(e) => handleAction(e, "upload")}
					>
						+
					</button>
				</Show>
				<button
					type="button"
					class="cms-action-btn"
					title="Rename"
					onClick={(e) => handleAction(e, "rename")}
				>
					{"\u270E"}
				</button>
				<button
					type="button"
					class="cms-action-btn cms-action-danger"
					title="Delete"
					onClick={(e) => handleAction(e, "delete")}
				>
					{"\u00D7"}
				</button>
			</Show>
		</span>
	);
};
