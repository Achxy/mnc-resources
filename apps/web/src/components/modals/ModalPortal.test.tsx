import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider, type ModalType, useModal } from "../../features/auth/modal-context";
import { ModalPortal } from "./ModalPortal";

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

const renderWithProviders = (initialModal?: ModalType) => {
	const Opener = () => {
		const { openModal } = useModal();
		if (initialModal) {
			openModal(initialModal);
		}
		return null;
	};

	return render(() => (
		<AuthProvider>
			<ModalProvider>
				<Opener />
				<ModalPortal />
			</ModalProvider>
		</AuthProvider>
	));
};

describe("ModalPortal", () => {
	it("renders nothing when no modal is open", () => {
		renderWithProviders();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("renders SignInModal for sign-in type", () => {
		renderWithProviders("sign-in");
		expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
	});

	it("renders SignUpModal for sign-up type", () => {
		renderWithProviders("sign-up");
		expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
	});

	it("renders ForgotPasswordModal for forgot-password type", () => {
		renderWithProviders("forgot-password");
		expect(screen.getByRole("heading", { name: "Forgot Password" })).toBeInTheDocument();
	});
});
