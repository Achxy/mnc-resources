import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithProviders = (targetPath = "/contents/delete.pdf") => {
	const Opener = () => {
		const { openModal } = useModal();
		openModal("delete", { targetPath });
		return null;
	};

	return render(() => (
		<ModalProvider>
			<Opener />
			<DeleteConfirmModal targetPath={targetPath} />
		</ModalProvider>
	));
};

describe("DeleteConfirmModal", () => {
	it("renders Delete title", () => {
		renderWithProviders();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("shows the target path", () => {
		renderWithProviders("/contents/important.pdf");
		expect(screen.getByText("/contents/important.pdf")).toBeInTheDocument();
	});

	it("has request deletion button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Request Deletion/i })).toBeInTheDocument();
	});

	it("has cancel button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
	});
});
