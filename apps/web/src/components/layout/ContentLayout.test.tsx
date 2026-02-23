import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { ContentLayout } from "./ContentLayout";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

describe("ContentLayout", () => {
	it("renders both panes", () => {
		render(() => (
			<ContentLayout
				treePane={<div data-testid="tree">Tree</div>}
				previewPane={<div data-testid="preview">Preview</div>}
				loading={false}
			/>
		));
		expect(screen.getByTestId("tree")).toBeInTheDocument();
		expect(screen.getByTestId("preview")).toBeInTheDocument();
	});

	it("renders the Contents heading", () => {
		render(() => (
			<ContentLayout treePane={<div>Tree</div>} previewPane={<div>Preview</div>} loading={false} />
		));
		expect(screen.getByText("Contents")).toBeInTheDocument();
	});

	it("has main landmark with aria-label", () => {
		render(() => (
			<ContentLayout treePane={<div>Tree</div>} previewPane={<div>Preview</div>} loading={false} />
		));
		expect(screen.getByRole("main")).toHaveAttribute("aria-label", "Class resources");
	});
});
