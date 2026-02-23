import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../features/auth/auth-context";
import { ModalProvider, useModal } from "../../features/auth/modal-context";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

const renderWithProviders = () => {
	const Opener = () => {
		const { openModal } = useModal();
		openModal("forgot-password");
		return null;
	};

	return render(() => (
		<AuthProvider>
			<ModalProvider>
				<Opener />
				<ForgotPasswordModal />
			</ModalProvider>
		</AuthProvider>
	));
};

describe("ForgotPasswordModal", () => {
	it("renders step 1 - email input", () => {
		renderWithProviders();
		expect(screen.getByText("Forgot Password")).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
	});

	it("has Send Reset Code button", () => {
		renderWithProviders();
		expect(screen.getByRole("button", { name: /Send Reset Code/i })).toBeInTheDocument();
	});

	it("has back to sign in link", () => {
		renderWithProviders();
		expect(screen.getByText("Back to Sign In")).toBeInTheDocument();
	});
});
