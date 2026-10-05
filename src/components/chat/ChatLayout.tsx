/**
 * The designer workspace.
 *
 * Conversation on the left, the trailer on the right — the chat is where the
 * buyer decides, the canvas is what they are deciding about. A journey bar
 * across the top answers "where am I and what's next" at every moment:
 * Brief → Concepts → Refine → Approve → Quote.
 */
import { Link } from "@tanstack/react-router";
import {
	Check,
	GripVertical,
	Loader2,
	MessageSquare,
	Truck,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "#/hooks/use-chat";
import { useMediaQuery } from "#/hooks/use-media-query";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";
import ChatPanel from "./ChatPanel";
import DesignCanvas from "./DesignCanvas";
import StyleQuizFlow from "./StyleQuizFlow";

const MIN_PERCENT = 30;
const MAX_PERCENT = 60;
const DEFAULT_PERCENT = 40;

type MobilePane = "design" | "build";

const JOURNEY = [
	{ id: "brief", label: "Brief" },
	{ id: "concepts", label: "Concepts" },
	{ id: "refine", label: "Refine" },
	{ id: "approve", label: "Approve" },
	{ id: "quote", label: "Quote" },
] as const;

function JourneyBar({ step }: { step: (typeof JOURNEY)[number]["id"] }) {
	const at = JOURNEY.findIndex((j) => j.id === step);
	return (
		<ol
			className="hidden items-center gap-1 lg:flex"
			aria-label="Your progress"
		>
			{JOURNEY.map((j, i) => (
				<li key={j.id} className="flex items-center gap-1">
					<span
						aria-current={i === at ? "step" : undefined}
						className={cn(
							"flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11.5px] font-bold",
							i < at &&
								"border-[var(--ftf-ink)] bg-[var(--ftf-ink)] text-white",
							i === at && "border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)]",
							i > at && "border-[var(--ftf-line)] text-[var(--ftf-ink-4)]",
						)}
					>
						{i < at ? (
							<Check className="h-3 w-3" />
						) : (
							<span className="tabular-nums">{i + 1}</span>
						)}
						{j.label}
					</span>
					{i < JOURNEY.length - 1 && (
						<span
							className={cn(
								"h-0.5 w-4",
								i < at ? "bg-[var(--ftf-ink)]" : "bg-[var(--ftf-line)]",
							)}
						/>
					)}
				</li>
			))}
		</ol>
	);
}

function QuoteDialog({
	onClose,
	onSubmit,
}: {
	onClose: () => void;
	onSubmit: (name: string, contact: string, note: string) => void;
}) {
	const [name, setName] = useState("");
	const [contact, setContact] = useState("");
	const [note, setNote] = useState("");
	const firstRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		firstRef.current?.focus();
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	const valid = name.trim().length > 1 && contact.trim().length > 4;
	const field =
		"mt-1.5 w-full rounded-xl border-2 border-[var(--ftf-ink)] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:shadow-[3px_3px_0_var(--ftf-orange-500)]";
	return (
		<div
			className="fixed inset-0 z-[90] flex items-end justify-center bg-[#17130f]/60 p-4 sm:items-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="quote-title"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (valid) onSubmit(name.trim(), contact.trim(), note.trim());
				}}
				className="w-full max-w-md rounded-2xl border-2 border-[var(--ftf-ink)] bg-white p-6 shadow-[6px_6px_0_var(--ftf-ink)]"
			>
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 id="quote-title" className="ftf-display text-[30px]">
							Request a quote
						</h2>
						<p className="mt-1 text-[13.5px] text-[var(--ftf-ink-2)]">
							We send your design and spec to the build team. A person replies —
							usually within one business day.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="rounded-full p-1 hover:bg-[var(--ftf-paper-2)]"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<label className="mt-5 block text-[13px] font-bold">
					Your name
					<input
						ref={firstRef}
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoComplete="name"
						className={field}
					/>
				</label>
				<label className="mt-3 block text-[13px] font-bold">
					Email or phone
					<input
						value={contact}
						onChange={(e) => setContact(e.target.value)}
						autoComplete="email"
						className={field}
					/>
				</label>
				<label className="mt-3 block text-[13px] font-bold">
					Anything we should know?{" "}
					<span className="font-normal text-[var(--ftf-ink-3)]">optional</span>
					<textarea
						value={note}
						onChange={(e) => setNote(e.target.value)}
						rows={2}
						className={cn(field, "resize-none")}
					/>
				</label>
				<p className="mt-3 text-[11.5px] text-[var(--ftf-ink-3)]">
					Your design stays private to you and our build team.
				</p>
				<button
					type="submit"
					disabled={!valid}
					className="ftf-cta mt-4 w-full py-3 text-[15px]"
				>
					Send to the build team
				</button>
			</form>
		</div>
	);
}

export default function ChatLayout() {
	const [splitPercent, setSplitPercent] = useState(DEFAULT_PERCENT);
	const [isDragging, setIsDragging] = useState(false);
	const [pane, setPane] = useState<MobilePane>("design");
	const [intakeDone, setIntakeDone] = useState(false);
	const [quoteOpen, setQuoteOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const chat = useChat();
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const handleDragStart = useCallback(() => {
		setIsDragging(true);
		const move = (x: number) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			setSplitPercent(
				Math.min(
					MAX_PERCENT,
					Math.max(MIN_PERCENT, ((x - rect.left) / rect.width) * 100),
				),
			);
		};
		const onMouseMove = (ev: MouseEvent) => move(ev.clientX);
		const onTouchMove = (ev: TouchEvent) =>
			ev.touches[0] && move(ev.touches[0].clientX);
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

	// The brief stands in front of the chat until the buyer has said
	// something. It waits for rehydration so a returning buyer is not shown a
	// brief they already completed.
	const showIntake = chat.hydrated && !intakeDone && chat.messages.length <= 1;

	const requestQuote = (name: string, contact: string, note: string) => {
		setQuoteOpen(false);
		track("quote_requested");
		setPane("design");
		void chat.sendMessage(
			`I'd like a quote for this design. My name is ${name} and you can reach me at ${contact}.${note ? ` ${note}` : ""}`,
		);
	};

	if (!chat.hydrated) {
		return (
			<div className="ftf chat-layout grid h-dvh w-full place-items-center bg-[var(--ftf-paper-2)]">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-6 w-6 animate-spin text-[var(--ftf-orange-500)]" />
					<p className="text-[13px] font-semibold">Restoring your design…</p>
				</div>
			</div>
		);
	}

	if (showIntake) {
		return (
			<div className="ftf chat-layout h-dvh w-full overflow-hidden">
				<StyleQuizFlow
					onStep={(step, data) => {
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
					onComplete={(brief, answers, image, picks, designBrief) => {
						setIntakeDone(true);
						if (answers.brandName) chat.setBrandName(answers.brandName);
						if (answers.vehicleId) chat.setVehicleId(answers.vehicleId);
						if (answers.businessType)
							chat.setBusinessType(answers.businessType);
						// The structured intake must land BEFORE the first chat turn —
						// that turn fires the first renders, and they read the record.
						void (async () => {
							try {
								const sessionId = await chat.ensureSession();
								await fetch("/api/agent/intake", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										sessionId,
										answers,
										quiz: picks,
										brief: designBrief,
										inspirationImage: image,
									}),
								});
								await chat.refreshDesign();
							} catch {
								/* the brief message still carries everything */
							}
							chat.sendMessage(brief, { kind: "brief" });
						})();
					}}
					onSkip={() => setIntakeDone(true)}
				/>
			</div>
		);
	}

	const chatPanel = (
		<ChatPanel
			chat={chat}
			onShowCanvas={isDesktop ? undefined : () => setPane("build")}
			onRequestQuote={() => setQuoteOpen(true)}
		/>
	);
	const canvas = (
		<DesignCanvas
			chat={chat}
			onRequestQuote={() => setQuoteOpen(true)}
			onOpenChat={() => {
				setPane("design");
				requestAnimationFrame(() =>
					document.getElementById("chat-input")?.focus(),
				);
			}}
		/>
	);

	const topBar = (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-[var(--ftf-ink)] bg-white px-4">
			<Link
				to="/"
				className="flex items-center gap-2"
				aria-label="Rolling Retail home"
			>
				<svg
					viewBox="0 0 32 32"
					className="h-8 w-8 -rotate-6"
					aria-hidden="true"
				>
					<rect width="32" height="32" rx="8" fill="#ff5a1f" />
					<rect x="6" y="9" width="20" height="11" rx="5.5" fill="#17130f" />
					<rect x="10" y="12" width="8" height="4" fill="#ffc83d" />
					<circle cx="17" cy="22.5" r="2.6" fill="#17130f" />
				</svg>
				<span className="ftf-display hidden text-[19px] sm:inline">
					Rolling Retail
				</span>
			</Link>
			<span className="hidden h-6 w-0.5 bg-[var(--ftf-line)] sm:block" />
			<span className="truncate text-[13px] font-bold">
				{chat.brandName || "Your trailer"}
			</span>
			<div className="mx-auto">
				<JourneyBar step={chat.journeyStep} />
			</div>
			<div className="ml-auto flex items-center gap-2">
				{typeof chat.creditsLeft === "number" && (
					<span
						className="hidden rounded-full border-2 border-[var(--ftf-ink)] px-2.5 py-1 text-[11.5px] font-bold tabular-nums sm:block"
						title="A design round is a new version: first concepts or a confirmed change. Extra angles are free."
					>
						{chat.creditsLeft} {chat.creditsLeft === 1 ? "round" : "rounds"}{" "}
						left
					</span>
				)}
				<button
					type="button"
					onClick={() => setQuoteOpen(true)}
					className="ftf-cta px-4 py-1.5 text-[13px]"
				>
					Get a quote
				</button>
			</div>
		</header>
	);

	return (
		<div className="ftf chat-layout flex h-dvh w-full flex-col overflow-hidden">
			{topBar}
			{isDesktop ? (
				<div
					ref={containerRef}
					className={cn(
						"relative flex min-h-0 flex-1",
						isDragging && "select-none",
					)}
				>
					<div
						className="relative h-full shrink-0 overflow-hidden"
						style={{ width: `${splitPercent}%` }}
					>
						{chatPanel}
					</div>
					{/* biome-ignore lint/a11y/useSemanticElements: an <hr> cannot be a focusable, draggable split handle */}
					<div
						role="separator"
						aria-orientation="vertical"
						aria-valuenow={Math.round(splitPercent)}
						aria-valuemin={MIN_PERCENT}
						aria-valuemax={MAX_PERCENT}
						aria-label="Resize panels"
						tabIndex={0}
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
						onMouseDown={(e) => {
							e.preventDefault();
							handleDragStart();
						}}
						onTouchStart={() => handleDragStart()}
						className="group relative z-30 flex w-0.5 shrink-0 cursor-col-resize items-center justify-center bg-[var(--ftf-ink)]"
					>
						<div className="flex h-10 w-5 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)] bg-white">
							<GripVertical className="h-3.5 w-3.5" />
						</div>
					</div>
					<div className="relative h-full min-w-0 flex-1 overflow-hidden">
						{canvas}
					</div>
				</div>
			) : (
				<>
					<div className="min-h-0 flex-1 overflow-hidden">
						{/* Both panes stay mounted; hiding by CSS keeps scroll, tab and draft state. */}
						<div className={cn("h-full", pane === "design" ? null : "hidden")}>
							{chatPanel}
						</div>
						<div className={cn("h-full", pane === "build" ? null : "hidden")}>
							{canvas}
						</div>
					</div>
					<nav
						className="flex shrink-0 gap-1.5 border-t-2 border-[var(--ftf-ink)] bg-white p-1.5"
						style={{
							paddingBottom:
								"calc(0.375rem + env(safe-area-inset-bottom, 0px))",
						}}
					>
						{(
							[
								{ id: "design", label: "Chat", icon: MessageSquare },
								{ id: "build", label: "Trailer", icon: Truck },
							] as const
						).map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => setPane(t.id)}
								aria-current={pane === t.id}
								className={cn(
									"flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold transition-colors",
									pane === t.id
										? "bg-[var(--ftf-ink)] text-white"
										: "hover:bg-[var(--ftf-paper-2)]",
								)}
							>
								<t.icon className="h-4 w-4" />
								{t.label}
								{t.id === "build" &&
									chat.isGeneratingImages &&
									pane !== "build" && (
										<span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ftf-orange-500)]" />
									)}
							</button>
						))}
					</nav>
				</>
			)}
			{quoteOpen && (
				<QuoteDialog
					onClose={() => setQuoteOpen(false)}
					onSubmit={requestQuote}
				/>
			)}
		</div>
	);
}
