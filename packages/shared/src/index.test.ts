import { describe, expect, it } from "vitest";
import type { ManifestDirectory, ManifestFile, ManifestNode, ManifestRoot } from "./index";

describe("shared types", () => {
	it("ManifestFile type is structurally valid", () => {
		const file: ManifestFile = {
			name: "test.pdf",
			type: "file",
			path: "/contents/test.pdf",
			extension: "pdf",
		};
		expect(file.type).toBe("file");
		expect(file.extension).toBe("pdf");
	});

	it("ManifestDirectory type is structurally valid", () => {
		const dir: ManifestDirectory = {
			name: "Folder",
			type: "directory",
			path: "/contents/Folder",
			children: [],
		};
		expect(dir.type).toBe("directory");
		expect(dir.children).toEqual([]);
	});

	it("ManifestNode union works with both types", () => {
		const file: ManifestNode = {
			name: "test.pdf",
			type: "file",
			path: "/contents/test.pdf",
			extension: "pdf",
		};
		const dir: ManifestNode = {
			name: "Folder",
			type: "directory",
			path: "/contents/Folder",
			children: [],
		};
		expect(file.type).toBe("file");
		expect(dir.type).toBe("directory");
	});

	it("ManifestRoot contains rootLabel, rootPath, children", () => {
		const root: ManifestRoot = {
			rootLabel: "Contents",
			rootPath: "/contents",
			children: [],
		};
		expect(root.rootLabel).toBe("Contents");
		expect(root.rootPath).toBe("/contents");
		expect(root.children).toEqual([]);
	});
});
