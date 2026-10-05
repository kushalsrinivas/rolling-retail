/**
 * The canvas: the live view of the latest design version.
 *
 * One stage, not a grid. The buyer sees one view large, a filmstrip of the
 * rest, and — instead of a wall of nine tiles that each might have failed —
 * the angles they have not rendered yet as free "add a view" tiles. The
 * version bar says which design this is and offers the one decision that
 * matters: approve it. Spec & quote is built from the same design record
 * the renders read, so it can never describe a different trailer.
 */
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Clapperboard,
	Download,
	Loader2,
	Maximize2,
	Plus,
	RefreshCw,
	RotateCcw,
	Star,
	X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { sceneFromSpec } from "#/lib/food-truck/build-scene";
import { createPortal } from "react-dom";
import { EQUIPMENT_LABELS } from "#/content/use-cases";
import {
	type GeneratedImage,
	type useChat,
	VIEW_TITLES,
	viewTitle,
} from "#/hooks/use-chat";
import {
	CONCEPT_VIEWS,
	footprintFt,
	getBusiness,
	getVehicle,
	MENU_VIEW,
} from "#/lib/food-truck/constants";
import { SALES_VIDEO_PRESETS } from "#/lib/food-truck/sales";
import { cn } from "#/lib/utils";
import { downloadDataUrl, watermarkImage } from "#/lib/watermark";
import MenuBuilder from "./MenuBuilder";

const BriefCompanion = lazy(() => import("./BriefCompanion"));
const TruckConfigurator = lazy(
	() => import("#/components/truck/TruckConfigurator"),
);

type Tab = "design" | "menu" | "spec";

const CARD =
	"rounded-2xl border-2 border-[var(--ftf-ink)] bg-white shadow-[4px_4px_0_var(--ftf-ink)]";
const GHOST =
	"inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ftf-ink)] bg-white px-3.5 py-1.5 text-[12.5px] font-bold transition-colors hover:bg-[var(--ftf-amber-500)] disabled:opacity-40 disabled:hover:bg-white";

const STARTERS = new Set([
	"exterior_hero",
	"side_elevation",
	"interior_layout",
]);

interface SpecShape {
	brand?: string;
	hasBrand?: boolean;
	businessType?: string;
	menu?: string[];
	vehicleId?: string;
	serveMode?: string;
	colors?: string[];
	vibe?: string[];
	equipment?: string[];
	openings?: Array<{ type: string }>;
	palette?: Record<string, { name: string; hex: string; film: string } | null>;
}

export default function DesignCanvas({
	chat,
	onRequestQuote,
	onOpenChat,
}: {
	chat: ReturnType<typeof useChat>;
	onRequestQuote: () => void;
	onOpenChat: () => void;
}) {
	const [tab, setTab] = useState<Tab>("design");
	const [lightbox, setLightbox] = useState(false);
	const {
		images,
		selectedView,
		setSelectedView,
		isGeneratingImages,
		progress,
		renderViews,
		retryFailedRenders,
		toggleFavorite,
		design,
		approveVersion,
		isApproving,
		creditsLeft,
		videos,
		isGeneratingVideo,
		generateVideo,
		brain,
		layout,
		estimate,
		sessionId,
		menuDraft,
		setMenuDraft,
		isRenderingMenu,
		renderMenuBoard,
		brandName,
	} = chat;

	const shown = images.filter(
		(i) => i.label !== MENU_VIEW || i.status === "ready",
	);
	const stageImg: GeneratedImage | undefined =
		images.find((i) => i.label === selectedView) ??
		images.find((i) => i.status === "ready") ??
		images[0];
	const ready = images.filter((i) => i.status === "ready");
	const missing = CONCEPT_VIEWS.filter(
		(v) => !images.some((i) => i.label === v),
	);
	const failed = images.filter(
		(i) =>
			(i.status === "failed" || i.stale) &&
			(CONCEPT_VIEWS as readonly string[]).includes(i.label),
	);
	const current = design?.current ?? null;
	const approvedVersion = design?.approvals?.[0]?.version;
	const isApprovedCurrent = current && approvedVersion === current.version;
	const spec = (current?.spec ?? null) as SpecShape | null;
	// The trailer the brief built, shown until the first photoreal render lands.
	const briefScene = useMemo(
		() => (spec ? sceneFromSpec(spec, design?.brief) : null),
		[spec, design?.brief],
	);
	// No real pixels yet (nothing rendered, or every view failed): the
	// trailer the brief built holds the stage.
	const showBrief =
		Boolean(briefScene) && !images.some((i) => i.status === "ready");
	const briefModel = (caption: string, cls?: string) =>
		briefScene ? (
			<Suspense
				fallback={
					<div
						className={cn(
							"h-full w-full animate-pulse bg-[var(--ftf-well)]",
							cls,
						)}
					/>
				}
			>
				<BriefCompanion scene={briefScene} caption={caption} className={cls} />
			</Suspense>
		) : null;

	// The stage follows the chat: a thumbnail tapped there opens here.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new selection should switch tabs, not a tab change
	useEffect(() => {
		if (selectedView && selectedView !== MENU_VIEW && tab !== "design")
			setTab("design");
	}, [selectedView]);

	const readyOrder = ready.map((r) => r.label);
	const step = (dir: 1 | -1) => {
		if (!stageImg || readyOrder.length < 2) return;
		const i = readyOrder.indexOf(stageImg.label);
		setSelectedView(
			readyOrder[(i + dir + readyOrder.length) % readyOrder.length],
		);
	};

	const save = async (img: GeneratedImage) => {
		const marked = await watermarkImage(img.url, {
			text: "Rolling Retail",
			subtext: viewTitle(img.label),
			tile: true,
		});
		downloadDataUrl(
			marked,
			`${(brandName || "rolling-retail").replace(/\s+/g, "-").toLowerCase()}-${img.label}.png`,
		);
	};

	return (
		<div className="flex h-full w-full flex-col bg-[var(--ftf-paper-2)]">
			{/* ── Tabs + version ── */}
			<div className="flex shrink-0 items-center gap-2 border-b-2 border-[var(--ftf-ink)] bg-white px-4 py-2.5">
				<div
					className="flex gap-1 rounded-full border-2 border-[var(--ftf-ink)] p-0.5"
					role="tablist"
				>
					{(
						[
							["design", "Design"],
							["menu", "Menu board"],
							["spec", "Spec & quote"],
						] as const
					).map(([id, label]) => (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={tab === id}
							onClick={() => setTab(id)}
							className={cn(
								"rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
								tab === id
									? "bg-[var(--ftf-ink)] text-white"
									: "hover:bg-[var(--ftf-paper-2)]",
							)}
						>
							{label}
						</button>
					))}
				</div>
				{current && (
					<div className="ml-auto flex min-w-0 items-center gap-2">
						<span
							className="hidden truncate text-[12px] text-[var(--ftf-ink-3)] md:block"
							title={current.changeSummary ?? ""}
						>
							{current.changeSummary}
						</span>
						<span className="shrink-0 rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase">
							v{current.version}
							{isApprovedCurrent ? " · approved" : ""}
						</span>
					</div>
				)}
			</div>

			{tab === "design" && (
				<div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 sm:px-6">
					{showBrief ? (
						// One persistent stage for the brief-built trailer, from the end of
						// the brief until the first photoreal render actually lands.
						<div>
							<div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border-2 border-[var(--ftf-ink)] shadow-[6px_6px_0_var(--ftf-ink)]">
								{briefModel(
									isGeneratingImages
										? "Built from your brief — photoreal renders on the way"
										: "Built from your brief",
									"rounded-none border-0 shadow-none",
								)}
								{isGeneratingImages && (
									<div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border-2 border-[var(--ftf-ink)] bg-white px-3 py-1.5 text-[12px] font-bold">
										<Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ftf-orange-500)]" />
										{progress.step || "Rendering"}
										{progress.rendersTotal > 0 && (
											<span className="tabular-nums text-[var(--ftf-ink-3)]">
												{progress.rendersDone}/{progress.rendersTotal}
											</span>
										)}
									</div>
								)}
							</div>
							{!isGeneratingImages && (
								<div className="mt-5 flex flex-wrap items-center gap-3">
									{failed.length > 0 ? (
										<>
											<span className="text-[13px] text-[var(--ftf-ink-2)]">
												The photoreal renders didn&apos;t come back this time.
											</span>
											<button
												type="button"
												onClick={() => retryFailedRenders()}
												className="ftf-cta inline-flex items-center gap-1.5 px-5 py-2.5 text-[14px]"
											>
												<RotateCcw className="h-4 w-4" /> Try again — free
											</button>
										</>
									) : (
										<button
											type="button"
											onClick={() => renderViews(undefined, "regenerate")}
											className="ftf-cta px-5 py-2.5 text-[14px]"
										>
											Render it photoreal
										</button>
									)}
									<button type="button" onClick={onOpenChat} className={GHOST}>
										Change something first
									</button>
								</div>
							)}
						</div>
					) : images.length === 0 && !isGeneratingImages ? (
						<div className={cn(CARD, "mx-auto mt-6 max-w-lg p-8 text-center")}>
							<p className="ftf-display text-[34px]">Your trailer goes here</p>
							<p className="mt-3 text-[14px] leading-relaxed text-[var(--ftf-ink-2)]">
								Tell the designer what you serve and how it should feel. Once it
								has enough to go on, it renders your trailer from the outside,
								the curbside and the line inside.
							</p>
							<div className="mt-6 flex flex-wrap justify-center gap-3">
								<button
									type="button"
									onClick={onOpenChat}
									className="ftf-cta px-5 py-2.5 text-[14px]"
								>
									Start in the chat
								</button>
								<button
									type="button"
									onClick={() => renderViews(undefined, "regenerate")}
									className={GHOST}
								>
									Render with what you know
								</button>
							</div>
						</div>
					) : (
						<>
							{/* ── Stage ── */}
							<div className="overflow-hidden rounded-2xl border-2 border-[var(--ftf-ink)] bg-[var(--ftf-well)] shadow-[6px_6px_0_var(--ftf-ink)]">
								<div className="group relative aspect-[16/10] w-full">
									{stageImg?.url ? (
										<button
											type="button"
											onClick={() =>
												stageImg.status === "ready" && setLightbox(true)
											}
											className="block h-full w-full"
											title="View full size"
										>
											<img
												src={stageImg.url}
												alt={`${viewTitle(stageImg.label)} — concept render`}
												className={cn(
													"h-full w-full object-cover transition-opacity",
													stageImg.status === "pending" && "opacity-40",
												)}
											/>
										</button>
									) : null}
									{stageImg?.status === "pending" && (
										<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
											<Loader2 className="h-7 w-7 animate-spin" />
											<p className="ftf-display text-[22px]">
												{progress.step || "Rendering"}
											</p>
											{progress.rendersTotal > 0 && (
												<div className="h-2 w-48 overflow-hidden rounded-full border border-white/40">
													<div
														className="h-full bg-[var(--ftf-orange-500)] transition-all duration-700"
														style={{
															width: `${Math.max(8, (progress.rendersDone / progress.rendersTotal) * 100)}%`,
														}}
													/>
												</div>
											)}
										</div>
									)}
									{stageImg?.status === "failed" && (
										<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--ftf-well)] text-center text-white">
											<p className="ftf-display text-[22px]">
												{viewTitle(stageImg.label)} didn&apos;t render
											</p>
											<button
												type="button"
												disabled={isGeneratingImages}
												onClick={() => retryFailedRenders()}
												className="ftf-cta inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
											>
												<RotateCcw className="h-3.5 w-3.5" /> Try again — free
											</button>
										</div>
									)}
									{stageImg && stageImg.status === "ready" && (
										<>
											<div className="absolute left-3 top-3 flex flex-wrap gap-2">
												<span className="rounded-full border-2 border-[var(--ftf-ink)] bg-white px-3 py-1 text-[12px] font-extrabold">
													{viewTitle(stageImg.label)}
												</span>
												{stageImg.stale && (
													<button
														type="button"
														disabled={isGeneratingImages}
														onClick={() => retryFailedRenders()}
														className="flex items-center gap-1.5 rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)] px-3 py-1 text-[12px] font-extrabold"
														title="The latest change didn't render for this view — this is the previous version"
													>
														<RotateCcw className="h-3 w-3" /> Previous version ·
														update free
													</button>
												)}
											</div>
											<div className="absolute right-3 top-3 flex gap-1.5">
												<button
													type="button"
													onClick={() => toggleFavorite(stageImg.label)}
													aria-pressed={Boolean(stageImg.favorite)}
													title={
														stageImg.favorite
															? "Remove favorite"
															: "Mark as a favorite"
													}
													className={cn(
														"flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)]",
														stageImg.favorite
															? "bg-[var(--ftf-amber-500)]"
															: "bg-white",
													)}
												>
													<Star
														className="h-4 w-4"
														fill={stageImg.favorite ? "currentColor" : "none"}
													/>
												</button>
												<button
													type="button"
													onClick={() => void save(stageImg)}
													title="Download"
													className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)] bg-white"
												>
													<Download className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => setLightbox(true)}
													title="Full size"
													className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)] bg-white"
												>
													<Maximize2 className="h-4 w-4" />
												</button>
											</div>
											{readyOrder.length > 1 && (
												<>
													<button
														type="button"
														onClick={() => step(-1)}
														aria-label="Previous view"
														className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)] bg-white opacity-0 transition-opacity group-hover:opacity-100"
													>
														<ChevronLeft className="h-5 w-5" />
													</button>
													<button
														type="button"
														onClick={() => step(1)}
														aria-label="Next view"
														className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--ftf-ink)] bg-white opacity-0 transition-opacity group-hover:opacity-100"
													>
														<ChevronRight className="h-5 w-5" />
													</button>
												</>
											)}
										</>
									)}
								</div>
							</div>

							{/* ── Filmstrip + free angles ── */}
							<div className="mt-5 flex gap-2.5 overflow-x-auto pb-2">
								{shown.map((img) => (
									<button
										key={img.label}
										type="button"
										onClick={() => setSelectedView(img.label)}
										className={cn(
											"w-[132px] shrink-0 overflow-hidden rounded-xl border-2 bg-white text-left transition-all",
											img.label === stageImg?.label
												? "border-[var(--ftf-ink)] shadow-[3px_3px_0_var(--ftf-orange-500)]"
												: "border-[var(--ftf-ink)]/30 hover:border-[var(--ftf-ink)]",
										)}
									>
										<span className="relative block aspect-[4/3] bg-[var(--ftf-well)]">
											{img.url && img.status !== "failed" && (
												<img
													src={img.url}
													alt=""
													className={cn(
														"h-full w-full object-cover",
														img.status === "pending" && "opacity-40",
													)}
												/>
											)}
											{img.status === "failed" && (
												<span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/80">
													<RotateCcw className="h-4 w-4" />
													<span className="text-[10px] font-bold uppercase">
														Retry free
													</span>
												</span>
											)}
											{img.status === "pending" && (
												<Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />
											)}
											{img.favorite && (
												<Star
													className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-[var(--ftf-amber-500)]"
													fill="currentColor"
												/>
											)}
											{img.stale && (
												<span className="absolute bottom-1.5 left-1.5 rounded-full border border-[var(--ftf-ink)] bg-[var(--ftf-amber-500)] px-1.5 text-[9.5px] font-extrabold uppercase">
													Previous
												</span>
											)}
										</span>
										<span className="block truncate px-2 py-1.5 text-[11.5px] font-bold">
											{viewTitle(img.label)}
										</span>
									</button>
								))}
								{missing.map((v) => (
									<button
										key={v}
										type="button"
										disabled={isGeneratingImages || ready.length === 0}
										onClick={() => renderViews([v], "more")}
										title={
											ready.length === 0
												? "Available once your first renders land"
												: `Render ${viewTitle(v).toLowerCase()} — free`
										}
										className="flex w-[132px] shrink-0 flex-col overflow-hidden rounded-xl border-2 border-dashed border-[var(--ftf-ink)]/40 bg-white/60 text-left transition-colors hover:border-[var(--ftf-ink)] hover:bg-[var(--ftf-amber-100)] disabled:opacity-40 disabled:hover:bg-white/60"
									>
										<span className="flex aspect-[4/3] flex-col items-center justify-center gap-1 text-[var(--ftf-ink-3)]">
											<Plus className="h-5 w-5" />
											<span className="text-[10.5px] font-bold uppercase tracking-wide">
												{STARTERS.has(v) ? "Render" : "Free angle"}
											</span>
										</span>
										<span className="block truncate border-t border-dashed border-[var(--ftf-ink)]/30 px-2 py-1.5 text-[11.5px] font-bold">
											{VIEW_TITLES[v]}
										</span>
									</button>
								))}
							</div>

							{failed.length > 0 && !isGeneratingImages && (
								<div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--ftf-ink)] bg-[var(--ftf-red-100)] px-4 py-2.5 text-[13px]">
									<span>
										{failed.map((f) => viewTitle(f.label)).join(", ")}{" "}
										{failed.every((f) => f.stale)
											? "didn't update to the latest version."
											: "didn't render."}
									</span>
									<button
										type="button"
										onClick={() => retryFailedRenders()}
										className={GHOST}
									>
										<RotateCcw className="h-3.5 w-3.5" /> Retry free
									</button>
								</div>
							)}

							{/* ── Version + decision ── */}
							{current && ready.length > 0 && (
								<div className={cn(CARD, "mt-5 p-5")}>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ftf-ink-3)]">
												Design v{current.version}
												{(design?.versions?.length ?? 0) > 1
													? ` of ${design?.versions?.length}`
													: ""}
											</p>
											<p className="mt-1 text-[16px] font-bold leading-snug">
												{isApprovedCurrent
													? "Approved — ready for a quote"
													: "Happy with this version?"}
											</p>
											<p className="mt-1 text-[13px] text-[var(--ftf-ink-2)]">
												{isApprovedCurrent
													? "Our team quotes from this exact version. You can still ask for changes — they become a new version."
													: "Approving locks this version for our build team. Changes are still welcome in the chat."}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											{isApprovedCurrent ? (
												<button
													type="button"
													onClick={onRequestQuote}
													className="ftf-cta px-5 py-2.5 text-[14px]"
												>
													Request a quote
												</button>
											) : (
												<button
													type="button"
													disabled={isApproving || isGeneratingImages}
													onClick={() => approveVersion(current.version)}
													className="ftf-cta inline-flex items-center gap-1.5 px-5 py-2.5 text-[14px]"
												>
													{isApproving ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Check className="h-4 w-4" />
													)}
													Approve v{current.version}
												</button>
											)}
											<button
												type="button"
												disabled={
													isGeneratingImages ||
													(typeof creditsLeft === "number" && creditsLeft <= 0)
												}
												onClick={() => renderViews(undefined, "regenerate")}
												className={GHOST}
												title="A fresh take on the same brief — uses 1 design round"
											>
												<RefreshCw className="h-3.5 w-3.5" /> Fresh take
											</button>
										</div>
									</div>
									{(design?.versions?.length ?? 0) > 1 && (
										<ol className="mt-4 flex flex-wrap gap-1.5 border-t-2 border-dashed border-[var(--ftf-line)] pt-3">
											{design?.versions?.map((v) => (
												<li
													key={v.version}
													title={v.changeSummary ?? ""}
													className={cn(
														"rounded-full border-2 px-2.5 py-0.5 text-[11px] font-bold",
														v.version === current.version
															? "border-[var(--ftf-ink)] bg-[var(--ftf-ink)] text-white"
															: "border-[var(--ftf-line)] text-[var(--ftf-ink-3)]",
													)}
												>
													v{v.version}
													{v.state === "approved" ? " ✓" : ""}
												</li>
											))}
										</ol>
									)}
								</div>
							)}

							{/* ── Film ── */}
							{ready.length > 0 && (
								<div className={cn(CARD, "mt-5 p-5")}>
									<p className="flex items-center gap-2 text-[15px] font-extrabold">
										<Clapperboard className="h-4 w-4 text-[var(--ftf-orange-500)]" />{" "}
										Film your trailer
									</p>
									<p className="mt-1 text-[13px] text-[var(--ftf-ink-2)]">
										A 10-second clip shot from your renders — for your deck,
										your investors or your socials.
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										{SALES_VIDEO_PRESETS.map((p) => (
											<button
												key={p.kind}
												type="button"
												disabled={isGeneratingVideo}
												onClick={() => generateVideo(p.kind)}
												className={GHOST}
												title={p.blurb}
											>
												{p.label}
											</button>
										))}
									</div>
									{videos.map((v) => (
										<div
											key={v.id}
											className="mt-3 overflow-hidden rounded-xl border-2 border-[var(--ftf-ink)]"
										>
											{v.status === "ready" && v.url ? (
												<>
													{/* biome-ignore lint/a11y/useMediaCaption: generated product clips have no dialogue */}
													<video
														src={v.url}
														controls
														playsInline
														className="aspect-video w-full bg-[var(--ftf-well)]"
													/>
													<div className="flex items-center justify-between border-t-2 border-[var(--ftf-ink)] px-3 py-2 text-[12px] font-bold">
														{SALES_VIDEO_PRESETS.find((p) => p.kind === v.kind)
															?.label ?? v.kind}
														<a
															href={v.url}
															download={`${v.kind}.mp4`}
															className="flex items-center gap-1 underline-offset-2 hover:underline"
														>
															<Download className="h-3.5 w-3.5" /> MP4
														</a>
													</div>
												</>
											) : v.status === "error" ? (
												<p className="px-3 py-3 text-[13px] text-[var(--ftf-red-600)]">
													The film didn&apos;t finish. Your renders are fine —
													try again.
												</p>
											) : (
												<p className="flex items-center gap-2 px-3 py-3 text-[13px]">
													<Loader2 className="h-4 w-4 animate-spin" /> Filming —
													this takes a minute or two.
												</p>
											)}
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			)}

			{tab === "menu" && (
				<div className="flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6">
					<MenuBuilder
						menu={menuDraft}
						onChange={setMenuDraft}
						brand={brandName}
						colors={brain?.colors ?? []}
						menuKeywords={brain?.menuKeywords ?? []}
						board={images.find((i) => i.label === MENU_VIEW)}
						hasHero={images.some(
							(i) => i.label === "exterior_hero" && i.status === "ready",
						)}
						isRendering={isRenderingMenu}
						creditsLeft={creditsLeft}
						onRender={renderMenuBoard}
					/>
				</div>
			)}

			{tab === "spec" && (
				<SpecTab
					spec={spec}
					brief={design?.brief}
					layout={layout}
					estimate={estimate}
					sessionId={sessionId}
					onRequestQuote={onRequestQuote}
					onAsk={(q) => {
						onOpenChat();
						void chat.sendMessage(q);
					}}
				/>
			)}

			{lightbox &&
				stageImg?.status === "ready" &&
				createPortal(
					<Lightbox
						img={stageImg}
						onClose={() => setLightbox(false)}
						onStep={step}
					/>,
					document.body,
				)}
		</div>
	);
}

function Lightbox({
	img,
	onClose,
	onStep,
}: {
	img: GeneratedImage;
	onClose: () => void;
	onStep: (d: 1 | -1) => void;
}) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight") onStep(1);
			if (e.key === "ArrowLeft") onStep(-1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, onStep]);
	return (
		<div
			className="ftf fixed inset-0 z-[100] flex items-center justify-center bg-[#17130f]/95 p-4"
			role="dialog"
			aria-modal="true"
			aria-label={viewTitle(img.label)}
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[var(--ftf-ink)] text-white"
			>
				<X className="h-5 w-5" />
			</button>
			<figure className="max-h-full max-w-6xl">
				<img
					src={img.url}
					alt={`${viewTitle(img.label)} — concept render`}
					className="max-h-[82vh] w-auto rounded-xl border-2 border-white/20"
				/>
				<figcaption className="mt-3 text-center text-[13px] text-white/70">
					<span className="font-bold text-white">{viewTitle(img.label)}</span> ·
					concept render, not a construction drawing
				</figcaption>
			</figure>
		</div>
	);
}

function SpecTab({
	spec,
	brief,
	layout,
	estimate,
	sessionId,
	onRequestQuote,
	onAsk,
}: {
	spec: SpecShape | null;
	brief?: { features?: string[]; wrapFinish?: string | null } | null;
	layout: ReturnType<typeof useChat>["layout"];
	estimate: ReturnType<typeof useChat>["estimate"];
	sessionId: string | null;
	onRequestQuote: () => void;
	onAsk: (q: string) => void;
}) {
	const vehicle = getVehicle(spec?.vehicleId ?? "");
	const palette = useMemo(
		() =>
			Object.entries(spec?.palette ?? {}).filter(
				(e): e is [string, { name: string; hex: string; film: string }] =>
					Boolean(e[1]),
			),
		[spec],
	);
	if (!spec) {
		return (
			<div className="flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-6">
				<div className={cn(CARD, "mx-auto max-w-lg p-8 text-center")}>
					<p className="ftf-display text-[30px]">
						Your spec builds as you design
					</p>
					<p className="mt-3 text-[14px] text-[var(--ftf-ink-2)]">
						Body, layout, equipment, wrap and a planning estimate — all from the
						same design your renders show.
					</p>
				</div>
			</div>
		);
	}
	const row = (k: string, v: React.ReactNode) => (
		<div className="flex justify-between gap-6 border-b border-[var(--ftf-line)] py-2.5 text-[13.5px] last:border-0">
			<dt className="text-[var(--ftf-ink-3)]">{k}</dt>
			<dd className="text-right font-semibold">{v}</dd>
		</div>
	);
	return (
		<div className="flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6">
			<div className="grid gap-5 xl:grid-cols-2">
				<section className={cn(CARD, "p-5")}>
					<h2 className="ftf-display text-[24px]">
						{spec.hasBrand ? spec.brand : "Your trailer"}
					</h2>
					<dl className="mt-3">
						{row(
							"Business",
							getBusiness(spec.businessType)?.label ?? spec.businessType,
						)}
						{row("Body", vehicle?.label ?? spec.vehicleId)}
						{vehicle && row("Outside size", footprintFt(vehicle))}
						{row(
							"Service",
							spec.serveMode === "walk-in" ? "Walk-in" : "Order at the hatch",
						)}
						{spec.menu?.length
							? row("Signature items", spec.menu.join(", "))
							: null}
						{row(
							"Openings",
							`${spec.openings?.length ?? 0} (1 service hatch, ${(spec.openings ?? []).filter((o) => o.type === "door").length} door${(spec.openings ?? []).filter((o) => o.type === "door").length === 1 ? "" : "s"})`,
						)}
						{row("Lead time", "6–10 weeks after sign-off")}
					</dl>
				</section>
				<section className={cn(CARD, "p-5")}>
					<h2 className="ftf-display text-[24px]">Wrap colors</h2>
					{palette.length ? (
						<ul className="mt-3 space-y-2.5">
							{palette.map(([role, c]) => (
								<li key={role} className="flex items-center gap-3">
									<span
										className="h-9 w-9 shrink-0 rounded-lg border-2 border-[var(--ftf-ink)]"
										style={{ background: c.hex }}
									/>
									<span className="min-w-0">
										<span className="block text-[13.5px] font-bold capitalize">
											{c.name}{" "}
											<span className="font-normal text-[var(--ftf-ink-3)]">
												· {role}
											</span>
										</span>
										<span className="block truncate text-[11.5px] text-[var(--ftf-ink-3)]">
											{c.hex.toUpperCase()} · {c.film}
										</span>
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-3 text-[13.5px] text-[var(--ftf-ink-2)]">
							No colors yet — ask the designer to propose a palette.
						</p>
					)}
					<p className="mt-3 text-[11.5px] text-[var(--ftf-ink-3)]">
						Screen color is approximate — final approval is against a physical
						film swatch.
					</p>
				</section>
				<section className={cn(CARD, "p-5 xl:col-span-2")}>
					<h2 className="ftf-display text-[24px]">Equipment line</h2>
					<ul className="mt-3 flex flex-wrap gap-2">
						{(spec.equipment ?? []).map((e) => (
							<li
								key={e}
								className="rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-paper-2)] px-3 py-1 text-[12.5px] font-bold"
							>
								{EQUIPMENT_LABELS[e] ?? e.replace(/-/g, " ")}
							</li>
						))}
					</ul>
					{layout?.zones?.length ? (
						<ol className="mt-4 space-y-1.5 border-t-2 border-dashed border-[var(--ftf-line)] pt-3 text-[13px] text-[var(--ftf-ink-2)]">
							{layout.zones.map((z, i) => (
								<li key={z} className="flex gap-2.5">
									<span className="font-extrabold text-[var(--ftf-orange-500)]">
										{String(i + 1).padStart(2, "0")}
									</span>
									{z}
								</li>
							))}
						</ol>
					) : (
						<button
							type="button"
							onClick={() =>
								onAsk(
									"Walk me through the layout of the line, station by station.",
								)
							}
							className={cn(GHOST, "mt-4")}
						>
							Explain my layout
						</button>
					)}
					{vehicle && (spec.equipment?.length ?? 0) > 0 && (
						<div className="mt-5 overflow-hidden rounded-xl border-2 border-[var(--ftf-ink)]">
							<Suspense
								fallback={
									<div className="h-[280px] w-full animate-pulse bg-[var(--ftf-well)]" />
								}
							>
								<TruckConfigurator
									vehicleId={vehicle.id}
									equipmentIds={spec.equipment ?? []}
									wrapColors={spec.colors ?? null}
									brandName={spec.hasBrand ? spec.brand : ""}
									features={brief?.features ?? []}
									finish={brief?.wrapFinish ?? null}
								/>
							</Suspense>
							<p className="border-t-2 border-[var(--ftf-ink)] bg-white px-3 py-2 text-[11.5px] text-[var(--ftf-ink-3)]">
								3D layout model from our factory dimensions — drag to look
								around.
							</p>
						</div>
					)}
				</section>
				<section className={cn(CARD, "p-5")}>
					<h2 className="ftf-display text-[24px]">Planning estimate</h2>
					{estimate ? (
						<>
							<p className="mt-2 text-[13.5px] text-[var(--ftf-ink-2)]">
								Wrap: ~{estimate.wrapSqft} sq ft · {estimate.wrapTier}
							</p>
							<p className="ftf-display mt-1 text-[32px]">
								${estimate.wrapLow.toLocaleString()}–$
								{estimate.wrapHigh.toLocaleString()}
							</p>
							<p className="text-[11.5px] text-[var(--ftf-ink-3)]">
								Wrap range, film + labor. Lead time {estimate.leadTimeWeeks}.
							</p>
						</>
					) : (
						<>
							<p className="mt-2 text-[13.5px] text-[var(--ftf-ink-2)]">
								Get wrap and build ranges for this exact trailer.
							</p>
							<button
								type="button"
								onClick={() =>
									onAsk(
										"Give me a planning estimate for this build — wrap, signage and lead time.",
									)
								}
								className={cn(GHOST, "mt-3")}
							>
								Estimate my build
							</button>
						</>
					)}
				</section>
				<section className={cn(CARD, "bg-[var(--ftf-orange-500)] p-5")}>
					<h2 className="ftf-display text-[28px]">Ready to build it?</h2>
					<p className="mt-2 text-[13.5px] font-medium">
						Our team quotes from your approved version and helps with your
						county&apos;s plan review.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<button
							type="button"
							onClick={onRequestQuote}
							className="rounded-full border-2 border-[var(--ftf-ink)] bg-[var(--ftf-ink)] px-5 py-2.5 text-[14px] font-bold text-white shadow-[3px_3px_0_#fff]"
						>
							Request a quote
						</button>
						{sessionId && (
							<a
								href={`/api/agent/package?sessionId=${encodeURIComponent(sessionId)}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ftf-ink)] bg-white px-4 py-2.5 text-[13px] font-bold"
							>
								<Download className="h-3.5 w-3.5" /> Concept package
							</a>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
