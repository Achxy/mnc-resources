import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { SignInModal } from "./SignInModal";

vi.mock("../../lib/auth-client", () => ({
	authClient: {
		getSession: vi.fn().mockResolvedValue({ data: null }),
		signIn: { email: vi.fn() },
		signUp: { email: vi.fn() },
		signOut: vi.fn().mockResolvedValue(undefined),
	},
}));

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
		openModal("sign-in");
		return null;
	};

	return render(() => (
		<AuthProvider>
			<ModalProvider>
				<Opener />
				<SignInModal />
			</ModalProvider>
		</AuthProvider>
	));
};

describe("SignInModal", () => {
	it("renders sign in form", () => {
		renderWithProviders();
		expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
	});

	it("has submit button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
	});

	it("has forgot password link", () => {
		renderWithProviders();
		expect(screen.getByText("Forgot password?")).toBeInTheDocument();
	});

	it("has sign up link", () => {
		renderWithProviders();
		expect(screen.getByText("Sign Up")).toBeInTheDocument();
	});
});
