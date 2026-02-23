import type { ManifestDirectory } from "@mnc/shared";

export const buildFolderTreeLines = (node: ManifestDirectory, indent = ""): string[] => {
	const lines: string[] = [];
	const children = node.children || [];
	children.forEach((child, index) => {
		const isLast = index === children.length - 1;
		const branch = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
		const nextIndent = indent + (isLast ? "    " : "\u2502   ");
		lines.push(indent + branch + child.name);
		if (child.type === "directory" && child.children.length > 0) {
			lines.push(...buildFolderTreeLines(child, nextIndent));
		}
	});
	return lines;
};
