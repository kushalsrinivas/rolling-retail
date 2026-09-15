import { GripVertical, MessageSquare } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useChat } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";
import BrandReportPanel from "./BrandReportPanel";
import ChatPanel from "./ChatPanel";

const MIN_PERCENT = 25;
const MAX_PERCENT = 75;
const DEFAULT_PERCENT = 50;

export default function ChatLayout() {
	const [splitPercent, setSplitPercent] = useState(DEFAULT_PERCENT);
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const chat = useChat();

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);

		const onMove = (ev: MouseEvent) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const pct = (x / rect.width) * 100;
			setSplitPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct)));
		};

		const onUp = () => {
			setIsDragging(false);
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"chat-layout relative flex h-dvh w-screen overflow-hidden bg-black",
				isDragging && "select-none",
			)}
		>
			{/* ── Left: Truck Build Panel ── */}
			<div
				className="relative h-full shrink-0 overflow-hidden"
				style={{ width: `${splitPercent}%` }}
			>
				<BrandReportPanel
					images={chat.images}
					brain={chat.brain}
					layout={chat.layout}
					estimate={chat.estimate}
					spec={chat.spec}
					lead={chat.lead}
					leads={chat.leads}
					creditsLeft={chat.creditsLeft}
					isGenerating={chat.isGeneratingImages}
					onAskAbout={(label, value) => chat.sendContextMessage(label, value)}
					onGenerateConcepts={() => chat.generateConcepts()}
					onToggleFavorite={(label) => chat.toggleFavorite(label)}
					onRefreshLeads={() => chat.refreshLeads()}
				/>
			</div>

			{/* ── Divider ── */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
			<div
				onMouseDown={handleMouseDown}
				className={cn(
					"group relative z-30 flex w-[3px] shrink-0 cursor-col-resize items-center justify-center",
					"bg-[rgba(163,130,255,0.08)] transition-colors hover:bg-purple-500/30",
					isDragging && "bg-purple-500/50",
				)}
				aria-label="Resize panels"
			>
				<div
					className={cn(
						"flex h-10 w-5 -translate-x-[9px] items-center justify-center rounded-full border border-[rgba(163,130,255,0.2)] bg-[#111113] shadow-md transition-all duration-150",
						"group-hover:border-purple-500/40 group-hover:bg-[#18181b] group-hover:shadow-[0_0_8px_rgba(168,85,247,0.25)]",
						isDragging &&
							"border-purple-500/60 shadow-[0_0_14px_rgba(168,85,247,0.4)]",
					)}
				>
					<GripVertical className="h-3.5 w-3.5 text-zinc-600 group-hover:text-purple-400" />
				</div>
			</div>

			{/* ── Right: Chat Panel ── */}
			<div className="relative h-full flex-1 overflow-hidden border-l border-[rgba(163,130,255,0.08)]">
				<div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-[rgba(163,130,255,0.15)] bg-[#111113]/80 px-3 py-1.5 backdrop-blur-sm">
					<MessageSquare className="h-3.5 w-3.5 text-purple-400" />
					<span className="text-xs font-medium text-purple-300">AI Chat</span>
				</div>
				<ChatPanel chat={chat} />
			</div>
		</div>
	);
}
