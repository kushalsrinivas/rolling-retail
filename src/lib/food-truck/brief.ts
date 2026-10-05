/**
 * Operating brief — how and where the truck trades, and what it must carry.
 *
 * The quiz used to stop at taste (styles, palettes) and a free-text box, so
 * the renders knew what the truck looked like but not where it stood or what
 * it was for. A festival trailer shot on a city curb, a night-trade unit with
 * no exterior lighting, a matte wrap rendered as gloss — every one of those
 * is a render the buyer has to correct with a credit.
 *
 * Each option here carries two things: the buyer-facing label, and the exact
 * technical phrase the STE prompts quote. Nothing in this file is free text
 * that reaches the image model unreviewed.
 *
 * Pure and client-safe.
 */
import { getBusiness, VEHICLES, type VehicleId } from "./constants";

export interface BriefOption<Id extends string = string> {
	id: Id;
	label: string;
	blurb?: string;
}

export const TRADING_CONTEXTS = [
	{
		id: "street",
		label: "City streets",
		blurb: "Curbside pitches, lunch crowds",
		scene:
			"a clean city curb with a concrete sidewalk; storefronts are far behind and out of focus",
	},
	{
		id: "events",
		label: "Festivals & events",
		blurb: "Big crowds, long queues",
		scene:
			"a festival field with short dry grass; event tents and flags are far behind and out of focus",
	},
	{
		id: "office",
		label: "Office parks",
		blurb: "Fast weekday lunch",
		scene:
			"a modern office plaza with light gray stone paving; glass buildings are far behind and out of focus",
	},
	{
		id: "brewery",
		label: "Breweries & wineries",
		blurb: "Evening trade, seated guests",
		scene:
			"a brewery yard with compacted gravel; wood picnic tables are far behind and out of focus",
	},
	{
		id: "campus",
		label: "Campus & schools",
		blurb: "Students, quick turns",
		scene:
			"a university walkway with trees and lawn; brick buildings are far behind and out of focus",
	},
	{
		id: "private",
		label: "Weddings & private hire",
		blurb: "Premium, photographed a lot",
		scene:
			"a landscaped garden lawn at a private venue; festoon lights hang far behind and out of focus",
	},
] as const;

export type TradingContextId = (typeof TRADING_CONTEXTS)[number]["id"];

export const SERVICE_PERIODS = [
	{ id: "day", label: "Daytime", blurb: "Breakfast through late afternoon" },
	{ id: "night", label: "Evenings", blurb: "After dark is the main trade" },
	{ id: "both", label: "Both", blurb: "Lunch and late service" },
] as const;

export type ServicePeriodId = (typeof SERVICE_PERIODS)[number]["id"];

/** Orders per hour at peak — drives body size and line width. */
export const PEAK_VOLUMES = [
	{ id: "low", label: "Under 30 / hr", blurb: "Relaxed, made-to-order" },
	{ id: "medium", label: "30–60 / hr", blurb: "A steady lunch line" },
	{ id: "high", label: "60–120 / hr", blurb: "Events and rushes" },
	{ id: "very-high", label: "120+ / hr", blurb: "Festival main stage" },
] as const;

export type PeakVolumeId = (typeof PEAK_VOLUMES)[number]["id"];

export const CREW_SIZES = [
	{ id: "1", label: "Just me" },
	{ id: "2", label: "Two people" },
	{ id: "3+", label: "Three or more" },
] as const;

export type CrewSizeId = (typeof CREW_SIZES)[number]["id"];

export const WRAP_FINISHES = [
	{
		id: "gloss",
		label: "Gloss",
		blurb: "Bright, shiny, classic",
		phrase:
			"gloss cast vinyl film; the surface shows sharp, clean reflections of the sky",
	},
	{
		id: "matte",
		label: "Matte",
		blurb: "Modern, no glare",
		phrase:
			"matte cast vinyl film; the surface is diffuse and shows no mirror reflections",
	},
	{
		id: "satin",
		label: "Satin",
		blurb: "Soft sheen, premium",
		phrase:
			"satin cast vinyl film; the surface shows a soft, low sheen and blurred reflections",
	},
] as const;

export type WrapFinishId = (typeof WRAP_FINISHES)[number]["id"];

export const LOGO_STATUSES = [
	{
		id: "have",
		label: "I have a logo",
		blurb: "We place it on the wrap later",
	},
	{ id: "need", label: "I need one", blurb: "We propose an emblem" },
	{ id: "undecided", label: "Not sure yet", blurb: "Decide later" },
] as const;

export type LogoStatusId = (typeof LOGO_STATUSES)[number]["id"];

export const BUDGETS = [
	{ id: "under-60k", label: "Under $60k" },
	{ id: "60-100k", label: "$60k–$100k" },
	{ id: "100-150k", label: "$100k–$150k" },
	{ id: "150k-plus", label: "$150k+" },
	{ id: "unsure", label: "Not sure yet" },
] as const;

export type BudgetId = (typeof BUDGETS)[number]["id"];

export const TIMELINES = [
	{ id: "asap", label: "As soon as possible" },
	{ id: "3-months", label: "Within 3 months" },
	{ id: "6-months", label: "Within 6 months" },
	{ id: "exploring", label: "Just exploring" },
] as const;

export type TimelineId = (typeof TIMELINES)[number]["id"];

/**
 * Visible features the buyer can ask for. Every one is something the factory
 * fits on every body without changing the openings — the old "rear hatch"
 * extra asked for a second serving opening the body lock forbids, so the
 * prompt contradicted itself.
 */
export const FEATURES = [
	{
		id: "roof-sign",
		label: "Roof sign",
		blurb: "Seen over a crowded event",
		note: "roof-mounted sign",
		phrase: "an illuminated roof blade sign on the roof centerline",
	},
	{
		id: "awning",
		label: "Fabric awning",
		blurb: "Shade and rain cover at the hatch",
		note: "fabric awning over the hatch",
		phrase:
			"a retractable fabric awning above the service hatch, in the accent color, with two diagonal support arms",
	},
	{
		id: "night-lighting",
		label: "Night lighting",
		blurb: "Serve after dark",
		note: "night service lighting",
		phrase:
			"a warm-white LED strip along the top edge of the hatch opening and two downlights on the curbside wall",
	},
	{
		id: "menu-board",
		label: "Big menu board",
		blurb: "Readable from the back of the queue",
		note: "large readable menu board",
		phrase:
			"a large menu board frame on the curbside wall next to the hatch; the board face is plain and dark with no text",
	},
	{
		id: "visible-kitchen",
		label: "Open kitchen view",
		blurb: "Cooking as theater",
		note: "main station visible from the hatch",
		phrase:
			"a full-width clear glass sneeze guard; the main station faces the hatch and is visible from the sidewalk",
	},
	{
		id: "condiment-shelf",
		label: "Condiment shelf",
		blurb: "Keeps the pickup moving",
		note: "fold-down condiment shelf below the hatch",
		phrase:
			"a fold-down brushed stainless shelf below the hatch sill, with brackets under it",
	},
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

export interface DesignBrief {
	tradingContexts: TradingContextId[];
	servicePeriod: ServicePeriodId | null;
	peakVolume: PeakVolumeId | null;
	crew: CrewSizeId | null;
	wrapFinish: WrapFinishId | null;
	logo: LogoStatusId | null;
	budget: BudgetId | null;
	timeline: TimelineId | null;
	features: FeatureId[];
	/**
	 * The buyer's own must-haves, as typed. The one free-text field that
	 * reaches the renderer — single line, capped, quoted as a data row.
	 */
	notes: string;
}

/** One line, no control characters, capped — safe to quote in a data row. */
export function cleanNotes(value: unknown): string {
	if (typeof value !== "string") return "";
	return (
		value
			// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
			.replace(/[\u0000-\u001f\u007f]+/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 240)
	);
}

export function emptyBrief(): DesignBrief {
	return {
		tradingContexts: [],
		servicePeriod: null,
		peakVolume: null,
		crew: null,
		wrapFinish: null,
		logo: null,
		budget: null,
		timeline: null,
		features: [],
		notes: "",
	};
}

function pickOne<T extends { id: string }>(
	list: readonly T[],
	value: unknown,
): T["id"] | null {
	if (typeof value !== "string") return null;
	return list.find((o) => o.id === value.trim())?.id ?? null;
}

function pickMany<T extends { id: string }>(
	list: readonly T[],
	value: unknown,
): T["id"][] {
	const raw = Array.isArray(value)
		? value
		: typeof value === "string"
			? value.split(/[,;]+/)
			: [];
	const out: T["id"][] = [];
	for (const v of raw) {
		const id = pickOne(list, v);
		if (id && !out.includes(id)) out.push(id);
	}
	return out;
}

/**
 * Accept whatever the client sent and keep only known ids. The brief is a
 * closed vocabulary on purpose: a typo or an injected phrase never reaches
 * the image prompt.
 */
export function parseBrief(input: unknown): DesignBrief {
	const o = (input && typeof input === "object" ? input : {}) as Record<
		string,
		unknown
	>;
	return {
		tradingContexts: pickMany(TRADING_CONTEXTS, o.tradingContexts),
		servicePeriod: pickOne(SERVICE_PERIODS, o.servicePeriod),
		peakVolume: pickOne(PEAK_VOLUMES, o.peakVolume),
		crew: pickOne(CREW_SIZES, o.crew),
		wrapFinish: pickOne(WRAP_FINISHES, o.wrapFinish),
		logo: pickOne(LOGO_STATUSES, o.logo),
		budget: pickOne(BUDGETS, o.budget),
		timeline: pickOne(TIMELINES, o.timeline),
		features: pickMany(FEATURES, o.features),
		notes: cleanNotes(o.notes),
	};
}

export function isBriefEmpty(b: DesignBrief | null | undefined): boolean {
	if (!b) return true;
	return (
		b.tradingContexts.length === 0 &&
		!b.servicePeriod &&
		!b.peakVolume &&
		!b.crew &&
		!b.wrapFinish &&
		!b.logo &&
		!b.budget &&
		!b.timeline &&
		b.features.length === 0 &&
		!b.notes
	);
}

const labelOf = <T extends { id: string; label: string }>(
	list: readonly T[],
	id: string | null,
) => (id ? (list.find((o) => o.id === id)?.label ?? null) : null);

/** The scene the hero is photographed in — the buyer's main pitch. */
export function sceneFor(brief: DesignBrief | null | undefined): string {
	const id = brief?.tradingContexts[0];
	return (
		TRADING_CONTEXTS.find((c) => c.id === id)?.scene ??
		"a clean urban street-food pitch with a concrete sidewalk; buildings are far behind and out of focus"
	);
}

export function finishPhraseFor(brief: DesignBrief | null | undefined): string {
	const id = brief?.wrapFinish ?? "gloss";
	return (
		WRAP_FINISHES.find((f) => f.id === id)?.phrase ?? WRAP_FINISHES[0].phrase
	);
}

/**
 * Feature phrases for the exterior prompts.
 *
 * With no brief at all (an old session, or a buyer who skipped the quiz) the
 * roof sign stays on, because every render before this module had one and a
 * returning buyer's next round must not lose it.
 */
export function featurePhrases(
	brief: DesignBrief | null | undefined,
): string[] {
	const ids: readonly FeatureId[] =
		brief && !isBriefEmpty(brief) ? brief.features : ["roof-sign"];
	return ids
		.map((id) => FEATURES.find((f) => f.id === id)?.phrase)
		.filter((p): p is (typeof FEATURES)[number]["phrase"] => Boolean(p));
}

export function hasFeature(
	brief: DesignBrief | null | undefined,
	id: FeatureId,
): boolean {
	if (!brief || isBriefEmpty(brief)) return id === "roof-sign";
	return brief.features.includes(id);
}

/** Plain-English lines for the chat brief and the sales handover. */
export function briefSummary(brief: DesignBrief | null | undefined): string[] {
	if (!brief) return [];
	const lines: string[] = [];
	const where = brief.tradingContexts
		.map((id) => labelOf(TRADING_CONTEXTS, id)?.toLowerCase())
		.filter(Boolean);
	if (where.length) lines.push(`I'll mostly trade at ${where.join(", ")}.`);
	const when = labelOf(SERVICE_PERIODS, brief.servicePeriod);
	if (when) lines.push(`Main service: ${when.toLowerCase()}.`);
	const peak = labelOf(PEAK_VOLUMES, brief.peakVolume);
	if (peak)
		lines.push(
			`Peak volume around ${peak.replace(" / hr", " orders an hour")}.`,
		);
	const crew = labelOf(CREW_SIZES, brief.crew);
	if (crew) lines.push(`Crew on the line: ${crew.toLowerCase()}.`);
	const finish = labelOf(WRAP_FINISHES, brief.wrapFinish);
	if (finish) lines.push(`Wrap finish: ${finish.toLowerCase()}.`);
	if (brief.logo === "have") lines.push("I already have a logo.");
	if (brief.logo === "need") lines.push("I need a logo designed.");
	const feats = brief.features
		.map((id) => FEATURES.find((f) => f.id === id)?.note)
		.filter(Boolean);
	if (feats.length) lines.push(`Must-have features: ${feats.join("; ")}.`);
	const budget = labelOf(BUDGETS, brief.budget);
	if (budget && brief.budget !== "unsure") lines.push(`Budget: ${budget}.`);
	const timeline = labelOf(TIMELINES, brief.timeline);
	if (timeline && brief.timeline !== "exploring")
		lines.push(`Timeline: ${timeline.toLowerCase()}.`);
	return lines;
}

export interface VehicleRecommendation {
	vehicleId: VehicleId;
	reason: string;
}

const HOT_TYPES = new Set([
	"fried",
	"grill",
	"pizza",
	"asian",
	"mexican",
	"breakfast",
	"combined",
]);

/**
 * The factory's builder doctrine, applied to the quiz answers.
 *
 * Compact beats big: the smallest body that carries the line at the stated
 * peak. Hot food never goes on the Large Airstream; walk-in retail always
 * does. This is a suggestion the buyer can overrule, not a gate.
 */
export function recommendVehicle(args: {
	businessType?: string | null;
	service?: string | null;
	peakVolume?: PeakVolumeId | null;
	tradingContexts?: readonly TradingContextId[];
}): VehicleRecommendation | null {
	const biz = getBusiness(args.businessType ?? "");
	if (!biz) return null;
	const walkIn = args.service === "walk-in";
	const peak = args.peakVolume ?? null;
	const premium = (args.tradingContexts ?? []).some(
		(c) => c === "private" || c === "brewery",
	);
	const busy = peak === "high" || peak === "very-high";
	const pick = (vehicleId: VehicleId, reason: string) => {
		if (!VEHICLES.some((v) => v.id === vehicleId)) return null;
		return { vehicleId, reason };
	};

	if (biz.id === "retail") {
		return walkIn || peak !== "low"
			? pick(
					"airstream-l",
					"A walk-in boutique needs floor for customers. The Large Airstream is built for that.",
				)
			: pick(
					"square-3m",
					"A hatch-serve merch stand needs wall, not floor. The 10 ft square is the cheapest to wrap.",
				);
	}
	if (HOT_TYPES.has(biz.id)) {
		if (peak === "very-high")
			return pick(
				"square-5m",
				"At 120+ orders an hour you need a longer line. The 16 ft square fits the full menu and drinks.",
			);
		if (busy || biz.id === "combined" || biz.id === "pizza")
			return premium
				? pick(
						"airstream-m",
						"A hot line with real throughput, in the body guests photograph. The Mid Airstream is the best-seller.",
					)
				: pick(
						"square-4m",
						"One hot station at real volume. The 13 ft square is the balanced build.",
					);
		return premium
			? pick(
					"airstream-s",
					"One compact hot station with the strongest curb appeal. Small Airstream keeps weight and power down.",
				)
			: pick(
					"square-4m",
					"One hot station and cold support. Compact beats big: less weight, a smaller power system.",
				);
	}
	// Cold and coffee lines: smallest body that carries the peak.
	if (busy)
		return premium
			? pick(
					"airstream-m",
					"Two people on a cold line at volume, with the Airstream look.",
				)
			: pick(
					"square-4m",
					"Room for two people on a cold line at volume, at a sensible wrap cost.",
				);
	return premium
		? pick(
				"airstream-s",
				"A cold or coffee line fits the Small Airstream. It has the best curb appeal for the least weight.",
			)
		: pick(
				"square-3m",
				"A cold or coffee line fits the 10 ft square. It is the cheapest to build and wrap.",
			);
}
