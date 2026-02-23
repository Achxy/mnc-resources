import { createSignal } from "solid-js";
import { useAuth } from "../../features/auth/auth-context";
import { ModalShell, useModal } from "../../features/auth/modal-context";

export const SignInModal = () => {
	const { signIn } = useAuth();
	const { openModal, closeModal } = useModal();
	const [error, setError] = createSignal("");
	const [loading, setLoading] = createSignal(false);

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const email = (form.elements.namedItem("email") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement).value;

		setError("");
		setLoading(true);
		try {
			await signIn(email, password);
			closeModal();
		} catch (err) {
			const msg = (err as Error).message || "Sign in failed";
			if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("verify")) {
				setError("Email not verified. Please complete the sign-up process first.");
			} else {
				setError(msg);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalShell title="Sign In">
			<form class="auth-form" onSubmit={handleSubmit}>
				<label class="auth-label">
					Email
					<input type="email" name="email" required autocomplete="email" class="auth-input" />
				</label>
				<label class="auth-label">
					Password
					<input
						type="password"
						name="password"
						required
						autocomplete="current-password"
						class="auth-input"
					/>
				</label>
				<p class="auth-forgot">
					<button type="button" class="auth-link" onClick={() => openModal("forgot-password")}>
						Forgot password?
					</button>
				</p>
				{error() && <p class="auth-error">{error()}</p>}
				<button type="submit" class="auth-submit" disabled={loading()}>
					{loading() ? "Signing in..." : "Sign In"}
				</button>
				<p class="auth-switch">
					Don't have an account?{" "}
					<button type="button" class="auth-link" onClick={() => openModal("sign-up")}>
						Sign Up
					</button>
				</p>
			</form>
		</ModalShell>
	);
};
