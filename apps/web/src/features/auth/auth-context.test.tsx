import { render, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

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

const TestConsumer = () => {
	const { user, isAdmin } = useAuth();
	return (
		<div>
			<span data-testid="user-name">{user()?.name || "none"}</span>
			<span data-testid="is-admin">{isAdmin() ? "yes" : "no"}</span>
		</div>
	);
};

describe("AuthProvider", () => {
	it("starts with null user", () => {
		mockGetSession.mockResolvedValue({ data: null });
		render(() => (
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		));
		expect(screen.getByTestId("user-name").textContent).toBe("none");
	});

	it("refreshSession populates user on mount", async () => {
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

		render(() => (
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		));

		await waitFor(() => {
			expect(screen.getByTestId("user-name").textContent).toBe("Test User");
		});
	});

	it("isAdmin returns true for admin role", async () => {
		mockGetSession.mockResolvedValue({
			data: {
				user: {
					id: "a1",
					email: "admin@test.com",
					name: "Admin",
					role: "admin",
					emailVerified: true,
				},
				session: { id: "s2" },
			},
		});

		render(() => (
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		));

		await waitFor(() => {
			expect(screen.getByTestId("is-admin").textContent).toBe("yes");
		});
	});

	it("isAdmin returns false for regular user", async () => {
		mockGetSession.mockResolvedValue({
			data: {
				user: {
					id: "u2",
					email: "user@test.com",
					name: "Regular",
					role: "user",
					emailVerified: true,
				},
				session: { id: "s3" },
			},
		});

		render(() => (
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		));

		await waitFor(() => {
			expect(screen.getByTestId("is-admin").textContent).toBe("no");
		});
	});
});

describe("useAuth", () => {
	it("throws outside provider", () => {
		expect(() => {
			render(() => {
				const { user } = useAuth();
				return <span>{user()?.name}</span>;
			});
		}).toThrow("useAuth must be used within AuthProvider");
	});
});
