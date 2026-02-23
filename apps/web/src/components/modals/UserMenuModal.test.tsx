import { render, screen, waitFor } from "@solidjs/testing-library";
import { createEffect } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../features/auth/auth-context";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { ModalPortal } from "./ModalPortal";

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

const renderWithProviders = (role = "user") => {
	mockGetSession.mockResolvedValue({
		data: {
			user: {
				id: "u1",
				email: "test@test.com",
				name: "Test User",
				role,
				emailVerified: true,
			},
			session: { id: "s1" },
		},
	});

	const Opener = () => {
		const { user } = useAuth();
		const { openModal } = useModal();
		createEffect(() => {
			if (user()) openModal("user-menu");
		});
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

describe("UserMenuModal", () => {
	it("shows Upload File option", async () => {
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("Upload File")).toBeInTheDocument();
		});
	});

	it("shows My Submissions option", async () => {
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("My Submissions")).toBeInTheDocument();
		});
	});

	it("shows Sign Out option", async () => {
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("Sign Out")).toBeInTheDocument();
		});
	});

	it("shows Admin Panel for admin users", async () => {
		renderWithProviders("admin");
		await waitFor(() => {
			expect(screen.getByText("Admin Panel")).toBeInTheDocument();
		});
	});

	it("shows Admin badge for admin users", async () => {
		renderWithProviders("admin");
		await waitFor(() => {
			expect(screen.getByText("Admin")).toBeInTheDocument();
		});
	});
});
