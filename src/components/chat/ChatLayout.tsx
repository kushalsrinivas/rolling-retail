import { GripVertical, LayoutPanelLeft, MessageSquare } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useChat } from "#/hooks/use-chat";
import { useMediaQuery } from "#/hooks/use-media-query";
import { cn } from "#/lib/utils";
import BrandReportPanel from "./BrandReportPanel";
import ChatPanel from "./ChatPanel";
import IntakeFlow from "./IntakeFlow";

const MIN_PERCENT = 25;
const MAX_PERCENT = 75;
const DEFAULT_PERCENT = 50;

type MobilePane = "design" | "build";

export default function ChatLayout() {
	const [splitPercent, setSplitPercent] = useState(DEFAULT_PERCENT);
	const [isDragging, setIsDragging] = useState(false);
	const [pane, setPane] = useState<MobilePane>("design");
	const [intakeDone, setIntakeDone] = useState(false);
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

	// The intake stands in front of the chat until the buyer has said something
	// — a blank prompt box is the point most people bounce at.
	const showIntake = !intakeDone && chat.messages.length <= 1;

	const buildPanel = (
		<BrandReportPanel
			images={chat.images}
			videos={chat.videos}
			isGeneratingVideo={chat.isGeneratingVideo}
			onGenerateVideo={(kind) => chat.generateVideo(kind)}
			brain={chat.brain}
			layout={chat.layout}
			estimate={chat.estimate}
			spec={chat.spec}
			lead={chat.lead}
			leads={chat.leads}
			creditsLeft={chat.creditsLeft}
			isGenerating={chat.isGeneratingImages}
			progress={chat.progress}
			onRetryFailed={() => chat.retryFailedRenders()}
			onAskAbout={(label, value) => chat.sendContextMessage(label, value)}
			onGenerateConcepts={() => chat.generateConcepts()}
			onToggleFavorite={(label) => chat.toggleFavorite(label)}
			onRefreshLeads={() => chat.refreshLeads()}
		/>
	);

	if (showIntake) {
		return (
			<div className="ftf chat-layout h-dvh w-full overflow-hidden">
				<IntakeFlow
					onComplete={(brief, answers, image) => {
						setIntakeDone(true);
						// Seed the pickers so the panel and the renders agree with the
						// brief before the first reply lands.
						if (answers.brandName) chat.setBrandName(answers.brandName);
						if (answers.vehicleId) chat.setVehicleId(answers.vehicleId);
						if (answers.businessType)
							chat.setBusinessType(answers.businessType);
						chat.sendMessage(brief, image ? { image } : undefined);
					}}
					onSkip={() => setIntakeDone(true)}
				/>
			</div>
		);
	}

	if (!isDesktop) {
		const conceptCount = chat.images.filter((i) => i.status === "ready").length;
		return (
			<div className="ftf chat-layout flex h-dvh w-full flex-col overflow-hidden">
				<div className="min-h-0 flex-1 overflow-hidden">
					{pane === "design" ? <ChatPanel chat={chat} /> : buildPanel}
				</div>

				{/* Bottom bar keeps the switch under the thumb, clear of the keyboard. */}
				<nav
					className="flex shrink-0 gap-1 border-t border-[var(--ftf-line)] bg-white p-1.5"
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
								"ftf-label flex flex-1 items-center justify-center gap-1.5 rounded py-3 transition-colors",
								pane === t.id
									? "bg-[var(--ftf-blue-800)] text-white"
									: "text-[var(--ftf-ink-2)] hover:bg-[var(--ftf-paper-2)]",
							)}
						>
							<t.icon className="h-4 w-4" />
							{t.label}
							{t.id === "build" && conceptCount > 0 && pane !== "build" && (
								<span className="rounded-sm bg-[var(--ftf-orange-500)] px-1.5 py-px text-[10px] text-[#241200]">
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
				"ftf chat-layout relative flex h-dvh w-full overflow-hidden",
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
					"group relative z-30 flex w-px shrink-0 cursor-col-resize touch-none items-center justify-center",
					"bg-[var(--ftf-line-strong)] transition-colors hover:bg-[var(--ftf-blue-600)]",
					isDragging && "bg-[var(--ftf-blue-800)]",
				)}
				aria-label="Resize panels"
			>
				<div
					className={cn(
						"flex h-9 w-4 -translate-x-[8px] items-center justify-center rounded-sm border bg-white transition-colors",
						"border-[var(--ftf-line-strong)] group-hover:border-[var(--ftf-blue-600)]",
						isDragging && "border-[var(--ftf-blue-800)]",
					)}
				>
					<GripVertical className="h-3.5 w-3.5 text-[var(--ftf-ink-4)] group-hover:text-[var(--ftf-blue-600)]" />
				</div>
			</div>

			{/* ── Right: Chat Panel ── */}
			<div className="relative h-full flex-1 overflow-hidden">
				<ChatPanel chat={chat} />
			</div>
		</div>
	);
}
