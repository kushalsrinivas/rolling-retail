/**
 * Project Brain — deterministic knowledge extractor.
 *
 * Turns messy brain-dumps into a structured, evolving understanding of the
 * project (brand / business / space / customer / aesthetic) plus a confidence
 * score per dimension. Deterministic on purpose: free, instant, reliable, and
 * it works offline. The LLM consults the brain via the digest injected into
 * its context each turn — the brain is the memory, the LLM is the director.
 */

import {
	type BusinessTypeId,
	getVehicle,
	LEGACY_BUSINESS_ALIASES,
	VEHICLES,
} from "./constants";

export type { BusinessTypeId };

export interface BrainConfidence {
	brand: number;
	business: number;
	space: number;
	customer: number;
	aesthetic: number;
}

export interface ProjectBrain {
	brandName: string | null;
	colors: string[];
	vibeWords: string[];
	businessType: BusinessTypeId | null;
	menuKeywords: string[];
	vehicleId: string | null;
	vehicleSource: "said" | "picker" | null;
	walkIn: boolean | null;
	customerNotes: string[];
	equipmentHints: string[];
	unknowns: string[];
	confidence: BrainConfidence;
	signals: number;
	updatedAt: number;
}

const BUSINESS_KEYWORDS: Record<Exclude<BusinessTypeId, "combined">, string[]> =
	{
		fried: [
			"fryer",
			"fried",
			"fish and chips",
			"fish & chips",
			"chips",
			"scampi",
			"fried chicken",
			"fries",
			"loaded fries",
			"wings",
			"fritters",
			"tempura",
			"nuggets",
		],
	grill: [
		"burger",
		"chicken burger",
		"chicken",
		"smash",
		"grill",
		"griddle",
		"chargrill",
		"bbq",
		"barbecue",
		"kebab",
		"steak",
		"cheesesteak",
		"burrito",
		"sandwich",
		"meat",
	],
		pizza: [
			"pizza",
			"pizzas",
			"neapolitan",
			"sourdough pizza",
			"italian",
			"pasta",
			"calzone",
			"focaccia",
			"deck oven",
			"pizza oven",
		],
		asian: [
			"noodles",
			"ramen",
			"bao",
			"curry",
			"thai",
			"chinese",
			"indian",
			"japanese",
			"korean",
			"vietnamese",
			"wok",
			"tacos",
			"taco",
			"mexican",
			"rice",
			"dumplings",
			"gyoza",
			"sushi",
			"katsu",
		],
		breakfast: [
			"breakfast",
			"brunch",
			"bacon roll",
			"bacon butty",
			"full english",
			"eggs",
			"pancakes",
			"porridge",
			"pastries",
			"croissant",
			"sausage roll",
		],
		coffee: [
			"coffee",
			"espresso",
			"flat white",
			"latte",
			"cappuccino",
			"barista",
			"speciality coffee",
			"specialty coffee",
		],
	"cold-drinks": [
		"boba",
		"bubble tea",
		"juice",
		"smoothie",
		"lemonade",
		"milkshake",
		"shake",
		"shakes",
		"matcha",
		"iced tea",
		"soft drink",
		"soft drinks",
		"cold drinks",
		"cold drink",
	],
		bakery: [
			"bakery",
			"patisserie",
			"cakes",
			"cupcakes",
			"brownies",
			"cookies",
			"doughnuts",
			"donuts",
			"dessert",
			"desserts",
			"sweet treats",
			"churros",
			"waffles",
			"crepes",
		],
		"ice-cream": [
			"ice cream",
			"gelato",
			"soft scoop",
			"sundae",
			"sorbet",
			"frozen yoghurt",
			"frozen yogurt",
			"mr whippy",
		],
		bar: [
			"bar",
			"cocktail",
			"cocktails",
			"beer",
			"craft beer",
			"wine",
			"prosecco",
			"gin",
			"mobile bar",
			"draught",
			"draft",
			"pour",
		],
		retail: [
			"merch",
			"merchandise",
			"clothing",
			"apparel",
			"t-shirt",
			"tshirt",
			"retail",
			"boutique",
			"gifts",
			"souvenir",
			"streetwear",
			"fashion",
			"florist",
			"flowers",
			"books",
		],
	};

const VEHICLE_WORDS = [
	"airstream",
	"square",
	"trailer",
	"truck",
	"van",
	"cart",
	"3m",
	"4m",
	"5m",
	"3 m",
	"4 m",
	"5 m",
	"meter",
	"metre",
	"body",
	"footprint",
];

const WALKIN_TRUE = [
	"walk-in",
	"walk in",
	"walkin",
	"step inside",
	"step in",
	"come inside",
	"customers inside",
	"people inside",
	"dine-in",
	"dine in",
	"sit inside",
	"seating inside",
	"enter the",
];

const WALKIN_FALSE = [
	"hatch",
	"serve window",
	"serving window",
	"service window",
	"order at",
	"walk-up",
	"walk up",
	"takeaway",
	"take-away",
	"takeout",
	"take-out",
	"pickup window",
	"pick-up",
	"no one walks",
	"nobody walks",
	"nobody inside",
	"no walk",
	"counter",
	"assembly visible",
	"watch their food",
	"visible griddle",
	"open kitchen",
];

const COLOR_WORDS = [
	"matte black",
	"stainless steel",
	"red",
	"blue",
	"green",
	"black",
	"white",
	"cream",
	"yellow",
	"orange",
	"purple",
	"pink",
	"gold",
	"silver",
	"teal",
	"navy",
	"maroon",
	"neon",
	"chrome",
	"wood",
	"walnut",
	"brass",
	"copper",
	"beige",
	"brown",
	"gray",
	"grey",
];

const VIBE_WORDS = [
	"premium",
	"luxury",
	"minimal",
	"minimalist",
	"bold",
	"retro",
	"vintage",
	"modern",
	"playful",
	"fun",
	"street",
	"edgy",
	"rustic",
	"elegant",
	"clean",
	"sleek",
	"industrial",
	"cozy",
	"high-end",
	"upscale",
	"flashy",
	"understated",
	"artisan",
	"craft",
];

const CUSTOMER_WORDS = [
	"students",
	"college",
	"university",
	"office",
	"workers",
	"lunch crowd",
	"families",
	"kids",
	"festival",
	"festivals",
	"tourists",
	"locals",
	"late-night",
	"late night",
	"nightlife",
	"health",
	"vegan",
	"fitness",
	"downtown",
	"campus",
];

const EQUIPMENT_WORDS = [
	"fryer",
	"griddle",
	"grill",
	"hood",
	"fire suppression",
	"hand sink",
	"sink",
	"ice",
	"refrigeration",
	"fridge",
	"freezer",
	"pos",
	"menu board",
	"hvac",
	"generator",
	"shore power",
	"awning",
	"signage",
	"blade sign",
	"roof sign",
];

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAny(hay: string, needles: string[]): string[] {
	return needles.filter((n) => {
		try {
			return new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(hay);
		} catch {
			return hay.includes(n);
		}
	});
}

function uniq<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

function extractBrandName(text: string): string | null {
	const patterns = [
		/(?:called|named|brand is|truck is|concept is|we are|we're|i'm building|building|Called|Named|Brand is|Truck is|Concept is|We are|We're|I'm building|Building)\s+([A-Z][A-Za-z0-9&'’-]*(?:\s+[A-Z][A-Za-z0-9&'’-]*)*)/,
		/["“]([A-Z][A-Za-z0-9&'’.\s-]{1,30})["”]/,
	];
	for (const p of patterns) {
		const m = text.match(p);
		if (m?.[1]) {
			const name = m[1]
				.trim()
				.replace(/\s+/g, " ")
				.replace(/[.\s]+$/, "");
			if (
				name.length >= 2 &&
				name.length <= 40 &&
				!/^(an?|the|it|this|that)\s/i.test(name) &&
				!/^(it|this|that)$/i.test(name)
			) {
				return name;
			}
		}
	}
	return null;
}

/** Last-resort "X truck" mention — runs AFTER exact-casing sources. */
function extractTruckMention(lower: string): string | null {
	const truckM = lower.match(/\b([a-z][a-z0-9&'-]{1,20})\s+truck\b/);
	if (
		truckM?.[1] &&
		!["food", "taco", "burger", "ice", "coffee"].includes(truckM[1])
	) {
		return `${truckM[1].charAt(0).toUpperCase()}${truckM[1].slice(1)} Truck`;
	}
	return null;
}

const AFFIRM_RE =
	/^(yes|yeah|yep|yup|sure|ok|okay|k|sounds good|perfect|love it|go ahead|do it|let's go|lets go|confirmed)[.!]*\b/i;

const BRAND_BLACKLIST = new Set(
	[
		"show line",
		"the show line",
		"flow",
		"the flow",
		"drinks",
		"order",
		"pickup",
		"full electric",
		"quick check",
		"airstream",
		"airstream mid",
		"airstream small",
		"airstream large",
		"square trailer",
		"linear hatch",
		"assembly line",
		"concept set",
		"build panel",
	].map((s) => s.toLowerCase()),
);

/** If the buyer just says "yes" after we proposed **BIB Truck**, adopt it. */
export function extractAffirmedBrand(
	history: string[],
	text: string,
): string | null {
	if (!AFFIRM_RE.test(text.trim())) return null;
	const assistants = history.filter(Boolean).slice(-3).reverse();
	for (const msg of assistants) {
		// 1. "running with **BIB Truck**" — highest confidence.
		const runningBold = msg.match(
			/running with\s+\*\*([^*]{2,40})\*\*/i,
		);
		if (runningBold?.[1]) {
			const name = runningBold[1].trim();
			if (
				name.length >= 2 &&
				name.length <= 40 &&
				!BRAND_BLACKLIST.has(name.toLowerCase())
			)
				return name;
		}
		// 2. Any other **Title Case** bold span that looks like a brand.
		const bolds = [...msg.matchAll(/\*\*([^*]{2,40})\*\*/g)]
			.map((m) => m[1].trim())
			.filter(
				(n) =>
					/^[A-Z]/.test(n) &&
					n.length >= 2 &&
					n.length <= 40 &&
					!BRAND_BLACKLIST.has(n.toLowerCase()) &&
					!/^(the|a|an)\s/i.test(n),
			);
		// Prefer short brand-like candidates ("BIB Truck" over a sentence).
		const short = bolds.find((n) => n.split(/\s+/).length <= 4);
		if (short) return short;
		// 3. Plain "running with BIB Truck" without bold.
		const runningPlain = msg.match(
			/running with\s+([A-Z][A-Za-z0-9&'’\- ]{1,30})/,
		);
		if (runningPlain?.[1]) {
			const name = runningPlain[1].trim().replace(/[.?!,;:]+$/, "");
			if (
				name.length >= 2 &&
				name.length <= 40 &&
				!BRAND_BLACKLIST.has(name.toLowerCase())
			)
				return name;
		}
	}
	return null;
}

function extractVehicle(lower: string): string | null {
	const isAirstream = lower.includes("airstream");
	const isSquare =
		lower.includes("square") ||
		/\b[345]\s?m\b/.test(lower) ||
		/\b[345]\s?(meter|metre)/.test(lower);
	const sizeM = lower.match(/\b([345])\s?m\b/)?.[1];
	if (isAirstream && !isSquare) {
		if (/small|compact|mini/.test(lower)) return "airstream-s";
		if (/large|big|xl|long|max/.test(lower)) return "airstream-l";
		return "airstream-m";
	}
	if (isSquare && !isAirstream) {
		if (sizeM === "3") return "square-3m";
		if (sizeM === "5") return "square-5m";
		return "square-4m";
	}
	return null;
}

export interface BrainContext {
	brandName?: string;
	vehicleId?: string;
	businessType?: string;
}

export function emptyBrain(): ProjectBrain {
	return {
		brandName: null,
		colors: [],
		vibeWords: [],
		businessType: null,
		menuKeywords: [],
		vehicleId: null,
		vehicleSource: null,
		walkIn: null,
		customerNotes: [],
		equipmentHints: [],
		unknowns: [],
		confidence: { brand: 0, business: 0, space: 0, customer: 0, aesthetic: 0 },
		signals: 0,
		updatedAt: Date.now(),
	};
}

export function updateBrain(
	prev: ProjectBrain | null,
	text: string,
	ctx?: BrainContext,
	history: string[] = [],
): ProjectBrain {
	const brain: ProjectBrain = prev
		? {
				...prev,
				colors: [...prev.colors],
				vibeWords: [...prev.vibeWords],
				menuKeywords: [...prev.menuKeywords],
				customerNotes: [...prev.customerNotes],
				equipmentHints: [...prev.equipmentHints],
			}
		: emptyBrain();
	const lower = text.toLowerCase();

	// ── Brand ──
	if (!brain.brandName) {
		const saidName = extractBrandName(text);
		if (saidName) {
			brain.brandName = saidName;
		} else if (ctx?.brandName && lower.includes(ctx.brandName.toLowerCase())) {
			// UI field counts too — adopted with its exact casing.
			brain.brandName = ctx.brandName;
		} else if (history.length > 0) {
			// "yes" after we proposed **BIB Truck** means BIB Truck.
			brain.brandName = extractAffirmedBrand(history, text);
			if (!brain.brandName) brain.brandName = extractTruckMention(lower);
		} else {
			brain.brandName = extractTruckMention(lower);
		}
	}
	brain.colors = uniq([...brain.colors, ...hasAny(lower, COLOR_WORDS)]);
	brain.vibeWords = uniq([...brain.vibeWords, ...hasAny(lower, VIBE_WORDS)]);

	// ── Business ──
	type BizCat = Exclude<BusinessTypeId, "combined">;
	const hits: Array<{ cat: BizCat; found: string[] }> = (
		Object.keys(BUSINESS_KEYWORDS) as BizCat[]
	)
		.map((cat) => ({ cat, found: hasAny(lower, BUSINESS_KEYWORDS[cat]) }))
		.filter((h) => h.found.length > 0);
	if (hits.length >= 2) {
		brain.businessType = "combined";
	} else if (hits.length === 1) {
		const cat = hits[0].cat;
		// A lone drinks mention next to food usually means a combined offer — resolved on next signal.
		brain.businessType = brain.businessType === "combined" ? "combined" : cat;
	}
	brain.menuKeywords = uniq([
		...brain.menuKeywords,
		...hits.flatMap((h) => h.found),
	]).slice(0, 12);
	// UI picker confirms business once the description talks trade.
	if (
		!brain.businessType &&
		hits.length === 0 &&
		ctx?.businessType &&
		/food|menu|sell|serve|kitchen|cook|eat|drink|coffee|retail|bar|boutique/.test(
			lower,
		)
	) {
		const aliased =
			LEGACY_BUSINESS_ALIASES[ctx.businessType] ?? ctx.businessType;
		brain.businessType = aliased as ProjectBrain["businessType"];
	}

	// ── Space: vehicle ──
	const saidVehicle = extractVehicle(lower);
	if (saidVehicle) {
		brain.vehicleId = saidVehicle;
		brain.vehicleSource = "said";
	} else if (
		!brain.vehicleId &&
		ctx?.vehicleId &&
		getVehicle(ctx.vehicleId) &&
		VEHICLE_WORDS.some((w) => {
			try {
				return new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(lower);
			} catch {
				return lower.includes(w);
			}
		})
	) {
		// Picker selection counts once the dump confirms vehicle talk.
		brain.vehicleId = ctx.vehicleId;
		brain.vehicleSource = "picker";
	}
	// Fallback: once the menu is known, the UI picker's default body is a
	// valid factory choice — adopt it so visuals never stall waiting for the
	// buyer to repeat the vehicle name back to us.
	if (
		!brain.vehicleId &&
		ctx?.vehicleId &&
		getVehicle(ctx.vehicleId) &&
		(brain.businessType || brain.menuKeywords.length >= 2)
	) {
		brain.vehicleId = ctx.vehicleId;
		brain.vehicleSource = "picker";
	}
	// ── Space: serve mode ──
	if (brain.walkIn === null) {
		if (hasAny(lower, WALKIN_TRUE).length > 0) brain.walkIn = true;
		else if (hasAny(lower, WALKIN_FALSE).length > 0) brain.walkIn = false;
	}

	// ── Customer / equipment ──
	brain.customerNotes = uniq([
		...brain.customerNotes,
		...hasAny(lower, CUSTOMER_WORDS),
	]).slice(0, 8);
	brain.equipmentHints = uniq([
		...brain.equipmentHints,
		...hasAny(lower, EQUIPMENT_WORDS),
	]).slice(0, 12);

	// ── Confidence ──
	const c = brain.confidence;
	c.brand = Math.min(
		95,
		(brain.brandName ? 70 : 0) +
			(brain.colors.length > 0 ? 12 : 0) +
			(brain.vibeWords.length > 0 ? 10 : 0) +
			(text.trim().length > 200 ? 8 : 0),
	);
	if (c.brand === 0 && text.trim().length > 0) c.brand = 10;
	c.business = brain.businessType
		? brain.menuKeywords.length >= 2
			? 92
			: 80
		: brain.menuKeywords.length > 0
			? 35
			: 10;
	c.space = brain.vehicleId ? (brain.walkIn !== null ? 90 : 65) : 20;
	c.customer =
		brain.customerNotes.length > 0
			? Math.min(85, 55 + brain.customerNotes.length * 10)
			: 10;
	c.aesthetic = brain.colors.length > 0 || brain.vibeWords.length > 0 ? 62 : 12;

	// ── Unknowns (max 3, highest leverage first) ──
	const unknowns: string[] = [];
	if (!brain.businessType) unknowns.push("what you sell");
	if (!brain.vehicleId) unknowns.push("vehicle + size");
	if (brain.walkIn === null) unknowns.push("walk-in vs hatch");
	if (!brain.brandName) unknowns.push("brand name");
	if (brain.colors.length === 0) unknowns.push("brand colors");
	brain.unknowns = unknowns.slice(0, 3);

	brain.signals =
		(brain.brandName ? 1 : 0) +
		(brain.colors.length > 0 ? 1 : 0) +
		(brain.vibeWords.length > 0 ? 1 : 0) +
		(brain.businessType ? 2 : 0) +
		Math.min(2, brain.menuKeywords.length) +
		(brain.vehicleId ? 2 : 0) +
		(brain.walkIn !== null ? 1 : 0) +
		Math.min(2, brain.customerNotes.length);
	brain.updatedAt = Date.now();
	return brain;
}

/** Enough signal to auto-generate the first visual concepts.
 * Vehicle is no longer a hard gate: once the menu + signals are strong the
 * UI picker's default body is a valid factory choice and visuals fire anyway.
 */
export function brainReady(brain: ProjectBrain | null): boolean {
	if (!brain) return false;
	if (!brain.businessType) return false;
	if (!(brain.brandName || brain.signals >= 4)) return false;
	if (brain.vehicleId) return true;
	return brain.signals >= 5;
}

/** Compact digest injected into the agent's context each turn. */
export function brainDigest(brain: ProjectBrain | null): string {
	if (!brain) return "Project brain: empty — early discovery.";
	const vehicle = brain.vehicleId
		? (getVehicle(brain.vehicleId)?.label ?? brain.vehicleId)
		: "?";
	const parts = [
		`brand:${brain.brandName ?? "?"}`,
		`biz:${brain.businessType ?? "?"}${brain.menuKeywords.length ? `(${brain.menuKeywords.slice(0, 4).join(",")})` : ""}`,
		`vehicle:${vehicle}`,
		`serve:${brain.walkIn === null ? "?" : brain.walkIn ? "walk-in" : "hatch"}`,
		`colors:${brain.colors.slice(0, 3).join(",") || "?"}`,
		`vibe:${brain.vibeWords.slice(0, 2).join(",") || "?"}`,
		`customer:${brain.customerNotes.slice(0, 2).join(",") || "?"}`,
		`conf:b${brain.confidence.brand}/u${brain.confidence.business}/s${brain.confidence.space}/c${brain.confidence.customer}/a${brain.confidence.aesthetic}`,
		`unknowns:${brain.unknowns.join(",") || "none"}`,
	];
	return `Project brain — ${parts.join(" | ")}. Decide and move; max ONE question per turn and only if blocked.`;
}

export function describeVehicle(id: string | null): string {
	if (!id) return "factory body (Airstream or Square Trailer)";
	return getVehicle(id)?.label ?? id;
}

export { VEHICLES };
