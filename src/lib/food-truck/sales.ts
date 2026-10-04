/**
 * Sales-asset layer for /chat — pure helpers, safe to import client-side.
 *
 * Principle: the first approved render establishes the visual truth; every
 * asset after it inherits that truth. The 3D model is scaffolding — the 2D
 * renders and video are the deliverables a salesperson drops into a deck.
 */
import { CONCEPT_VIEWS } from "./constants";
import { type LineProfile, lineProfileFor } from "./line-profile";
import { type DesignBrief, finishPhraseFor, sceneFor } from "./brief";
import { defaultOpenings, type Opening, openingsSteLines } from "./openings";
import {
	row,
	type SteSection,
	steDocument,
	termsSection,
	warning,
} from "./ste";

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
	/**
	 * The record's openings. When present the brief positions every opening
	 * by exact distance and closes the world with a count; when absent the
	 * brief falls back to the body defaults so a clip never films blind.
	 */
	openings?: Opening[] | null;
	/** Operating brief — the orbit's setting and the wrap's film finish. */
	brief?: DesignBrief | null;
}

function bodyName(body: SalesVideoContext["vehicleBody"]): string {
	if (body === "airstream")
		return "rounded riveted polished-aluminium Airstream-style trailer";
	if (body === "square")
		return "square-profile food trailer with flat vertical side walls";
	return "food trailer";
}

function serviceName(mode: SalesVideoContext["serveMode"]): string {
	if (mode === "walk-in")
		return "walk-in; customers step inside to order at an interior counter";
	if (mode === "hybrid") return "hybrid; a walk-in aisle and a service hatch";
	return "hatch-serve; a wide curbside service hatch; no public entry";
}

/**
 * Resolve the openings a clip is accountable to: the record's when the
 * caller has them, else the body defaults — never nothing.
 */
function openingsFor(ctx: SalesVideoContext): Opening[] | null {
	return (
		ctx.openings ??
		(ctx.vehicleBody && ctx.lengthM
			? defaultOpenings(ctx.vehicleBody, ctx.lengthM)
			: null)
	);
}

/**
 * The facts the camera must respect but does not itself frame. Same data
 * rows on every clip, so the three films describe one trailer.
 */
function subjectSection(ctx: SalesVideoContext, line: LineProfile): SteSection {
	const named =
		ctx.hasBrand !== false && ctx.brand && ctx.brand !== "the business";
	return {
		title: "Subject data",
		lines: [
			row(
				"Brand",
				named
					? `"${ctx.brand}"`
					: "none; an as-yet-unnamed business; letter nothing",
			),
			row("Business", ctx.businessLabel),
			row("Trailer model", ctx.vehicleLabel),
			row("Body", bodyName(ctx.vehicleBody)),
			ctx.lengthM && ctx.widthM
				? row("Box size", `${ctx.lengthM} m long × ${ctx.widthM} m wide`)
				: null,
			row("Service model", serviceName(ctx.serveMode)),
			row("Wrap colors", ctx.colors),
			row("Film finish", ctx.brief ? finishPhraseFor(ctx.brief) : null),
			row("Style", ctx.vibe),
			row("Menu", ctx.menu),
			row("Equipment line", ctx.equipment),
			row("Forbidden in this trailer", line.forbid),
		],
	};
}

function geometrySection(ctx: SalesVideoContext): SteSection {
	const openings = openingsFor(ctx);
	return {
		title: openings ? "Exact openings" : "Fixed geometry",
		lines: [
			"GEOMETRY IS FIXED for the full clip.",
			...(openings ? openingsSteLines(openings, ctx.vehicleBody ?? null) : []),
			"A door stays a door. The service hatch stays the only hatch.",
			"No opening opens, folds, slides or changes into a different opening.",
		],
	};
}

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
function referenceSection(
	referenceViews: readonly string[],
	line: LineProfile,
	camera: "outside" | "inside",
): SteSection {
	return {
		title: "Reference lock",
		lines: [
			"The attached images are approved renders of this trailer. The buyer signed them off.",
			...(referenceViews.length
				? referenceViews.map(
						(v, i) =>
							`Reference image ${i + 1}: the approved ${v.replace(/_/g, " ")}`,
					)
				: ["Reference image 1: the master render"]),
			"The space, objects and surfaces in the references are the set for this clip.",
			"Copy the silhouette, proportions, panel lines, wheels, roof unit and sign from the references.",
			"Copy the wrap artwork, brand colors, logo position and sign lettering from the references.",
			camera === "inside"
				? "Copy the interior layout, counters, equipment, materials, floor, walls and ceiling from the references."
				: null,
			camera === "inside"
				? "THE CAMERA IS INSIDE from frame one. It stands in the aisle of this trailer and never leaves it."
				: "THE CAMERA stays outside the trailer and looks in through the open hatch.",
			camera === "inside"
				? "The camera never passes through a wall, floor, ceiling or the service hatch."
				: "The camera never passes through a door, hatch or window.",
			"You operate a camera around a trailer that exists now. Do not redesign or re-dress the scene.",
			row(
				"Permitted motion",
				`the camera move, the stated light, and ${line.motion}`,
			),
		],
	};
}

/** What generic video models add unprompted, and what ruins a sales asset. */
const WARNINGS: readonly string[] = [
	warning("Do not redesign, restyle or re-proportion the trailer."),
	warning(
		"Do not add, move, remove or merge a door, hatch, window, vent or wheel.",
	),
	warning("Do not let an opening change shape or function during the clip."),
	warning("Do not change the wrap artwork or the brand colors."),
	warning(
		"Do not invent text, lettering, slogans, prices, logos or random characters in frame.",
	),
	warning(
		"Do not show people.",
		"This includes customers, staff, chefs, passers-by, silhouettes, hands and reflections.",
	),
	warning("Do not add a second vehicle."),
	warning("Do not add captions, subtitles, lower-thirds, watermarks or UI."),
	warning("Do not morph, warp or jump the trailer between frames."),
	warning("Do not cut to a different location."),
	warning(
		"Do not use fisheye, a heavy vignette, lens flares, speed ramps or a shaky handheld camera.",
	),
	warning(
		"Do not show a blueprint, technical drawing, sectional, cutaway, isometric or wireframe view.",
		"Each clip is a photoreal camera shot.",
	),
];

/** Grade and glass, held constant across the exterior clips. */
const CRAFT_OUTSIDE: readonly string[] = [
	row(
		"Camera",
		"cinema camera, 35 mm equivalent lens, 24 fps, 1/48 s shutter",
	)!,
	row("Support", "motorized gimbal or dolly; never handheld")!,
	row(
		"Focus",
		"shallow depth of field on close shots; deep focus on wide shots",
	)!,
	row("Grade", "natural; clean whites; no crushed blacks")!,
	row("Audio and text", "no dialogue; no on-screen text")!,
];

/**
 * The inside walkthrough's glass: one lens decision stated once, because
 * "35mm" and "24mm" in the same prompt taught the model to average them.
 */
const CRAFT_INSIDE: readonly string[] = [
	row(
		"Camera",
		"cinema camera, 24mm ultra-wide equivalent lens, 24 fps, 1/48 s shutter",
	)!,
	row("Support", "dolly on the aisle at chest height")!,
	row("Focus", "deep focus for the full clip")!,
	row("Grade", "natural; clean whites; no crushed blacks")!,
	row("Audio and text", "no dialogue; no on-screen text")!,
];

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
 * Reference-locked shot lists, written as ASD-STE100 video specifications:
 * the task, the subject data, then one timed step per camera beat, the
 * light, the craft, the lock and the warnings. Each step is one command
 * against the clock, which is what the model holds onto for ten seconds
 * instead of improvising a different trailer halfway through.
 */
export function buildSalesVideoPrompt(
	kind: SalesVideoKind,
	ctx: SalesVideoContext,
	/** Concept views attached as references, in the order the model sees them. */
	referenceViews: readonly string[] = [],
): string {
	const line = lineFor(ctx);
	const terms = termsSection([
		"trailer",
		"curbside",
		"roadside",
		"hatch",
		"wrap",
		"line",
	]);
	const subject = subjectSection(ctx, line);
	const geometry = geometrySection(ctx);
	const warnings: SteSection = { title: "Warnings", lines: [...WARNINGS] };
	const doc = (title: string, sections: (SteSection | null)[]) =>
		steDocument({
			kind: "VIDEO SPECIFICATION",
			title,
			sections: sections.filter((s): s is SteSection => s !== null),
		});

	// The walkthrough is filmed from inside the galley, so its lock changes.
	if (kind === "walkthrough") {
		return doc("INSIDE WALKTHROUGH — 10 SECONDS", [
			{
				title: "Task",
				lines: [
					"Make one 10-second photoreal product film inside the trailer.",
					"This is the flagship clip of the sales deck.",
					"The interior is complete: a full commercial line, exactly as the interior reference shows it.",
				],
			},
			terms,
			subject,
			{
				title: "Line on camera",
				lines: [
					row("Line, in camera order", line.videoLine),
					"Show the line in this order. Do not add, skip or swap a unit.",
				],
			},
			{
				title: "Shot list",
				lines: [
					"Step 1, 0.0–3.0 s: Start inside at the rear end of the aisle, eye level, looking forward.",
					"Step 1 frame: the full line ahead, bright; the open service hatch glows at the far end.",
					"Step 2, 3.0–7.0 s: Dolly slowly forward down the center of the aisle at chest height.",
					"Step 3, 7.0–10.0 s: Pull back smoothly and tilt up a little. End on one wide frame of the full galley.",
				],
			},
			{
				title: "Light",
				lines: [
					row(
						"Light",
						"warm task light on the line; cool daylight through the open service hatch",
					),
					row("Color temperature", "4000 K task light; 6500 K daylight"),
					"Keep contrast on the stainless. Do not blow out the highlights.",
				],
			},
			{
				title: "Craft",
				lines: [
					...CRAFT_INSIDE,
					"The wide lens makes the aisle read bigger than the trailer's footprint.",
					"Do not invent equipment, corridors or rooms to make the space bigger.",
				],
			},
			geometry,
			referenceSection(referenceViews, line, "inside"),
			warnings,
		]);
	}

	if (kind === "night-cinematic") {
		return doc("NIGHT CINEMATIC — 10 SECONDS", [
			{
				title: "Task",
				lines: [
					"Make one 10-second photoreal cinematic film of the trailer at night.",
				],
			},
			terms,
			subject,
			{
				title: "Shot list",
				lines: [
					"Step 1, 0.0–3.5 s: Open wide on a three-quarter front view of the curbside, across wet pavement.",
					"Step 1 frame: the lit reflection of the trailer stretches toward the camera; street bokeh is behind.",
					"Step 2, 3.5–7.5 s: Push in slowly toward the glowing service hatch.",
					"Step 2 drift: move a few degrees around the front corner, so the wrap and the roof sign both read.",
					`Step 3, 7.5–10.0 s: Settle on a medium shot of the hatch, with ${line.signature} on the counter.`,
				],
			},
			{
				title: "Light",
				lines: [
					row(
						"Light",
						"blue hour into night; the hatch and the roof sign are the only warm sources",
					),
					row("Color temperature", "3000 K hatch and sign; 7000 K sky"),
					row("Background", "practical streetlights far behind, as bokeh"),
					"Keep the mood dark but clear. The wrap colors must stay identifiable.",
				],
			},
			{
				title: "Action",
				lines: [
					"There are no people in frame.",
					"A single car light passes far behind. This is the only motion other than the camera.",
				],
			},
			{ title: "Craft", lines: [...CRAFT_OUTSIDE] },
			geometry,
			referenceSection(referenceViews, line, "outside"),
			warnings,
		]);
	}

	const setting = ctx.brief ? sceneFor(ctx.brief) : null;
	return doc("FULL 360° ORBIT — 10 SECONDS", [
		{
			title: "Task",
			lines: [
				"Make one 10-second photoreal film: one full 360° orbit of the trailer.",
				"This is the exterior slide of the sales deck.",
			],
		},
		terms,
		subject,
		{
			title: "Shot list",
			lines: [
				"Orbit at a constant rate on a level circle, camera at chest height.",
				"Hold the trailer dead center and at the same size for the full clip.",
				"Step 1, 0.0–3.5 s: Start at the three-quarter front view of the curbside, nose toward the camera.",
				"Step 2, 3.5–7.0 s: Pass the full curbside. The wrap and the roof sign are square to the camera at the midpoint.",
				"Step 3, 7.0–10.0 s: Continue past the rear and along the roadside, back to the opening angle.",
				"Decelerate and stop exactly at the opening angle. The circle is complete.",
			],
		},
		{
			title: "Light and scene",
			lines: [
				row("Light", "golden hour; low warm sun; long soft shadows"),
				row("Color temperature", "3500 K sun; 6500 K sky fill"),
				row(
					"Setting",
					setting ?? "a clean ground plane; an uncluttered background",
				),
				"The background must not compete with the trailer.",
			],
		},
		{
			title: "Action",
			lines: [
				"There is no action. The product is the subject. There are no people in frame.",
			],
		},
		{ title: "Craft", lines: [...CRAFT_OUTSIDE] },
		geometry,
		referenceSection(referenceViews, line, "outside"),
		warnings,
	]);
}
