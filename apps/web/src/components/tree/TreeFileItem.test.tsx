import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider } from "../../features/auth/modal-context";
import { createManifestFile } from "../../test/factories";
import { TreeFileItem } from "./TreeFileItem";

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

describe("TreeFileItem", () => {
	it("renders file name as link", () => {
		const node = createManifestFile({ name: "notes.pdf", path: "/contents/notes.pdf" });
		renderWithProviders(() => <TreeFileItem node={node} index={0} />);

		const link = screen.getByRole("link", { name: "notes.pdf" });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("has treeitem role", () => {
		const node = createManifestFile();
		renderWithProviders(() => <TreeFileItem node={node} index={0} />);
		expect(screen.getByRole("treeitem")).toBeInTheDocument();
	});

	it("first item has tabIndex 0", () => {
		const node = createManifestFile();
		renderWithProviders(() => <TreeFileItem node={node} index={0} isFirstOfTree />);
		expect(screen.getByRole("treeitem")).toHaveAttribute("tabindex", "0");
	});

	it("non-first item has tabIndex -1", () => {
		const node = createManifestFile();
		renderWithProviders(() => <TreeFileItem node={node} index={1} />);
		expect(screen.getByRole("treeitem")).toHaveAttribute("tabindex", "-1");
	});
});
