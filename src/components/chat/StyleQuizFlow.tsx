/**
 * Style quiz — the Looka-style replacement for the static intake.
 *
 * Five steps, every one skippable: use → body → style likes → color likes →
 * extras. Style/color rounds are star-pick grids over a curated catalog
 * (pre-made truck photos drop into `QuizStyle.image`; gradients stand in
 * until the factory supplies them). Picks collapse to the same answer record
 * the old intake produced, so intake → design-record → single auto-render
 * needs zero changes — the quiz only gathers better signal.
 */
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useState } from "react";
import {
	BUSINESS_TYPES,
	VEHICLES,
} from "#/lib/food-truck/constants";
import {
	composeBrief,
	type IntakeAnswers,
} from "#/lib/food-truck/intake";
import {
	extrasNote,
	QUIZ_EXTRAS,
	QUIZ_PALETTES,
	QUIZ_STYLES,
	quizToDirect,
	type QuizPicks,
} from "#/lib/food-truck/quiz";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";

export interface StyleQuizFlowProps {
	onComplete: (
		brief: string,
		answers: IntakeAnswers,
		image: undefined,
		picks: QuizPicks,
	) => void;
	onSkip: () => void;
	/** Fired on every Next so the CMS logs partials even on drop-off. */
	onStep: (step: string, data: Record<string, unknown>) => void;
}

const FIELD =
	"w-full rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--ftf-ink)] placeholder:text-[var(--ftf-ink-4)] outline-none transition-colors focus:border-[var(--ftf-blue-600)]";

const STEPS = [
	{ id: "use", title: "What are you serving?" },
	{ id: "body", title: "Pick your truck" },
	{ id: "style", title: "Star the looks you love" },
	{ id: "color", title: "Star the colors you love" },
	{ id: "extras", title: "Finishing touches" },
] as const;

export default function StyleQuizFlow({
	onComplete,
	onSkip,
	onStep,
}: StyleQuizFlowProps) {
	// -1 is the welcome screen; 0..4 are the quiz steps.
	const [stepIndex, setStepIndex] = useState(-1);
	const [brandName, setBrandName] = useState("");
	const [businessType, setBusinessType] = useState("");
	const [menu, setMenu] = useState("");
	const [vehicleId, setVehicleId] = useState("");
	const [service, setService] = useState("");
	const [styles, setStyles] = useState<string[]>([]);
	const [palettes, setPalettes] = useState<string[]>([]);
	const [extras, setExtras] = useState<string[]>([]);
	const [notes, setNotes] = useState("");

	const toggle = (list: string[], id: string) =>
		list.includes(id) ? list.filter((v) => v !== id) : [...list, id];

	const snapshot = (): Record<string, unknown> => ({
		brandName,
		businessType,
		menu,
		vehicleId,
		service,
		styles,
		palettes,
		extras,
		notes,
	});

	const finish = () => {
		const picks: QuizPicks = { styles, palettes, extras };
		const { vibe, colors } = quizToDirect(picks);
		track("quiz_completed", {
			styles: picks.styles.length,
			palettes: picks.palettes.length,
			extras: picks.extras.length,
		});
		const extraNotes = extrasNote(picks);
		const answers: IntakeAnswers = {
			brandName,
			businessType,
			menu,
			vehicleId,
			service,
			vibe,
			colors,
			notes: [notes.trim(), extraNotes].filter(Boolean).join("; "),
		};
		onStep("final", { ...snapshot(), vibe, colors });
		onComplete(composeBrief(answers), answers, undefined, picks);
	};

	const next = () => {
		onStep(STEPS[stepIndex].id, snapshot());
		track("quiz_step", { step: STEPS[stepIndex].id, index: stepIndex });
		if (stepIndex >= STEPS.length - 1) finish();
		else setStepIndex((i) => i + 1);
	};

	const shell = (children: React.ReactNode) => (
		<div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--ftf-paper-2)] px-4 py-8">
			<div className="mx-auto my-auto w-full max-w-xl">
				<div className="overflow-hidden rounded border border-[var(--ftf-line)] bg-white shadow-[var(--ftf-shadow-lg)]">
					<div className="h-1 bg-[var(--ftf-blue-800)]" />
					<div className="px-6 py-7 sm:px-8">{children}</div>
				</div>
				<p className="mt-4 text-center text-[11px] text-[var(--ftf-ink-4)]">
					Free concept renders · no account needed
				</p>
			</div>
		</div>
	);

	const choiceCard = (
		selected: boolean,
		onClick: () => void,
		title: string,
		blurb?: string,
	) => (
		<button
			key={title}
			type="button"
			onClick={onClick}
			className={cn(
				"rounded border px-3 py-2.5 text-left transition-colors",
				selected
					? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-50)]"
					: "border-[var(--ftf-line)] bg-white hover:border-[var(--ftf-line-strong)]",
			)}
		>
			<span
				className={cn(
					"block text-sm font-semibold",
					selected ? "text-[var(--ftf-blue-800)]" : "text-[var(--ftf-ink)]",
				)}
			>
				{title}
			</span>
			{blurb && (
				<span className="mt-0.5 block text-[11px] leading-snug text-[var(--ftf-ink-3)]">
					{blurb}
				</span>
			)}
		</button>
	);

	if (stepIndex === -1) {
		return shell(
			<>
				<p className="ftf-label">Custom food truck design</p>
				<h1 className="ftf-display mt-2 text-[26px] leading-[1.15] text-[var(--ftf-ink)]">
					Let&apos;s design your truck
				</h1>
				<p className="mt-2.5 text-sm leading-relaxed text-[var(--ftf-ink-2)]">
					Five quick steps — star the looks you like and we&apos;ll generate
					your concept from your taste. Skip anything you haven&apos;t decided
					yet.
				</p>
				<button
					type="button"
					onClick={() => {
						track("quiz_started");
						setStepIndex(0);
					}}
					className="ftf-cta mt-6 flex w-full items-center justify-center gap-2 rounded px-4 py-3 text-sm"
				>
					Find my style <ArrowRight className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onSkip}
					className="mt-5 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
				>
					Skip — I&apos;d rather just look around
				</button>
			</>,
		);
	}

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
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{items.map((item) => {
				const active = picked.includes(item.id);
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onToggle(item.id)}
						className={cn(
							"group relative overflow-hidden rounded border text-left transition-colors",
							active
								? "border-[var(--ftf-blue-800)] ring-1 ring-[var(--ftf-blue-800)]"
								: "border-[var(--ftf-line)] hover:border-[var(--ftf-line-strong)]",
						)}
					>
						{item.image ? (
							<img
								src={item.image}
								alt={item.label}
								className="h-24 w-full object-cover"
							/>
						) : (
							<span
								className="block h-24 w-full"
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

	const isLast = stepIndex === STEPS.length - 1;

	return shell(
		<>
			<div className="flex items-center justify-between">
				<p className="ftf-label">
					Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex].title}
				</p>
				<span className="text-[11px] tabular-nums text-[var(--ftf-ink-4)]">
					{pickedCount(stepIndex, styles, palettes) || ""}
				</span>
			</div>
			<div className="mt-2 flex items-center gap-1">
				{STEPS.map((s, i) => (
					<span
						key={s.id}
						className={cn(
							"h-1 flex-1 transition-colors",
							i <= stepIndex
								? "bg-[var(--ftf-blue-800)]"
								: "bg-[var(--ftf-paper-3)]",
						)}
					/>
				))}
			</div>

			<h2 className="ftf-display mt-5 text-[22px] leading-tight text-[var(--ftf-ink)]">
				{STEPS[stepIndex].title}
			</h2>

			<div className="mt-5">
				{stepIndex === 0 && (
					<div className="space-y-5">
						<div>
							<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
								Business name
							</p>
							<div className="mt-2">
								<input
									value={brandName}
									onChange={(e) => setBrandName(e.target.value)}
									placeholder="e.g. BIB Burgers"
									className={FIELD}
								/>
							</div>
						</div>
						<div>
							<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
								What will you serve?
							</p>
							<p className="mb-2 mt-0.5 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
								This sets the equipment line and the layout.
							</p>
							<div className="grid gap-1.5 sm:grid-cols-2">
								{BUSINESS_TYPES.map((b) =>
									choiceCard(
										businessType === b.id,
										() =>
											setBusinessType(businessType === b.id ? "" : b.id),
										b.label,
										b.note,
									),
								)}
							</div>
						</div>
						<div>
							<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
								Signature items
							</p>
							<div className="mt-2">
								<input
									value={menu}
									onChange={(e) => setMenu(e.target.value)}
									placeholder="e.g. smash burgers, chicken burgers, shakes"
									className={FIELD}
								/>
							</div>
						</div>
					</div>
				)}

				{stepIndex === 1 && (
					<div className="space-y-5">
						<div className="grid gap-1.5 sm:grid-cols-2">
							{VEHICLES.map((v) =>
								choiceCard(
									vehicleId === v.id,
									() => setVehicleId(vehicleId === v.id ? "" : v.id),
									v.label,
									v.blurb,
								),
							)}
						</div>
						<div>
							<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
								How do customers order?
							</p>
							<div className="mt-2 grid gap-1.5 sm:grid-cols-2">
								{choiceCard(
									service === "hatch",
									() => setService(service === "hatch" ? "" : "hatch"),
									"At a hatch",
									"They order outside. Most food trucks work this way.",
								)}
								{choiceCard(
									service === "walk-in",
									() => setService(service === "walk-in" ? "" : "walk-in"),
									"They walk inside",
									"Needs a wider body and more floor for customers.",
								)}
							</div>
						</div>
					</div>
				)}

				{stepIndex === 2 && (
					<div>
						<p className="mb-3 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
							Tap the star on every look you&apos;d be happy driving. Pick at
							least two — or skip ahead.
						</p>
						{starGrid(
							QUIZ_STYLES.map((s) => ({
								id: s.id,
								label: s.label,
								blurb: s.blurb,
								gradient: s.gradient,
								image: s.image,
							})),
							styles,
							(id) => setStyles(toggle(styles, id)),
						)}
					</div>
				)}

				{stepIndex === 3 && (
					<div>
						<p className="mb-3 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
							Star the palettes that feel like your brand. We&apos;ll mix your
							picks into the wrap.
						</p>
						{starGrid(
							QUIZ_PALETTES.map((p) => ({
								id: p.id,
								label: p.label,
								blurb: p.colors.join(" · "),
								gradient: paletteGradient(p.colors),
							})),
							palettes,
							(id) => setPalettes(toggle(palettes, id)),
						)}
					</div>
				)}

				{stepIndex === 4 && (
					<div className="space-y-5">
						<div className="flex flex-wrap gap-1.5">
							{QUIZ_EXTRAS.map((e) => (
								<button
									key={e.id}
									type="button"
									onClick={() => setExtras(toggle(extras, e.id))}
									title={e.blurb}
									className={cn(
										"rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors",
										extras.includes(e.id)
											? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-800)] text-white"
											: "border-[var(--ftf-line)] bg-white text-[var(--ftf-ink-2)] hover:border-[var(--ftf-line-strong)] hover:text-[var(--ftf-ink)]",
									)}
								>
									{e.label}
								</button>
							))}
						</div>
						<div>
							<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
								Anything you must have?
							</p>
							<div className="mt-2">
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="e.g. the burger assembly has to be visible from the counter"
									rows={3}
									className={cn(FIELD, "resize-none")}
								/>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="mt-7 flex items-center gap-2">
				<button
					type="button"
					onClick={() => setStepIndex((i) => i - 1)}
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
					{isLast ? "Generate my truck" : "Next"}
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>

			<button
				type="button"
				onClick={() => (isLast ? finish() : next())}
				className="mt-3 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
			>
				{isLast ? "Skip the rest" : "Skip the rest — I'll fill it in as I go"}
			</button>
		</>,
	);
}

/** "3 picked" hint on the star rounds. */
function pickedCount(step: number, styles: string[], palettes: string[]) {
	if (step === 2)
		return styles.length > 0
			? `${styles.length} picked`
			: "pick at least 2 — or skip";
	if (step === 3)
		return palettes.length > 0
			? `${palettes.length} picked`
			: "pick at least 2 — or skip";
	return "";
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
