import { Show } from "solid-js";
import { useAuth } from "../../features/auth/auth-context";
import { ModalShell, useModal } from "../../features/auth/modal-context";

export const UserMenuModal = () => {
	const { user, signOut, isAdmin } = useAuth();
	const { openModal, closeModal } = useModal();

	const currentUser = user();
	if (!currentUser) return null;

	return (
		<ModalShell title={currentUser.name || "Account"}>
			<div class="user-menu">
				<p class="user-menu-email">{currentUser.email}</p>
				<Show when={currentUser.role === "admin"}>
					<span class="user-menu-badge">Admin</span>
				</Show>
				<hr class="user-menu-divider" />
				<Show when={isAdmin()}>
					<button
						type="button"
						class="user-menu-item"
						onClick={() => {
							closeModal();
							openModal("admin");
						}}
					>
						Admin Panel
					</button>
				</Show>
				<button
					type="button"
					class="user-menu-item"
					onClick={() => {
						closeModal();
						openModal("upload", { targetDirectory: "/contents" });
					}}
				>
					Upload File
				</button>
				<button
					type="button"
					class="user-menu-item"
					onClick={() => {
						closeModal();
						openModal("submissions");
					}}
				>
					My Submissions
				</button>
				<button
					type="button"
					class="user-menu-item user-menu-signout"
					onClick={async () => {
						await signOut();
						closeModal();
					}}
				>
					Sign Out
				</button>
			</div>
		</ModalShell>
	);
};
