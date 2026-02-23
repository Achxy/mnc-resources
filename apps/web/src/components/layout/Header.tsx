import logoUrl from "../../assets/mnc-logo.png";
import { useAuth } from "../../features/auth/auth-context";
import { useModal } from "../../features/auth/modal-context";
import s from "../../styles/header.module.css";

export const Header = () => {
	const { user } = useAuth();
	const { openModal } = useModal();

	const handleClick = () => {
		if (user()) {
			openModal("user-menu");
		} else {
			openModal("sign-in");
		}
	};

	return (
		<header class={s.header}>
			<div class={s.logoArea}>
				<img
					class={s.logo}
					src={logoUrl}
					alt="Class logo"
					width="96"
					height="96"
					decoding="async"
				/>
			</div>
			<button
				type="button"
				class={`auth-btn ${user() ? "auth-btn-signed-in" : ""}`}
				onClick={handleClick}
			>
				{user()?.name || user()?.email || "Sign In"}
			</button>
		</header>
	);
};
