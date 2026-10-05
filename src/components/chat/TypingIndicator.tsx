export default function TypingIndicator({
	label = "Designing",
}: {
	label?: string;
}) {
	return (
		<output className="flex w-full items-center gap-2.5" aria-live="polite">
			<div className="flex h-8 w-8 shrink-0 -rotate-6 items-center justify-center rounded-lg border-2 border-[var(--ftf-ink)] bg-[var(--ftf-orange-500)]">
				<svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
					<rect x="6" y="9" width="20" height="11" rx="5.5" fill="#17130f" />
					<rect x="10" y="12" width="8" height="4" fill="#ffc83d" />
					<circle cx="17" cy="22.5" r="2.6" fill="#17130f" />
				</svg>
			</div>
			<div className="flex items-center gap-2 rounded-2xl rounded-tl-md border-2 border-[var(--ftf-ink)] bg-white px-4 py-3">
				<span className="text-[12.5px] font-bold text-[var(--ftf-ink-2)]">
					{label}
				</span>
				<span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--ftf-orange-500)]" />
				<span className="typing-dot typing-dot--2 h-1.5 w-1.5 rounded-full bg-[var(--ftf-orange-500)]" />
				<span className="typing-dot typing-dot--3 h-1.5 w-1.5 rounded-full bg-[var(--ftf-orange-500)]" />
			</div>
		</output>
	);
}
