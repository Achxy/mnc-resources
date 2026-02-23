import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider } from "../../features/auth/modal-context";
import { createManifestDirectory, createManifestFile } from "../../test/factories";
import { TreeDirectoryItem } from "./TreeDirectoryItem";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithProviders = (ui: () => JSX.Element) =>
	render(() => (
		<AuthProvider>
			<ModalProvider>{ui()}</ModalProvider>
		</AuthProvider>
	));

describe("TreeDirectoryItem", () => {
	it("renders directory name", () => {
		const node = createManifestDirectory({ name: "Test Folder" });
		const onToggle = vi.fn();
		renderWithProviders(() => <TreeDirectoryItem node={node} index={0} onToggle={onToggle} />);
		expect(screen.getByText("Test Folder")).toBeInTheDocument();
	});

	it("starts collapsed", () => {
		const node = createManifestDirectory();
		const onToggle = vi.fn();
		renderWithProviders(() => <TreeDirectoryItem node={node} index={0} onToggle={onToggle} />);
		const item = screen.getByRole("treeitem");
		expect(item).toHaveAttribute("aria-expanded", "false");
	});

	it("expands on click and calls onToggle", async () => {
		const node = createManifestDirectory({
			children: [createManifestFile({ name: "inner.pdf" })],
		});
		const onToggle = vi.fn();
		renderWithProviders(() => <TreeDirectoryItem node={node} index={0} onToggle={onToggle} />);
		// Multiple treeitems may exist (dir + child), get the first (directory)
		const items = screen.getAllByRole("treeitem");
		const dirItem = items[0];
		dirItem.click();
		expect(dirItem).toHaveAttribute("aria-expanded", "true");
		expect(onToggle).toHaveBeenCalledWith(node);
	});

	it("collapses on second click", () => {
		const node = createManifestDirectory({
			children: [createManifestFile()],
		});
		const onToggle = vi.fn();
		renderWithProviders(() => <TreeDirectoryItem node={node} index={0} onToggle={onToggle} />);
		const item = screen.getByRole("treeitem");
		item.click();
		item.click();
		expect(item).toHaveAttribute("aria-expanded", "false");
	});

	it("has data-is-folder attribute", () => {
		const node = createManifestDirectory();
		const onToggle = vi.fn();
		renderWithProviders(() => <TreeDirectoryItem node={node} index={0} onToggle={onToggle} />);
		expect(screen.getByRole("treeitem")).toHaveAttribute("data-is-folder", "true");
	});
});
