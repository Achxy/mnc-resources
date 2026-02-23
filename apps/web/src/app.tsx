import type { ManifestDirectory, ManifestNode } from "@mnc/shared";
import { Show, createEffect, createResource, createSignal, onMount } from "solid-js";
import { ContentLayout } from "./components/layout/ContentLayout";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { ModalPortal } from "./components/modals/ModalPortal";
import { PreviewPane } from "./components/preview/PreviewPane";
import { TreeContainer } from "./components/tree/TreeContainer";
import { AuthProvider } from "./features/auth/auth-context";
import { ModalProvider } from "./features/auth/modal-context";
import { fetchManifest } from "./lib/manifest-fetch";
import { PassiveLoader } from "./lib/passive-loader";
import { registerServiceWorker } from "./lib/sw-register";

export const App = () => {
	const loader = new PassiveLoader();
	const [hoveredNode, setHoveredNode] = createSignal<ManifestNode | null>(null);

	const [manifest, { refetch }] = createResource(fetchManifest);

	const loading = () => manifest.loading;
	const children = () => manifest()?.children || [];

	onMount(() => {
		registerServiceWorker();

		// Listen for manifest changes from admin publish
		document.addEventListener("cms:manifest-changed", () => {
			refetch();
		});
	});

	// Start passive loading when manifest loads
	createEffect(() => {
		const data = manifest();
		if (data) {
			loader.start(data.children);
		}
	});

	const handleToggleDirectory = (node: ManifestDirectory) => {
		loader.queuePriority(node.children);
	};

	const handleHover = (node: ManifestNode) => {
		setHoveredNode(node);
	};

	return (
		<AuthProvider>
			<ModalProvider>
				<Header />
				<ContentLayout
					loading={loading()}
					treePane=<Show
						when={!manifest.error}
						fallback={<p>Failed to load resources. Please refresh the page.</p>}
					>
						<Show when={children().length > 0}>
							<TreeContainer
								children={children()}
								onHover={handleHover}
								onToggleDirectory={handleToggleDirectory}
							/>
						</Show>
					</Show>
					previewPane={<PreviewPane node={hoveredNode()} />}
				/>
				<Footer />
				<ModalPortal />
			</ModalProvider>
		</AuthProvider>
	);
};
