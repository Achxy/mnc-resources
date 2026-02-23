import { For, Show, createResource } from "solid-js";
import { ModalShell } from "../../features/auth/modal-context";
import { apiFetch } from "../../lib/api";

type ChangeRequest = {
	id: string;
	type: string;
	status: string;
	target_path: string;
	original_filename?: string;
	review_note?: string;
	created_at: string;
};

const statusClass = (s: string) =>
	({
		pending: "status-pending",
		approved: "status-approved",
		rejected: "status-rejected",
		published: "status-published",
	})[s] || "";

export const SubmissionsModal = () => {
	const [changes, { refetch }] = createResource(async () => {
		const res = await apiFetch("/api/changes");
		if (!res.ok) throw new Error("Failed to load submissions");
		const data = (await res.json()) as { changes: ChangeRequest[] };
		return data.changes;
	});

	const handleCancel = async (id: string) => {
		const res = await apiFetch(`/api/changes/${id}`, { method: "DELETE" });
		if (res.ok) refetch();
	};

	return (
		<ModalShell title="My Submissions">
			<Show when={changes.loading}>
				<p class="loading-text">Loading...</p>
			</Show>

			<Show when={changes.error}>
				<p class="auth-error">{(changes.error as Error).message}</p>
			</Show>

			<Show when={changes() && changes()?.length === 0}>
				<p class="empty-text">No submissions yet.</p>
			</Show>

			<Show when={changes() && (changes()?.length ?? 0) > 0}>
				<div class="submissions-list">
					<For each={changes()}>
						{(cr) => (
							<div class="submission-item">
								<div class="submission-header">
									<span class="submission-type">{cr.type}</span>
									<span class={`submission-status ${statusClass(cr.status)}`}>{cr.status}</span>
								</div>
								<p class="submission-path">{cr.target_path}</p>
								<Show when={cr.original_filename}>
									<p class="submission-filename">{cr.original_filename}</p>
								</Show>
								<Show when={cr.review_note}>
									<p class="submission-note">Note: {cr.review_note}</p>
								</Show>
								<p class="submission-date">{new Date(cr.created_at).toLocaleDateString()}</p>
								<Show when={cr.status === "pending"}>
									<button
										type="button"
										class="submission-cancel"
										onClick={() => handleCancel(cr.id)}
									>
										Cancel
									</button>
								</Show>
							</div>
						)}
					</For>
				</div>
			</Show>
		</ModalShell>
	);
};
