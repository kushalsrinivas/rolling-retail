import { useEffect, useRef, useState } from "react";

/**
 * Reveal an element the first time it scrolls into view.
 *
 * Once only — re-animating on the way back up is the thing that makes a page
 * feel like a demo rather than a document. Honours prefers-reduced-motion by
 * reporting "already revealed", so the content is simply there.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
	options: { threshold?: number; rootMargin?: string } = {},
) {
	const ref = useRef<T>(null);
	const [shown, setShown] = useState(false);

	const { threshold = 0.15, rootMargin = "0px 0px -8% 0px" } = options;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		if (
			typeof window === "undefined" ||
			!("IntersectionObserver" in window) ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			setShown(true);
			return;
		}

		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setShown(true);
					io.disconnect();
				}
			},
			{ threshold, rootMargin },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [threshold, rootMargin]);

	return { ref, shown };
}
