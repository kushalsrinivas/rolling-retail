/**
 * Sales-asset layer for /chat — pure helpers, safe to import client-side.
 *
 * Principle: the first approved render establishes the visual truth; every
 * asset after it inherits that truth. The 3D model is scaffolding — the 2D
 * renders and video are the deliverables a salesperson drops into a deck.
 */
import { CONCEPT_VIEWS } from "./constants";
import { type LineProfile, lineProfileFor } from "./line-profile";

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
	brand_mark: "Brand slide",
	menu_board: "Menu slide",
};

export function salesSlideFor(label: string): string {
	return SALES_SLIDE_MAP[label] ?? "Product overview";
}

export function coversAllConceptViews(): string[] {
	return CONCEPT_VIEWS.filter((v) => !(v in SALES_SLIDE_MAP));
}

export type SalesVideoKind = "hero-orbit" | "walkthrough" | "night-cinematic";

export interface SalesVideoPreset {
	kind: SalesVideoKind;
	label: string;
	blurb: string;
}

export const SALES_VIDEO_PRESETS: SalesVideoPreset[] = [
	{
		kind: "walkthrough",
		label: "Inside walkthrough · 10s",
		blurb:
			"The flagship clip: the camera stands in the galley and dollies the full equipment line, shot wide so the interior reads big.",
	},
	{
		kind: "hero-orbit",
		label: "Full 360 orbit · 10s",
		blurb:
			"One continuous circle around the trailer — every wall, the wrap and the sign, back to the opening angle.",
	},
	{
		kind: "night-cinematic",
		label: "Night cinematic · 10s",
		blurb: "Wet street, glowing hatch, signage lit. The vision slide.",
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
	/** Business type id, e.g. "cold-drinks". Picks the serve line. */
	businessType?: string | null;
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

/** Camera-height/action block shared by the outside clips. */
const ACTION =
	"ACTION: no people anywhere in frame — the product and the camera carry the motion.";

/**
 * The hard constraint. The references are approved renders the buyer already
 * signed off, so the model's job is cinematography, not design — one wrong
 * hatch and the clip stops matching the quote the factory sends.
 *
 * Naming the view each reference came from matters: a walkthrough handed the
 * exterior hero and told only "match the references" still has to invent an
 * interior, and invents a different one every run. Told that image 1 IS the
 * galley it is filming, it moves a camera through it instead.
 */
function lockFor(
	referenceViews: readonly string[] = [],
	line?: LineProfile,
	/** "inside" = the walkthrough, filmed within the galley. */
	camera: "outside" | "inside" = "outside",
): string {
	const named = referenceViews
		.map((v, i) => `image ${i + 1} is the approved ${v.replace(/_/g, " ")}`)
		.join(", ");
	const cameraRule =
		camera === "inside"
			? "THE CAMERA IS INSIDE from frame one: it is standing in this trailer's aisle and never passes through a wall, floor, ceiling or the service window; it never leaves the trailer."
			: "THE CAMERA NEVER PASSES THROUGH A DOOR, HATCH OR WINDOW: it stays outside the trailer and looks in through the open hatch, so the opening keeps its frame in every shot.";
	return [
		"REFERENCE LOCK — the attached images are approved renders of this exact trailer, already signed off by the buyer.",
		named
			? `Reference ${named}. The space, objects and surfaces you can see in them are the set for this shot.`
			: "Reference image 1 is the master.",
		"Reproduce them precisely: silhouette, length and proportions, panel lines, the position of every door, hatch, window and vent, wheel and axle position, roof unit and blade sign, wrap artwork, brand colours, logo placement and signage typography, and — inside — the layout, counters, equipment, materials, flooring, wall and ceiling finishes.",
		"GEOMETRY IS FIXED for the whole clip: the number and position of doors, windows, hatches, panels and vents never changes. A door stays a door and a hatch stays the only hatch in every frame — nothing opens, folds, slides or converts into a different opening, and no new serving window ever appears.",
		cameraRule,
		`You are operating a camera around a vehicle that already exists. Do not recreate, redesign or re-dress the scene. The ONLY things this clip introduces are the camera move described below, the stated light, and ${line?.motion ?? "no other motion"}. The scene is unoccupied — there are no people in it, and none may appear.`,
		line ? `THE LINE: ${line.forbid}` : "",
	]
		.filter(Boolean)
		.join(" ");
}

/** What generic video models add unprompted, and what ruins a sales asset. */
const NEGATIVE =
	"DO NOT: redesign, restyle or re-proportion the trailer; add, move, remove, merge or repurpose a door, hatch, window, vent or wheel, or let any opening change shape or function mid-clip; change the wrap artwork or brand colours; invent text, lettering, slogans, prices, logos or gibberish anywhere in frame; add people of any kind — customers, staff, chefs, passers-by, silhouettes, hands or reflections; add a second vehicle; add on-screen captions, subtitles, lower-thirds, watermarks or UI; morph, warp or teleport the trailer between frames; cut to a different location; use fisheye, heavy vignette, lens flare spam, speed ramping or shaky handheld.";

/** Grade and glass, held constant across the exterior clips. */
const CRAFT =
	"CRAFT: shot on a cinema camera, 35mm equivalent, shallow depth of field on close shots and deep focus on wides, smooth motorised camera movement (gimbal or dolly, never handheld), 24fps cinematic motion blur, natural colour grade with clean whites and no crushed blacks, photoreal product-commercial quality. No dialogue, no on-screen text.";

/**
 * The inside walkthrough's glass: one lens decision stated once, because
 * "35mm" and "24mm" in the same prompt taught the model to average them.
 */
const CRAFT_INSIDE =
	"CRAFT: shot on a cinema camera on a dolly riding the aisle, 24fps cinematic motion blur, natural colour grade with clean whites and no crushed blacks, photoreal product-commercial quality. No dialogue, no on-screen text.";

/**
 * The serve line the camera sees, per business.
 *
 * The shot lists used to name a griddle, burners and plated hot food
 * regardless of what the truck sells, then matched "bubble tea" in the
 * cold-drinks label so every juice bar was filmed as a boba bar. The line
 * profile now decides from the business type and the menu together.
 */
function lineFor(ctx: SalesVideoContext): LineProfile {
	return lineProfileFor(
		ctx.businessType ?? inferType(ctx.businessLabel),
		ctx.menu ?? "",
	);
}

/** Older callers only send the label; map it back to a type id. */
function inferType(label: string | null | undefined): string {
	const l = (label ?? "").toLowerCase();
	if (/bubble tea|cold drinks|juice/.test(l)) return "cold-drinks";
	if (/coffee|espresso/.test(l)) return "coffee";
	if (/ice cream|gelato/.test(l)) return "ice-cream";
	if (/bakery|patisserie|dessert/.test(l)) return "bakery";
	if (/taco|mexican/.test(l)) return "mexican";
	if (/pizza/.test(l)) return "pizza";
	if (/grill|burger|barbecue/.test(l)) return "grill";
	if (/fried|fish/.test(l)) return "fried";
	if (/asian|world/.test(l)) return "asian";
	if (/breakfast|brunch/.test(l)) return "breakfast";
	if (/bar|pour/.test(l)) return "bar";
	if (/retail|boutique/.test(l)) return "retail";
	return "combined";
}

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
	/** Concept views attached as references, in the order the model sees them. */
	referenceViews: readonly string[] = [],
): string {
	const brief = productBrief(ctx);
	const line = lineFor(ctx);

	// The walkthrough is filmed from inside the galley, so its lock changes.
	if (kind === "walkthrough") {
		const LOCK = lockFor(referenceViews, line, "inside");
		return [
			"10-second product film: an INSIDE WALKTHROUGH of this exact trailer — the flagship clip of the sales deck, filmed from within the interior.",
			brief,
			"THE INTERIOR IS COMPLETE: a full professional commercial line inside the described box, dense with real equipment from wall to wall, exactly as the interior reference shows it.",
			`SHOT LIST — 0.0–3.0s: the camera stands INSIDE at the rear end of the aisle, eye level, looking forward: the full equipment run ahead — ${line?.videoLine ?? "the service line"} — brightly lit, the open service hatch glowing at the far end of the aisle. 3.0–7.0s: one continuous slow forward dolly down the centre aisle at chest height — the line passes the lens in the exact order the brief and the interior reference name it, nothing added, nothing skipped, nothing swapped. 7.0–10.0s: a smooth reverse pull-back with a gentle tilt-up so the whole galley — counters, splashback, task lighting, the length of the aisle — folds into one wide frame, and rest.`,
			"LIGHT: warm 4000K task lighting on the line, cool daylight bleeding in through the open service hatch, appetising contrast on the stainless, no blown highlights.",
			ACTION,
			CRAFT_INSIDE,
			`WIDE-ANGLE BRIEF: 24mm ultra-wide equivalent at chest height, deep focus throughout, so the aisle reads long and generous — bigger than the trailer's footprint — WITHOUT inventing any equipment, corridor or extra room the brief and references do not name. The drama comes from the lens and the dolly, never from changing the space.`,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	const LOCK = lockFor(referenceViews, line);

	if (kind === "night-cinematic") {
		return [
			"10-second cinematic film: the trailer at night.",
			brief,
			`SHOT LIST — 0.0–3.5s: open wide on a three-quarter front angle of the curbside across wet pavement, the trailer's lit reflection stretching toward camera, street bokeh behind. 3.5–7.5s: a slow, continuous push-in toward the glowing service hatch while the camera drifts a few degrees around the front corner, so the wrap and the illuminated roof blade sign both read. 7.5–10.0s: settle on a medium of the hatch, warm interior light spilling out across the counter with ${line.signature} waiting on it.`,
			"LIGHT: blue-hour-to-night ambient, the hatch and blade sign as the only warm sources, accent-coloured hatch frame catching interior light, practical streetlights far behind as bokeh. Moody and premium, never murky — the wrap colours must still be identifiable.",
			"ACTION: no people in frame; a single car light passing far behind is the only movement besides the camera.",
			CRAFT,
			LOCK,
			NEGATIVE,
		].join(" ");
	}

	return [
		"10-second film: the full 360° orbit. This is the deck's exterior slide.",
		brief,
		"SHOT LIST — one continuous full 360° orbit at a constant rate, camera at chest height on a level circular path, the trailer held dead centre and the same size in frame throughout. 0.0–3.5s: begin at the three-quarter front angle of the curbside, nose toward camera. 3.5–7.0s: pass the full livery side, wrap artwork and roof blade sign square to camera at the midpoint. 7.0–10.0s: continue past the rear end cap and down the roadside, back to the opening angle, decelerating to rest exactly where the clip began — the full circle complete.",
		"LIGHT: golden hour, low warm sun, long soft shadows, clean ground plane, uncluttered background that never competes with the trailer.",
		"ACTION: none — the product is the subject. No people anywhere in frame.",
		CRAFT,
		LOCK,
		NEGATIVE,
	].join(" ");
}
