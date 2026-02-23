import { createSignal } from "solid-js";
import { ModalShell, useModal } from "../../features/auth/modal-context";
import { apiFetch } from "../../lib/api";

export const DeleteConfirmModal = (props: { targetPath: string }) => {
	const { closeModal } = useModal();
	const [error, setError] = createSignal("");
	const [loading, setLoading] = createSignal(false);

	const handleDelete = async () => {
		setError("");
		setLoading(true);
		try {
			const res = await apiFetch("/api/changes/delete", {
				method: "POST",
				body: JSON.stringify({ targetPath: props.targetPath }),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "Delete request failed");
			}
			closeModal();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalShell title="Delete">
			<div class="auth-form">
				<p>Request deletion of:</p>
				<p>
					<strong>{props.targetPath}</strong>
				</p>
				{error() && <p class="auth-error">{error()}</p>}
				<div class="modal-actions">
					<button
						type="button"
						class="auth-submit cms-ctx-danger"
						disabled={loading()}
						onClick={handleDelete}
					>
						{loading() ? "Requesting..." : "Request Deletion"}
					</button>
					<button type="button" class="auth-submit" onClick={closeModal}>
						Cancel
					</button>
				</div>
			</div>
		</ModalShell>
	);
};
