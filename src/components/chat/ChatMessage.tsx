import { Factory, User } from "lucide-react";
import type { ReactNode } from "react";
import type { ChatMessage as ChatMessageType } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";

/** Minimal chat markdown: headings, bold, italic, code, bullets, numbered. */
function renderInline(
	text: string,
	keyPrefix: string,
	onDark: boolean,
): ReactNode[] {
	const out: ReactNode[] = [];
	// **bold**, *italic*, `code` — unclosed spans render as plain text (streaming-safe).
	const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)/g;
	let last = 0;
	let m: RegExpExecArray | null;
	let k = 0;
	while ((m = re.exec(text)) !== null) {
		if (m.index > last) out.push(text.slice(last, m.index));
		if (m[2] !== undefined) {
			out.push(
				<strong
					key={`${keyPrefix}-b${k++}`}
					className={cn(
						"font-semibold",
						onDark ? "text-white" : "text-[var(--ftf-ink)]",
					)}
				>
					{m[2]}
				</strong>,
			);
		} else if (m[3] !== undefined) {
			out.push(
				<em key={`${keyPrefix}-i${k++}`} className="italic">
					{m[3]}
				</em>,
			);
		} else if (m[4] !== undefined) {
			out.push(
				<code
					key={`${keyPrefix}-c${k++}`}
					className={cn(
						"rounded-sm px-1 py-px font-mono text-[12px]",
						onDark
							? "bg-white/15 text-white"
							: "bg-[var(--ftf-paper-3)] text-[var(--ftf-blue-800)]",
					)}
				>
					{m[4]}
				</code>,
			);
		}
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out.length ? out : [text];
}

function Markdown({ text, onDark }: { text: string; onDark: boolean }) {
	const lines = text.split("\n");
	const blocks: ReactNode[] = [];
	let list: { type: "ul" | "ol"; items: string[] } | null = null;
	const flushList = (key: string) => {
		if (!list) return;
		const { type, items } = list;
		list = null;
		if (type === "ul") {
			blocks.push(
				<ul key={key} className="my-1.5 space-y-1">
					{items.map((it, i) => (
						<li key={i} className="flex gap-2.5 leading-relaxed">
							{/* A square marker, not a dot — the whole surface is square. */}
							<span
								className={cn(
									"mt-[7px] h-[5px] w-[5px] shrink-0 rounded-[1px]",
									onDark ? "bg-white/50" : "bg-[var(--ftf-blue-600)]",
								)}
							/>
							<span className="flex-1">
								{renderInline(it, `${key}-${i}`, onDark)}
							</span>
						</li>
					))}
				</ul>,
			);
		} else {
			blocks.push(
				<ol key={key} className="my-1.5 space-y-1">
					{items.map((it, i) => (
						<li key={i} className="flex gap-2.5 leading-relaxed">
							<span
								className={cn(
									"w-4 shrink-0 text-right font-semibold tabular-nums",
									onDark ? "text-white/60" : "text-[var(--ftf-blue-600)]",
								)}
							>
								{i + 1}
							</span>
							<span className="flex-1">
								{renderInline(it, `${key}-${i}`, onDark)}
							</span>
						</li>
					))}
				</ol>,
			);
		}
	};

	lines.forEach((raw, idx) => {
		const line = raw.trimEnd();
		const stripped = line.trim();
		if (!stripped) {
			flushList(`l${idx}`);
			return;
		}
		const h = stripped.match(/^(#{1,4})\s+(.*)$/);
		if (h) {
			flushList(`l${idx}`);
			blocks.push(
				<p
					key={`h${idx}`}
					className={cn(
						"ftf-label mb-1 mt-3 first:mt-0",
						onDark && "text-white/70",
					)}
				>
					{renderInline(h[2], `h${idx}`, onDark)}
				</p>,
			);
			return;
		}
		const bullet = stripped.match(/^[-*•]\s+(.*)$/);
		if (bullet) {
			if (!list || list.type !== "ul") {
				flushList(`l${idx}`);
				list = { type: "ul", items: [] };
			}
			list.items.push(bullet[1]);
			return;
		}
		const numbered = stripped.match(/^\d+[.)]\s+(.*)$/);
		if (numbered) {
			if (!list || list.type !== "ol") {
				flushList(`l${idx}`);
				list = { type: "ol", items: [] };
			}
			list.items.push(numbered[1]);
			return;
		}
		flushList(`l${idx}`);
		blocks.push(
			<p key={`p${idx}`} className="leading-relaxed">
				{renderInline(stripped, `p${idx}`, onDark)}
			</p>,
		);
	});
	flushList("lend");
	return <div className="space-y-1">{blocks}</div>;
}

interface ChatMessageProps {
	message: ChatMessageType;
	isLatest?: boolean;
}

export default function ChatMessage({ message, isLatest }: ChatMessageProps) {
	const isUser = message.role === "user";

	if (message.notice) {
		return (
			<div className="flex w-full justify-center px-1">
				<p className="max-w-[90%] rounded-sm border-l-2 border-[var(--ftf-amber-500)] bg-[var(--ftf-amber-100)] px-3 py-2 text-center text-xs text-[var(--ftf-amber-600)]">
					{message.content}
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"chat-message flex w-full gap-2.5",
				isUser ? "flex-row-reverse" : "flex-row",
			)}
		>
			{/* Avatar — a square badge, matching the header mark. */}
			<div
				className={cn(
					"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm",
					isUser
						? "border border-[var(--ftf-line)] bg-white text-[var(--ftf-ink-3)]"
						: "bg-[var(--ftf-blue-800)] text-white",
				)}
			>
				{isUser ? (
					<User className="h-3.5 w-3.5" />
				) : (
					<Factory className="h-3.5 w-3.5" />
				)}
			</div>

			{/* Bubble */}
			<div
				className={cn(
					"relative max-w-[80%] rounded px-3.5 py-2.5 text-[13px] leading-relaxed",
					isUser
						? "bg-[var(--ftf-blue-800)] text-white"
						: "border bg-white text-[var(--ftf-ink)]",
					// The newest reply gets a firmer edge so the eye lands on it
					// without a colour change or a glow doing the work.
					!isUser &&
						(isLatest
							? "border-[var(--ftf-line-strong)]"
							: "border-[var(--ftf-line)]"),
				)}
			>
				{isUser && message.image && (
					<img
						src={message.image}
						alt="Attached inspiration"
						className="mb-2 max-h-48 w-auto rounded-sm border border-white/25 object-cover"
					/>
				)}
				{isUser && message.content.startsWith("[Context:") ? (
					(() => {
						const nlIdx = message.content.indexOf("\n\n");
						const contextLine =
							nlIdx !== -1 ? message.content.slice(0, nlIdx) : "";
						const questionText =
							nlIdx !== -1 ? message.content.slice(nlIdx + 2) : message.content;
						const ctxMatch = contextLine.match(/^\[Context: (.+?) = (.+?)\]$/);
						return (
							<>
								{ctxMatch && (
									<div className="mb-2 flex items-center gap-1.5 rounded-sm border-l-2 border-white/40 bg-white/10 px-2.5 py-1.5">
										<span className="ftf-label !text-white/90">
											{ctxMatch[1]}
										</span>
										<span className="truncate text-[11px] text-white/70">
											{ctxMatch[2]}
										</span>
									</div>
								)}
								<span className="whitespace-pre-wrap">{questionText}</span>
							</>
						);
					})()
				) : isUser ? (
					<span className="whitespace-pre-wrap">{message.content}</span>
				) : (
					<Markdown text={message.content} onDark={false} />
				)}
				{message.isStreaming && (
					<span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[var(--ftf-blue-600)] align-middle" />
				)}
				<span
					className={cn(
						"mt-1.5 block text-[10px] tabular-nums",
						isUser
							? "text-right text-white/50"
							: "text-left text-[var(--ftf-ink-4)]",
					)}
				>
					{message.timestamp.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			</div>
		</div>
	);
}
