import {
	AlertTriangle,
	BarChart3,
	Box,
	Brain,
	Check,
	Clapperboard,
	ClipboardCopy,
	Download,
	FileJson,
	ImageIcon,
	Layers,
	Loader2,
	Lock,
	Maximize2,
	MessageCircle,
	RefreshCw,
	RotateCcw,
	Star,
	Truck,
	Users,
	UtensilsCrossed,
	X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	type GeneratedImage,
	type GeneratedVideo,
	type PipelineLead,
	type PipelineProgress,
	prettyView,
	type TruckEstimate,
	type TruckLayout,
	type TruckSpec,
} from "#/hooks/use-chat";
import type { ProjectBrain } from "#/lib/food-truck/brain";
import {
	CONCEPT_VIEW_COUNT,
	CONCEPT_VIEWS,
	MENU_VIEW,
} from "#/lib/food-truck/constants";
import type { MenuDesign } from "#/lib/food-truck/menu";
import {
	SALES_VIDEO_PRESETS,
	type SalesVideoKind,
	salesSlideFor,
	TOUR_PARTS,
} from "#/lib/food-truck/sales";
import { cn } from "#/lib/utils";
import { downloadDataUrl, watermarkImage } from "#/lib/watermark";
import MenuBuilder from "./MenuBuilder";

const LABEL_MAP: Record<string, string> = {
	exterior: "Exterior hero",
	hatch_open: "Hatch open · serve",
	interior: "Interior line",
	vehicle_wrap: "Vehicle Wrap Concept",
	brand_lifestyle: "Brand Lifestyle",
	store_interior: "Store Interior",
	deployment_scene: "Deployment Scene",
};

interface BrandReportPanelProps {
	images: GeneratedImage[];
	videos: GeneratedVideo[];
	isGeneratingVideo: boolean;
	onGenerateVideo: (kind: SalesVideoKind) => void;
	brain: ProjectBrain | null;
	layout: TruckLayout | null;
	estimate: TruckEstimate | null;
	spec: TruckSpec | null;
	lead: Record<string, unknown> | null;
	leads: PipelineLead[];
	creditsLeft: number | null;
	isGenerating: boolean;
	progress: PipelineProgress;
	onRetryFailed: () => void;
	onAskAbout: (label: string, value: string) => void;
	onGenerateConcepts: () => void;
	onToggleFavorite: (label: string) => void;
	onRefreshLeads: () => void;
	brandName: string;
	menu: MenuDesign | null;
	onMenuChange: (menu: MenuDesign) => void;
	isRenderingMenu: boolean;
	onRenderMenuBoard: (menu: MenuDesign, artwork: string) => void;
}

type TabId = "visuals" | "menu" | "build";

/* ── Shared primitives ─────────────────────────────────────────────────── */

/** A white sheet. Every block of content in the panel is one of these. */
const CARD = "rounded border border-[var(--ftf-line)] bg-white";

/** A quiet secondary action: square, outlined, blue label. */
const GHOST_BTN =
	"inline-flex items-center gap-1.5 rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ftf-blue-800)] transition-colors hover:bg-[var(--ftf-blue-50)] disabled:opacity-40 disabled:hover:bg-white";

function SectionHeader({
	icon: Icon,
	title,
	badge,
	tone = "neutral",
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	badge?: string;
	tone?: "neutral" | "working" | "live";
}) {
	return (
		<div className="flex items-center gap-2.5 pb-3">
			<Icon className="h-4 w-4 shrink-0 text-[var(--ftf-blue-800)]" />
			<span className="ftf-label !text-[var(--ftf-ink)]">{title}</span>
			{badge && (
				<span
					className={cn(
						"shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold",
						tone === "working" &&
							"bg-[var(--ftf-amber-100)] text-[var(--ftf-amber-600)]",
						tone === "live" &&
							"bg-[var(--ftf-teal-100)] text-[var(--ftf-teal-600)]",
						tone === "neutral" &&
							"bg-[var(--ftf-paper-3)] text-[var(--ftf-ink-2)]",
					)}
				>
					{badge}
				</span>
			)}
			<div className="h-px flex-1 bg-[var(--ftf-line)]" />
		</div>
	);
}

/** A labelled read-only figure. Used wherever the panel states a number. */
function Stat({
	label,
	value,
	note,
	accent,
}: {
	label: string;
	value: string;
	note?: string;
	accent?: "blue" | "teal";
}) {
	return (
		<div className={cn(CARD, "p-3")}>
			<p className="ftf-label">{label}</p>
			<p
				className={cn(
					"ftf-display mt-1 text-lg leading-none",
					accent === "teal"
						? "text-[var(--ftf-teal-600)]"
						: "text-[var(--ftf-blue-800)]",
				)}
			>
				{value}
			</p>
			{note && (
				<p className="mt-1.5 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
					{note}
				</p>
			)}
		</div>
	);
}

/** The panel's one empty state, so all three read as the same product. */
function EmptyState({
	icon: Icon,
	title,
	body,
	action,
	footnote,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	body: string;
	action?: { label: string; onClick: () => void };
	footnote?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				CARD,
				"flex flex-col items-center gap-3 px-6 py-10 text-center",
			)}
		>
			<div className="flex h-12 w-12 items-center justify-center rounded bg-[var(--ftf-blue-50)]">
				<Icon className="h-5 w-5 text-[var(--ftf-blue-800)]" />
			</div>
			<div>
				<p className="ftf-display text-[15px] text-[var(--ftf-ink)]">{title}</p>
				<p className="mx-auto mt-1.5 max-w-[320px] text-xs leading-relaxed text-[var(--ftf-ink-2)]">
					{body}
				</p>
			</div>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="ftf-cta mt-1 rounded px-4 py-2 text-xs"
				>
					{action.label}
				</button>
			)}
			{footnote && (
				<p className="flex items-center gap-1.5 text-[11px] text-[var(--ftf-ink-4)]">
					{footnote}
				</p>
			)}
		</div>
	);
}

/**
 * The tour's progress, as one honest display.
 *
 * Nine renders and up to three video parts used to land piecemeal into a grid
 * that also held the finished article, so a half-built tour was
 * indistinguishable from a finished one. This stands in front of the work
 * until everything has settled.
 */
function TourProgress({
	progress,
	rendersReady,
	rendersFailed,
}: {
	progress: PipelineProgress;
	rendersReady: number;
	rendersFailed: number;
}) {
	const renderPct = progress.rendersTotal
		? Math.round(
				((progress.rendersDone || rendersReady + rendersFailed) /
					progress.rendersTotal) *
					100,
			)
		: 0;
	const videoPct = progress.videosTotal
		? Math.round((progress.videosDone / progress.videosTotal) * 100)
		: 0;
	// Renders are the bulk of the wait; weight the bar accordingly rather
	// than letting three video parts claim half of it.
	const overall = progress.videosTotal
		? Math.round(renderPct * 0.6 + videoPct * 0.4)
		: renderPct;

	const phaseLabel =
		progress.phase === "videos"
			? "Generating videos"
			: progress.phase === "finalizing"
				? "Finalizing tour"
				: "Generating renders";

	const steps: Array<{
		id: string;
		label: string;
		done: boolean;
		now: boolean;
	}> = [
		{
			id: "renders",
			label: "Generating renders",
			done: progress.phase === "videos" || progress.phase === "finalizing",
			now: progress.phase === "renders",
		},
		{
			id: "videos",
			label: "Generating videos",
			done: progress.phase === "finalizing",
			now: progress.phase === "videos",
		},
		{
			id: "final",
			label: "Finalizing tour",
			done: false,
			now: progress.phase === "finalizing",
		},
	];

	return (
		<div className={cn(CARD, "p-5")}>
			<div className="flex items-center gap-2.5">
				<Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--ftf-blue-800)]" />
				<span className="ftf-label !text-[var(--ftf-ink)]">{phaseLabel}</span>
				<span className="ml-auto ftf-display text-sm tabular-nums text-[var(--ftf-blue-800)]">
					{overall}%
				</span>
			</div>

			<div
				className="mt-3 h-1.5 overflow-hidden rounded-sm bg-[var(--ftf-paper-3)]"
				role="progressbar"
				aria-valuenow={overall}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={phaseLabel}
			>
				<div
					className="h-full bg-[var(--ftf-blue-800)] transition-[width] duration-500"
					style={{ width: `${Math.max(2, overall)}%` }}
				/>
			</div>

			{progress.step && (
				<p className="mt-2.5 text-xs text-[var(--ftf-ink-2)]">
					{progress.step}…
				</p>
			)}

			<dl className="mt-4 grid grid-cols-2 gap-2">
				<div className="rounded-sm bg-[var(--ftf-paper-2)] px-3 py-2">
					<dt className="ftf-label">Renders</dt>
					<dd className="ftf-display mt-0.5 text-sm tabular-nums text-[var(--ftf-ink)]">
						{rendersReady} / {progress.rendersTotal || CONCEPT_VIEW_COUNT}
						{rendersFailed > 0 && (
							<span className="ml-1.5 text-[11px] font-medium text-[var(--ftf-red-600)]">
								{rendersFailed} failed
							</span>
						)}
					</dd>
				</div>
				<div className="rounded-sm bg-[var(--ftf-paper-2)] px-3 py-2">
					<dt className="ftf-label">Video parts</dt>
					<dd className="ftf-display mt-0.5 text-sm tabular-nums text-[var(--ftf-ink)]">
						{progress.videosTotal
							? `${progress.videosDone} / ${progress.videosTotal}`
							: "—"}
					</dd>
				</div>
			</dl>

			<ol className="mt-4 space-y-1.5 border-t border-[var(--ftf-line)] pt-3">
				{steps.map((st) => (
					<li
						key={st.id}
						className={cn(
							"flex items-center gap-2 text-[11px]",
							st.now
								? "font-semibold text-[var(--ftf-ink)]"
								: st.done
									? "text-[var(--ftf-teal-600)]"
									: "text-[var(--ftf-ink-4)]",
						)}
					>
						{st.done ? (
							<Check className="h-3 w-3 shrink-0" />
						) : st.now ? (
							<Loader2 className="h-3 w-3 shrink-0 animate-spin" />
						) : (
							<span className="h-3 w-3 shrink-0 rounded-[1px] border border-current opacity-40" />
						)}
						{st.label}
					</li>
				))}
			</ol>

			<p className="mt-3 text-[11px] leading-relaxed text-[var(--ftf-ink-3)]">
				Each view is generated from the ones before it, so the whole set
				describes the same truck. That chaining is why it is not instant.
			</p>
		</div>
	);
}

/**
 * Full-screen image viewer.
 *
 * Rendered through a portal on `document.body`. It previously lived inside
 * the split pane, where any ancestor with a transform, filter or containment
 * turns `position: fixed` into "fixed to that ancestor" — which is how an
 * expanded render ended up painted behind the panel. A portal puts it outside
 * every one of those stacking contexts by construction.
 */
function Lightbox({
	image,
	onClose,
	onPrev,
	onNext,
	footer,
}: {
	image: GeneratedImage;
	onClose: () => void;
	onPrev?: () => void;
	onNext?: () => void;
	footer?: React.ReactNode;
}) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowLeft") onPrev?.();
			if (e.key === "ArrowRight") onNext?.();
		};
		window.addEventListener("keydown", onKey);
		// The panel behind must not scroll under the overlay on touch.
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [onClose, onPrev, onNext]);

	if (typeof document === "undefined") return null;

	return createPortal(
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape is bound above; the backdrop is a convenience target
		// biome-ignore lint/a11y/noStaticElementInteractions: dialog semantics are on the inner panel
		<div
			className="ftf lightbox-overlay fixed inset-0 z-[999] flex flex-col bg-black/90 backdrop-blur-sm"
			onClick={onClose}
		>
			{/* Bar first in DOM order so the close control is reachable on phones. */}
			<div className="flex shrink-0 items-start justify-between gap-3 p-4">
				<span className="min-w-0">
					<span className="block truncate text-sm font-semibold text-white">
						{LABEL_MAP[image.label] || prettyView(image.label)}
					</span>
					<span className="ftf-label !text-white/50">
						{salesSlideFor(image.label)}
					</span>
				</span>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20"
				>
					<X className="h-4.5 w-4.5" />
				</button>
			</div>

			{/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: stops the backdrop handler */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label={LABEL_MAP[image.label] || prettyView(image.label)}
				className="lightbox-content flex min-h-0 flex-1 items-center justify-center px-4"
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={image.url}
					alt={LABEL_MAP[image.label] || image.label}
					className="max-h-full max-w-full rounded object-contain"
				/>
			</div>

			{/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: stops the backdrop handler */}
			<div
				className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-4"
				onClick={(e) => e.stopPropagation()}
				style={{
					paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
				}}
			>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrev}
						disabled={!onPrev}
						className="rounded bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30"
					>
						← Previous
					</button>
					<button
						type="button"
						onClick={onNext}
						disabled={!onNext}
						className="rounded bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30"
					>
						Next →
					</button>
				</div>
				{footer}
			</div>
		</div>,
		document.body,
	);
}

function downloadJson(filename: string, data: unknown) {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Chained tour parts played as one ~30s walkthrough. */
function TourSeries({ parts }: { parts: GeneratedVideo[] }) {
	const ready = parts
		.filter((p) => p.status === "ready" && p.url)
		.sort((a, b) => (a.part ?? 1) - (b.part ?? 1));
	const pending = parts.some((p) => p.status === "pending");
	const failed = parts.find((p) => p.status === "error");
	const [idx, setIdx] = useState(0);
	const clip = ready[Math.min(idx, ready.length - 1)];
	if (!clip) {
		if (failed && !pending) {
			return (
				<p className="px-3 py-3 text-xs text-[var(--ftf-red-600)]">
					Tour failed{failed.error ? ` — ${failed.error}` : ""}. Stills are
					unaffected; try again.
				</p>
			);
		}
		return (
			<p className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--ftf-amber-600)]">
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				Filming part {Math.min(parts.length, TOUR_PARTS)} of {TOUR_PARTS} — the
				full tour takes a few minutes.
			</p>
		);
	}
	return (
		<>
			{/* biome-ignore lint/a11y/useMediaCaption: generated product clips have no dialogue track to caption */}
			<video
				key={clip.id}
				src={clip.url ?? undefined}
				controls
				playsInline
				autoPlay
				className="aspect-video w-full bg-[var(--ftf-well)]"
				onEnded={() => {
					if (idx < ready.length - 1) setIdx(idx + 1);
				}}
			/>
			<div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ftf-line)] px-3 py-2">
				<span className="text-[11px] text-[var(--ftf-ink-2)]">
					Full tour · part {clip.part ?? 1} of {TOUR_PARTS}
					{pending
						? " · filming next…"
						: ready.length < TOUR_PARTS
							? " · filming…"
							: " · ~30s"}
				</span>
				<div className="flex gap-2">
					{ready.map((p) => (
						<a
							key={p.id}
							href={p.url ?? undefined}
							download={`tour-part-${p.part ?? 1}.mp4`}
							className="flex items-center gap-1 text-[11px] font-medium text-[var(--ftf-blue-800)] hover:underline"
						>
							<Download className="h-3 w-3" /> Pt{p.part ?? 1}
						</a>
					))}
				</div>
			</div>
		</>
	);
}

/** Project Brain — what the designer has understood so far. */
function BrainCard({ brain }: { brain: ProjectBrain | null }) {
	if (!brain || brain.signals === 0) {
		return (
			<div
				className={cn(
					"mb-5 rounded border border-dashed border-[var(--ftf-line-strong)] bg-white p-4 text-center",
				)}
			>
				<p className="flex items-center justify-center gap-2">
					<Brain className="h-4 w-4 text-[var(--ftf-blue-800)]" />
					<span className="ftf-label !text-[var(--ftf-ink)]">
						Project brain · empty
					</span>
				</p>
				<p className="mx-auto mt-2 max-w-[320px] text-[11px] leading-relaxed text-[var(--ftf-ink-2)]">
					Dump everything in chat — menu, vibe, colors, photos. Understanding
					builds here, then concepts generate on their own.
				</p>
			</div>
		);
	}
	const bars: Array<{ label: string; value: number }> = [
		{ label: "Brand", value: brain.confidence.brand },
		{ label: "Business", value: brain.confidence.business },
		{ label: "Space", value: brain.confidence.space },
		{ label: "Customer", value: brain.confidence.customer },
		{ label: "Aesthetic", value: brain.confidence.aesthetic },
	];
	return (
		<div className={cn(CARD, "mb-5 p-4")}>
			<div className="flex items-center justify-between gap-2">
				<p className="flex items-center gap-2">
					<Brain className="h-4 w-4 shrink-0 text-[var(--ftf-blue-800)]" />
					<span className="ftf-label !text-[var(--ftf-ink)]">
						Project brain
						{brain.brandName ? ` · ${brain.brandName}` : ""}
					</span>
				</p>
				<span className="flex shrink-0 items-center gap-1.5 rounded-sm bg-[var(--ftf-teal-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ftf-teal-600)]">
					<span className="h-1.5 w-1.5 rounded-full bg-[var(--ftf-teal-500)]" />
					Learning
				</span>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
				{bars.map((b) => (
					<div key={b.label}>
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-[var(--ftf-ink-2)]">{b.label}</span>
							<span className="font-semibold tabular-nums text-[var(--ftf-ink)]">
								{b.value}%
							</span>
						</div>
						<div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[var(--ftf-paper-3)]">
							<div
								className="metric-bar h-full bg-[var(--ftf-blue-800)]"
								style={{ width: `${b.value}%` }}
							/>
						</div>
					</div>
				))}
			</div>
			{brain.unknowns.length > 0 && (
				<div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--ftf-line)] pt-3">
					<span className="ftf-label">Still open</span>
					{brain.unknowns.map((u) => (
						<span
							key={u}
							className="rounded-sm bg-[var(--ftf-paper-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ftf-ink-2)]"
						>
							{u}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

/** three.js is heavy and client-only; keep it out of the panel's first paint. */
/** What the factory wants stamped on anything a buyer takes away. */
const WATERMARK_TEXT =
	import.meta.env.VITE_WATERMARK_TEXT || "Food Truck Factory";

const TruckConfigurator = lazy(
	() => import("#/components/truck/TruckConfigurator"),
);

const ConceptToModel = lazy(() => import("#/components/truck/ConceptToModel"));

export default function BrandReportPanel({
	images: allImages,
	videos,
	isGeneratingVideo,
	onGenerateVideo,
	brain,
	layout,
	estimate,
	spec,
	lead,
	leads,
	creditsLeft,
	isGenerating,
	progress,
	onRetryFailed,
	onAskAbout,
	onGenerateConcepts,
	onToggleFavorite,
	onRefreshLeads,
	brandName,
	menu,
	onMenuChange,
	isRenderingMenu,
	onRenderMenuBoard,
}: BrandReportPanelProps) {
	const [tab, setTab] = useState<TabId>("visuals");
	// Keyed by view, not index: the grid reorders as slots settle, and an
	// index would silently start pointing at a different render.
	const [lightbox, setLightbox] = useState<string | null>(null);
	const [loaded, setLoaded] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [saving, setSaving] = useState(false);

	// Factory pipeline is live data — refresh whenever the build tab opens.
	useEffect(() => {
		if (tab === "build") onRefreshLeads();
	}, [tab, onRefreshLeads]);

	// The menu board lives in the round's grid only once it exists; its
	// progress and failures belong to the Menu tab, which can retry it.
	const board = allImages.find((i) => i.label === MENU_VIEW);
	const images = allImages.filter(
		(i) =>
			(CONCEPT_VIEWS as readonly string[]).includes(i.label) ||
			i.status === "ready",
	);
	const hasHero = allImages.some(
		(i) => i.label === "exterior_hero" && i.status === "ready",
	);
	const readyImages = images.filter((i) => i.status === "ready");
	const readyConcepts = readyImages.filter((i) => i.label !== MENU_VIEW);
	const failedImages = images.filter((i) => i.status === "failed");
	const hasFailures = failedImages.length > 0;
	const lightboxIndex = readyImages.findIndex((i) => i.label === lightbox);
	const lightboxImage =
		lightboxIndex >= 0 ? readyImages[lightboxIndex] : undefined;

	const saveConcept = useCallback(
		async (img: GeneratedImage) => {
			setSaving(true);
			try {
				const marked = await watermarkImage(img.url, {
					text: WATERMARK_TEXT,
					subtext: prettyView(img.label),
					tile: true,
				});
				downloadDataUrl(
					marked,
					`${spec?.brandName?.replace(/\s+/g, "-").toLowerCase() ?? "concept"}-${img.label}.png`,
				);
			} finally {
				setSaving(false);
			}
		},
		[spec],
	);

	const handoffText = [
		spec ? `Brand: ${spec.brandName} (${spec.business})` : "Brand: —",
		spec ? `Vehicle: ${spec.vehicle} · ${spec.footprintM}` : "Vehicle: —",
		layout ? `Layout: ${layout.layoutName} (${layout.serveMode})` : "Layout: —",
		layout ? `Equipment: ${layout.equipment.join(", ")}` : null,
		estimate
			? `Wrap: ~${estimate.wrapSqft} sq ft ${estimate.wrapTier} ≈ $${estimate.wrapLow.toLocaleString()}–$${estimate.wrapHigh.toLocaleString()}`
			: null,
		spec ? `Contact: ${spec.buyerContact}` : null,
		"Source: web designer session (LangGraph) — full chat log attached in factory pipeline.",
	]
		.filter(Boolean)
		.join("\n");

	const copyHandoff = async () => {
		try {
			await navigator.clipboard.writeText(handoffText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1600);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<div className="brand-report flex h-full w-full flex-col bg-[var(--ftf-paper-2)]">
			{/* ── Tabs: an underline bar, not pills ── */}
			<div className="flex shrink-0 items-center gap-1 border-b border-[var(--ftf-line)] bg-white px-4">
				{[
					{ id: "visuals" as TabId, label: "Visuals", icon: Truck },
					{ id: "menu" as TabId, label: "Menu", icon: UtensilsCrossed },
					{ id: "build" as TabId, label: "Build & spec", icon: BarChart3 },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						aria-current={tab === t.id}
						className={cn(
							"relative flex items-center gap-2 px-2.5 py-3.5 text-xs font-semibold transition-colors",
							tab === t.id
								? "text-[var(--ftf-blue-800)]"
								: "text-[var(--ftf-ink-3)] hover:text-[var(--ftf-ink)]",
						)}
					>
						<t.icon className="h-4 w-4" />
						{t.label}
						{tab === t.id && (
							<span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--ftf-blue-800)]" />
						)}
					</button>
				))}
				<div className="ml-auto flex items-center gap-1.5">
					{typeof creditsLeft === "number" && (
						<span className="rounded-sm border border-[var(--ftf-line)] px-2 py-1 text-[10px] font-medium tabular-nums text-[var(--ftf-ink-2)]">
							{creditsLeft} / 5 visuals
						</span>
					)}
					{(layout || estimate || spec) && (
						<span className="flex items-center gap-1.5 rounded-sm bg-[var(--ftf-teal-100)] px-2 py-1 text-[10px] font-semibold text-[var(--ftf-teal-600)]">
							<span className="h-1.5 w-1.5 rounded-full bg-[var(--ftf-teal-500)]" />
							Live build
						</span>
					)}
				</div>
			</div>

			{tab === "visuals" ? (
				<div className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
					<SectionHeader
						icon={ImageIcon}
						title="Truck concepts"
						tone={isGenerating ? "working" : hasFailures ? "neutral" : "live"}
						badge={
							isGenerating
								? "Rendering"
								: readyConcepts.length
									? `${readyConcepts.length} of ${CONCEPT_VIEW_COUNT} views`
									: undefined
						}
					/>
					{/*
					 * While a round is in flight the panel shows progress and
					 * nothing else. A grid that fills in one tile at a time reads
					 * as a broken tour, not a loading one.
					 */}
					{isGenerating ? (
						<TourProgress
							progress={progress}
							rendersReady={readyImages.length}
							rendersFailed={failedImages.length}
						/>
					) : images.length === 0 ? (
						<EmptyState
							icon={Truck}
							title={`No concepts yet — start with ${CONCEPT_VIEW_COUNT}`}
							body="The exterior hero is rendered first and becomes the anchor; every later view is generated with the finished renders before it attached as references, so all nine show the same truck rather than nine interpretations of it."
							action={{
								label: `Generate ${CONCEPT_VIEW_COUNT} starter concepts`,
								onClick: onGenerateConcepts,
							}}
							footnote={
								<>
									<Lock className="h-3 w-3" /> 5 free visuals · then top-up or
									talk to sales
								</>
							}
						/>
					) : (
						<>
							{hasFailures && (
								<div className="mb-3 flex flex-wrap items-center gap-2 rounded border-l-2 border-[var(--ftf-amber-500)] bg-[var(--ftf-amber-100)] px-3 py-2.5">
									<AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--ftf-amber-600)]" />
									<p className="flex-1 text-[11px] leading-relaxed text-[var(--ftf-amber-600)]">
										{failedImages.length} view
										{failedImages.length === 1 ? "" : "s"} did not render:{" "}
										{failedImages.map((f) => prettyView(f.label)).join(", ")}.
									</p>
									<button
										type="button"
										onClick={onRetryFailed}
										className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[var(--ftf-amber-600)]/40 bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ftf-amber-600)] transition-colors hover:bg-[var(--ftf-amber-100)]"
									>
										<RotateCcw className="h-3 w-3" /> Retry these
									</button>
								</div>
							)}
							<div
								className={cn(
									"grid gap-2.5",
									images.length === 1
										? "grid-cols-1"
										: "grid-cols-1 md:grid-cols-2",
								)}
							>
								{images.map((img) => {
									const title = LABEL_MAP[img.label] || prettyView(img.label);
									// Every view keeps its tile whatever happened to it —
									// a failure states itself instead of leaving a hole.
									if (img.status !== "ready") {
										return (
											<div
												key={img.label}
												className={cn(
													"flex aspect-video flex-col items-center justify-center gap-2 rounded px-4 text-center",
													img.status === "pending"
														? "ftf-working bg-[var(--ftf-well)]"
														: "border border-dashed border-[var(--ftf-line-strong)] bg-[var(--ftf-paper-2)]",
												)}
											>
												{img.status === "pending" ? (
													<>
														<Loader2 className="h-5 w-5 animate-spin text-white/40" />
														<span className="ftf-label !text-white/40">
															{title}
														</span>
													</>
												) : (
													<>
														<AlertTriangle className="h-5 w-5 text-[var(--ftf-ink-4)]" />
														<span className="ftf-label">{title}</span>
														<span className="max-w-[240px] text-[11px] leading-snug text-[var(--ftf-ink-3)]">
															{img.error ?? "This view did not render."}
														</span>
														<button
															type="button"
															onClick={() => onRetryFailed()}
															className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ftf-blue-800)] hover:underline"
														>
															<RotateCcw className="h-3 w-3" /> Retry
														</button>
													</>
												)}
											</div>
										);
									}
									return (
										<div
											key={img.label}
											className={cn(
												"showcase-card group relative aspect-video overflow-hidden rounded border-2 bg-[var(--ftf-well)] transition-colors",
												img.favorite
													? "border-[var(--ftf-orange-500)]"
													: "border-transparent hover:border-[var(--ftf-blue-600)]",
											)}
										>
											{!loaded.has(img.label) && (
												<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--ftf-well)]">
													<Loader2 className="h-5 w-5 animate-spin text-white/40" />
												</div>
											)}
											<button
												type="button"
												onClick={() => setLightbox(img.label)}
												className="absolute inset-0 h-full w-full"
												title="Enlarge"
											>
												<img
													src={img.url}
													alt={title}
													className="h-full w-full object-cover"
													onLoad={() =>
														setLoaded((prev) => new Set(prev).add(img.label))
													}
													onError={() =>
														setLoaded((prev) => new Set(prev).add(img.label))
													}
												/>
											</button>
											<button
												type="button"
												onClick={() => onToggleFavorite(img.label)}
												title={
													img.favorite
														? "Approved for deck + video — click to unstar"
														: "Star to approve for deck + video"
												}
												className={cn(
													"absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-sm transition",
													img.favorite
														? "bg-[var(--ftf-orange-500)] text-[#241200]"
														: "bg-black/55 text-white/80 opacity-0 backdrop-blur-sm hover:bg-black/75 group-hover:opacity-100",
												)}
											>
												<Star
													className={cn(
														"h-3.5 w-3.5",
														img.favorite && "fill-[#241200]",
													)}
												/>
											</button>
											{/* Provenance: which renders this one inherited from. */}
											{img.references && img.references.length > 0 && (
												<span
													title={`Generated with references: ${img.references.map(prettyView).join(", ")}`}
													className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-sm bg-black/55 px-1.5 py-1 text-[10px] font-medium text-white/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
												>
													<Layers className="h-3 w-3" />
													{img.references.length}
												</span>
											)}
											{/* Caption plate: always readable, not a hover surprise. */}
											<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
												<span className="min-w-0">
													<span className="block truncate text-xs font-semibold text-white">
														{title}
													</span>
													<span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-white/60">
														{salesSlideFor(img.label)}
														{img.favorite && " · approved"}
													</span>
												</span>
												<Maximize2 className="h-4 w-4 shrink-0 text-white/60 opacity-0 transition-opacity group-hover:opacity-100" />
											</div>
										</div>
									);
								})}
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={onGenerateConcepts}
									disabled={isGenerating}
									className={GHOST_BTN}
								>
									<RefreshCw className="h-3 w-3" />
									Regenerate · 1 credit
								</button>
								<button
									type="button"
									onClick={() =>
										onAskAbout(
											"Concept feedback",
											"Develop the hatch-open direction with bolder signage.",
										)
									}
									className={GHOST_BTN}
								>
									<MessageCircle className="h-3 w-3" /> Refine in chat
								</button>
							</div>

							{/* Sales video — Omni Flash films the master + starred
							    stills, so the video shows the approved product. */}
							<div className="mt-8">
								<SectionHeader
									icon={Clapperboard}
									title="Sales video"
									tone={isGeneratingVideo ? "working" : "neutral"}
									badge={
										isGeneratingVideo
											? "Filming"
											: videos.length
												? `${videos.length} clip${videos.length === 1 ? "" : "s"}`
												: undefined
									}
								/>
								<p className="-mt-1 mb-3 text-xs leading-relaxed text-[var(--ftf-ink-2)]">
									Each clip is filmed from the renders that show the space it
									covers — the walkthrough from the interior views, the night
									cut from the night render — so the camera moves through the
									truck you approved rather than a new one.
								</p>
								<div className="grid gap-2 sm:grid-cols-2">
									{SALES_VIDEO_PRESETS.map((p) => (
										<button
											key={p.kind}
											type="button"
											onClick={() => onGenerateVideo(p.kind)}
											disabled={isGeneratingVideo || readyImages.length === 0}
											className={cn(
												CARD,
												"px-3 py-2.5 text-left transition-colors hover:border-[var(--ftf-blue-600)] hover:bg-[var(--ftf-blue-50)] disabled:opacity-40 disabled:hover:border-[var(--ftf-line)] disabled:hover:bg-white",
											)}
										>
											<span className="block text-xs font-semibold text-[var(--ftf-ink)]">
												{p.label}
											</span>
											<span className="mt-0.5 block text-[11px] leading-snug text-[var(--ftf-ink-3)]">
												{p.blurb}
											</span>
										</button>
									))}
								</div>
								{isGeneratingVideo && (
									<div className="mt-2.5">
										<TourProgress
											progress={progress}
											rendersReady={readyImages.length}
											rendersFailed={failedImages.length}
										/>
									</div>
								)}
								{!isGeneratingVideo &&
									videos.length > 0 &&
									(() => {
										const groups = new Map<string, GeneratedVideo[]>();
										const singles: GeneratedVideo[] = [];
										for (const v of videos) {
											if (v.kind === "tour") {
												const key = v.seriesId || v.id;
												const g = groups.get(key) ?? [];
												g.push(v);
												groups.set(key, g);
											} else {
												singles.push(v);
											}
										}
										return (
											<>
												{[...groups.values()].map((parts) => (
													<div
														key={parts[0].seriesId || parts[0].id}
														className={cn(CARD, "mt-2.5 overflow-hidden")}
													>
														<TourSeries parts={parts} />
													</div>
												))}
												{singles.map((v) => (
													<div
														key={v.id}
														className={cn(CARD, "mt-2.5 overflow-hidden")}
													>
														{v.status === "ready" && v.url ? (
															<>
																{/* biome-ignore lint/a11y/useMediaCaption: generated product clips have no dialogue track to caption */}
																<video
																	src={v.url}
																	controls
																	playsInline
																	className="aspect-video w-full bg-[var(--ftf-well)]"
																/>
																<div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ftf-line)] px-3 py-2">
																	<span className="text-[11px] font-medium text-[var(--ftf-ink-2)]">
																		{SALES_VIDEO_PRESETS.find(
																			(p) => p.kind === v.kind,
																		)?.label ?? v.kind}
																	</span>
																	<a
																		href={v.url}
																		download={`${v.kind}.mp4`}
																		className="flex items-center gap-1 text-[11px] font-medium text-[var(--ftf-blue-800)] hover:underline"
																	>
																		<Download className="h-3 w-3" /> Deck-ready
																		MP4
																	</a>
																</div>
															</>
														) : v.status === "error" ? (
															<p className="px-3 py-3 text-xs leading-relaxed text-[var(--ftf-red-600)]">
																Video failed
																{v.error ? ` — ${v.error}` : ""}. Stills are
																unaffected; try again.
															</p>
														) : (
															<p className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--ftf-amber-600)]">
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
																Filming the approved stills — this takes a
																minute or two.
															</p>
														)}
													</div>
												))}
											</>
										);
									})()}
							</div>

							{/* The trailer itself — built from the factory's dimensions,
							    so it cannot disagree with the spec above. */}
							{layout && (
								<div className="mt-8">
									<SectionHeader
										icon={Box}
										title="Your trailer"
										badge="Live model"
										tone="live"
									/>
									<p className="-mt-1 mb-3 text-xs leading-relaxed text-[var(--ftf-ink-2)]">
										Built from the factory's own dimensions and your equipment
										list — change the layout and the power draw, the aisle and
										every render angle follow.
									</p>
									<Suspense
										fallback={
											<div className="ftf-working h-[280px] w-full rounded bg-[var(--ftf-well)] sm:h-[340px]" />
										}
									>
										<TruckConfigurator
											vehicleId={brain?.vehicleId ?? null}
											equipmentIds={layout.equipment}
											wrapColors={brain?.colors ?? null}
										/>
									</Suspense>

									{/* The paid half: one chosen render becomes a real mesh. */}
									<Suspense fallback={null}>
										<ConceptToModel
											concepts={readyImages.map((i) => ({
												label: i.label,
												url: i.url,
											}))}
											prompt={[
												spec?.brandName,
												layout.layoutName,
												spec?.vehicle,
												"food trailer, exterior",
											]
												.filter(Boolean)
												.join(" — ")}
										/>
									</Suspense>
								</div>
							)}
						</>
					)}
				</div>
			) : tab === "menu" ? (
				<div className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
					<SectionHeader
						icon={UtensilsCrossed}
						title="Menu board"
						tone={
							isRenderingMenu
								? "working"
								: board?.status === "ready"
									? "live"
									: "neutral"
						}
						badge={
							isRenderingMenu
								? "Rendering"
								: board?.status === "ready"
									? "On render"
									: undefined
						}
					/>
					<MenuBuilder
						menu={menu}
						onChange={onMenuChange}
						brand={brandName}
						colors={brain?.colors ?? []}
						menuKeywords={brain?.menuKeywords ?? []}
						board={board}
						hasHero={hasHero}
						isRendering={isRenderingMenu}
						creditsLeft={creditsLeft}
						onRender={onRenderMenuBoard}
					/>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
					<BrainCard brain={brain} />
					{!layout && !estimate && !spec ? (
						<EmptyState
							icon={BarChart3}
							title="Your build sheet appears here"
							body="Layout zones, equipment, wrap area and price ranges, bill of materials and the private investor spec — all built live as you chat."
							action={{
								label: "Recommend my layout",
								onClick: () =>
									onAskAbout(
										"Layout",
										"Recommend the layout for my menu and vehicle.",
									),
							}}
						/>
					) : (
						<>
							{layout && (
								<div className="mb-6">
									<SectionHeader
										icon={Truck}
										title="Recommended layout"
										badge={layout.serveMode}
									/>
									<div className={cn(CARD, "p-4")}>
										<p className="ftf-display text-[15px] text-[var(--ftf-ink)]">
											{layout.layoutName}
										</p>
										<ul className="mt-2.5 space-y-1.5">
											{layout.zones.map((z) => (
												<li
													key={z}
													className="flex gap-2.5 text-xs leading-relaxed text-[var(--ftf-ink-2)]"
												>
													<span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-[1px] bg-[var(--ftf-blue-600)]" />
													<span className="flex-1">{z}</span>
												</li>
											))}
										</ul>
										<div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-[var(--ftf-line)] pt-3.5">
											{layout.equipment.map((e) => (
												<span
													key={e}
													className="rounded-sm bg-[var(--ftf-blue-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--ftf-blue-800)]"
												>
													{e}
												</span>
											))}
										</div>
										<p className="mt-3 text-[11px] leading-relaxed text-[var(--ftf-ink-2)]">
											<span className="font-semibold text-[var(--ftf-ink)]">
												Power:
											</span>{" "}
											{layout.powerNotes}
										</p>
										{layout.complianceNotes.map((c) => (
											<p
												key={c}
												className="mt-2 border-l-2 border-[var(--ftf-amber-500)] bg-[var(--ftf-amber-100)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--ftf-amber-600)]"
											>
												{c}
											</p>
										))}
									</div>
								</div>
							)}

							{estimate && (
								<div className="mb-6">
									<SectionHeader
										icon={BarChart3}
										title="Wrap & build estimate"
										badge="Ranges"
									/>
									<div className="grid grid-cols-2 gap-2">
										<Stat
											label="Wrap area"
											value={`~${estimate.wrapSqft} sq ft`}
											note={`${estimate.wrapTier} · ${estimate.vehicleLabel}`}
										/>
										<Stat
											label="Wrap range"
											accent="teal"
											value={`$${estimate.wrapLow.toLocaleString()}–$${estimate.wrapHigh.toLocaleString()}`}
											note="film + labor · final quote by sales"
										/>
									</div>
									<div className={cn(CARD, "mt-2 p-4")}>
										<p className="ftf-label mb-2.5">Bill of materials</p>
										{estimate.bom.map((b) => (
											<div
												key={`${b.item}-${b.detail}`}
												className="flex items-start justify-between gap-3 border-b border-[var(--ftf-line)] py-2 last:border-0"
											>
												<span className="text-xs font-medium text-[var(--ftf-ink)]">
													{b.item}
												</span>
												<span className="text-right text-[11px] text-[var(--ftf-ink-2)]">
													{b.detail}
												</span>
											</div>
										))}
										<p className="mt-2.5 border-t border-[var(--ftf-line)] pt-2.5 text-[11px] text-[var(--ftf-ink-2)]">
											<span className="font-semibold text-[var(--ftf-ink)]">
												Lead time:
											</span>{" "}
											{estimate.leadTimeWeeks}
										</p>
									</div>
								</div>
							)}

							{spec && (
								<div className="mb-6">
									<SectionHeader
										icon={FileJson}
										title="Investor spec"
										badge="Private"
										tone="live"
									/>
									<div className="overflow-hidden rounded border border-[var(--ftf-line)] bg-white">
										<div className="h-1 bg-[var(--ftf-teal-500)]" />
										<div className="p-4">
											<p className="ftf-display text-[15px] text-[var(--ftf-ink)]">
												{spec.brandName}
											</p>
											<p className="mt-0.5 text-xs text-[var(--ftf-ink-2)]">
												{spec.business} · {spec.vehicle} · {spec.footprintM}
											</p>
											<p className="mt-3 flex items-start gap-2 rounded-sm bg-[var(--ftf-teal-100)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--ftf-teal-600)]">
												<Lock className="mt-px h-3 w-3 shrink-0" />
												{spec.privacy}
											</p>
											<ol className="mt-3 space-y-1.5">
												{spec.nextSteps.map((n, i) => (
													<li
														key={n}
														className="flex gap-2.5 text-[11px] leading-relaxed text-[var(--ftf-ink-2)]"
													>
														<span className="w-3 shrink-0 text-right font-semibold tabular-nums text-[var(--ftf-blue-600)]">
															{i + 1}
														</span>
														<span className="flex-1">{n}</span>
													</li>
												))}
											</ol>
											<div className="mt-4 flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() =>
														downloadJson(
															`${spec.brandName.replace(/\s+/g, "-").toLowerCase()}-spec.json`,
															{ spec, layout, estimate },
														)
													}
													className="ftf-cta inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs"
												>
													<Download className="h-3 w-3" /> Spec JSON
												</button>
												<button
													type="button"
													onClick={copyHandoff}
													className={GHOST_BTN}
												>
													{copied ? (
														<Check className="h-3 w-3" />
													) : (
														<ClipboardCopy className="h-3 w-3" />
													)}
													{copied ? "Copied" : "Copy WhatsApp handoff"}
												</button>
											</div>
										</div>
									</div>
								</div>
							)}

							<div className={cn(CARD, "p-4")}>
								<div className="flex items-center justify-between gap-2">
									<p className="flex items-center gap-2">
										<Users className="h-4 w-4 shrink-0 text-[var(--ftf-blue-800)]" />
										<span className="ftf-label !text-[var(--ftf-ink)]">
											Factory pipeline
										</span>
										{leads.length > 0 && (
											<span className="rounded-sm bg-[var(--ftf-paper-3)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--ftf-ink-2)]">
												{leads.length}
											</span>
										)}
									</p>
									<button
										type="button"
										onClick={onRefreshLeads}
										title="Refresh pipeline"
										aria-label="Refresh pipeline"
										className="flex h-7 w-7 items-center justify-center rounded-sm text-[var(--ftf-ink-3)] transition-colors hover:bg-[var(--ftf-blue-50)] hover:text-[var(--ftf-blue-800)]"
									>
										<RefreshCw className="h-3.5 w-3.5" />
									</button>
								</div>
								{lead && (
									<p className="mt-2 rounded-sm bg-[var(--ftf-teal-100)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--ftf-teal-600)]">
										This session: handoff saved (
										{String((lead as { stage?: string }).stage ?? "new")}).
									</p>
								)}
								{leads.length === 0 ? (
									<p className="mt-2 text-[11px] leading-relaxed text-[var(--ftf-ink-2)]">
										{lead
											? "Refreshing pipeline…"
											: "Day 0 · designing. Drop your name + WhatsApp/email in chat and I'll save the handoff — even cold sessions convert on follow-up."}
									</p>
								) : (
									<div className="mt-2.5 space-y-1">
										{leads.slice(0, 8).map((l) => (
											<button
												key={l.sessionId}
												type="button"
												onClick={() =>
													onAskAbout(
														`Lead: ${l.brandName ?? "unknown brand"}`,
														`${l.vehicle ?? "vehicle tbd"} · stage ${l.stage ?? "new"}. How should sales follow up?`,
													)
												}
												className="w-full rounded-sm border border-[var(--ftf-line)] p-2.5 text-left transition-colors hover:border-[var(--ftf-blue-600)] hover:bg-[var(--ftf-blue-50)]"
												title="Ask the designer about this lead"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="truncate text-xs font-semibold text-[var(--ftf-ink)]">
														{l.brandName ?? "Unknown brand"}
													</span>
													<span className="shrink-0 rounded-sm bg-[var(--ftf-paper-2)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--ftf-ink-2)]">
														{l.stage ?? "new"}
													</span>
												</div>
												<p className="mt-0.5 truncate text-[10px] text-[var(--ftf-ink-3)]">
													{l.vehicle ?? "vehicle tbd"} ·{" "}
													{new Date(l.lastSeen).toLocaleString([], {
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
											</button>
										))}
										<p className="pt-1 text-[10px] leading-relaxed text-[var(--ftf-ink-4)]">
											What sales sees — contact + concept + full chat log per
											session. Open /chat in another tab to simulate a second
											buyer.
										</p>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			)}

			{/* ── Lightbox: portalled to <body>, above every stacking context ── */}
			{lightboxImage && (
				<Lightbox
					image={lightboxImage}
					onClose={() => setLightbox(null)}
					onPrev={
						lightboxIndex > 0
							? () => setLightbox(readyImages[lightboxIndex - 1].label)
							: undefined
					}
					onNext={
						lightboxIndex < readyImages.length - 1
							? () => setLightbox(readyImages[lightboxIndex + 1].label)
							: undefined
					}
					footer={
						/* Concepts leave with the factory's mark on them. */
						<button
							type="button"
							disabled={saving}
							onClick={() => saveConcept(lightboxImage)}
							className="ftf-cta inline-flex items-center gap-1.5 rounded px-4 py-2 text-xs"
						>
							<Download className="h-3.5 w-3.5" />
							{saving ? "Preparing…" : "Download"}
						</button>
					}
				/>
			)}
		</div>
	);
}
