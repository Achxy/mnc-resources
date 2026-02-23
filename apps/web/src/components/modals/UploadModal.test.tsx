import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { UploadModal } from "./UploadModal";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithProviders = (targetDirectory = "/contents") => {
	const Opener = () => {
		const { openModal } = useModal();
		openModal("upload", { targetDirectory });
		return null;
	};

	return render(() => (
		<ModalProvider>
			<Opener />
			<UploadModal targetDirectory={targetDirectory} />
		</ModalProvider>
	));
};

describe("UploadModal", () => {
	it("renders Upload Files title", () => {
		renderWithProviders();
		expect(screen.getByText("Upload Files")).toBeInTheDocument();
	});

	it("shows target directory", () => {
		renderWithProviders("/contents/3rd Semester");
		expect(screen.getByDisplayValue("/contents/3rd Semester")).toBeInTheDocument();
	});

	it("has Add files button", () => {
		renderWithProviders();
		expect(screen.getByText("+ Add files")).toBeInTheDocument();
	});

	it("submit button is disabled when no files", () => {
		renderWithProviders();
		const btn = screen.getByText("Select files to upload");
		expect(btn).toBeDisabled();
	});
});
