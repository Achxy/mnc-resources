export interface ManifestFile {
	name: string;
	type: "file";
	path: string;
	extension: string;
}

export interface ManifestDirectory {
	name: string;
	type: "directory";
	path: string;
	children: ManifestNode[];
}

export type ManifestNode = ManifestFile | ManifestDirectory;

export interface ManifestRoot {
	rootLabel: string;
	rootPath: string;
	children: ManifestNode[];
}
