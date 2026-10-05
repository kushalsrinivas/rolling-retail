/**
 * The conversation: the design's timeline.
 *
 * No form bar above the chat any more — the brief already set the brand,
 * the body and the business, and three dropdowns that silently overrode it
 * were how the panel and the chat fell out of step. Changes are asked for
 * in words and come back as a proposal card the buyer applies.
 */
import { AlertCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { useChat } from "#/hooks/use-chat";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

interface ChatPanelProps {
	chat: ReturnType<typeof useChat>;
	/** Bring the canvas into view (phone layout). */
	onShowCanvas?: () => void;
	onRequestQuote: () => void;
}

type Suggestion = { label: string; send?: string; run?: () => void };

export default function ChatPanel({
	chat,
	onShowCanvas,
	onRequestQuote,
}: ChatPanelProps) {
	const {
		messages,
		images,
		isStreaming,
		isConnecting,
		isGeneratingImages,
		creditsLeft,
		error,
		sendMessage,
		clearError,
		applyProposal,
		dismissProposal,
		retryFailedRenders,
		renderViews,
		setSelectedView,
		progress,
	} = chat;
	const bottomRef = useRef<HTMLDivElement>(null);
	const busy = isStreaming || isConnecting || isGeneratingImages;
	const ready = new Set(
		images.filter((i) => i.status === "ready").map((i) => i.label),
	);
	const hasRenders = ready.size > 0;
	const pendingProposal = messages.some(
		(m) => m.kind === "proposal" && m.proposal?.status === "pending",
	);

	// Follow the conversation as it grows: new turns, streamed text, cards.
	const lastLen = messages[messages.length - 1]?.content.length ?? 0;
	// biome-ignore lint/correctness/useExhaustiveDependencies: these are the scroll triggers, not values the effect reads
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages.length, lastLen, isGeneratingImages]);

	const suggestions: Suggestion[] = !hasRenders
		? [
				{
					label: "Make it feel more premium",
					send: "I'd like it to feel more premium.",
				},
				{
					label: "What size do I need?",
					send: "Is this the right trailer size for my menu and volume?",
				},
				{
					label: "What will it cost?",
					send: "Roughly what will this build cost?",
				},
			]
		: [
				{
					label: "Try a different color",
					send: "Show me a different color direction for the wrap.",
				},
				{
					label: "Make the wrap bolder",
					send: "Make the wrap bolder and easier to spot from a distance.",
				},
				...(!ready.has("night_exterior")
					? [
							{
								label: "See it at night",
								run: () => renderViews(["night_exterior"], "more"),
							},
						]
					: []),
				...(!ready.has("exterior_rear")
					? [
							{
								label: "See the rear",
								run: () => renderViews(["exterior_rear"], "more"),
							},
						]
					: []),
				{
					label: "What will it cost?",
					send: "What will this build cost, roughly?",
				},
				{ label: "Get a quote", run: onRequestQuote },
			];

	const selectView = (v: string) => {
		setSelectedView(v);
		onShowCanvas?.();
	};

	return (
		<div className="chat-panel flex h-full flex-col bg-[var(--ftf-paper-2)]">
			{error && (
				<div
					className="flex items-start gap-2 border-b-2 border-[var(--ftf-ink)] bg-[var(--ftf-red-100)] px-4 py-2.5 text-[13px] text-[var(--ftf-red-600)]"
					role="alert"
				>
					<AlertCircle className="mt-px h-4 w-4 shrink-0" />
					<p className="flex-1 leading-relaxed">{error}</p>
					<button
						type="button"
						onClick={clearError}
						aria-label="Dismiss"
						className="shrink-0 rounded-full p-0.5 hover:bg-black/5"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			<div
				className="chat-messages flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
				aria-live="polite"
			>
				{messages.map((msg, i) => (
					<ChatMessage
						key={msg.id}
						message={msg}
						isLatest={i === messages.length - 1}
						images={images}
						busy={busy}
						creditsLeft={creditsLeft}
						onSelectView={selectView}
						onApplyProposal={(id) => {
							void applyProposal(id);
							onShowCanvas?.();
						}}
						onDismissProposal={(id) => void dismissProposal(id)}
						onRetry={() => void retryFailedRenders()}
					/>
				))}
				{(isConnecting ||
					(isStreaming && messages[messages.length - 1]?.content === "")) && (
					<TypingIndicator label="Thinking" />
				)}
				{isGeneratingImages && !isStreaming && (
					<TypingIndicator
						label={
							progress.step ? `${progress.step}…` : "Rendering your trailer…"
						}
					/>
				)}
				<div ref={bottomRef} />
			</div>

			<div className="shrink-0 border-t-2 border-[var(--ftf-ink)] bg-white">
				{!busy && !pendingProposal && (
					<div
						className="flex gap-2 overflow-x-auto px-4 pt-3 sm:px-5"
						aria-label="Suggestions"
					>
						{suggestions.map((s) => (
							<button
								key={s.label}
								type="button"
								onClick={() =>
									s.run ? s.run() : s.send && sendMessage(s.send)
								}
								className="shrink-0 rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-paper-2)] px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-[var(--ftf-amber-500)]"
							>
								{s.label}
							</button>
						))}
					</div>
				)}
				<ChatInput
					onSend={sendMessage}
					disabled={isStreaming || isConnecting}
					placeholder={
						hasRenders
							? "Ask for a change — “make the band teal”, “switch to the 16 ft”…"
							: "Tell me about your menu, your look, or attach a photo…"
					}
				/>
			</div>
		</div>
	);
}
