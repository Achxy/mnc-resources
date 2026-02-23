export const registerServiceWorker = () => {
	if (!("serviceWorker" in navigator)) return;

	if (import.meta.env.DEV) {
		navigator.serviceWorker.getRegistrations().then((regs) => {
			for (const r of regs) r.unregister();
		});
		return;
	}

	navigator.serviceWorker.register("/sw.js").catch((err) => {
		console.warn("SW registration failed:", err);
	});
};
