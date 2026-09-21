/**
 * Sales-asset layer for /chat — pure helpers, safe to import client-side.
 *
 * Principle: the first approved render establishes the visual truth; every
 * asset after it inherits that truth. The 3D model is scaffolding — the 2D
 * renders and video are the deliverables a salesperson drops into a deck.
 */
import { CONCEPT_VIEWS } from "./constants";

export function isRealPhoto(url: string | null | undefined): url is string {
	return (
		typeof url === "string" &&
		url.startsWith("data:image/") &&
		!url.startsWith("data:image/svg")
	);
}

/**
 * Master = first real exterior_hero; falls back to the first real photo so a
 * round that somehow lacks a hero still yields a stable reference. SVG
 * placeholders never count.
 */
export function pickMasterReference(
	images: Array<{ label: string; url: string }>,
): string | null {
	const hero = images.find(
		(i) => i.label === "exterior_hero" && isRealPhoto(i.url),
	);
	if (hero) return hero.url;
	const first = images.find((i) => isRealPhoto(i.url));
	return first?.url ?? null;
}

/** Starred (buyer-approved) images, oldest first, excluding the master. */
export function pickApprovedReferences(
	images: Array<{ label: string; url: string; favorite?: boolean }>,
	masterUrl: string | null,
	max = 2,
): string[] {
	const out: string[] = [];
	for (const img of images) {
		if (!img.favorite || img.url === masterUrl || !isRealPhoto(img.url))
			continue;
		if (!out.includes(img.url)) out.push(img.url);
		if (out.length >= max) break;
	}
	return out;
}

/** Which sales-deck slide each concept view feeds. Covers every CONCEPT_VIEW. */
export const SALES_SLIDE_MAP: Record<string, string> = {
	exterior_hero: "Hero slide",
	exterior_rear: "Product overview",
	side_elevation: "Product overview",
	interior_layout: "Feature slide",
	front_elevation: "Feature slide",
	assembly_theater: "Use-case slide",
	night_exterior: "Vision slide",
	roof_plan: "Technical slide",
	brand_mark: "Brand slide",
};

export function salesSlideFor(label: string): string {
	return SALES_SLIDE_MAP[label] ?? "Product overview";
}

export function coversAllConceptViews(): string[] {
	return CONCEPT_VIEWS.filter((v) => !(v in SALES_SLIDE_MAP));
}

export type SalesVideoKind =
	| "hero-orbit"
	| "walkthrough"
	| "night-cinematic"
	| "tour";

export interface SalesVideoPreset {
	kind: SalesVideoKind;
	label: string;
	blurb: string;
}

export const SALES_VIDEO_PRESETS: SalesVideoPreset[] = [
	{
		kind: "hero-orbit",
		label: "Hero orbit · 10s",
		blurb: "Slow 180° orbit at golden hour. The deck's opening slide.",
	},
	{
		kind: "walkthrough",
		label: "Serve-up walkthrough · 10s",
		blurb: "Hatch to counter, food assembled and handed across.",
	},
	{
		kind: "night-cinematic",
		label: "Night cinematic · 10s",
		blurb: "Wet street, glowing hatch, signage lit. The vision slide.",
	},
	{
		kind: "tour",
		label: "Full tour · 30s",
		blurb: "Three chained 10s parts: exterior, serve line, close.",
	},
];

/**
 * Everything the video model needs to film the right product.
 *
 * The stills get a nine-field brief (body, dimensions, menu, equipment,
 * service model, palette) and it shows. Video used to get four loose strings
 * and a sentence, so it invented a generic trailer and shot it generically.
 * The optional fields are optional only so an old caller still compiles —
 * every one of them that arrives makes the clip more specific to this build.
 */
export interface SalesVideoContext {
	brand: string;
	vehicleLabel: string;
	colors: string;
	vibe: string;
	/** False when the buyer has not named the business — nothing gets lettered. */
	hasBrand?: boolean;
	vehicleBody?: "airstream" | "square" | null;
	lengthM?: number | null;
	widthM?: number | null;
	/** Human business label, e.g. "Grill, Burgers & Barbecue". */
	businessLabel?: string | null;
	/** Readable menu items, e.g. "smash burgers, loaded fries". */
	menu?: string | null;
	/** Readable equipment line, e.g. "flat-top griddle, make-rail, ice well". */
	equipment?: string | null;
	/** hatch-serve | walk-in | hybrid */
	serveMode?: "hatch-serve" | "walk-in" | "hybrid" | null;
}

function bodyPhrase(body: SalesVideoContext["vehicleBody"]): string {
	if (body === "airstream")
		return "polished riveted aluminium rounded Airstream-style trailer";
	if (body === "square")
		return "square-profile stainless-steel food trailer with flat vertical sides";
	return "food trailer";
}

function servePhrase(mode: SalesVideoContext["serveMode"]): string {
	if (mode === "walk-in")
		return "customers step inside to order at an interior counter";
	if (mode === "hybrid")
		return "a walk-in aisle alongside a street-side serve hatch";
	return "a wide street-side serve hatch, no public entry";
}

/** One sentence naming the exact product, reused by every shot list. */
function subject(ctx: SalesVideoContext): string {
	const named =
		ctx.hasBrand !== false && ctx.brand && ctx.brand !== "the business";
	const who = named ? `"${ctx.brand}"` : "an as-yet-unnamed business";
	const size =
		ctx.lengthM && ctx.widthM ? `${ctx.lengthM}m × ${ctx.widthM}m ` : "";
	const biz = ctx.businessLabel ? `${ctx.businessLabel.toLowerCase()} ` : "";
	return `a ${size}${bodyPhrase(ctx.vehicleBody)} (${ctx.vehicleLabel}) operating as a ${biz}food truck for ${who}`;
}

/** The facts the camera must respect but does not itself frame. */
function productBrief(ctx: SalesVideoContext): string {
	const bits: string[] = [
		`SUBJECT: ${subject(ctx)}.`,
		`Livery: ${ctx.colors}. Overall feel: ${ctx.vibe}.`,
		`Service model: ${servePhrase(ctx.serveMode)}.`,
	];
	if (ctx.menu) bits.push(`Menu on the board: ${ctx.menu}.`);
	if (ctx.equipment)
		bits.push(`Equipment visible on the line: ${ctx.equipment}.`);
	return bits.join(" ");
}

/**
 * The hard constraint. The references are approved renders the buyer already
 * signed off, so the model's job is cinematography, not design — one wrong
 * hatch and the clip stops matching the quote the factory sends.
 */
const LOCK =
	"REFERENCE LOCK — the attached images are approved renders of this exact trailer, and reference image 1 is the master. Reproduce it precisely: silhouette, length and proportions, panel lines, the position of every door, hatch, window and vent, wheel and axle position, roof unit and blade sign, wrap artwork, brand colours, logo placement and signage typography. You are filming a product that already exists. Change nothing but the camera, the light within the stated time of day, and the people and food moving inside the frame.";

/** What generic video models add unprompted, and what ruins a sales asset. */
const NEGATIVE =
	"DO NOT: redesign, restyle or re-proportion the trailer; add, move or remove a door, hatch, window, vent or wheel; change the wrap artwork or brand colours; invent text, lettering, slogans, prices, logos or gibberish anywhere in frame; add a second vehicle; add on-screen captions, subtitles, lower-thirds, watermarks or UI; morph, warp or teleport the trailer between frames; cut to a different location; use fisheye, heavy vignette, lens flare spam, speed ramping or shaky handheld.";

/** Grade and glass, held constant so a chained tour cuts together. */
const CRAFT =
	"CRAFT: shot on a cinema camera, 35mm equivalent, shallow depth of field on close shots and deep focus on wides, smooth motorised camera movement (gimbal or dolly, never handheld), 24fps cinematic motion blur, natural colour grade with clean whites and no crushed blacks, photoreal product-commercial quality. No dialogue, no on-screen text.";

/**
 * Reference-locked shot lists. Each is written the way a director writes a
 * board: subject, then beat-by-beat camera and action against the clock, then
 * light, then craft, then the lock and the negatives. The one-line versions
 * these replaced gave the model nothing to hold onto for ten whole seconds,
 * which is exactly when it starts improvising a different truck.
 */
export function buildSalesVideoPrompt(
	kind: SalesVideoKind,
	ctx: SalesVideoContext,
): string {
	const brief = productBrief(ctx);

	if (kind === "walkthrough") {
		return [
			"10-second product film: the serve-up.",
			brief,
			"SHOT LIST — 0.0–3.0s: start outside at the open service hatch, eye level, the counter filling the lower third; the camera pushes in slowly and steadily toward the hatch opening. 3.0–6.5s: continue the push through the hatch line and begin a smooth lateral dolly along the counter past the hot station, where a chef in black works the line — steam lifting off the griddle, a hand turning food, garnish pans bright under the sneeze-guard. 6.5–10.0s: the dolly settles as a finished, well-presented item is placed on the counter and handed across to a waiting customer; end on that hand-off, the branded counter front sharp behind it.",
			"LIGHT: late-afternoon daylight outside, warm 4000K task light inside the canopy spilling onto the food. Appetising, high-contrast on the product, no blown highlights.",
			"ACTION: two staff working, unhurried and competent; two or three customers waiting, out of focus. Everyone stays clear of the trailer's signage.",
			CRAFT,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	if (kind === "night-cinematic") {
		return [
			"10-second cinematic film: the trailer at night.",
			brief,
			"SHOT LIST — 0.0–3.5s: open wide on a three-quarter front angle across wet pavement, the trailer's lit reflection stretching toward camera, street bokeh behind. 3.5–7.5s: a slow, continuous push-in toward the glowing service hatch while the camera drifts a few degrees around the front corner, so the wrap and the illuminated roof blade sign both read. 7.5–10.0s: settle on a medium of the hatch, warm interior light spilling out, a customer silhouetted at the counter collecting an order.",
			"LIGHT: blue-hour-to-night ambient, the hatch and blade sign as the only warm sources, accent-coloured hatch frame catching interior light, practical streetlights far behind as bokeh. Moody and premium, never murky — the wrap colours must still be identifiable.",
			"ACTION: two or three customers in silhouette, minimal movement; a single car light passing far behind.",
			CRAFT,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	if (kind === "tour") {
		// Part 1 of 3. Parts 2 and 3 arrive via tourContinuationPrompt, so this
		// has to end somewhere the next part can pick up from.
		return [
			"10-second film — PART 1 OF 3 of a continuous guided tour, filmed as one unbroken take.",
			brief,
			"SHOT LIST — 0.0–3.5s: open wide on the branded exterior at a three-quarter front angle, the full length of the trailer in frame, stabiliser jacks down and the roof blade sign lit. 3.5–7.0s: the camera tracks slowly right along the livery side at a steady walking pace, letting the wrap artwork and signage pass through frame. 7.0–10.0s: arrive at the open service hatch and begin easing in toward it; END THE SHOT framed square on the open hatch with the serve line just becoming visible inside — the next part continues from exactly this framing.",
			"LIGHT: golden hour, low warm sun raking across the livery side, long soft shadows, clear sky. Hold this exact time of day; the following parts must match it.",
			"ACTION: a small queue forming at the hatch, staff visible inside. Nobody crosses in front of the signage.",
			CRAFT,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	return [
		"10-second film: the hero orbit. This is the opening slide of a sales deck.",
		brief,
		"SHOT LIST — one continuous 180° orbit at a constant rate, camera at chest height on a level path, the trailer held dead centre and the same size in frame throughout. 0.0–3.5s: begin at the three-quarter front, nose toward camera. 3.5–7.0s: pass the full livery side, wrap artwork and roof blade sign square to camera at the midpoint. 7.0–10.0s: continue to the three-quarter rear and decelerate to a stop with the trailer still fully in frame.",
		"LIGHT: golden hour, low warm sun, long soft shadows, clean ground plane, uncluttered background that never competes with the trailer.",
		"ACTION: none — the product is the subject. No people crossing frame.",
		CRAFT,
		LOCK,
		NEGATIVE,
	].join(" ");
}

/** Omni caps one generation at 10s — the 30s tour is 3 chained parts. */
export const TOUR_PARTS = 3;

/**
 * Continuation beats for tour parts 2 and 3.
 *
 * Each extends the previous interaction, so the only thing that makes them
 * read as one 30-second take is being told precisely where the last part
 * stopped and what comes next. Both parts used to send nearly the same
 * sentence, which is why the back half of a tour looped the serve line twice
 * and never arrived anywhere.
 */
export function tourContinuationPrompt(
	part: number,
	ctx: SalesVideoContext,
): string {
	const brief = productBrief(ctx);
	const continuity =
		"CONTINUITY: this continues the previous clip as one unbroken take. Start on the exact frame the previous part ended on — same trailer, same position in frame, same golden-hour light, same camera height, same grade — and keep moving in the same direction at the same speed. No cut, no jump, no re-establish, no fade.";

	if (part >= TOUR_PARTS) {
		return [
			"10-second film — PART 3 OF 3, the closing beat of the guided tour.",
			continuity,
			brief,
			"SHOT LIST — 0.0–3.0s: the last item on the line is finished and handed across the counter to a waiting customer; hold on the hand-off. 3.0–6.5s: the camera pulls back out through the service hatch in one smooth continuous move, the counter and canopy passing out of frame. 6.5–10.0s: keep retreating and arc gently left to settle on the wide three-quarter hero angle the tour opened on — full trailer in frame, blade sign lit, a small queue at the hatch — and come to rest there. This is the final frame of the deck's video.",
			"LIGHT: the same golden hour as parts 1 and 2, a few minutes later — very slightly warmer and lower, never a different time of day.",
			CRAFT,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	return [
		"10-second film — PART 2 OF 3, the interior leg of the guided tour.",
		continuity,
		brief,
		"SHOT LIST — 0.0–2.5s: continue in through the open hatch and settle onto the serve line, the counter running left to right through frame. 2.5–5.0s: lateral dolly along the hot station — burners or griddle working, steam lifting, a chef in black plating up under the stainless extraction canopy. 5.0–7.5s: continue past the refrigerated make-rail, garnish pans and prep boards bright beneath the sneeze-guard, a second pair of hands assembling an order. 7.5–10.0s: reach the drinks end-cap — ice well, chilled display, a drink being poured — and slow to a near stop there. END on the finished order sitting ready on the counter; part 3 picks up from this frame.",
		"LIGHT: warm 4000K task light under the canopy, cool golden-hour daylight through the open hatch behind the line. Interior clearly readable, no blown highlights on the stainless.",
		"ACTION: two staff working the line, calm and competent. Camera never doubles back over ground part 1 already covered.",
		CRAFT,
		LOCK,
		NEGATIVE,
	].join(" ");
}
