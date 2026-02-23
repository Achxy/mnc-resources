import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { RenameModal } from "./RenameModal";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithProviders = (sourcePath = "/contents/old.pdf") => {
	const Opener = () => {
		const { openModal } = useModal();
		openModal("rename", { sourcePath });
		return null;
	};

	return render(() => (
		<ModalProvider>
			<Opener />
			<RenameModal sourcePath={sourcePath} />
		</ModalProvider>
	));
};

describe("RenameModal", () => {
	it("renders Rename title", () => {
		renderWithProviders();
		expect(screen.getByRole("heading", { name: "Rename" })).toBeInTheDocument();
	});

	it("shows current path as disabled input", () => {
		renderWithProviders("/contents/test.pdf");
		const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
		const disabledInput = inputs.find((input) => input.disabled);
		expect(disabledInput).toBeDefined();
		expect(disabledInput?.value).toBe("/contents/test.pdf");
	});

	it("has new path input", () => {
		renderWithProviders("/contents/old.pdf");
		const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
		const enabledInputs = inputs.filter((input) => !input.disabled);
		expect(enabledInputs.length).toBeGreaterThanOrEqual(1);
	});

	it("has submit button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Submit Rename/i })).toBeInTheDocument();
	});
});
