import {
	type Accessor,
	type JSX,
	createContext,
	createSignal,
	onMount,
	useContext,
} from "solid-js";
import { apiFetch } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

export type User = {
	id: string;
	email: string;
	name: string;
	role: string | null;
	emailVerified: boolean;
	username?: string;
};

type AuthContextValue = {
	user: Accessor<User | null>;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string, name: string, username: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshSession: () => Promise<void>;
	verifyAndSetup: (email: string, code: string, password: string) => Promise<void>;
	sendResetOTP: (email: string) => Promise<void>;
	resetWithOTP: (email: string, code: string, password: string) => Promise<void>;
	isAdmin: () => boolean;
};

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider = (props: { children: JSX.Element }) => {
	const [user, setUser] = createSignal<User | null>(null);

	const refreshSession = async () => {
		try {
			const { data } = await authClient.getSession();
			setUser((data?.user as unknown as User) || null);
		} catch {
			setUser(null);
		}
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await authClient.signIn.email({ email, password });
		if (error) throw new Error(error.message || "Sign in failed");
		setUser((data?.user as unknown as User) || null);
	};

	const signUp = async (email: string, password: string, name: string, username: string) => {
		const { error } = await authClient.signUp.email({
			email,
			password,
			name,
			username,
		});
		if (error) throw new Error(error.message || "Sign up failed");
		await authClient.signOut();
	};

	const signOut = async () => {
		await authClient.signOut();
		setUser(null);
	};

	const verifyAndSetup = async (email: string, code: string, password: string) => {
		const res = await apiFetch("/api/auth/verify-and-setup", {
			method: "POST",
			body: JSON.stringify({ email, code, password }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error((data as { error?: string }).error || "Verification failed");
		}
	};

	const sendResetOTP = async (email: string) => {
		const res = await apiFetch("/api/auth/send-reset-otp", {
			method: "POST",
			body: JSON.stringify({ email }),
		});
		if (!res.ok) throw new Error("Request failed");
	};

	const resetWithOTP = async (email: string, code: string, password: string) => {
		const res = await apiFetch("/api/auth/reset-with-otp", {
			method: "POST",
			body: JSON.stringify({ email, code, password }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error((data as { error?: string }).error || "Reset failed");
		}
	};

	const isAdmin = () => user()?.role === "admin";

	onMount(() => {
		refreshSession();
	});

	return (
		<AuthContext.Provider
			value={{
				user,
				signIn,
				signUp,
				signOut,
				refreshSession,
				verifyAndSetup,
				sendResetOTP,
				resetWithOTP,
				isAdmin,
			}}
		>
			{props.children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};
