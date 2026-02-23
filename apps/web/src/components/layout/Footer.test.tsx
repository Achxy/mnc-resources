import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider } from "../../features/auth/modal-context";
import { Footer } from "./Footer";

const renderWithProviders = (ui: () => JSX.Element) =>
	render(() => (
		<AuthProvider>
			<ModalProvider>{ui()}</ModalProvider>
		</AuthProvider>
	));

describe("Footer", () => {
	it("renders the designer name", () => {
		renderWithProviders(() => <Footer />);
		expect(screen.getByText("Achyuth Jayadevan")).toBeInTheDocument();
	});

	it("renders LinkedIn link", () => {
		renderWithProviders(() => <Footer />);
		const link = screen.getByRole("link", { name: "Achyuth Jayadevan" });
		expect(link).toHaveAttribute("href", "https://www.linkedin.com/in/achyuthjayadevan/");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});
});
