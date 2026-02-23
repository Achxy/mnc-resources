import s from "../../styles/footer.module.css";

export const Footer = () => {
	return (
		<footer class={s.footer}>
			<p class={s.text}>
				Designed and maintained by{" "}
				<a
					href="https://www.linkedin.com/in/achyuthjayadevan/"
					target="_blank"
					rel="noopener noreferrer"
					class={s.link}
				>
					Achyuth Jayadevan
				</a>
			</p>
		</footer>
	);
};
