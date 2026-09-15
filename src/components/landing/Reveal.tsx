/**
 * Wrapper that fades and lifts its children in on first scroll into view.
 * Staggering is done with `delay` rather than nesting, so the markup stays
 * readable and the reveal order is obvious at a glance.
 */
import type { CSSProperties, ReactNode } from "react";
import { useReveal } from "#/hooks/use-reveal";

export function Reveal({
	children,
	delay = 0,
	className = "",
}: {
	children: ReactNode;
	delay?: number;
	className?: string;
}) {
	const { ref, shown } = useReveal<HTMLDivElement>();
	return (
		<div
			ref={ref}
			data-shown={shown}
			style={{ "--rr-delay": `${delay}ms` } as CSSProperties}
			className={`rr-reveal ${className}`}
		>
			{children}
		</div>
	);
}
