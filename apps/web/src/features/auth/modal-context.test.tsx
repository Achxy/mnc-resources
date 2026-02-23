import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it } from "vitest";
import { ModalProvider, ModalShell, useModal } from "./modal-context";

const TestConsumer = () => {
	const { modal, openModal, closeModal } = useModal();
	return (
		<div>
			<span data-testid="modal-state">{modal()?.type || "null"}</span>
			<button type="button" data-testid="open-signin" onClick={() => openModal("sign-in")}>
				Open
			</button>
			<button
				type="button"
				data-testid="open-upload"
				onClick={() => openModal("upload", { dir: "/contents" })}
			>
				Upload
			</button>
			<button type="button" data-testid="close" onClick={closeModal}>
				Close
			</button>
		</div>
	);
};

describe("ModalProvider", () => {
	it("initial state is null", () => {
		render(() => (
			<ModalProvider>
				<TestConsumer />
			</ModalProvider>
		));
		expect(screen.getByTestId("modal-state").textContent).toBe("null");
	});

	it("openModal sets type", async () => {
		render(() => (
			<ModalProvider>
				<TestConsumer />
			</ModalProvider>
		));
		screen.getByTestId("open-signin").click();
		expect(screen.getByTestId("modal-state").textContent).toBe("sign-in");
	});

	it("closeModal resets to null", () => {
		render(() => (
			<ModalProvider>
				<TestConsumer />
			</ModalProvider>
		));
		screen.getByTestId("open-signin").click();
		screen.getByTestId("close").click();
		expect(screen.getByTestId("modal-state").textContent).toBe("null");
	});
});

describe("useModal", () => {
	it("throws outside provider", () => {
		expect(() => {
			render(() => {
				const { modal } = useModal();
				return <span>{modal()?.type}</span>;
			});
		}).toThrow("useModal must be used within ModalProvider");
	});
});

describe("ModalShell", () => {
	it("renders title and children", () => {
		render(() => (
			<ModalProvider>
				<TestModalShellWrapper title="Test Title">
					<p>Modal content</p>
				</TestModalShellWrapper>
			</ModalProvider>
		));
		expect(screen.getByText("Test Title")).toBeInTheDocument();
		expect(screen.getByText("Modal content")).toBeInTheDocument();
	});

	it("renders close button", () => {
		render(() => (
			<ModalProvider>
				<TestModalShellWrapper title="Test">
					<p>Content</p>
				</TestModalShellWrapper>
			</ModalProvider>
		));
		expect(screen.getByLabelText("Close")).toBeInTheDocument();
	});
});

// Helper wrapper since ModalShell needs useModal context
const TestModalShellWrapper = (props: { title: string; children: JSX.Element }) => {
	return <ModalShell title={props.title}>{props.children}</ModalShell>;
};
