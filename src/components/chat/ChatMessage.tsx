import {
	ArrowRight,
	Check,
	ClipboardList,
	ImageIcon,
	Loader2,
	RotateCcw,
	Sparkles,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	type ChatMessage as ChatMessageType,
	type GeneratedImage,
	viewTitle,
} from "#/hooks/use-chat";
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
									onDark ? "bg-white/60" : "bg-[var(--ftf-orange-500)]",
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
									onDark ? "text-white/60" : "text-[var(--ftf-orange-500)]",
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
	images: GeneratedImage[];
	busy: boolean;
	creditsLeft: number | null;
	onSelectView: (view: string) => void;
	onApplyProposal: (id: string) => void;
	onDismissProposal: (id: string) => void;
	onRetry: () => void;
}

/** The assistant's mark: the Rolling Retail badge, small. */
function Badge() {
	return (
		<div className="mt-0.5 flex h-8 w-8 shrink-0 -rotate-6 items-center justify-center rounded-lg border-2 border-[var(--ftf-ink)] bg-[var(--ftf-orange-500)]">
			<svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
				<rect x="6" y="9" width="20" height="11" rx="5.5" fill="#17130f" />
				<rect x="10" y="12" width="8" height="4" fill="#ffc83d" />
				<circle cx="17" cy="22.5" r="2.6" fill="#17130f" />
			</svg>
		</div>
	);
}

const CARD =
	"w-full rounded-2xl border-2 border-[var(--ftf-ink)] bg-white shadow-[4px_4px_0_var(--ftf-ink)]";

/** The quiz's composed brief, shown as what it is: a brief, not a paragraph. */
function BriefCard({ text }: { text: string }) {
	const lines = text
		.split(/(?<=\.)\s+(?=[A-Z])/)
		.map((l) => l.trim())
		.filter(Boolean);
	return (
		<div className={cn(CARD, "overflow-hidden")}>
			<div className="flex items-center gap-2 border-b-2 border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)] px-4 py-2.5">
				<ClipboardList className="h-4 w-4" />
				<p className="text-[12px] font-extrabold uppercase tracking-wider">
					Your brief
				</p>
			</div>
			<ul className="space-y-1.5 px-4 py-3 text-[13px] leading-relaxed text-[var(--ftf-ink-2)]">
				{lines.map((l) => (
					<li key={l} className="flex gap-2.5">
						<span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ftf-orange-500)]" />
						<span>{l}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

const REASON_TITLE: Record<string, string> = {
	first: "Your first concepts",
	revision: "Updated renders",
	more: "New angle",
	retry: "Re-rendered",
	regenerate: "Fresh take",
};

/** A finished round, inline in the timeline — tap a thumbnail to view it. */
function RendersCard({
	message,
	images,
	onSelectView,
	onRetry,
	busy,
}: Pick<
	ChatMessageProps,
	"message" | "images" | "onSelectView" | "onRetry" | "busy"
>) {
	const r = message.renders;
	if (!r) return null;
	const byView = new Map(images.map((i) => [i.label, i]));
	const failed = r.failed ?? [];
	return (
		<div className={cn(CARD, "p-3.5")}>
			<div className="flex items-center justify-between gap-2">
				<p className="flex items-center gap-2 text-[13px] font-extrabold">
					<ImageIcon className="h-4 w-4 text-[var(--ftf-orange-500)]" />
					{REASON_TITLE[r.reason ?? "first"] ?? "New renders"}
				</p>
				{r.version ? (
					<span className="rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)] px-2 py-0.5 text-[10px] font-extrabold uppercase">
						v{r.version}
					</span>
				) : null}
			</div>
			{r.views.length > 0 && (
				<div className="mt-3 grid grid-cols-3 gap-2">
					{r.views.map((v) => {
						const img = byView.get(v);
						return (
							<button
								key={v}
								type="button"
								onClick={() => onSelectView(v)}
								className="group overflow-hidden rounded-lg border-2 border-[var(--ftf-ink)] bg-[var(--ftf-well)] text-left"
								title={`Show ${viewTitle(v).toLowerCase()} on the canvas`}
							>
								{img?.url && img.status !== "failed" ? (
									<img
										src={img.url}
										alt={viewTitle(v)}
										className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								) : (
									<span className="flex aspect-[4/3] items-center justify-center">
										<Loader2 className="h-4 w-4 animate-spin text-white/50" />
									</span>
								)}
								<span className="block truncate border-t-2 border-[var(--ftf-ink)] bg-white px-2 py-1 text-[10.5px] font-bold">
									{viewTitle(v)}
								</span>
							</button>
						);
					})}
				</div>
			)}
			{failed.length > 0 && (
				<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--ftf-red-100)] px-3 py-2 text-[12px] text-[var(--ftf-red-600)]">
					<span>{failed.map(viewTitle).join(", ")} didn&apos;t render.</span>
					<button
						type="button"
						disabled={busy}
						onClick={onRetry}
						className="flex items-center gap-1 font-bold underline-offset-2 hover:underline disabled:opacity-50"
					>
						<RotateCcw className="h-3 w-3" /> Retry free
					</button>
				</div>
			)}
			{r.views.length > 0 && (
				<p className="mt-2.5 text-[11.5px] leading-snug text-[var(--ftf-ink-3)]">
					Concept renders — dimensions, openings and equipment are confirmed by
					our factory before build.
				</p>
			)}
		</div>
	);
}

/** A change the designer proposed. Nothing re-renders until the buyer applies it. */
function ProposalCard({
	message,
	busy,
	creditsLeft,
	onApplyProposal,
	onDismissProposal,
}: Pick<
	ChatMessageProps,
	"message" | "busy" | "creditsLeft" | "onApplyProposal" | "onDismissProposal"
>) {
	const p = message.proposal;
	if (!p) return null;
	const out = typeof creditsLeft === "number" && creditsLeft <= 0;
	return (
		<div
			className={cn(
				CARD,
				"overflow-hidden",
				p.status === "dismissed" && "opacity-60 shadow-none",
			)}
		>
			<div className="flex items-center gap-2 border-b-2 border-[var(--ftf-ink)] bg-[var(--ftf-orange-100)] px-4 py-2.5">
				<Sparkles className="h-4 w-4 text-[var(--ftf-orange-500)]" />
				<p className="text-[12px] font-extrabold uppercase tracking-wider">
					Proposed change
				</p>
				{p.status === "applied" && (
					<span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-[var(--ftf-teal-600)]">
						<Check className="h-3.5 w-3.5" /> Applied
						{p.version ? ` · v${p.version}` : ""}
					</span>
				)}
				{p.status === "dismissed" && (
					<span className="ml-auto text-[11px] font-bold text-[var(--ftf-ink-3)]">
						Not applied
					</span>
				)}
			</div>
			<div className="px-4 py-3">
				<p className="text-[14px] font-bold leading-snug">{p.changeSummary}</p>
				{p.changes.length > 0 && (
					<ul className="mt-2 space-y-1 text-[12.5px] text-[var(--ftf-ink-2)]">
						{p.changes.map((c) => (
							<li key={c} className="flex gap-2">
								<ArrowRight className="mt-[3px] h-3 w-3 shrink-0 text-[var(--ftf-orange-500)]" />
								{c}
							</li>
						))}
					</ul>
				)}
				<p className="mt-2 text-[11.5px] text-[var(--ftf-ink-3)]">
					Everything else stays exactly as it is. Re-renders {p.viewCount} view
					{p.viewCount === 1 ? "" : "s"} · uses 1 design round.
				</p>
				{(p.status === "pending" || p.status === "applying") && (
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<button
							type="button"
							disabled={busy || out || p.status === "applying"}
							onClick={() => onApplyProposal(p.id)}
							className="ftf-cta inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
						>
							{p.status === "applying" ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…
								</>
							) : (
								<>Apply &amp; re-render</>
							)}
						</button>
						{p.status === "pending" && (
							<button
								type="button"
								onClick={() => onDismissProposal(p.id)}
								className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[12.5px] font-bold text-[var(--ftf-ink-2)] hover:bg-[var(--ftf-paper-2)]"
							>
								<X className="h-3.5 w-3.5" /> Not now
							</button>
						)}
						{out && (
							<span className="text-[11.5px] text-[var(--ftf-red-600)]">
								No design rounds left — request a quote to keep refining.
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export default function ChatMessage(props: ChatMessageProps) {
	const { message, isLatest } = props;
	const isUser = message.role === "user";

	if (message.notice) {
		return (
			<div className="flex w-full justify-center px-1">
				<p className="max-w-[90%] rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-amber-100)] px-3 py-1.5 text-center text-xs font-semibold">
					{message.content}
				</p>
			</div>
		);
	}

	if (message.kind === "renders" || message.kind === "proposal") {
		return (
			<div className="chat-message flex w-full gap-2.5">
				<Badge />
				<div className="min-w-0 flex-1 max-w-[92%]">
					{message.kind === "renders" ? (
						<RendersCard {...props} />
					) : (
						<ProposalCard {...props} />
					)}
				</div>
			</div>
		);
	}

	if (isUser && message.kind === "brief") {
		return (
			<div className="chat-message flex w-full justify-end">
				<div className="w-full max-w-[92%]">
					<BriefCard text={message.content} />
				</div>
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
			{!isUser && <Badge />}
			<div
				className={cn(
					"relative max-w-[85%] px-4 py-3 text-[14px] leading-relaxed",
					isUser
						? "rounded-2xl rounded-br-md border-2 border-[var(--ftf-ink)] bg-[var(--ftf-ink)] text-white"
						: cn(
								"rounded-2xl rounded-tl-md border-2 border-[var(--ftf-ink)] bg-white text-[var(--ftf-ink)]",
								isLatest && "shadow-[3px_3px_0_var(--ftf-ink)]",
							),
				)}
			>
				{isUser && message.image && (
					<img
						src={message.image}
						alt="Attached inspiration"
						className="mb-2 max-h-48 w-auto rounded-lg border-2 border-white/30 object-cover"
					/>
				)}
				{isUser ? (
					<span className="whitespace-pre-wrap">{message.content}</span>
				) : message.content ? (
					<Markdown text={message.content} onDark={false} />
				) : null}
				{message.isStreaming && (
					<span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-full bg-[var(--ftf-orange-500)] align-middle" />
				)}
			</div>
		</div>
	);
}
