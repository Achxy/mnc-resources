import { Match, Show, Suspense, Switch, lazy } from "solid-js";
import { useModal } from "../../features/auth/modal-context";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { RenameModal } from "./RenameModal";
import { SignInModal } from "./SignInModal";
import { SignUpModal } from "./SignUpModal";
import { SubmissionsModal } from "./SubmissionsModal";
import { UploadModal } from "./UploadModal";
import { UserMenuModal } from "./UserMenuModal";

const AdminPanel = lazy(() =>
	import("../../features/admin/AdminPanel").then((m) => ({ default: m.AdminPanel })),
);

export const ModalPortal = () => {
	const { modal } = useModal();

	return (
		<Show when={modal()}>
			{(state) => (
				<Switch>
					<Match when={state().type === "sign-in"}>
						<SignInModal />
					</Match>
					<Match when={state().type === "sign-up"}>
						<SignUpModal />
					</Match>
					<Match when={state().type === "forgot-password"}>
						<ForgotPasswordModal />
					</Match>
					<Match when={state().type === "user-menu"}>
						<UserMenuModal />
					</Match>
					<Match when={state().type === "upload"}>
						<UploadModal
							targetDirectory={(state().props?.targetDirectory as string) || "/contents"}
						/>
					</Match>
					<Match when={state().type === "submissions"}>
						<SubmissionsModal />
					</Match>
					<Match when={state().type === "rename"}>
						<RenameModal sourcePath={(state().props?.sourcePath as string) || ""} />
					</Match>
					<Match when={state().type === "delete"}>
						<DeleteConfirmModal targetPath={(state().props?.targetPath as string) || ""} />
					</Match>
					<Match when={state().type === "admin"}>
						<Suspense fallback={<p class="loading-text">Loading admin panel...</p>}>
							<AdminPanel />
						</Suspense>
					</Match>
				</Switch>
			)}
		</Show>
	);
};
