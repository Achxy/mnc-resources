import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider } from "../../features/auth/modal-context";
import { createManifestDirectory, createManifestFile } from "../../test/factories";
import { TreeContainer } from "./TreeContainer";

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

describe("TreeContainer", () => {
	it("renders tree role", () => {
		const onHover = vi.fn();
		const onToggle = vi.fn();

		renderWithProviders(() => (
			<TreeContainer children={[]} onHover={onHover} onToggleDirectory={onToggle} />
		));
		expect(screen.getByRole("tree")).toBeInTheDocument();
	});

	it("renders file and directory items", () => {
		const children = [
			createManifestDirectory({ name: "Folder" }),
			createManifestFile({ name: "test.pdf" }),
		];
		const onHover = vi.fn();
		const onToggle = vi.fn();

		renderWithProviders(() => (
			<TreeContainer children={children} onHover={onHover} onToggleDirectory={onToggle} />
		));

		expect(screen.getByText("Folder")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("has aria-label", () => {
		const onHover = vi.fn();
		const onToggle = vi.fn();

		renderWithProviders(() => (
			<TreeContainer children={[]} onHover={onHover} onToggleDirectory={onToggle} />
		));
		expect(screen.getByRole("tree")).toHaveAttribute("aria-label", "Contents tree");
	});
});
