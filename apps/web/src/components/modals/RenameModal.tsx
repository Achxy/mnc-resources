import { createSignal } from "solid-js";
import { ModalShell, useModal } from "../../features/auth/modal-context";
import { apiFetch } from "../../lib/api";

export const RenameModal = (props: { sourcePath: string }) => {
	const { closeModal } = useModal();
	const [error, setError] = createSignal("");
	const [loading, setLoading] = createSignal(false);

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const targetPath = (form.elements.namedItem("targetPath") as HTMLInputElement).value;

		setError("");
		setLoading(true);
		try {
			const res = await apiFetch("/api/changes/rename", {
				method: "POST",
				body: JSON.stringify({ sourcePath: props.sourcePath, targetPath }),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "Rename failed");
			}
			closeModal();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalShell title="Rename">
			<form class="auth-form" onSubmit={handleSubmit}>
				<label class="auth-label">
					Current Path
					<input type="text" value={props.sourcePath} disabled class="auth-input" />
				</label>
				<label class="auth-label">
					New Path
					<input
						type="text"
						name="targetPath"
						value={props.sourcePath}
						required
						class="auth-input"
					/>
				</label>
				{error() && <p class="auth-error">{error()}</p>}
				<button type="submit" class="auth-submit" disabled={loading()}>
					{loading() ? "Submitting..." : "Submit Rename"}
				</button>
			</form>
		</ModalShell>
	);
};
