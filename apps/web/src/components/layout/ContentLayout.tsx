import { type JSX, createSignal, onCleanup, onMount } from "solid-js";
import { MIN_FULL_WIDTH } from "../../lib/config";
import s from "../../styles/layout.module.css";

export const ContentLayout = (props: {
	treePane: JSX.Element;
	previewPane: JSX.Element;
	loading: boolean;
}) => {
	const [isNarrow, setIsNarrow] = createSignal(window.innerWidth < MIN_FULL_WIDTH);

	onMount(() => {
		let timer: ReturnType<typeof setTimeout>;
		const onResize = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				setIsNarrow(window.innerWidth < MIN_FULL_WIDTH);
			}, 100);
		};
		window.addEventListener("resize", onResize);
		onCleanup(() => window.removeEventListener("resize", onResize));
	});

	return (
		<main class={s.app} aria-label="Class resources">
			<section class={`${s.contentPanel} ${props.loading ? s.contentPanelLoading : ""}`}>
				<h1 class={s.contentTitle}>Contents</h1>
				<div class={s.contentLayout}>
					<div class={`${s.treePane} ${isNarrow() ? s.treePaneFull : ""}`}>{props.treePane}</div>
					<div class={`${s.previewPane} ${isNarrow() ? s.previewPaneHidden : ""}`}>
						{props.previewPane}
					</div>
				</div>
			</section>
		</main>
	);
};
