import { render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider } from "../../features/auth/modal-context";
import { Header } from "./Header";

const mockGetSession = vi.fn();

vi.mock("../../lib/auth-client", () => ({
	authClient: {
		getSession: (...args: unknown[]) => mockGetSession(...args),
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

const renderWithProviders = (ui: () => JSX.Element) =>
	render(() => (
		<AuthProvider>
			<ModalProvider>{ui()}</ModalProvider>
		</AuthProvider>
	));

describe("Header", () => {
	it('shows "Sign In" when logged out', () => {
		mockGetSession.mockResolvedValue({ data: null });
		renderWithProviders(() => <Header />);
		expect(screen.getByText("Sign In")).toBeInTheDocument();
	});

	it("shows user name when logged in", async () => {
		mockGetSession.mockResolvedValue({
			data: {
				user: {
					id: "u1",
					email: "test@test.com",
					name: "Test User",
					role: "user",
					emailVerified: true,
				},
				session: { id: "s1" },
			},
		});

		renderWithProviders(() => <Header />);

		await waitFor(() => {
			expect(screen.getByText("Test User")).toBeInTheDocument();
		});
	});
});
