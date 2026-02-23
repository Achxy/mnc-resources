import { type Accessor, type JSX, createContext, createSignal, useContext } from "solid-js";
import { Portal } from "solid-js/web";

export type ModalType =
	| "sign-in"
	| "sign-up"
	| "forgot-password"
	| "user-menu"
	| "upload"
	| "submissions"
	| "rename"
	| "delete"
	| "admin";

export type ModalState = {
	type: ModalType;
	props?: Record<string, unknown>;
} | null;

type ModalContextValue = {
	modal: Accessor<ModalState>;
	openModal: (type: ModalType, props?: Record<string, unknown>) => void;
	closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue>();

export const ModalProvider = (props: { children: JSX.Element }) => {
	const [modal, setModal] = createSignal<ModalState>(null);

	const openModal = (type: ModalType, modalProps?: Record<string, unknown>) => {
		setModal({ type, props: modalProps });
	};

	const closeModal = () => {
		setModal(null);
	};

	return (
		<ModalContext.Provider value={{ modal, openModal, closeModal }}>
			{props.children}
		</ModalContext.Provider>
	);
};

export const useModal = () => {
	const ctx = useContext(ModalContext);
	if (!ctx) throw new Error("useModal must be used within ModalProvider");
	return ctx;
};

export const ModalShell = (props: { title: string; children: JSX.Element }) => {
	const { closeModal } = useModal();

	const handleOverlayClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) closeModal();
	};

	return (
		<Portal>
			<div class="modal-overlay" onClick={handleOverlayClick}>
				<div class="modal" role="dialog" aria-modal="true">
					<div class="modal-header">
						<h2 class="modal-title">{props.title}</h2>
						<button type="button" class="modal-close" aria-label="Close" onClick={closeModal}>
							&times;
						</button>
					</div>
					<div class="modal-body">{props.children}</div>
				</div>
			</div>
		</Portal>
	);
};
