import { GripVertical, LayoutPanelLeft, MessageSquare } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useChat } from "#/hooks/use-chat";
import { useMediaQuery } from "#/hooks/use-media-query";
import { cn } from "#/lib/utils";
import BrandReportPanel from "./BrandReportPanel";
import ChatPanel from "./ChatPanel";

const MIN_PERCENT = 25;
const MAX_PERCENT = 75;
const DEFAULT_PERCENT = 50;

type MobilePane = "design" | "build";

export default function ChatLayout() {
	const [splitPercent, setSplitPercent] = useState(DEFAULT_PERCENT);
	const [isDragging, setIsDragging] = useState(false);
	const [pane, setPane] = useState<MobilePane>("design");
	const containerRef = useRef<HTMLDivElement>(null);
	const chat = useChat();

	// Food Truck Factory sends the link over WhatsApp, so most buyers arrive on
	// a phone. A side-by-side split has no room there — below md the two panels
	// become one pane with a toggle.
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const handleDragStart = useCallback(() => {
		setIsDragging(true);

		const move = (x: number) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const pct = ((x - rect.left) / rect.width) * 100;
			setSplitPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct)));
		};

		const onMouseMove = (ev: MouseEvent) => move(ev.clientX);
		const onTouchMove = (ev: TouchEvent) => {
			if (ev.touches[0]) move(ev.touches[0].clientX);
		};
		const onUp = () => {
			setIsDragging(false);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("mouseup", onUp);
			window.removeEventListener("touchend", onUp);
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("touchmove", onTouchMove);
		window.addEventListener("mouseup", onUp);
		window.addEventListener("touchend", onUp);
	}, []);

	const buildPanel = (
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
	);

	if (!isDesktop) {
		const conceptCount = chat.images.length;
		return (
			<div className="chat-layout flex h-dvh w-full flex-col overflow-hidden bg-black">
				<div className="min-h-0 flex-1 overflow-hidden">
					{pane === "design" ? <ChatPanel chat={chat} /> : buildPanel}
				</div>

				{/* Bottom bar keeps the switch under the thumb, clear of the keyboard. */}
				<nav
					className="flex shrink-0 gap-1 border-t border-[rgba(163,130,255,0.1)] bg-[#0b0b10] p-1.5"
					style={{
						paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))",
					}}
				>
					{(
						[
							{ id: "design", label: "Design", icon: MessageSquare },
							{ id: "build", label: "Build", icon: LayoutPanelLeft },
						] as const
					).map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setPane(t.id)}
							aria-current={pane === t.id}
							className={cn(
								"flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors",
								pane === t.id
									? "bg-purple-500/10 text-purple-300"
									: "text-zinc-500",
							)}
						>
							<t.icon className="h-4 w-4" />
							{t.label}
							{t.id === "build" && conceptCount > 0 && pane !== "build" && (
								<span className="rounded-full bg-purple-500/15 px-1.5 text-[10px] text-purple-300">
									{conceptCount}
								</span>
							)}
						</button>
					))}
				</nav>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"chat-layout relative flex h-dvh w-full overflow-hidden bg-black",
				isDragging && "select-none",
			)}
		>
			{/* ── Left: Truck Build Panel ── */}
			<div
				className="relative h-full shrink-0 overflow-hidden"
				style={{ width: `${splitPercent}%` }}
			>
				{buildPanel}
			</div>

			{/* ── Divider ── */}
			{/* biome-ignore lint/a11y/useSemanticElements: an <hr> cannot be a
			    focusable, draggable split handle */}
			<div
				role="separator"
				aria-orientation="vertical"
				aria-valuenow={Math.round(splitPercent)}
				aria-valuemin={MIN_PERCENT}
				aria-valuemax={MAX_PERCENT}
				onKeyDown={(e) => {
					if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
						e.preventDefault();
						setSplitPercent((p) =>
							Math.min(
								MAX_PERCENT,
								Math.max(MIN_PERCENT, p + (e.key === "ArrowLeft" ? -2 : 2)),
							),
						);
					}
				}}
				tabIndex={0}
				onMouseDown={(e) => {
					e.preventDefault();
					handleDragStart();
				}}
				onTouchStart={(e) => {
					if (e.touches[0]) handleDragStart();
				}}
				className={cn(
					"group relative z-30 flex w-[3px] shrink-0 cursor-col-resize items-center justify-center touch-none",
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
