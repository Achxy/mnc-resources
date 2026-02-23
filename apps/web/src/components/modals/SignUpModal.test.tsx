import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { SignUpModal } from "./SignUpModal";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

const renderWithProviders = () => {
	const Opener = () => {
		const { openModal } = useModal();
		openModal("sign-up");
		return null;
	};

	return render(() => (
		<AuthProvider>
			<ModalProvider>
				<Opener />
				<SignUpModal />
			</ModalProvider>
		</AuthProvider>
	));
};

describe("SignUpModal", () => {
	it("renders step 1 - roll number input", () => {
		renderWithProviders();
		expect(screen.getByText("Sign Up")).toBeInTheDocument();
		expect(screen.getByText("240957")).toBeInTheDocument();
	});

	it("shows roll number prefix", () => {
		renderWithProviders();
		expect(screen.getByText("240957")).toBeInTheDocument();
	});

	it("has Look up button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Look up/i })).toBeInTheDocument();
	});

	it("has Sign In link", () => {
		renderWithProviders();
		expect(screen.getByText("Sign In")).toBeInTheDocument();
	});
});
