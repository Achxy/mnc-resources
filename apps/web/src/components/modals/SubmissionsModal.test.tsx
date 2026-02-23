import { render, screen, waitFor } from "@solidjs/testing-library";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { server } from "../../test/mocks/server";
import { SubmissionsModal } from "./SubmissionsModal";

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
		openModal("submissions");
		return null;
	};

	return render(() => (
		<ModalProvider>
			<Opener />
			<SubmissionsModal />
		</ModalProvider>
	));
};

describe("SubmissionsModal", () => {
	it("renders My Submissions title", () => {
		renderWithProviders();
		expect(screen.getByText("My Submissions")).toBeInTheDocument();
	});

	it("shows loading state", () => {
		server.use(
			http.get("*/api/changes", () => {
				return new Promise(() => {}); // never resolves
			}),
		);
		renderWithProviders();
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("shows empty state", async () => {
		server.use(
			http.get("*/api/changes", () => {
				return HttpResponse.json({ changes: [] });
			}),
		);
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("No submissions yet.")).toBeInTheDocument();
		});
	});

	it("renders submissions list", async () => {
		server.use(
			http.get("*/api/changes", () => {
				return HttpResponse.json({
					changes: [
						{
							id: "1",
							type: "upload",
							status: "pending",
							target_path: "/contents/test.pdf",
							created_at: "2025-01-01T00:00:00Z",
						},
					],
				});
			}),
		);
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("upload")).toBeInTheDocument();
			expect(screen.getByText("pending")).toBeInTheDocument();
		});
	});

	it("shows cancel button for pending items", async () => {
		server.use(
			http.get("*/api/changes", () => {
				return HttpResponse.json({
					changes: [
						{
							id: "1",
							type: "upload",
							status: "pending",
							target_path: "/contents/test.pdf",
							created_at: "2025-01-01T00:00:00Z",
						},
					],
				});
			}),
		);
		renderWithProviders();
		await waitFor(() => {
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});
	});
});
