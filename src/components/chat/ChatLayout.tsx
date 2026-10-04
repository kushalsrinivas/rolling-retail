import {
	GripVertical,
	LayoutPanelLeft,
	Loader2,
	MessageSquare,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useChat } from "#/hooks/use-chat";
import { useMediaQuery } from "#/hooks/use-media-query";
import { cn } from "#/lib/utils";
import BrandReportPanel from "./BrandReportPanel";
import ChatPanel from "./ChatPanel";
import StyleQuizFlow from "./StyleQuizFlow";

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
	// — a blank prompt box is the point most people bounce at. It waits for
	// rehydration first, so a returning buyer is not shown intake they have
	// already completed just because the messages are still loading.
	const showIntake =
		chat.hydrated && !intakeDone && chat.messages.length <= 1;

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
			onGenerateConcepts={(opts) => chat.generateConcepts(opts)}
			onToggleFavorite={(label) => chat.toggleFavorite(label)}
			design={chat.design}
			onApproveVersion={(v) => chat.approveVersion(v)}
			isApproving={chat.isApproving}
			sessionId={chat.sessionId}
			onOpenChat={() => {
				// On a phone the chat is the other pane; show it, then focus
				// the box so the customer writes their own feedback.
				setPane("design");
				requestAnimationFrame(() =>
					document.getElementById("chat-input")?.focus(),
				);
			}}
			onRefreshLeads={() => chat.refreshLeads()}
			brandName={chat.brain?.brandName || chat.brandName}
			menu={chat.menuDraft}
			onMenuChange={chat.setMenuDraft}
			isRenderingMenu={chat.isRenderingMenu}
			onRenderMenuBoard={(menu, artwork) => chat.renderMenuBoard(menu, artwork)}
		/>
	);

	// Rehydrate first: a reload must not flash intake/starter states over a
	// session that is about to be restored from the server.
	if (!chat.hydrated) {
		return (
			<div className="ftf chat-layout grid h-dvh w-full place-items-center bg-[var(--ftf-paper-2)]">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-6 w-6 animate-spin text-[var(--ftf-blue-800)]" />
					<p className="text-xs text-[var(--ftf-ink-2)]">
						Restoring your design…
					</p>
				</div>
			</div>
		);
	}

	if (showIntake) {
		return (
			<div className="ftf chat-layout h-dvh w-full overflow-hidden">
				<StyleQuizFlow
					onStep={(step, data) => {
						// Per-round CMS log — best-effort, never blocks the quiz.
						void (async () => {
							try {
								const sessionId = await chat.ensureSession();
								await fetch("/api/agent/quiz-step", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ sessionId, step, data }),
								});
							} catch {
								/* CMS logging is best-effort */
							}
						})();
					}}
					onComplete={(brief, answers, _image, picks) => {
						setIntakeDone(true);
						// Seed the pickers so the panel and the renders agree with the
						// brief before the first reply lands.
						if (answers.brandName) chat.setBrandName(answers.brandName);
						if (answers.vehicleId) chat.setVehicleId(answers.vehicleId);
						if (answers.businessType)
							chat.setBusinessType(answers.businessType);
						// Structured intake writes the design record directly —
						// the prose brief alone would lose "sage"/"birria" to regex.
						// The full signal (business + vehicle + colors + vibe)
						// trips brainReady on this first message, so the single
						// auto-render round fires without further questions.
						void (async () => {
							try {
								const sessionId = await chat.ensureSession();
								await fetch("/api/agent/intake", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ sessionId, answers, quiz: picks }),
								});
								await chat.refreshDesign();
							} catch {
								/* record is best-effort — chat still carries the brief */
							}
						})();
						chat.sendMessage(brief);
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
					{/* Both panes stay mounted and one is hidden by CSS: unmounting
					    the chat or the build panel on every toggle reset the panel's
					    tab, scroll positions and the half-typed chat draft, and the
					    work simply disappeared whenever the buyer peeked at another
					    pane mid-generation. */}
					<div className={cn("h-full", pane === "design" ? null : "hidden")}>
						<ChatPanel chat={chat} />
					</div>
					<div className={cn("h-full", pane === "build" ? null : "hidden")}>
						{buildPanel}
					</div>
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
