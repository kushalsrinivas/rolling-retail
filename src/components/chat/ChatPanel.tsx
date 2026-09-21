import { AlertCircle, Factory, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { useChat } from "#/hooks/use-chat";
import { BUSINESS_TYPES, VEHICLES } from "#/lib/food-truck/constants";
import { cn } from "#/lib/utils";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

interface ChatPanelProps {
	chat: ReturnType<typeof useChat>;
}

/**
 * Every field in the spec bar looks the same: a Montserrat label above a
 * square control with a blue focus ring. The old panel had three slightly
 * different input treatments in one row.
 */
const FIELD =
	"w-full rounded border border-[var(--ftf-line)] bg-white px-2.5 py-2 text-xs text-[var(--ftf-ink)] outline-none transition-colors hover:border-[var(--ftf-line-strong)] focus:border-[var(--ftf-blue-600)]";

export default function ChatPanel({ chat }: ChatPanelProps) {
	const {
		messages,
		isStreaming,
		isConnecting,
		isGeneratingImages,
		creditsLeft,
		vehicleId,
		setVehicleId,
		businessType,
		setBusinessType,
		brandName,
		setBrandName,
		error,
		sendMessage,
		generateConcepts,
		clearError,
	} = chat;
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isStreaming, isConnecting]);

	return (
		<div className="chat-panel flex h-full flex-col bg-[var(--ftf-paper-2)]">
			{/* ── Header ── */}
			<div className="flex shrink-0 items-center gap-3 border-b border-[var(--ftf-line)] bg-white px-5 py-3.5">
				<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--ftf-blue-800)]">
					<Factory className="h-[18px] w-[18px] text-white" />
				</div>
				<div className="min-w-0">
					<p className="ftf-display text-[15px] leading-tight text-[var(--ftf-ink)]">
						Factory Designer
					</p>
					<p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ftf-ink-3)]">
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--ftf-teal-500)]" />
						Online · typically replies instantly
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					{isGeneratingImages && (
						<span className="flex items-center gap-1.5 rounded-sm bg-[var(--ftf-amber-100)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ftf-amber-600)]">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ftf-amber-500)]" />
							Rendering
						</span>
					)}
					{typeof creditsLeft === "number" && (
						<span className="hidden rounded-sm border border-[var(--ftf-line)] px-2.5 py-1.5 text-[11px] tabular-nums text-[var(--ftf-ink-2)] sm:block">
							<span className="font-semibold text-[var(--ftf-ink)]">
								{creditsLeft}
							</span>
							<span className="text-[var(--ftf-ink-4)]"> / 5 visuals</span>
						</span>
					)}
				</div>
			</div>

			{/* ── Spec bar: the three facts every render depends on ── */}
			<div className="shrink-0 border-b border-[var(--ftf-line)] bg-white px-5 pb-3.5 pt-3">
				<p className="ftf-label mb-2">Build parameters</p>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block text-[11px] font-medium text-[var(--ftf-ink-2)]">
							Brand name
						</span>
						<input
							value={brandName}
							onChange={(e) => setBrandName(e.target.value)}
							placeholder="e.g. Ember &amp; Oak"
							className={cn(FIELD, "placeholder:text-[var(--ftf-ink-4)]")}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] font-medium text-[var(--ftf-ink-2)]">
							Vehicle
						</span>
						<select
							value={vehicleId}
							onChange={(e) => setVehicleId(e.target.value)}
							className={FIELD}
						>
							{VEHICLES.map((v) => (
								<option key={v.id} value={v.id} title={v.blurb}>
									{v.label}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] font-medium text-[var(--ftf-ink-2)]">
							Business type
						</span>
						<select
							value={businessType}
							onChange={(e) => setBusinessType(e.target.value)}
							className={FIELD}
						>
							{BUSINESS_TYPES.map((b) => (
								<option key={b.id} value={b.id} title={b.note}>
									{b.label}
								</option>
							))}
						</select>
					</label>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => generateConcepts()}
						disabled={isGeneratingImages || isStreaming}
						className="ftf-cta rounded px-4 py-2 text-xs"
					>
						{isGeneratingImages ? "Rendering concepts…" : "Generate concepts"}
					</button>
					<button
						type="button"
						onClick={() =>
							sendMessage(
								"Please recommend the most suitable layout for my menu and service style.",
							)
						}
						disabled={isStreaming || isConnecting}
						className="rounded border border-[var(--ftf-line-strong)] px-3.5 py-2 text-xs font-medium text-[var(--ftf-blue-800)] transition-colors hover:bg-[var(--ftf-blue-50)] disabled:opacity-40"
					>
						Recommend layout
					</button>
					<button
						type="button"
						onClick={() =>
							sendMessage(
								"Please prepare my specification summary and factory handover. My contact details are: ",
							)
						}
						disabled={isStreaming || isConnecting}
						className="rounded border border-[var(--ftf-line-strong)] px-3.5 py-2 text-xs font-medium text-[var(--ftf-blue-800)] transition-colors hover:bg-[var(--ftf-blue-50)] disabled:opacity-40"
					>
						Build specification
					</button>
				</div>
			</div>

			{/* ── Error banner ── */}
			{error && (
				<div className="flex items-start gap-2 border-b border-[var(--ftf-line)] bg-[var(--ftf-red-100)] px-5 py-2.5 text-xs text-[var(--ftf-red-600)]">
					<AlertCircle className="mt-px h-4 w-4 shrink-0" />
					<p className="flex-1 leading-relaxed">{error}</p>
					<button
						type="button"
						onClick={clearError}
						aria-label="Dismiss"
						className="shrink-0 rounded-sm p-0.5 transition-colors hover:bg-[var(--ftf-red-500)]/10"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			)}

			{/* ── Messages ── */}
			<div className="chat-messages flex-1 space-y-4 overflow-y-auto px-5 py-5">
				{messages.map((msg, i) => (
					<ChatMessage
						key={msg.id}
						message={msg}
						isLatest={i === messages.length - 1}
					/>
				))}
				{(isConnecting ||
					(isStreaming && messages[messages.length - 1]?.content === "")) && (
					<TypingIndicator />
				)}
				<div ref={bottomRef} />
			</div>

			{/* ── Input ── */}
			<div className="shrink-0 border-t border-[var(--ftf-line)] bg-white">
				<ChatInput
					onSend={sendMessage}
					disabled={isStreaming || isConnecting}
					placeholder="Describe your brand, menu, colors, service style and inspiration…"
				/>
			</div>
		</div>
	);
}
