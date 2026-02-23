import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider } from "../../features/auth/modal-context";
import { createManifestDirectory, createManifestFile, createUser } from "../../test/factories";
import { TreeItemActions } from "./TreeItemActions";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithModal = (ui: () => JSX.Element) =>
	render(() => <ModalProvider>{ui()}</ModalProvider>);

describe("TreeItemActions", () => {
	it("always shows download button", () => {
		const node = createManifestFile();
		renderWithModal(() => <TreeItemActions node={node} isFolder={false} user={null} />);
		const downloadBtn = screen.getByTitle("Download");
		expect(downloadBtn).toBeInTheDocument();
	});

	it("hides CMS buttons when not logged in", () => {
		const node = createManifestFile();
		renderWithModal(() => <TreeItemActions node={node} isFolder={false} user={null} />);
		expect(screen.queryByTitle("Rename")).not.toBeInTheDocument();
		expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
	});

	it("shows CMS buttons when logged in", () => {
		const node = createManifestFile();
		const user = createUser();
		renderWithModal(() => <TreeItemActions node={node} isFolder={false} user={user} />);
		expect(screen.getByTitle("Rename")).toBeInTheDocument();
		expect(screen.getByTitle("Delete")).toBeInTheDocument();
	});

	it("shows upload button only for folders", () => {
		const node = createManifestDirectory();
		const user = createUser();
		renderWithModal(() => <TreeItemActions node={node} isFolder={true} user={user} />);
		expect(screen.getByTitle("Upload to this folder")).toBeInTheDocument();
	});

	it("does not show upload button for files", () => {
		const node = createManifestFile();
		const user = createUser();
		renderWithModal(() => <TreeItemActions node={node} isFolder={false} user={user} />);
		expect(screen.queryByTitle("Upload to this folder")).not.toBeInTheDocument();
	});
});
