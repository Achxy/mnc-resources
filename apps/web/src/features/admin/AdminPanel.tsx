import { For, Match, Show, Switch, createResource, createSignal } from "solid-js";
import { ModalShell } from "../../features/auth/modal-context";
import { apiFetch, formatFileSize } from "../../lib/api";

type QueueItem = {
	id: string;
	type: string;
	status: string;
	target_path: string;
	source_path?: string;
	original_filename?: string;
	file_size?: number;
	user_name?: string;
	user_email?: string;
	created_at: string;
};

type AuditEntry = {
	id: string;
	action: string;
	user_id: string;
	user_name?: string;
	target_type?: string;
	target_id?: string;
	created_at: string;
};

export const AdminPanel = () => {
	const [tab, setTab] = createSignal<"queue" | "audit">("queue");

	return (
		<ModalShell title="Admin Panel">
			<div class="admin-tabs">
				<button
					type="button"
					class={`admin-tab ${tab() === "queue" ? "active" : ""}`}
					onClick={() => setTab("queue")}
				>
					Review Queue
				</button>
				<button
					type="button"
					class={`admin-tab ${tab() === "audit" ? "active" : ""}`}
					onClick={() => setTab("audit")}
				>
					Audit Log
				</button>
			</div>
			<Switch>
				<Match when={tab() === "queue"}>
					<ReviewQueue />
				</Match>
				<Match when={tab() === "audit"}>
					<AuditLog />
				</Match>
			</Switch>
		</ModalShell>
	);
};

const ReviewQueue = () => {
	const [queue, { refetch }] = createResource(async () => {
		const res = await apiFetch("/api/admin/queue");
		if (!res.ok) throw new Error("Failed to load queue");
		const data = (await res.json()) as { queue: QueueItem[] };
		return data.queue;
	});

	const reviewAction = async (id: string, action: "approve" | "reject") => {
		const note = action === "reject" ? prompt("Rejection reason (optional):") : null;
		const res = await apiFetch(`/api/admin/review/${id}`, {
			method: "POST",
			body: JSON.stringify({ action, note }),
		});
		if (!res.ok) {
			alert(`${action} failed`);
			return;
		}
		const result = (await res.json()) as { status: string };
		if (result.status === "approved" && confirm("Approved. Publish now?")) {
			await publishChange(id);
		}
		refetch();
	};

	const publishChange = async (id: string) => {
		const res = await apiFetch(`/api/admin/publish/${id}`, { method: "POST" });
		if (!res.ok) {
			alert("Publish failed");
			return;
		}
		document.dispatchEvent(new CustomEvent("cms:manifest-changed"));
	};

	return (
		<>
			<Show when={queue.loading}>
				<p class="loading-text">Loading...</p>
			</Show>
			<Show when={queue.error}>
				<p class="auth-error">{(queue.error as Error).message}</p>
			</Show>
			<Show when={queue() && queue()?.length === 0}>
				<p class="empty-text">No pending requests.</p>
			</Show>
			<Show when={queue() && (queue()?.length ?? 0) > 0}>
				<div class="queue-list">
					<For each={queue()}>
						{(cr) => (
							<div class="queue-item">
								<div class="queue-item-header">
									<span class="submission-type">{cr.type}</span>
									<span class="queue-user">{cr.user_name || cr.user_email}</span>
								</div>
								<p class="submission-path">{cr.target_path}</p>
								<Show when={cr.source_path}>
									<p class="submission-path">from: {cr.source_path}</p>
								</Show>
								<Show when={cr.original_filename}>
									<p class="submission-filename">
										{cr.original_filename} ({formatFileSize(cr.file_size)})
									</p>
								</Show>
								<p class="submission-date">{new Date(cr.created_at).toLocaleDateString()}</p>
								<div class="queue-actions">
									<button
										type="button"
										class="queue-approve"
										onClick={() => reviewAction(cr.id, "approve")}
									>
										Approve
									</button>
									<button
										type="button"
										class="queue-reject"
										onClick={() => reviewAction(cr.id, "reject")}
									>
										Reject
									</button>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>
		</>
	);
};

const AuditLog = () => {
	const [audit] = createResource(async () => {
		const res = await apiFetch("/api/admin/audit");
		if (!res.ok) throw new Error("Failed to load audit log");
		const data = (await res.json()) as { audit: AuditEntry[] };
		return data.audit;
	});

	return (
		<>
			<Show when={audit.loading}>
				<p class="loading-text">Loading...</p>
			</Show>
			<Show when={audit.error}>
				<p class="auth-error">{(audit.error as Error).message}</p>
			</Show>
			<Show when={audit() && audit()?.length === 0}>
				<p class="empty-text">No audit entries.</p>
			</Show>
			<Show when={audit() && (audit()?.length ?? 0) > 0}>
				<div class="audit-list">
					<For each={audit()}>
						{(entry) => (
							<div class="audit-item">
								<span class="audit-action">{entry.action}</span>
								<span class="audit-user">{entry.user_name || entry.user_id}</span>
								<span class="audit-target">
									{entry.target_type}:{entry.target_id?.slice(0, 8) || ""}
								</span>
								<span class="audit-date">{new Date(entry.created_at).toLocaleDateString()}</span>
							</div>
						)}
					</For>
				</div>
			</Show>
		</>
	);
};
