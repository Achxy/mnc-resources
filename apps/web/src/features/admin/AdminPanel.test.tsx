import { render, screen, waitFor } from "@solidjs/testing-library";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { server } from "../../test/mocks/server";
import { AdminPanel } from "./AdminPanel";

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
		openModal("admin");
		return null;
	};

	return render(() => (
		<ModalProvider>
			<Opener />
			<AdminPanel />
		</ModalProvider>
	));
};

describe("AdminPanel", () => {
	it("renders with Review Queue and Audit Log tabs", () => {
		server.use(
			http.get("*/api/admin/queue", () => HttpResponse.json({ queue: [] })),
			http.get("*/api/admin/audit", () => HttpResponse.json({ audit: [] })),
		);

		renderWithProviders();
		expect(screen.getByText("Review Queue")).toBeInTheDocument();
		expect(screen.getByText("Audit Log")).toBeInTheDocument();
	});

	it("defaults to queue tab", () => {
		server.use(http.get("*/api/admin/queue", () => HttpResponse.json({ queue: [] })));

		renderWithProviders();
		const queueTab = screen.getByText("Review Queue");
		expect(queueTab.classList.contains("active")).toBe(true);
	});

	it("shows empty queue message", async () => {
		server.use(http.get("*/api/admin/queue", () => HttpResponse.json({ queue: [] })));

		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("No pending requests.")).toBeInTheDocument();
		});
	});

	it("renders queue items", async () => {
		server.use(
			http.get("*/api/admin/queue", () =>
				HttpResponse.json({
					queue: [
						{
							id: "cr-1",
							type: "upload",
							status: "pending",
							target_path: "/contents/file.pdf",
							user_name: "Alice",
							user_email: "alice@test.com",
							created_at: "2025-01-01T00:00:00Z",
						},
					],
				}),
			),
		);

		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("upload")).toBeInTheDocument();
			expect(screen.getByText("Alice")).toBeInTheDocument();
			expect(screen.getByText("Approve")).toBeInTheDocument();
			expect(screen.getByText("Reject")).toBeInTheDocument();
		});
	});

	it("switches to audit tab", async () => {
		server.use(
			http.get("*/api/admin/queue", () => HttpResponse.json({ queue: [] })),
			http.get("*/api/admin/audit", () => HttpResponse.json({ audit: [] })),
		);

		renderWithProviders();
		screen.getByText("Audit Log").click();

		await waitFor(() => {
			expect(screen.getByText("No audit entries.")).toBeInTheDocument();
		});
	});
});
