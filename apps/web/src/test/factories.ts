import type { ManifestDirectory, ManifestFile, ManifestNode, ManifestRoot } from "@mnc/shared";

export const createManifestFile = (overrides: Partial<ManifestFile> = {}): ManifestFile => ({
	name: "test.pdf",
	type: "file",
	path: "/contents/test.pdf",
	extension: "pdf",
	...overrides,
});

export const createManifestDirectory = (
	overrides: Partial<ManifestDirectory> = {},
): ManifestDirectory => ({
	name: "Test Folder",
	type: "directory",
	path: "/contents/Test Folder",
	children: [],
	...overrides,
});

export const createManifestRoot = (children: ManifestNode[] = []): ManifestRoot => ({
	rootLabel: "Contents",
	rootPath: "/contents",
	children,
});

export const createNestedManifest = (): ManifestRoot =>
	createManifestRoot([
		createManifestDirectory({
			name: "3rd Semester",
			path: "/contents/3rd Semester",
			children: [
				createManifestFile({
					name: "notes.pdf",
					path: "/contents/3rd Semester/notes.pdf",
					extension: "pdf",
				}),
				createManifestFile({
					name: "image.png",
					path: "/contents/3rd Semester/image.png",
					extension: "png",
				}),
				createManifestDirectory({
					name: "Assignments",
					path: "/contents/3rd Semester/Assignments",
					children: [
						createManifestFile({
							name: "hw1.pdf",
							path: "/contents/3rd Semester/Assignments/hw1.pdf",
							extension: "pdf",
						}),
					],
				}),
			],
		}),
		createManifestFile({
			name: "syllabus.pdf",
			path: "/contents/syllabus.pdf",
			extension: "pdf",
		}),
	]);

export const createUser = (overrides = {}) => ({
	id: "user-1",
	email: "student@example.com",
	name: "Test Student",
	role: "user" as const,
	emailVerified: true,
	username: "teststudent",
	...overrides,
});

export const createAdminUser = (overrides = {}) =>
	createUser({
		id: "admin-1",
		email: "admin@example.com",
		name: "Admin User",
		role: "admin",
		username: "admin",
		...overrides,
	});
