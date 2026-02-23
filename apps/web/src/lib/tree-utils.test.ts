import { describe, expect, it } from "vitest";
import { createManifestDirectory, createManifestFile } from "../test/factories";
import { buildFolderTreeLines } from "./tree-utils";

describe("buildFolderTreeLines", () => {
	it("returns empty array for directory with no children", () => {
		const dir = createManifestDirectory({ children: [] });
		expect(buildFolderTreeLines(dir)).toEqual([]);
	});

	it("renders single file", () => {
		const dir = createManifestDirectory({
			children: [createManifestFile({ name: "test.pdf" })],
		});
		const lines = buildFolderTreeLines(dir);
		expect(lines).toEqual(["└── test.pdf"]);
	});

	it("renders multiple files with correct connectors", () => {
		const dir = createManifestDirectory({
			children: [
				createManifestFile({ name: "a.pdf" }),
				createManifestFile({ name: "b.pdf" }),
				createManifestFile({ name: "c.pdf" }),
			],
		});
		const lines = buildFolderTreeLines(dir);
		expect(lines).toEqual(["├── a.pdf", "├── b.pdf", "└── c.pdf"]);
	});

	it("renders nested directories", () => {
		const dir = createManifestDirectory({
			children: [
				createManifestDirectory({
					name: "SubDir",
					path: "/contents/SubDir",
					children: [createManifestFile({ name: "inner.pdf" })],
				}),
			],
		});
		const lines = buildFolderTreeLines(dir);
		expect(lines).toEqual(["└── SubDir", "    └── inner.pdf"]);
	});

	it("renders mixed files and dirs", () => {
		const dir = createManifestDirectory({
			children: [
				createManifestDirectory({
					name: "Folder",
					path: "/contents/Folder",
					children: [createManifestFile({ name: "doc.pdf" })],
				}),
				createManifestFile({ name: "readme.txt" }),
			],
		});
		const lines = buildFolderTreeLines(dir);
		expect(lines).toEqual(["├── Folder", "│   └── doc.pdf", "└── readme.txt"]);
	});

	it("renders 3+ levels of nesting", () => {
		const dir = createManifestDirectory({
			children: [
				createManifestDirectory({
					name: "L1",
					path: "/contents/L1",
					children: [
						createManifestDirectory({
							name: "L2",
							path: "/contents/L1/L2",
							children: [createManifestFile({ name: "deep.pdf" })],
						}),
					],
				}),
			],
		});
		const lines = buildFolderTreeLines(dir);
		expect(lines).toEqual(["└── L1", "    └── L2", "        └── deep.pdf"]);
	});
});
