import { AlertCircle, Bot, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { useChat } from "#/hooks/use-chat";
import { BUSINESS_TYPES, VEHICLES } from "#/lib/food-truck/constants";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

interface ChatPanelProps {
	chat: ReturnType<typeof useChat>;
}

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
		<div className="chat-panel flex h-full flex-col bg-[#09090b]">
			{/* Header */}
			<div className="flex shrink-0 items-center gap-3 border-b border-[rgba(163,130,255,0.08)] px-5 py-4">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 ring-1 ring-purple-500/20">
					<Bot className="h-4 w-4 text-purple-400" />
				</div>
				<div>
					<p className="text-sm font-medium text-[#fafafa]">
						Factory Designer
					</p>
					<p className="flex items-center gap-1 text-xs text-[#52525b]">
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400/80" />
						Available
						{typeof creditsLeft === "number" && (
							<span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
								{creditsLeft} of 5 visuals remaining
							</span>
						)}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					{isGeneratingImages && (
						<div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
							<div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
							Preparing concepts…
						</div>
					)}
				</div>
			</div>

			{/* Designer controls: brand + vehicle + business + generate */}
			<div className="shrink-0 space-y-2 border-b border-[rgba(163,130,255,0.08)] bg-[#0c0c0e] px-4 py-3">
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
							Brand name
						</span>
						<input
							value={brandName}
							onChange={(e) => setBrandName(e.target.value)}
							placeholder="e.g. Ember & Oak"
							className="w-full rounded-lg border border-[rgba(163,130,255,0.15)] bg-[#111113] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
							Vehicle
						</span>
						<select
							value={vehicleId}
							onChange={(e) => setVehicleId(e.target.value)}
							className="w-full rounded-lg border border-[rgba(163,130,255,0.15)] bg-[#111113] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50"
						>
							{VEHICLES.map((v) => (
								<option key={v.id} value={v.id} title={v.blurb}>
									{v.label}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
							Business type
						</span>
						<select
							value={businessType}
							onChange={(e) => setBusinessType(e.target.value)}
							className="w-full rounded-lg border border-[rgba(163,130,255,0.15)] bg-[#111113] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50"
						>
							{BUSINESS_TYPES.map((b) => (
								<option key={b.id} value={b.id} title={b.note}>
									{b.label}
								</option>
							))}
						</select>
					</label>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => generateConcepts()}
						disabled={isGeneratingImages || isStreaming}
						className="rounded-full bg-purple-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
					>
						{isGeneratingImages
							? "Preparing concepts…"
							: "Generate concepts"}
					</button>
					<button
						type="button"
						onClick={() =>
							sendMessage(
								"Please recommend the most suitable layout for my menu and service style.",
							)
						}
						disabled={isStreaming || isConnecting}
						className="rounded-full border border-[rgba(163,130,255,0.2)] px-3.5 py-1.5 text-xs text-purple-300 transition hover:bg-purple-500/10 disabled:opacity-50"
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
						className="rounded-full border border-[rgba(163,130,255,0.2)] px-3.5 py-1.5 text-xs text-purple-300 transition hover:bg-purple-500/10 disabled:opacity-50"
					>
						Build specification
					</button>
				</div>
			</div>

			{/* Error banner */}
			{error && (
				<div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<p className="flex-1">{error}</p>
					<button
						type="button"
						onClick={clearError}
						className="shrink-0 rounded-full p-0.5 transition hover:bg-red-500/10"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			)}

			{/* Messages */}
			<div className="chat-messages flex-1 space-y-4 overflow-y-auto px-4 py-5">
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

			{/* Input */}
			<div className="shrink-0 border-t border-[rgba(163,130,255,0.08)]">
				<ChatInput
					onSend={sendMessage}
					disabled={isStreaming || isConnecting}
					placeholder="Describe your brand, menu, colors, service style and inspiration…"
				/>
			</div>
		</div>
	);
}
