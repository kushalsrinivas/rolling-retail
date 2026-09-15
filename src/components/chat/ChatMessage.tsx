import { Bot, User } from "lucide-react";
import type { ReactNode } from "react";
import type { ChatMessage as ChatMessageType } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";

/** Minimal chat markdown: headings, bold, italic, code, bullets, numbered. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
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
					className="font-semibold text-zinc-50"
				>
					{m[2]}
				</strong>,
			);
		} else if (m[3] !== undefined) {
			out.push(
				<em key={`${keyPrefix}-i${k++}`} className="text-zinc-200">
					{m[3]}
				</em>,
			);
		} else if (m[4] !== undefined) {
			out.push(
				<code
					key={`${keyPrefix}-c${k++}`}
					className="rounded bg-zinc-800 px-1 py-px text-[12px] text-amber-200"
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

function Markdown({ text }: { text: string }) {
	const lines = text.split("\n");
	const blocks: ReactNode[] = [];
	let list: { type: "ul" | "ol"; items: string[] } | null = null;
	const flushList = (key: string) => {
		if (!list) return;
		const { type, items } = list;
		list = null;
		if (type === "ul") {
			blocks.push(
				<ul key={key} className="my-1.5 space-y-1 pl-1">
					{items.map((it, i) => (
						<li key={i} className="flex gap-2 leading-relaxed">
							<span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-purple-400/80" />
							<span className="flex-1">{renderInline(it, `${key}-${i}`)}</span>
						</li>
					))}
				</ul>,
			);
		} else {
			blocks.push(
				<ol key={key} className="my-1.5 space-y-1 pl-1">
					{items.map((it, i) => (
						<li key={i} className="flex gap-2 leading-relaxed">
							<span className="w-4 shrink-0 text-right tabular-nums text-purple-300/90">
								{i + 1}.
							</span>
							<span className="flex-1">{renderInline(it, `${key}-${i}`)}</span>
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
					className="mb-0.5 mt-2.5 text-[13px] font-semibold tracking-tight text-zinc-50 first:mt-0"
				>
					{renderInline(h[2], `h${idx}`)}
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
				{renderInline(stripped, `p${idx}`)}
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
				<p className="max-w-[90%] rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-center text-xs text-amber-300">
					{message.content}
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"chat-message flex w-full gap-3 px-1",
				isUser ? "flex-row-reverse" : "flex-row",
				isLatest && "chat-message--latest",
			)}
		>
			{/* Avatar */}
			<div
				className={cn(
					"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
					isUser
						? "border-purple-500/30 bg-purple-500/10 text-purple-400"
						: "border-[rgba(163,130,255,0.15)] bg-[rgba(168,85,247,0.08)] text-purple-400",
				)}
			>
				{isUser ? (
					<User className="h-3.5 w-3.5" />
				) : (
					<Bot className="h-3.5 w-3.5" />
				)}
			</div>

			{/* Bubble */}
			<div
				className={cn(
					"relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
					isUser
						? "rounded-tr-sm bg-purple-600/20 text-[#fafafa] ring-1 ring-purple-500/25"
						: "rounded-tl-sm bg-[#18181b] text-[#e4e4e7] ring-1 ring-[rgba(163,130,255,0.08)]",
				)}
			>
				{isUser && message.image && (
					<img
						src={message.image}
						alt="Attached inspiration"
						className="mb-2 max-h-48 w-auto rounded-xl border border-purple-500/25 object-cover"
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
									<div className="mb-2 flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1.5">
										<span className="text-[10px] font-medium text-purple-300">
											{ctxMatch[1]}
										</span>
										<span className="text-[10px] text-purple-400/60">·</span>
										<span className="truncate text-[10px] text-purple-300/70">
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
					<Markdown text={message.content} />
				)}
				{message.isStreaming && (
					<span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-purple-400/80" />
				)}
				<span
					className={cn(
						"mt-1 block text-[10px]",
						isUser
							? "text-right text-purple-300/50"
							: "text-left text-zinc-600",
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
