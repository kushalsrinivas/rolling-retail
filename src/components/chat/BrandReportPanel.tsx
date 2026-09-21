import {
	BarChart3,
	Box,
	Brain,
	Clapperboard,
	ClipboardCopy,
	Download,
	FileJson,
	ImageIcon,
	Loader2,
	Lock,
	Maximize2,
	MessageCircle,
	RefreshCw,
	Send,
	Star,
	Truck,
	Users,
	X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import type {
	GeneratedImage,
	GeneratedVideo,
	PipelineLead,
	TruckEstimate,
	TruckLayout,
	TruckSpec,
} from "#/hooks/use-chat";
import type { ProjectBrain } from "#/lib/food-truck/brain";
import { CONCEPT_VIEW_COUNT } from "#/lib/food-truck/constants";
import {
	SALES_VIDEO_PRESETS,
	type SalesVideoKind,
	salesSlideFor,
} from "#/lib/food-truck/sales";
import { cn } from "#/lib/utils";
import { downloadDataUrl, watermarkImage } from "#/lib/watermark";

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
	onAskAbout: (label: string, value: string) => void;
	onGenerateConcepts: () => void;
	onToggleFavorite: (label: string) => void;
	onRefreshLeads: () => void;
}

type TabId = "visuals" | "build";

function SectionHeader({
	icon: Icon,
	title,
	badge,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	badge?: string;
}) {
	return (
		<div className="flex items-center gap-2 pb-2 pt-1">
			<Icon className="h-3.5 w-3.5 text-purple-400" />
			<span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
				{title}
			</span>
			{badge && (
				<span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
					{badge}
				</span>
			)}
			<div className="ml-2 h-px flex-1 bg-gradient-to-r from-[rgba(163,130,255,0.15)] to-transparent" />
		</div>
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

/** Project Brain — what the designer has understood so far. */
function BrainCard({ brain }: { brain: ProjectBrain | null }) {
	if (!brain || brain.signals === 0) {
		return (
			<div className="mb-5 rounded-xl border border-dashed border-[rgba(163,130,255,0.2)] bg-[#111113] p-3.5 text-center">
				<p className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-300">
					<Brain className="h-3.5 w-3.5 text-purple-400" />
					Project Brain — empty
				</p>
				<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
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
		<div className="mb-5 rounded-xl border border-[rgba(163,130,255,0.12)] bg-[#111113] p-3.5">
			<div className="flex items-center justify-between">
				<p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
					<Brain className="h-3 w-3 text-purple-400" />
					Project Brain{brain.brandName ? ` · ${brain.brandName}` : ""}
				</p>
				<span className="flex items-center gap-1 text-[10px] text-emerald-400">
					<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
					learning
				</span>
			</div>
			<div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
				{bars.map((b) => (
					<div key={b.label}>
						<div className="flex items-center justify-between text-[10px]">
							<span className="text-zinc-500">{b.label}</span>
							<span className="tabular-nums text-zinc-400">{b.value}%</span>
						</div>
						<div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-800/70">
							<div
								className="h-full rounded-full bg-purple-500/70 transition-all duration-500"
								style={{ width: `${b.value}%` }}
							/>
						</div>
					</div>
				))}
			</div>
			{brain.unknowns.length > 0 && (
				<div className="mt-2.5 flex flex-wrap gap-1.5">
					<span className="text-[10px] text-zinc-600">Still open:</span>
					{brain.unknowns.map((u) => (
						<span
							key={u}
							className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
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
	images,
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
	onAskAbout,
	onGenerateConcepts,
	onToggleFavorite,
	onRefreshLeads,
}: BrandReportPanelProps) {
	const [tab, setTab] = useState<TabId>("visuals");
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [loaded, setLoaded] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [saving, setSaving] = useState(false);

	// Factory pipeline is live data — refresh whenever the build tab opens.
	useEffect(() => {
		if (tab === "build") onRefreshLeads();
	}, [tab, onRefreshLeads]);

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
		<div className="flex h-full w-full flex-col bg-[#09090b]">
			{/* Tabs */}
			<div className="flex items-center gap-1 border-b border-[rgba(163,130,255,0.1)] px-4 py-2">
				{[
					{ id: "visuals" as TabId, label: "Visuals", icon: Truck },
					{ id: "build" as TabId, label: "Build & Spec", icon: BarChart3 },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						className={cn(
							"relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
							tab === t.id
								? "bg-purple-500/10 text-purple-300"
								: "text-zinc-500 hover:text-zinc-300",
						)}
					>
						<t.icon className="h-3.5 w-3.5" />
						{t.label}
					</button>
				))}
				<div className="ml-auto flex items-center gap-1">
					{typeof creditsLeft === "number" && (
						<span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
							{creditsLeft} / 5 visuals left
						</span>
					)}
					{(layout || estimate || spec) && (
						<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
							live build
						</span>
					)}
				</div>
			</div>

			{tab === "visuals" ? (
				<div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
					<SectionHeader
						icon={ImageIcon}
						title="Truck Concepts"
						badge={
							isGenerating
								? "Generating…"
								: images.length
									? `${images.length} concept${images.length === 1 ? "" : "s"}`
									: undefined
						}
					/>
					{images.length === 0 && !isGenerating ? (
						<div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(163,130,255,0.12)] bg-[rgba(168,85,247,0.05)]">
								<Truck className="h-7 w-7 text-purple-500/40" />
							</div>
							<div>
								<p className="text-sm font-medium text-zinc-300">
									No concepts yet — start with {CONCEPT_VIEW_COUNT}
								</p>
								<p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-zinc-500">
									One master hero, nine deck-ready views off it (hero, overview,
									feature, use-case, technical, vision). Star the ones to
									approve for video — no angle drift.
								</p>
							</div>
							<button
								type="button"
								onClick={onGenerateConcepts}
								className="rounded-full bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500"
							>
								Generate {CONCEPT_VIEW_COUNT} starter concepts
							</button>
							<p className="flex items-center gap-1 text-[10px] text-zinc-600">
								<Lock className="h-3 w-3" /> 5 free visuals · then top-up or
								talk to sales
							</p>
						</div>
					) : (
						<>
							<div
								className={cn(
									"mt-3 grid gap-2.5",
									images.length === 1
										? "grid-cols-1"
										: "grid-cols-1 md:grid-cols-2",
								)}
							>
								{images.map((img, i) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: labels repeat across regenerations; label+index is the stable identity
										key={`${img.label}-${i}`}
										className={cn(
											"group relative aspect-video overflow-hidden rounded-xl border bg-[#111113] transition",
											img.favorite
												? "border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.15)]"
												: "border-[rgba(163,130,255,0.1)] hover:border-purple-500/30",
										)}
									>
										{!loaded.has(img.label) && (
											<div className="absolute inset-0 z-10 flex items-center justify-center bg-[#111113]">
												<Loader2 className="h-5 w-5 animate-spin text-purple-500/50" />
											</div>
										)}
										<button
											type="button"
											onClick={() => setLightbox(i)}
											className="absolute inset-0 h-full w-full"
											title="Enlarge"
										>
											<img
												src={img.url}
												alt={LABEL_MAP[img.label] || img.label}
												className="h-full w-full object-cover"
												onLoad={() =>
													setLoaded((p) => new Set(p).add(img.label))
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
												"absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition",
												img.favorite
													? "bg-amber-400 text-black"
													: "bg-black/60 text-zinc-400 opacity-0 hover:text-amber-300 group-hover:opacity-100",
											)}
										>
											<Star
												className={cn(
													"h-3.5 w-3.5",
													img.favorite && "fill-black",
												)}
											/>
										</button>
										<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
											<div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3">
												<span className="text-xs font-medium text-white/90">
													{LABEL_MAP[img.label] || img.label}
													{img.favorite && " · approved"}
													<span className="ml-1.5 rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-200">
														{salesSlideFor(img.label)}
													</span>
												</span>
												<Maximize2 className="h-4 w-4 shrink-0 text-white/70" />
											</div>
										</div>
									</div>
								))}
								{isGenerating &&
									Array.from({ length: Math.max(0, 3 - images.length) }).map(
										(_, i) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: transient loading slots
												key={`generating-${i}`}
												className="flex aspect-video items-center justify-center rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]"
											>
												<Loader2 className="h-5 w-5 animate-spin text-purple-500/50" />
											</div>
										),
									)}
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={onGenerateConcepts}
									disabled={isGenerating}
									className="rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
								>
									Regenerate (uses 1 credit)
								</button>
								<button
									type="button"
									onClick={() =>
										onAskAbout(
											"Concept feedback",
											"Develop the hatch-open direction with bolder signage.",
										)
									}
									className="flex items-center gap-1 rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10"
								>
									<MessageCircle className="h-3 w-3" /> Refine in chat
								</button>
							</div>
							{/* Sales video — Omni Flash films the master + starred
							    stills, so the video shows the approved product. */}
							<div className="mt-6">
								<SectionHeader
									icon={Clapperboard}
									title="Sales video"
									badge={
										isGeneratingVideo
											? "Generating…"
											: videos.length
												? `${videos.length} clip${videos.length === 1 ? "" : "s"}`
												: undefined
									}
								/>
								<p className="mt-2 mb-3 text-xs leading-relaxed text-zinc-500">
									Star stills to approve them — the master hero plus up to two
									starred views become the video's references. Drop the clip
									straight into the deck.
								</p>
								<div className="flex flex-wrap gap-2">
									{SALES_VIDEO_PRESETS.map((p) => (
										<button
											key={p.kind}
											type="button"
											onClick={() => onGenerateVideo(p.kind)}
											disabled={isGeneratingVideo || images.length === 0}
											title={p.blurb}
											className="rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
										>
											{p.label}
										</button>
									))}
								</div>
								{videos.map((v) => (
									<div
										key={v.id}
										className="mt-2.5 overflow-hidden rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113]"
									>
										{v.status === "ready" && v.url ? (
											<>
												{/* biome-ignore lint/a11y/useMediaCaption: generated product clips have no dialogue track to caption */}
												<video
													src={v.url}
													controls
													playsInline
													className="aspect-video w-full bg-black"
												/>
												<div className="flex items-center justify-between px-3 py-2">
													<span className="text-xs text-zinc-400">
														{SALES_VIDEO_PRESETS.find((p) => p.kind === v.kind)
															?.label ?? v.kind}
													</span>
													<a
														href={v.url}
														download={`${v.kind}.mp4`}
														className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
													>
														<Download className="h-3 w-3" /> Deck-ready MP4
													</a>
												</div>
											</>
										) : v.status === "error" ? (
											<p className="px-3 py-2.5 text-xs text-red-400">
												Video failed{v.error ? ` — ${v.error}` : ""}. Stills are
												unaffected; try again.
											</p>
										) : (
											<p className="flex items-center gap-2 px-3 py-2.5 text-xs text-amber-300">
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
												Filming the approved stills — this takes a minute or
												two.
											</p>
										)}
									</div>
								))}
							</div>
							{/* The trailer itself — built from the factory's dimensions,
							    so it cannot disagree with the spec above. */}
							{layout && (
								<div className="mt-6">
									<SectionHeader
										icon={Box}
										title="Your trailer"
										badge="live model"
									/>
									<p className="mt-2 mb-3 text-xs leading-relaxed text-zinc-500">
										Built from the factory's own dimensions and your equipment
										list — change the layout and the power draw, the aisle and
										every render angle follow.
									</p>
									<Suspense
										fallback={
											<div className="h-[280px] w-full animate-pulse rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#0b0b10] sm:h-[340px]" />
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
											concepts={images.map((i) => ({
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
			) : (
				<div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
					<BrainCard brain={brain} />
					{!layout && !estimate && !spec ? (
						<div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(163,130,255,0.12)] bg-[rgba(168,85,247,0.05)]">
								<BarChart3 className="h-7 w-7 text-purple-500/40" />
							</div>
							<p className="text-sm font-medium text-zinc-300">
								Your build sheet appears here
							</p>
							<p className="max-w-[280px] text-xs leading-relaxed text-zinc-500">
								Layout zones, equipment, wrap area + ranges, BOM and the private
								investor spec — built live as you chat.
							</p>
							<button
								type="button"
								onClick={() =>
									onAskAbout(
										"Layout",
										"Recommend the layout for my menu and vehicle.",
									)
								}
								className="rounded-full bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500"
							>
								Recommend my layout
							</button>
						</div>
					) : (
						<>
							{layout && (
								<div className="mb-5">
									<SectionHeader
										icon={Truck}
										title="Recommended layout"
										badge={layout.serveMode}
									/>
									<div className="mt-3 rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3.5">
										<p className="text-sm font-semibold text-zinc-100">
											{layout.layoutName}
										</p>
										<ul className="mt-2 space-y-1">
											{layout.zones.map((z) => (
												<li
													key={z}
													className="text-xs leading-relaxed text-zinc-400"
												>
													· {z}
												</li>
											))}
										</ul>
										<div className="mt-3 flex flex-wrap gap-1.5">
											{layout.equipment.map((e) => (
												<span
													key={e}
													className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300"
												>
													{e}
												</span>
											))}
										</div>
										<p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
											<span className="text-zinc-300">Power:</span>{" "}
											{layout.powerNotes}
										</p>
										{layout.complianceNotes.map((c) => (
											<p
												key={c}
												className="mt-1 text-[11px] leading-relaxed text-amber-300/80"
											>
												⚠ {c}
											</p>
										))}
									</div>
								</div>
							)}

							{estimate && (
								<div className="mb-5">
									<SectionHeader
										icon={BarChart3}
										title="Wrap & build estimate"
										badge="ranges"
									/>
									<div className="mt-3 grid grid-cols-2 gap-2">
										<div className="rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3">
											<p className="text-[10px] text-zinc-500">Wrap area</p>
											<p className="text-lg font-bold text-purple-300">
												~{estimate.wrapSqft} sq ft
											</p>
											<p className="text-[10px] text-zinc-600">
												{estimate.wrapTier} · {estimate.vehicleLabel}
											</p>
										</div>
										<div className="rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3">
											<p className="text-[10px] text-zinc-500">Wrap range</p>
											<p className="text-lg font-bold text-emerald-400">
												${estimate.wrapLow.toLocaleString()}–$
												{estimate.wrapHigh.toLocaleString()}
											</p>
											<p className="text-[10px] text-zinc-600">
												film + labor · final quote by sales
											</p>
										</div>
									</div>
									<div className="mt-2 rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3">
										<p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
											Bill of materials
										</p>
										{estimate.bom.map((b) => (
											<div
												key={`${b.item}-${b.detail}`}
												className="flex items-start justify-between gap-2 border-b border-zinc-800/50 py-1.5 last:border-0"
											>
												<span className="text-xs text-zinc-300">{b.item}</span>
												<span className="text-right text-[11px] text-zinc-500">
													{b.detail}
												</span>
											</div>
										))}
										<p className="mt-2 text-[11px] text-zinc-500">
											Lead time: {estimate.leadTimeWeeks}
										</p>
									</div>
								</div>
							)}

							{spec && (
								<div className="mb-5">
									<SectionHeader
										icon={FileJson}
										title="Investor spec · private"
										badge="yours only"
									/>
									<div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
										<p className="text-sm font-semibold text-zinc-100">
											{spec.brandName} — {spec.business}
										</p>
										<p className="mt-0.5 text-xs text-zinc-400">
											{spec.vehicle} · {spec.footprintM}
										</p>
										<p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-400">
											<Lock className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />{" "}
											{spec.privacy}
										</p>
										<ol className="mt-2 space-y-1">
											{spec.nextSteps.map((n) => (
												<li key={n} className="text-[11px] text-zinc-500">
													→ {n}
												</li>
											))}
										</ol>
										<div className="mt-3 flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() =>
													downloadJson(
														`${spec.brandName.replace(/\s+/g, "-").toLowerCase()}-spec.json`,
														{ spec, layout, estimate },
													)
												}
												className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25"
											>
												<Download className="h-3 w-3" /> Spec JSON
											</button>
											<button
												type="button"
												onClick={copyHandoff}
												className="flex items-center gap-1 rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10"
											>
												{copied ? (
													<Send className="h-3 w-3" />
												) : (
													<ClipboardCopy className="h-3 w-3" />
												)}
												{copied ? "Copied!" : "Copy WhatsApp handoff"}
											</button>
										</div>
									</div>
								</div>
							)}

							<div className="rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3.5">
								<div className="flex items-center justify-between">
									<p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
										<Users className="h-3 w-3" />
										Factory pipeline
										{leads.length > 0 && (
											<span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
												{leads.length}
											</span>
										)}
									</p>
									<button
										type="button"
										onClick={onRefreshLeads}
										title="Refresh pipeline"
										className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-purple-500/10 hover:text-purple-300"
									>
										<RefreshCw className="h-3 w-3" />
									</button>
								</div>
								{lead && (
									<p className="mt-1 text-xs leading-relaxed text-emerald-300">
										This session: handoff saved (
										{String((lead as { stage?: string }).stage ?? "new")}
										).
									</p>
								)}
								{leads.length === 0 ? (
									<p className="mt-1 text-xs leading-relaxed text-zinc-400">
										{lead
											? "Refreshing pipeline…"
											: "Day 0 · designing. Drop your name + WhatsApp/email in chat and I'll save the handoff — even cold sessions convert on follow-up."}
									</p>
								) : (
									<div className="mt-2 space-y-1.5">
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
												className="w-full rounded-lg bg-zinc-900/50 p-2 text-left transition hover:bg-zinc-900"
												title="Ask the designer about this lead"
											>
												<div className="flex items-center justify-between">
													<span className="text-xs font-medium text-zinc-200">
														{l.brandName ?? "Unknown brand"}
													</span>
													<span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-300">
														{l.stage ?? "new"}
													</span>
												</div>
												<p className="mt-0.5 truncate text-[10px] text-zinc-500">
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
										<p className="text-[10px] text-zinc-600">
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

			{/* Lightbox */}
			{lightbox !== null && images[lightbox] && (
				// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: lightbox dismiss
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
					onClick={() => setLightbox(null)}
				>
					{/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: stop propagation */}
					<div
						className="relative max-h-[90vh] max-w-[90vw]"
						onClick={(e) => e.stopPropagation()}
					>
						<img
							src={images[lightbox].url}
							alt={images[lightbox].label}
							className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
						/>
						<button
							type="button"
							onClick={() => setLightbox(null)}
							className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-white/70 hover:bg-zinc-700 hover:text-white"
						>
							<X className="h-4 w-4" />
						</button>
						{/* Concepts leave with the factory's mark on them. */}
						<button
							type="button"
							disabled={saving}
							onClick={async () => {
								const img = images[lightbox];
								setSaving(true);
								try {
									const marked = await watermarkImage(img.url, {
										text: WATERMARK_TEXT,
										subtext: img.label.replace(/_/g, " "),
										tile: true,
									});
									downloadDataUrl(
										marked,
										`${spec?.brandName?.replace(/\s+/g, "-").toLowerCase() ?? "concept"}-${img.label}.png`,
									);
								} finally {
									setSaving(false);
								}
							}}
							className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3.5 py-2 text-xs font-medium text-white/85 backdrop-blur transition hover:bg-black/85 disabled:opacity-60"
						>
							<Download className="h-3.5 w-3.5" />
							{saving ? "Preparing…" : "Download"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
