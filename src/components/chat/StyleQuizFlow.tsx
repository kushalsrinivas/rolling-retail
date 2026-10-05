/**
 * Design brief quiz — the guided intake in front of the designer chat.
 *
 * Seven short steps and a review, every one skippable:
 *   business → operation → truck → look → color & finish → details → review.
 *
 * The old five-step quiz captured taste (styles, palettes) but nothing about
 * how the truck trades, so the first renders had to guess the setting, the
 * finish and the fittings — and a guess the buyer corrects costs a credit.
 * The operation step now feeds the truck recommendation (the factory's
 * builder doctrine, applied live), and every answer lands in the structured
 * brief the STE render prompts read.
 *
 * Picks still collapse to the same answer record the old intake produced, so
 * intake → design record → single auto-render is unchanged; the brief rides
 * alongside it.
 */
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ImagePlus,
	Pencil,
	Sparkles,
	Star,
	X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
	BUDGETS,
	CREW_SIZES,
	type DesignBrief,
	FEATURES,
	LOGO_STATUSES,
	PEAK_VOLUMES,
	parseBrief,
	recommendVehicle,
	SERVICE_PERIODS,
	TIMELINES,
	TRADING_CONTEXTS,
	WRAP_FINISHES,
} from "#/lib/food-truck/brief";
import {
	BUSINESS_TYPES,
	footprintFt,
	getBusiness,
	getVehicle,
	VEHICLES,
} from "#/lib/food-truck/constants";
import { composeBrief, type IntakeAnswers } from "#/lib/food-truck/intake";
import {
	MENU_SUGGESTIONS,
	QUIZ_PALETTES,
	QUIZ_STYLES,
	type QuizPicks,
	quizToDirect,
} from "#/lib/food-truck/quiz";
import { useMediaQuery } from "#/hooks/use-media-query";
import {
	type BuildScene,
	describeChange,
	sceneFromDraft,
} from "#/lib/food-truck/build-scene";
import { fileToDataUrl } from "#/lib/image-file";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";

/** three.js stays out of the quiz's first paint. */
const BriefCompanion = lazy(() => import("./BriefCompanion"));

export interface StyleQuizFlowProps {
	onComplete: (
		brief: string,
		answers: IntakeAnswers,
		image: string | undefined,
		picks: QuizPicks,
		designBrief: DesignBrief,
	) => void;
	onSkip: () => void;
	/** Fired on every Next so the CMS logs partials even on drop-off. */
	onStep: (step: string, data: Record<string, unknown>) => void;
}

const FIELD =
	"w-full rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--ftf-ink)] placeholder:text-[var(--ftf-ink-4)] outline-none transition-colors focus:border-[var(--ftf-blue-600)]";

const STEPS = [
	{ id: "use", title: "Tell us about the business", short: "Business" },
	{ id: "operation", title: "How will you trade?", short: "Operation" },
	{ id: "body", title: "Pick your truck", short: "Truck" },
	{ id: "style", title: "Star the looks you love", short: "Look" },
	{ id: "color", title: "Colors and finish", short: "Color" },
	{ id: "extras", title: "Features and must-haves", short: "Details" },
	{ id: "review", title: "Review your brief", short: "Review" },
] as const;

const DRAFT_KEY = "ftf.quiz.draft.v2";

interface Draft {
	brandName: string;
	businessType: string;
	menu: string;
	tradingContexts: string[];
	servicePeriod: string;
	peakVolume: string;
	crew: string;
	vehicleId: string;
	service: string;
	styles: string[];
	palettes: string[];
	customColors: string[];
	wrapFinish: string;
	logo: string;
	features: string[];
	notes: string;
	budget: string;
	timeline: string;
}

const EMPTY: Draft = {
	brandName: "",
	businessType: "",
	menu: "",
	tradingContexts: [],
	servicePeriod: "",
	peakVolume: "",
	crew: "",
	vehicleId: "",
	service: "",
	styles: [],
	palettes: [],
	customColors: [],
	wrapFinish: "",
	logo: "",
	features: [],
	notes: "",
	budget: "",
	timeline: "",
};

/** Per-viewer convenience only — a cleared or blocked store just starts fresh. */
function loadDraft(): { draft: Draft; step: number } | null {
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { draft?: Partial<Draft>; step?: number };
		return {
			draft: { ...EMPTY, ...(parsed.draft ?? {}) },
			step: typeof parsed.step === "number" ? parsed.step : 0,
		};
	} catch {
		return null;
	}
}

function saveDraft(draft: Draft, step: number) {
	try {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
	} catch {
		/* storage unavailable — the quiz still works */
	}
}

function clearDraft() {
	try {
		window.localStorage.removeItem(DRAFT_KEY);
	} catch {
		/* noop */
	}
}

const COLOR_IDEAS = [
	"sage green",
	"mustard yellow",
	"burgundy",
	"forest green",
	"sky blue",
	"terracotta",
	"lavender",
	"white",
];

export default function StyleQuizFlow({
	onComplete,
	onSkip,
	onStep,
}: StyleQuizFlowProps) {
	// -1 is the welcome screen; 0..6 are the steps.
	const [stepIndex, setStepIndex] = useState(-1);
	const [d, setD] = useState<Draft>(EMPTY);
	const [resume, setResume] = useState<{ draft: Draft; step: number } | null>(
		null,
	);
	const [photo, setPhoto] = useState<string | undefined>(undefined);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [colorInput, setColorInput] = useState("");
	// Edits from the review screen return straight to the review.
	const [returnToReview, setReturnToReview] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		const saved = loadDraft();
		if (saved && JSON.stringify(saved.draft) !== JSON.stringify(EMPTY)) {
			setResume(saved);
		}
	}, []);

	useEffect(() => {
		if (stepIndex >= 0) saveDraft(d, stepIndex);
	}, [d, stepIndex]);

	// Move focus to the new step's heading so keyboard and screen-reader
	// users land at the top of the step, not on a button that vanished.
	useEffect(() => {
		if (stepIndex >= 0) headingRef.current?.focus();
	}, [stepIndex]);

	const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
		setD((prev) => ({ ...prev, [key]: value }));
	const toggleIn = (key: keyof Draft, id: string) =>
		setD((prev) => {
			const list = prev[key] as string[];
			return {
				...prev,
				[key]: list.includes(id) ? list.filter((v) => v !== id) : [...list, id],
			};
		});
	const pickOne = (key: keyof Draft, id: string) =>
		setD((prev) => ({ ...prev, [key]: prev[key] === id ? "" : id }));

	const recommendation = useMemo(
		() =>
			recommendVehicle({
				businessType: d.businessType,
				service: d.service,
				peakVolume: (d.peakVolume || null) as never,
				tradingContexts: d.tradingContexts as never,
			}),
		[d.businessType, d.service, d.peakVolume, d.tradingContexts],
	);

	// The live 3D build: every answer changes what the companion shows.
	const scene = useMemo(
		() =>
			sceneFromDraft(
				d,
				recommendation?.vehicleId ?? null,
				Math.max(0, stepIndex),
			),
		[d, recommendation, stepIndex],
	);
	const prevScene = useRef<BuildScene | null>(null);
	const [caption, setCaption] = useState<string | null>(null);
	useEffect(() => {
		const c = describeChange(prevScene.current, scene);
		if (c) setCaption(c);
		prevScene.current = scene;
	}, [scene]);
	const wide = useMediaQuery("(min-width: 1024px)");
	const [sheetOpen, setSheetOpen] = useState(false);

	const designBrief = (): DesignBrief =>
		parseBrief({
			tradingContexts: d.tradingContexts,
			servicePeriod: d.servicePeriod,
			peakVolume: d.peakVolume,
			crew: d.crew,
			wrapFinish: d.wrapFinish,
			logo: d.logo,
			budget: d.budget,
			timeline: d.timeline,
			features: d.features,
			notes: d.notes,
		});

	const derived = () => {
		const picks: QuizPicks = {
			styles: d.styles,
			palettes: d.palettes,
			extras: d.features,
		};
		const { vibe, colors } = quizToDirect(picks);
		// The buyer's own colors lead: they named them, the palettes are taste.
		const allColors = [
			...d.customColors,
			...colors.split(", ").filter(Boolean),
		].filter((c, i, a) => a.indexOf(c) === i);
		return { picks, vibe, colors: allColors.slice(0, 4).join(", ") };
	};

	const snapshot = (): Record<string, unknown> => ({
		...d,
		hasPhoto: Boolean(photo),
	});

	const finish = () => {
		const { picks, vibe, colors } = derived();
		// No body picked: the doctrine's suggestion is the starting point,
		// the same default the buyer saw recommended.
		const vehicleId = d.vehicleId || recommendation?.vehicleId || "";
		const answers: IntakeAnswers = {
			brandName: d.brandName,
			businessType: d.businessType,
			menu: d.menu,
			vehicleId,
			service: d.service,
			vibe,
			colors,
			notes: d.notes.trim(),
		};
		const brief = designBrief();
		track("quiz_completed", {
			styles: picks.styles.length,
			palettes: picks.palettes.length,
			extras: picks.extras.length,
			contexts: brief.tradingContexts.length,
			hasPhoto: Boolean(photo),
			usedRecommendation: !d.vehicleId && Boolean(recommendation),
		});
		onStep("final", { ...snapshot(), vibe, colors, vehicleId });
		clearDraft();
		onComplete(
			composeBrief(answers, undefined, brief),
			answers,
			photo,
			picks,
			brief,
		);
	};

	const go = (i: number) => setStepIndex(i);

	const next = () => {
		const step = STEPS[stepIndex];
		onStep(step.id, snapshot());
		track("quiz_step", { step: step.id, index: stepIndex });
		if (step.id === "review") return finish();
		if (returnToReview) {
			setReturnToReview(false);
			return go(STEPS.length - 1);
		}
		go(stepIndex + 1);
	};

	const addColor = (raw: string) => {
		const c = raw.trim().toLowerCase();
		if (!c || d.customColors.includes(c) || d.customColors.length >= 3) return;
		set("customColors", [...d.customColors, c]);
		setColorInput("");
	};

	const addMenuItem = (item: string) => {
		const have = d.menu
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (have.some((h) => h.toLowerCase() === item.toLowerCase())) return;
		set("menu", [...have, item].join(", "));
	};

	const onPhoto = async (file: File | undefined) => {
		if (!file) return;
		setPhotoError(null);
		try {
			setPhoto(await fileToDataUrl(file));
			track("quiz_photo_added");
		} catch (err) {
			setPhotoError(
				err instanceof Error ? err.message : "Could not read that image.",
			);
		}
	};

	/* ── Building blocks ─────────────────────────────────────────────── */

	const companion = (cls?: string) => (
		<Suspense
			fallback={
				<div
					className={cn(
						"grid h-full w-full place-items-center rounded-2xl border-2 border-[var(--ftf-ink)] bg-[#17130f] text-[13px] text-white/60",
						cls,
					)}
				>
					Warming up the workshop…
				</div>
			}
		>
			<BriefCompanion scene={scene} caption={caption} className={cls} />
		</Suspense>
	);

	const shell = (children: React.ReactNode) => (
		<div className="flex h-full w-full overflow-hidden bg-[var(--ftf-paper-2)]">
			<div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-8">
				<div className="mx-auto my-auto w-full max-w-2xl">
					<div className="overflow-hidden rounded border border-[var(--ftf-line)] bg-white shadow-[var(--ftf-shadow-lg)]">
						<div className="h-1 bg-[var(--ftf-blue-800)]" />
						<div className="px-5 py-7 sm:px-8">{children}</div>
					</div>
					<p className="mt-4 text-center text-[11px] text-[var(--ftf-ink-4)]">
						Free concept renders · no account needed · your design stays private
					</p>
				</div>
			</div>
			{wide ? (
				<aside
					className="w-[min(46vw,680px)] shrink-0 py-6 pr-6"
					aria-label="Your trailer, building live"
				>
					{companion()}
				</aside>
			) : (
				<>
					<button
						type="button"
						onClick={() => setSheetOpen(true)}
						className="ftf-cta fixed bottom-5 right-4 z-40 flex items-center gap-2 px-4 py-3 text-[14px]"
						style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
					>
						See your trailer
						{scene.equipmentIds.length > 0 && (
							<span className="rounded-full bg-[var(--ftf-ink)] px-2 py-0.5 text-[11px] text-white">
								{Object.values(scene.done).filter(Boolean).length}/5
							</span>
						)}
					</button>
					{sheetOpen && (
						<div
							className="fixed inset-0 z-50 flex flex-col bg-[#17130f]/70"
							role="dialog"
							aria-modal="true"
							aria-label="Your trailer"
						>
							<button
								type="button"
								className="flex-1"
								aria-label="Close"
								onClick={() => setSheetOpen(false)}
							/>
							<div className="h-[78dvh] rounded-t-3xl border-t-2 border-[var(--ftf-ink)] bg-[var(--ftf-paper-2)] p-3">
								<div className="mb-2 flex items-center justify-between px-1">
									<p className="text-[13px] font-extrabold">
										Your trailer, so far
									</p>
									<button
										type="button"
										onClick={() => setSheetOpen(false)}
										className="rounded-full border-2 border-[var(--ftf-ink)] bg-white px-3 py-1 text-[12px] font-bold"
									>
										Back to the brief
									</button>
								</div>
								<div className="h-[calc(100%-2.5rem)]">
									{companion("shadow-none")}
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);

	const label = (text: string, hint?: string, optional = true) => (
		<div className="mb-2">
			<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
				{text}
				{optional && (
					<span className="ml-1.5 text-[11px] font-normal text-[var(--ftf-ink-4)]">
						optional
					</span>
				)}
			</p>
			{hint && (
				<p className="mt-0.5 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
					{hint}
				</p>
			)}
		</div>
	);

	const choiceCard = (
		selected: boolean,
		onClick: () => void,
		title: string,
		blurb?: string,
		badge?: string,
	) => (
		<button
			key={title}
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={cn(
				"relative rounded border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ftf-blue-600)]",
				selected
					? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-50)]"
					: "border-[var(--ftf-line)] bg-white hover:border-[var(--ftf-line-strong)]",
			)}
		>
			{badge && (
				<span className="absolute -top-2 right-2 flex items-center gap-1 rounded-sm bg-[var(--ftf-orange-500)] px-1.5 py-px text-[10px] font-semibold text-[#241200]">
					<Sparkles className="h-3 w-3" />
					{badge}
				</span>
			)}
			<span
				className={cn(
					"flex items-center gap-1.5 text-sm font-semibold",
					selected ? "text-[var(--ftf-blue-800)]" : "text-[var(--ftf-ink)]",
				)}
			>
				{selected && <Check className="h-3.5 w-3.5 shrink-0" />}
				{title}
			</span>
			{blurb && (
				<span className="mt-0.5 block text-[11px] leading-snug text-[var(--ftf-ink-3)]">
					{blurb}
				</span>
			)}
		</button>
	);

	const chip = (
		selected: boolean,
		onClick: () => void,
		text: string,
		title?: string,
	) => (
		<button
			key={text}
			type="button"
			onClick={onClick}
			title={title}
			aria-pressed={selected}
			className={cn(
				"rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ftf-blue-600)]",
				selected
					? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-800)] text-white"
					: "border-[var(--ftf-line)] bg-white text-[var(--ftf-ink-2)] hover:border-[var(--ftf-line-strong)] hover:text-[var(--ftf-ink)]",
			)}
		>
			{text}
		</button>
	);

	const starGrid = (
		items: Array<{
			id: string;
			label: string;
			blurb?: string;
			gradient?: string;
			image?: string;
		}>,
		picked: string[],
		onToggle: (id: string) => void,
	) => (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{items.map((item) => {
				const active = picked.includes(item.id);
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onToggle(item.id)}
						aria-pressed={active}
						className={cn(
							"group relative overflow-hidden rounded border text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ftf-blue-600)]",
							active
								? "border-[var(--ftf-blue-800)] ring-1 ring-[var(--ftf-blue-800)]"
								: "border-[var(--ftf-line)] hover:-translate-y-px hover:border-[var(--ftf-line-strong)]",
						)}
					>
						{item.image ? (
							<img
								src={item.image}
								alt={item.label}
								loading="lazy"
								className="h-20 w-full object-cover"
							/>
						) : (
							<span
								aria-hidden
								className="block h-20 w-full"
								style={{ background: item.gradient }}
							/>
						)}
						<span className="block bg-white px-2.5 py-2">
							<span className="block text-xs font-semibold text-[var(--ftf-ink)]">
								{item.label}
							</span>
							{item.blurb && (
								<span className="mt-0.5 block text-[10px] leading-snug text-[var(--ftf-ink-3)]">
									{item.blurb}
								</span>
							)}
						</span>
						<span
							aria-hidden
							className={cn(
								"absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
								active
									? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-800)] text-white"
									: "border-[var(--ftf-line-strong)] bg-white/90 text-[var(--ftf-ink-3)]",
							)}
						>
							<Star
								className="h-3.5 w-3.5"
								fill={active ? "currentColor" : "none"}
							/>
						</span>
					</button>
				);
			})}
		</div>
	);

	/* ── Welcome ─────────────────────────────────────────────────────── */

	if (stepIndex === -1) {
		return shell(
			<>
				<p className="ftf-label">Custom food truck design</p>
				<h1 className="ftf-display mt-2 text-[26px] leading-[1.15] text-[var(--ftf-ink)]">
					Let&apos;s design your truck
				</h1>
				<p className="mt-2.5 text-sm leading-relaxed text-[var(--ftf-ink-2)]">
					About three minutes. Tell us what you serve, how you trade and what
					you like. We turn it into a buildable brief and your first concept
					renders. Skip anything you haven&apos;t decided yet.
				</p>
				<ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[var(--ftf-ink-2)] sm:grid-cols-3">
					{STEPS.map((s, i) => (
						<li key={s.id} className="flex items-center gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ftf-paper-3)] text-[10px] font-semibold tabular-nums text-[var(--ftf-ink-2)]">
								{i + 1}
							</span>
							{s.short}
						</li>
					))}
				</ol>
				{resume ? (
					<div className="mt-6 grid gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => {
								setD(resume.draft);
								track("quiz_resumed", { step: resume.step });
								go(Math.min(resume.step, STEPS.length - 1));
							}}
							className="ftf-cta flex items-center justify-center gap-2 rounded px-4 py-3 text-sm"
						>
							Continue where I left off <ArrowRight className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => {
								clearDraft();
								setResume(null);
								track("quiz_started");
								go(0);
							}}
							className="rounded border border-[var(--ftf-line-strong)] px-4 py-3 text-sm font-medium text-[var(--ftf-ink-2)] hover:bg-[var(--ftf-paper-2)]"
						>
							Start over
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => {
							track("quiz_started");
							go(0);
						}}
						className="ftf-cta mt-6 flex w-full items-center justify-center gap-2 rounded px-4 py-3 text-sm"
					>
						Start my brief <ArrowRight className="h-4 w-4" />
					</button>
				)}
				<button
					type="button"
					onClick={onSkip}
					className="mt-5 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
				>
					Skip — I&apos;d rather describe it in chat
				</button>
			</>,
		);
	}

	/* ── Steps ───────────────────────────────────────────────────────── */

	const step = STEPS[stepIndex];
	const isReview = step.id === "review";
	const business = getBusiness(d.businessType);
	const menuIdeas = MENU_SUGGESTIONS[d.businessType] ?? [];
	const { colors: previewColors, vibe: previewVibe } = derived();

	const reviewRows: Array<{ step: number; label: string; value: string }> = [
		{
			step: 0,
			label: "Business",
			value: [d.brandName || "Unnamed", business?.label]
				.filter(Boolean)
				.join(" · "),
		},
		{ step: 0, label: "Menu", value: d.menu },
		{
			step: 1,
			label: "Trading",
			value: [
				d.tradingContexts
					.map((id) => TRADING_CONTEXTS.find((c) => c.id === id)?.label)
					.filter(Boolean)
					.join(", "),
				SERVICE_PERIODS.find((p) => p.id === d.servicePeriod)?.label,
				PEAK_VOLUMES.find((p) => p.id === d.peakVolume)?.label,
				CREW_SIZES.find((c) => c.id === d.crew)?.label,
			]
				.filter(Boolean)
				.join(" · "),
		},
		{
			step: 2,
			label: "Truck",
			value: [
				getVehicle(d.vehicleId || recommendation?.vehicleId)?.label,
				!d.vehicleId && recommendation ? "(recommended)" : null,
				d.service === "walk-in"
					? "walk-in"
					: d.service === "hatch"
						? "hatch service"
						: null,
			]
				.filter(Boolean)
				.join(" "),
		},
		{
			step: 3,
			label: "Look",
			value: d.styles
				.map((id) => QUIZ_STYLES.find((s) => s.id === id)?.label)
				.filter(Boolean)
				.join(", "),
		},
		{
			step: 4,
			label: "Colors",
			value: [
				previewColors,
				WRAP_FINISHES.find((f) => f.id === d.wrapFinish)?.label,
			]
				.filter(Boolean)
				.join(" · "),
		},
		{
			step: 5,
			label: "Features",
			value: d.features
				.map((id) => FEATURES.find((f) => f.id === id)?.label)
				.filter(Boolean)
				.join(", "),
		},
		{ step: 5, label: "Must-haves", value: d.notes },
	];

	return shell(
		<>
			<div className="flex items-center justify-between gap-3">
				<p className="ftf-label">
					Step {stepIndex + 1} of {STEPS.length} · {step.short}
				</p>
				<span className="text-[11px] tabular-nums text-[var(--ftf-ink-4)]">
					{step.id === "style" &&
						(d.styles.length ? `${d.styles.length} picked` : "pick 2 or more")}
					{step.id === "color" &&
						(d.palettes.length ? `${d.palettes.length} picked` : "")}
				</span>
			</div>
			<div className="mt-2 flex items-center gap-1" aria-hidden>
				{STEPS.map((s, i) => (
					<span
						key={s.id}
						className={cn(
							"h-1 flex-1 transition-colors duration-300",
							i <= stepIndex
								? "bg-[var(--ftf-blue-800)]"
								: "bg-[var(--ftf-paper-3)]",
						)}
					/>
				))}
			</div>

			<h2
				ref={headingRef}
				tabIndex={-1}
				className="ftf-display mt-5 text-[22px] leading-tight text-[var(--ftf-ink)] outline-none"
			>
				{step.title}
			</h2>

			<div className="mt-5">
				{step.id === "use" && (
					<div className="space-y-6">
						<div>
							{label(
								"Business name",
								"We letter the trailer with it. No name yet? We leave the sign panels blank.",
							)}
							<input
								value={d.brandName}
								onChange={(e) => set("brandName", e.target.value)}
								placeholder="e.g. BIB Burgers"
								className={FIELD}
								maxLength={40}
							/>
						</div>
						<div>
							{label(
								"What will you serve?",
								"This sets the equipment line, the power plan and the layout.",
								false,
							)}
							<div className="grid gap-1.5 sm:grid-cols-2">
								{BUSINESS_TYPES.map((b) =>
									choiceCard(
										d.businessType === b.id,
										() => pickOne("businessType", b.id),
										b.label,
										b.note,
									),
								)}
							</div>
						</div>
						<div>
							{label(
								"Signature items",
								"The two or three things people queue for. They shape the counter and the emblem.",
							)}
							<input
								value={d.menu}
								onChange={(e) => set("menu", e.target.value)}
								placeholder="e.g. smash burgers, loaded fries, shakes"
								className={FIELD}
							/>
							{menuIdeas.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1.5">
									{menuIdeas.map((m) =>
										chip(
											d.menu.toLowerCase().includes(m.toLowerCase()),
											() => addMenuItem(m),
											`+ ${m}`,
										),
									)}
								</div>
							)}
						</div>
					</div>
				)}

				{step.id === "operation" && (
					<div className="space-y-6">
						<div>
							{label(
								"Where will you trade most?",
								"Pick all that apply. The first one sets the scene in your renders.",
							)}
							<div className="grid gap-1.5 sm:grid-cols-3">
								{TRADING_CONTEXTS.map((c) =>
									choiceCard(
										d.tradingContexts.includes(c.id),
										() => toggleIn("tradingContexts", c.id),
										c.label,
										c.blurb,
									),
								)}
							</div>
						</div>
						<div>
							{label(
								"When is your main service?",
								"Evening trade changes the lighting and the signage.",
							)}
							<div className="grid gap-1.5 sm:grid-cols-3">
								{SERVICE_PERIODS.map((p) =>
									choiceCard(
										d.servicePeriod === p.id,
										() => pickOne("servicePeriod", p.id),
										p.label,
										p.blurb,
									),
								)}
							</div>
						</div>
						<div>
							{label(
								"Orders per hour at your busiest",
								"This decides how long the line must be — and the truck size.",
							)}
							<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
								{PEAK_VOLUMES.map((p) =>
									choiceCard(
										d.peakVolume === p.id,
										() => pickOne("peakVolume", p.id),
										p.label,
										p.blurb,
									),
								)}
							</div>
						</div>
						<div>
							{label("People on the line")}
							<div className="flex flex-wrap gap-1.5">
								{CREW_SIZES.map((c) =>
									chip(d.crew === c.id, () => pickOne("crew", c.id), c.label),
								)}
							</div>
						</div>
					</div>
				)}

				{step.id === "body" && (
					<div className="space-y-6">
						{recommendation && (
							<div className="flex gap-3 rounded border border-[var(--ftf-blue-600)]/30 bg-[var(--ftf-blue-50)] p-3">
								<Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ftf-blue-800)]" />
								<div className="min-w-0 flex-1">
									<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
										Our pick for you:{" "}
										{getVehicle(recommendation.vehicleId)?.label}
									</p>
									<p className="mt-0.5 text-[12px] leading-snug text-[var(--ftf-ink-2)]">
										{recommendation.reason}
									</p>
									{d.vehicleId !== recommendation.vehicleId && (
										<button
											type="button"
											onClick={() => set("vehicleId", recommendation.vehicleId)}
											className="mt-2 text-xs font-semibold text-[var(--ftf-blue-800)] underline-offset-4 hover:underline"
										>
											Use this truck
										</button>
									)}
								</div>
							</div>
						)}
						<div>
							{label(
								"Body",
								"Every body is built in our factory. Sizes are outside length × width × height.",
							)}
							<div className="grid gap-2 sm:grid-cols-2">
								{VEHICLES.map((v) =>
									choiceCard(
										d.vehicleId === v.id,
										() => pickOne("vehicleId", v.id),
										v.label,
										`${footprintFt(v)} · ${v.blurb}`,
										recommendation?.vehicleId === v.id
											? "Recommended"
											: undefined,
									),
								)}
							</div>
						</div>
						<div>
							{label("How do customers order?")}
							<div className="grid gap-1.5 sm:grid-cols-2">
								{choiceCard(
									d.service === "hatch",
									() => pickOne("service", "hatch"),
									"At a hatch",
									"They order outside. Most food trucks work this way.",
								)}
								{choiceCard(
									d.service === "walk-in",
									() => pickOne("service", "walk-in"),
									"They walk inside",
									"Needs a wider body and more floor for customers.",
								)}
							</div>
						</div>
					</div>
				)}

				{step.id === "style" && (
					<div>
						<p className="mb-3 text-[12px] leading-snug text-[var(--ftf-ink-3)]">
							Tap the star on every look you&apos;d be happy driving. Two or
							more gives us the best signal.
						</p>
						{starGrid(
							QUIZ_STYLES.map((s) => ({
								id: s.id,
								label: s.label,
								blurb: s.blurb,
								gradient: s.gradient,
								image: s.image,
							})),
							d.styles,
							(id) => toggleIn("styles", id),
						)}
					</div>
				)}

				{step.id === "color" && (
					<div className="space-y-6">
						<div>
							{label(
								"Palettes you like",
								"We mix your picks into the wrap — at most three colors plus a neutral, so it stays durable.",
							)}
							{starGrid(
								QUIZ_PALETTES.map((p) => ({
									id: p.id,
									label: p.label,
									blurb: p.colors.join(" · "),
									gradient: paletteGradient(p.colors),
								})),
								d.palettes,
								(id) => toggleIn("palettes", id),
							)}
						</div>
						<div>
							{label(
								"Your own brand colors",
								"Got exact colors already? Add up to three — they lead the wrap.",
							)}
							<div className="flex gap-2">
								<input
									value={colorInput}
									onChange={(e) => setColorInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addColor(colorInput);
										}
									}}
									placeholder="e.g. sage green"
									className={FIELD}
									maxLength={30}
								/>
								<button
									type="button"
									onClick={() => addColor(colorInput)}
									className="shrink-0 rounded border border-[var(--ftf-line-strong)] px-3 text-sm font-medium text-[var(--ftf-ink-2)] hover:bg-[var(--ftf-paper-2)]"
								>
									Add
								</button>
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{d.customColors.map((c) => (
									<span
										key={c}
										className="flex items-center gap-1 rounded-sm bg-[var(--ftf-blue-800)] px-2 py-1 text-xs font-medium text-white"
									>
										{c}
										<button
											type="button"
											aria-label={`Remove ${c}`}
											onClick={() =>
												set(
													"customColors",
													d.customColors.filter((x) => x !== c),
												)
											}
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								))}
								{d.customColors.length < 3 &&
									COLOR_IDEAS.filter((c) => !d.customColors.includes(c))
										.slice(0, 6)
										.map((c) => chip(false, () => addColor(c), `+ ${c}`))}
							</div>
						</div>
						<div>
							{label("Wrap finish")}
							<div className="grid gap-1.5 sm:grid-cols-3">
								{WRAP_FINISHES.map((f) =>
									choiceCard(
										d.wrapFinish === f.id,
										() => pickOne("wrapFinish", f.id),
										f.label,
										f.blurb,
									),
								)}
							</div>
						</div>
						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								{label("Logo")}
								<div className="flex flex-wrap gap-1.5">
									{LOGO_STATUSES.map((l) =>
										chip(
											d.logo === l.id,
											() => pickOne("logo", l.id),
											l.label,
											l.blurb,
										),
									)}
								</div>
							</div>
							<div>
								{label(
									"A photo you like",
									"A truck, a storefront, a palette. We borrow the styling, never the bodywork.",
								)}
								<input
									ref={fileRef}
									type="file"
									accept="image/png,image/jpeg,image/webp"
									className="hidden"
									onChange={(e) => void onPhoto(e.target.files?.[0])}
								/>
								{photo ? (
									<div className="flex items-center gap-2">
										<img
											src={photo}
											alt="Your inspiration"
											className="h-14 w-14 rounded border border-[var(--ftf-line)] object-cover"
										/>
										<button
											type="button"
											onClick={() => setPhoto(undefined)}
											className="text-xs font-medium text-[var(--ftf-ink-3)] hover:text-[var(--ftf-ink)]"
										>
											Remove
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => fileRef.current?.click()}
										className="flex items-center gap-2 rounded border border-dashed border-[var(--ftf-line-strong)] px-3 py-2.5 text-xs font-medium text-[var(--ftf-ink-2)] hover:border-[var(--ftf-blue-600)] hover:text-[var(--ftf-blue-800)]"
									>
										<ImagePlus className="h-4 w-4" /> Upload a photo
									</button>
								)}
								{photoError && (
									<p className="mt-1 text-[11px] text-red-600">{photoError}</p>
								)}
							</div>
						</div>
					</div>
				)}

				{step.id === "extras" && (
					<div className="space-y-6">
						<div>
							{label(
								"Features",
								"Each one fits every body without changing the openings. They appear in your renders.",
							)}
							<div className="grid gap-1.5 sm:grid-cols-3">
								{FEATURES.map((f) =>
									choiceCard(
										d.features.includes(f.id),
										() => toggleIn("features", f.id),
										f.label,
										f.blurb,
									),
								)}
							</div>
						</div>
						<div>
							{label(
								"Anything you must have?",
								"Equipment, a material, an idea you can't stop thinking about. Better now than at the end of the build.",
							)}
							<textarea
								value={d.notes}
								onChange={(e) => set("notes", e.target.value)}
								placeholder="e.g. the griddle has to be visible from the counter"
								rows={3}
								maxLength={240}
								className={cn(FIELD, "resize-none")}
							/>
						</div>
						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								{label(
									"Budget",
									"A range helps sales prepare a realistic quote. It never limits your renders.",
								)}
								<div className="flex flex-wrap gap-1.5">
									{BUDGETS.map((b) =>
										chip(
											d.budget === b.id,
											() => pickOne("budget", b.id),
											b.label,
										),
									)}
								</div>
							</div>
							<div>
								{label("When do you want to trade?")}
								<div className="flex flex-wrap gap-1.5">
									{TIMELINES.map((t) =>
										chip(
											d.timeline === t.id,
											() => pickOne("timeline", t.id),
											t.label,
										),
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{isReview && (
					<div>
						<p className="mb-3 text-[12px] leading-snug text-[var(--ftf-ink-3)]">
							This is the brief your first renders are built from. Fix anything
							that looks wrong now — it saves a revision later.
						</p>
						<dl className="divide-y divide-[var(--ftf-line)] rounded border border-[var(--ftf-line)]">
							{reviewRows.map((r) => (
								<div
									key={r.label}
									className="flex items-start gap-3 px-3 py-2.5"
								>
									<dt className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--ftf-ink-3)]">
										{r.label}
									</dt>
									<dd
										className={cn(
											"min-w-0 flex-1 text-sm",
											r.value
												? "text-[var(--ftf-ink)]"
												: "text-[var(--ftf-ink-4)]",
										)}
									>
										{r.value || "We'll propose this"}
									</dd>
									<button
										type="button"
										aria-label={`Edit ${r.label}`}
										onClick={() => {
											setReturnToReview(true);
											go(r.step);
										}}
										className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--ftf-blue-800)] hover:underline"
									>
										<Pencil className="h-3 w-3" /> Edit
									</button>
								</div>
							))}
						</dl>
						{previewVibe && (
							<p className="mt-3 text-[11px] text-[var(--ftf-ink-3)]">
								Style read: {previewVibe}
							</p>
						)}
						<p className="mt-3 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
							Renders are concept visualizations. Dimensions, openings,
							equipment and wrap are confirmed by the factory before build.
						</p>
					</div>
				)}
			</div>

			<div className="mt-7 flex items-center gap-2">
				<button
					type="button"
					onClick={() => {
						setReturnToReview(false);
						go(stepIndex - 1);
					}}
					className="flex items-center gap-1.5 rounded border border-[var(--ftf-line-strong)] px-3.5 py-2.5 text-sm font-medium text-[var(--ftf-ink-2)] transition-colors hover:bg-[var(--ftf-paper-2)] hover:text-[var(--ftf-ink)]"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
				<button
					type="button"
					onClick={next}
					className="ftf-cta flex flex-1 items-center justify-center gap-2 rounded px-4 py-2.5 text-sm"
				>
					{isReview
						? "Generate my concepts"
						: returnToReview
							? "Back to review"
							: "Next"}
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>

			{!isReview && (
				<button
					type="button"
					onClick={() => {
						onStep(step.id, snapshot());
						setReturnToReview(false);
						go(STEPS.length - 1);
					}}
					className="mt-3 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
				>
					Skip to review
				</button>
			)}
		</>,
	);
}

/** Two-tone preview from color words until real photos land. */
function paletteGradient(colors: string[]) {
	const a = swatchFor(colors[0]);
	const b = swatchFor(colors[1] ?? colors[0]);
	return `linear-gradient(135deg,${a} 60%,${b} 60%)`;
}

function swatchFor(word: string) {
	const w = word.toLowerCase();
	if (w.includes("black")) return "#1c1c1e";
	if (w.includes("cream")) return "#f3ead6";
	if (w.includes("orange")) return "#e8641b";
	if (w.includes("red")) return "#b3202c";
	if (w.includes("teal")) return "#1f7a8c";
	if (w.includes("navy")) return "#1e2a4a";
	if (w.includes("steel")) return "#9aa1a8";
	if (w.includes("pink")) return "#ff4fa3";
	return "#888";
}
