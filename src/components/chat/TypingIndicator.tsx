import { Factory } from "lucide-react";

export default function TypingIndicator() {
	return (
		<div className="flex w-full gap-2.5">
			<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[var(--ftf-blue-800)] text-white">
				<Factory className="h-3.5 w-3.5" />
			</div>
			<div className="flex items-center gap-1.5 rounded border border-[var(--ftf-line)] bg-white px-4 py-4">
				<span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--ftf-blue-600)]" />
				<span className="typing-dot typing-dot--2 h-1.5 w-1.5 rounded-full bg-[var(--ftf-blue-600)]" />
				<span className="typing-dot typing-dot--3 h-1.5 w-1.5 rounded-full bg-[var(--ftf-blue-600)]" />
			</div>
		</div>
	);
}
