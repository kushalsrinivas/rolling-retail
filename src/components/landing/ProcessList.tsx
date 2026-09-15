/**
 * The two pipelines, side by side in time rather than space.
 *
 * Eleven steps against four is the argument, and five of the eleven are the
 * same word. Revealing them one at a time lets the repetition accumulate the
 * way it does in a real week — reading "Revision" five times in a row lands
 * harder than a bullet saying revisions are costly.
 */
import { useReveal } from "#/hooks/use-reveal";

export interface Step {
	id: string;
	label: string;
}

export function ProcessList({
	steps,
	tone,
	stepMs = 90,
}: {
	steps: Step[];
	/** "today" marks the repeats; "after" is the short one. */
	tone: "today" | "after";
	stepMs?: number;
}) {
	const { ref, shown } = useReveal<HTMLOListElement>({ threshold: 0.2 });

	return (
		<ol ref={ref} className="mt-4 space-y-px">
			{steps.map((step, i) => {
				const repeat = tone === "today" && step.label === "Revision";
				return (
					<li
						key={step.id}
						data-shown={shown}
						style={{ "--rr-delay": `${i * stepMs}ms` } as React.CSSProperties}
						className={`rr-step flex items-baseline gap-3 border-l-2 py-2 pl-3 text-[15px] ${
							repeat
								? "border-orange-600 bg-orange-50/70 text-stone-800"
								: tone === "after"
									? "border-stone-900 text-stone-800"
									: "border-stone-200 text-stone-600"
						}`}
					>
						<span className="font-mono text-[11px] text-stone-400">
							{String(i + 1).padStart(2, "0")}
						</span>
						{step.label}
					</li>
				);
			})}
		</ol>
	);
}
