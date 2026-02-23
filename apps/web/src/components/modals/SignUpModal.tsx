import { Match, Switch, createSignal } from "solid-js";
import { useAuth } from "../../features/auth/auth-context";
import { ModalShell, useModal } from "../../features/auth/modal-context";
import { apiFetch } from "../../lib/api";

const randomPassword = () => {
	const buf = new Uint8Array(24);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const SignUpModal = () => {
	const { signIn, signUp, verifyAndSetup } = useAuth();
	const { openModal, closeModal } = useModal();

	const [step, setStep] = createSignal<1 | 2 | 3>(1);
	const [error, setError] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [lookupData, setLookupData] = createSignal<{
		name: string;
		email: string;
		rollNumber: string;
	} | null>(null);

	const handleLookup = async (suffix: string) => {
		if (!/^\d{3}$/.test(suffix)) {
			setError("Enter exactly 3 digits");
			return;
		}
		setError("");
		setLoading(true);
		try {
			const res = await apiFetch("/api/roster/lookup", {
				method: "POST",
				body: JSON.stringify({ suffix }),
			});
			const data = (await res.json()) as {
				name?: string;
				email?: string;
				error?: string;
			};
			if (!res.ok) {
				if (data.error === "Already registered") {
					setError("Already registered. Sign in instead.");
				} else {
					setError(data.error || "Lookup failed");
				}
				return;
			}
			setLookupData({
				name: data.name || "",
				email: data.email || "",
				rollNumber: `240957${suffix}`,
			});
			setStep(2);
		} finally {
			setLoading(false);
		}
	};

	const handleSendCode = async () => {
		const data = lookupData();
		if (!data) return;
		setError("");
		setLoading(true);
		try {
			await signUp(data.email, randomPassword(), data.name, data.rollNumber);
			setStep(3);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const handleVerify = async (e: SubmitEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const code = (form.elements.namedItem("code") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement).value;
		const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		const data = lookupData();
		if (!data) return;
		setError("");
		setLoading(true);
		try {
			await verifyAndSetup(data.email, code, password);
			await signIn(data.email, password);
			closeModal();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalShell title="Sign Up">
			<Switch>
				<Match when={step() === 1}>
					<div class="auth-form">
						<label class="auth-label">
							Roll Number
							<div class="roll-input-row">
								<span class="roll-prefix">240957</span>
								<input
									type="text"
									id="roll-suffix"
									inputmode="numeric"
									pattern="\d{3}"
									maxLength={3}
									placeholder="001"
									required
									class="auth-input roll-suffix-input"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleLookup((e.target as HTMLInputElement).value.trim());
										}
									}}
								/>
							</div>
						</label>
						{error() && <p class="auth-error">{error()}</p>}
						<button
							type="button"
							class="auth-submit"
							disabled={loading()}
							onClick={() => {
								const input = document.getElementById("roll-suffix") as HTMLInputElement;
								handleLookup(input.value.trim());
							}}
						>
							{loading() ? "Looking up..." : "Look up"}
						</button>
						<p class="auth-switch">
							Already have an account?{" "}
							<button type="button" class="auth-link" onClick={() => openModal("sign-in")}>
								Sign In
							</button>
						</p>
					</div>
				</Match>

				<Match when={step() === 2}>
					<div class="auth-form">
						<p class="signup-welcome">
							Welcome, <strong>{lookupData()?.name}</strong>
						</p>
						<p class="auth-hint">We'll send a verification code to:</p>
						<p class="signup-email-display">{lookupData()?.email}</p>
						{error() && <p class="auth-error">{error()}</p>}
						<button type="button" class="auth-submit" disabled={loading()} onClick={handleSendCode}>
							{loading() ? "Sending..." : "Send Verification Code"}
						</button>
						<button type="button" class="auth-link" onClick={() => setStep(1)}>
							Back
						</button>
					</div>
				</Match>

				<Match when={step() === 3}>
					<form class="auth-form" onSubmit={handleVerify}>
						<p class="auth-hint">
							Enter the 6-digit code sent to <strong>{lookupData()?.email}</strong>
						</p>
						<label class="auth-label">
							Verification Code
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
							Password
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
							{loading() ? "Verifying..." : "Complete Registration"}
						</button>
					</form>
				</Match>
			</Switch>
		</ModalShell>
	);
};
