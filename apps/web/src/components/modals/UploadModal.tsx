import { For, createSignal } from "solid-js";
import { ModalShell } from "../../features/auth/modal-context";
import { apiUrl } from "../../lib/api";
import { formatFileSize } from "../../lib/api";

type FileEntry = {
	id: number;
	file: File;
	progress: number;
	status: "pending" | "uploading" | "success" | "failed";
};

export const UploadModal = (props: { targetDirectory?: string }) => {
	const [files, setFiles] = createSignal<FileEntry[]>([]);
	const [error, setError] = createSignal("");
	const [uploading, setUploading] = createSignal(false);
	let nextId = 0;
	let fileInputRef!: HTMLInputElement;

	const targetDir = () => props.targetDirectory || "/contents";

	const addFiles = (newFiles: FileList | File[]) => {
		const entries: FileEntry[] = Array.from(newFiles).map((file) => ({
			id: nextId++,
			file,
			progress: 0,
			status: "pending" as const,
		}));
		setFiles((prev) => [...prev, ...entries]);
	};

	const removeFile = (id: number) => {
		setFiles((prev) => prev.filter((f) => f.id !== id));
	};

	const uploadFile = (entry: FileEntry): Promise<void> =>
		new Promise((resolve) => {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", apiUrl("/api/changes/upload"));
			xhr.withCredentials = true;

			xhr.upload.addEventListener("progress", (ev) => {
				if (ev.lengthComputable) {
					const pct = Math.round((ev.loaded / ev.total) * 100);
					setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, progress: pct } : f)));
				}
			});

			xhr.addEventListener("load", () => {
				const status = xhr.status >= 200 && xhr.status < 300 ? "success" : "failed";
				setFiles((prev) =>
					prev.map((f) => (f.id === entry.id ? { ...f, status, progress: 100 } : f)),
				);
				resolve();
			});

			xhr.addEventListener("error", () => {
				setFiles((prev) =>
					prev.map((f) => (f.id === entry.id ? { ...f, status: "failed" as const } : f)),
				);
				resolve();
			});

			const formData = new FormData();
			formData.append("file", entry.file);
			formData.append("targetPath", `${targetDir()}/${entry.file.name}`);
			xhr.send(formData);
		});

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		const entries = files();
		if (!entries.length) return;

		setError("");
		setUploading(true);

		for (const entry of entries) {
			await uploadFile(entry);
		}

		const failed = files().filter((f) => f.status === "failed").length;
		const succeeded = files().filter((f) => f.status === "success").length;

		if (failed > 0) {
			setError(`${failed} upload(s) failed. ${succeeded} succeeded.`);
		}
		setUploading(false);
	};

	const count = () => files().length;
	const allDone = () => files().every((f) => f.status === "success" || f.status === "failed");

	return (
		<ModalShell title="Upload Files">
			<form class="auth-form" onSubmit={handleSubmit}>
				<label class="auth-label">
					Target Directory
					<input type="text" value={targetDir()} required class="auth-input" readOnly />
				</label>
				<div class="upload-file-list">
					<For each={files()}>
						{(entry) => (
							<div
								class={`upload-file-item ${entry.status === "success" ? "upload-success" : ""} ${entry.status === "failed" ? "upload-failed" : ""}`}
							>
								<div class="upload-file-info">
									<span class="upload-file-name">{entry.file.name}</span>
									<span class="upload-file-size">{formatFileSize(entry.file.size)}</span>
								</div>
								{entry.status === "uploading" || entry.progress > 0 ? (
									<div class="upload-file-progress">
										<div class="upload-file-progress-bar" style={{ width: `${entry.progress}%` }} />
									</div>
								) : null}
								{!uploading() && entry.status === "pending" ? (
									<button
										type="button"
										class="upload-file-remove"
										aria-label="Remove"
										onClick={() => removeFile(entry.id)}
									>
										&times;
									</button>
								) : null}
							</div>
						)}
					</For>
				</div>
				<div class="upload-add-area">
					<button
						type="button"
						class="upload-add-btn"
						disabled={uploading()}
						onClick={() => fileInputRef.click()}
					>
						+ Add files
					</button>
					<input
						type="file"
						multiple
						hidden
						ref={fileInputRef}
						onChange={(e) => {
							const input = e.target as HTMLInputElement;
							if (input.files?.length) addFiles(input.files);
							input.value = "";
						}}
					/>
				</div>
				{error() && <p class="auth-error">{error()}</p>}
				<button type="submit" class="auth-submit" disabled={count() === 0 || uploading()}>
					{count() === 0
						? "Select files to upload"
						: allDone()
							? `Done (${files().filter((f) => f.status === "success").length} uploaded)`
							: uploading()
								? "Uploading..."
								: `Submit for Review (${count()} file${count() > 1 ? "s" : ""})`}
				</button>
			</form>
		</ModalShell>
	);
};
