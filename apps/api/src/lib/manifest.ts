const MANIFEST_KEY = "resources-manifest.json";
const ROOT_LABEL = "Contents";
const ROOT_WEB_PATH = "/contents";

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

const getExtension = (fileName: string): string => {
	const dot = fileName.lastIndexOf(".");
	return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
};

type TreeNode = {
	dirs: Map<string, TreeNode>;
	files: string[];
};

type ManifestEntry = {
	type: "directory" | "file";
	name: string;
	path: string;
	extension?: string;
	children?: ManifestEntry[];
};

const buildTree = (keys: string[]): ManifestEntry[] => {
	const root: TreeNode = { dirs: new Map(), files: [] };

	for (const key of keys) {
		const parts = key.split("/");
		let current = root;

		for (let i = 0; i < parts.length - 1; i++) {
			const dirName = parts[i];
			if (!current.dirs.has(dirName)) {
				current.dirs.set(dirName, { dirs: new Map(), files: [] });
			}
			// biome-ignore lint/style/noNonNullAssertion: checked above
			current = current.dirs.get(dirName)!;
		}

		current.files.push(parts[parts.length - 1]);
	}

	const convertNode = (node: TreeNode, webPath: string): ManifestEntry[] => {
		const children: ManifestEntry[] = [];

		const dirEntries = [...node.dirs.entries()].sort((a, b) => collator.compare(a[0], b[0]));
		const fileEntries = [...node.files].sort((a, b) => collator.compare(a, b));

		for (const [name, childNode] of dirEntries) {
			const childWebPath = `${webPath}/${name}`;
			children.push({
				type: "directory",
				name,
				path: childWebPath,
				children: convertNode(childNode, childWebPath),
			});
		}

		for (const name of fileEntries) {
			children.push({
				type: "file",
				name,
				path: `${webPath}/${name}`,
				extension: getExtension(name),
			});
		}

		return children;
	};

	return convertNode(root, ROOT_WEB_PATH);
};

export const regenerateManifest = async (bucket: R2Bucket): Promise<void> => {
	const keys: string[] = [];
	let cursor: string | undefined;

	do {
		const listed = await bucket.list({ cursor });
		for (const obj of listed.objects) {
			if (obj.key === MANIFEST_KEY) continue;
			if (obj.key.startsWith("_staging/")) continue;
			keys.push(obj.key);
		}
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);

	const manifest = {
		rootLabel: ROOT_LABEL,
		rootPath: ROOT_WEB_PATH,
		children: buildTree(keys),
	};

	const body = JSON.stringify(manifest);

	await bucket.put(MANIFEST_KEY, body, {
		httpMetadata: {
			contentType: "application/json",
			cacheControl: "no-cache",
		},
	});
};
