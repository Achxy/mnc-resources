import { Match, Switch, createSignal } from "solid-js";
import { useAuth } from "../../features/auth/auth-context";
import { ModalShell, useModal } from "../../features/auth/modal-context";

export const ForgotPasswordModal = () => {
	const { sendResetOTP, resetWithOTP } = useAuth();
	const { openModal, closeModal } = useModal();

	const [step, setStep] = createSignal<1 | 2>(1);
	const [error, setError] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [resetEmail, setResetEmail] = createSignal("");

	const handleSendCode = async (email: string) => {
		if (!email) return;
		setError("");
		setLoading(true);
		try {
			await sendResetOTP(email);
			setResetEmail(email);
			setStep(2);
		} catch (err) {
			setError((err as Error).message || "Failed to send reset code");
		} finally {
			setLoading(false);
		}
	};

	const handleReset = async (e: SubmitEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const code = (form.elements.namedItem("code") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement).value;
		const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setError("");
		setLoading(true);
		try {
			await resetWithOTP(resetEmail(), code, password);
			closeModal();
			openModal("sign-in");
		} catch (err) {
			setError((err as Error).message || "Reset failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalShell title="Forgot Password">
			<Switch>
				<Match when={step() === 1}>
					<div class="auth-form">
						<p class="auth-hint">Enter your email and we'll send a code to reset your password.</p>
						<label class="auth-label">
							Email
							<input
								type="email"
								id="forgot-email"
								required
								autocomplete="email"
								class="auth-input"
							/>
						</label>
						{error() && <p class="auth-error">{error()}</p>}
						<button
							type="button"
							class="auth-submit"
							disabled={loading()}
							onClick={() => {
								const input = document.getElementById("forgot-email") as HTMLInputElement;
								handleSendCode(input.value);
							}}
						>
							{loading() ? "Sending..." : "Send Reset Code"}
						</button>
						<p class="auth-switch">
							<button type="button" class="auth-link" onClick={() => openModal("sign-in")}>
								Back to Sign In
							</button>
						</p>
					</div>
				</Match>

				<Match when={step() === 2}>
					<form class="auth-form" onSubmit={handleReset}>
						<p class="auth-hint">
							Enter the 6-digit code sent to <strong>{resetEmail()}</strong>
						</p>
						<label class="auth-label">
							Reset Code
							<input
								type="text"
								name="code"
								inputmode="numeric"
								pattern="\d{6}"
								maxLength={6}
								required
								autocomplete="one-time-code"
								class="auth-input otp-input"
								placeholder="000000"
							/>
						</label>
						<label class="auth-label">
							New Password
							<input
								type="password"
								name="password"
								required
								minLength={8}
								autocomplete="new-password"
								class="auth-input"
							/>
						</label>
						<label class="auth-label">
							Confirm Password
							<input
								type="password"
								name="confirmPassword"
								required
								minLength={8}
								autocomplete="new-password"
								class="auth-input"
							/>
						</label>
						{error() && <p class="auth-error">{error()}</p>}
						<button type="submit" class="auth-submit" disabled={loading()}>
							{loading() ? "Resetting..." : "Reset Password"}
						</button>
					</form>
				</Match>
			</Switch>
		</ModalShell>
	);
};
