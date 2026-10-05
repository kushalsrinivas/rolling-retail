/**
 * Art direction — the descriptive half of every render and video prompt.
 *
 * The STE rules said what the model must not do; they said little about what
 * the picture should actually look like. "A color-blocked lower third" is a
 * hundred different trailers, and a real round proved it: the hero came back
 * cream-over-teal and the curbside view teal-over-cream-over-teal. This
 * module turns the design record into measured, named, repeatable facts —
 * which color covers which wall to which height, where the wordmark sits on
 * each side and how big, what every surface is made of — and every view and
 * every clip quotes the same rows word for word.
 *
 * Pure and client-safe. Output is ASD-STE100: data rows and short sentences.
 */
import {
	type DesignBrief,
	sceneFor,
	finishPhraseFor,
	hasFeature,
} from "./brief";
import type { LineProfile } from "./line-profile";
import { type DesignPalette, type PaletteRole, paletteFor } from "./palette";
import { row, type SteSection } from "./ste";
import { resolveWrap } from "./wrap-color";

export interface ArtArgs {
	brand: string;
	hasBrand: boolean;
	vehicleBody: "airstream" | "square";
	lengthM: number;
	heightM: number;
	colors: string;
	vibe: string;
	businessLabel: string;
	emblem: string;
	line: LineProfile;
	brief?: DesignBrief | null;
}

interface Swatch {
	name: string;
	hex: string;
}

const WHITE: Swatch = { name: "gloss white", hex: "#F5F5F5" };
const CREAM: Swatch = { name: "cream", hex: "#EFE4CF" };
const INK: Swatch = { name: "matte black", hex: "#1C1C1F" };
const ALUMINIUM: Swatch = { name: "polished aluminium", hex: "#C8CCD0" };

function swatch(r: PaletteRole | null | undefined): Swatch | null {
	if (!r) return null;
	// A word the wrap catalog does not know keeps the buyer's word, no hex.
	return resolveWrap([r.name])
		? { name: r.name, hex: r.hex.toUpperCase() }
		: { name: r.name, hex: "" };
}

function label(s: Swatch): string {
	return s.hex ? `${s.name} ${s.hex}` : s.name;
}

function isDark(s: Swatch): boolean {
	const hex = s.hex.replace("#", "");
	if (hex.length !== 6)
		return /black|navy|charcoal|dark|forest|burgundy/i.test(s.name);
	const [r, g, b] = [0, 2, 4].map((i) =>
		Number.parseInt(hex.slice(i, i + 2), 16),
	);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

function splitColors(colors: string): string[] {
	return colors
		.split(/,|\band\b|;/)
		.map((c) => c.trim())
		.filter((c) => c && c !== "brand colors");
}

/**
 * Who paints what. Chosen once from the palette roles so every view agrees:
 * the neutral (or white) is the body, the primary is the band, the accent is
 * the trim. A one-color palette becomes body + band in that color and white.
 */
export function colorPlan(colors: string, body: "airstream" | "square") {
	const p: DesignPalette = paletteFor(splitColors(colors));
	const primary = swatch(p.primary);
	const secondary = swatch(p.secondary);
	const accent = swatch(p.accent);
	const neutral = swatch(p.neutral);
	if (body === "airstream") {
		const band = primary ?? neutral ?? INK;
		const panel = neutral && neutral !== band ? neutral : CREAM;
		const trim = accent ?? secondary ?? (isDark(band) ? CREAM : INK);
		return { base: ALUMINIUM, band, panel, trim };
	}
	const band = primary ?? neutral ?? INK;
	let base = neutral && neutral !== band ? neutral : (secondary ?? WHITE);
	if (base.name === band.name) base = WHITE;
	const trim =
		accent ?? (primary ? secondary : null) ?? (isDark(base) ? CREAM : INK);
	return { base, band, panel: base, trim };
}

/** Letterforms from the buyer's style words — one typeface for every view. */
export function typefaceFor(vibe: string): string {
	const v = vibe.toLowerCase();
	if (/rustic|farm|craft/.test(v)) return "bold slab-serif capitals";
	if (/retro|diner|classic/.test(v))
		return "bold rounded retro sans-serif, title case";
	if (/premium|minimal|clean|luxury/.test(v))
		return "clean geometric sans-serif capitals, medium weight, wide letter spacing";
	if (/bold|street|loud|neon/.test(v))
		return "heavy condensed sans-serif capitals";
	if (/playful|fun/.test(v)) return "chunky rounded sans-serif, title case";
	return "bold geometric sans-serif, title case";
}

/** The wrap, measured. Identical in every view and every clip. */
export function wrapArtworkSection(a: ArtArgs): SteSection {
	const c = colorPlan(a.colors, a.vehicleBody);
	const type = typefaceFor(a.vibe);
	const onPanel = a.vehicleBody === "airstream" ? c.panel : c.base;
	const wordColor = isDark(onPanel)
		? isDark(c.band)
			? CREAM
			: c.band
		: c.band;
	const cap = a.vehicleBody === "airstream" ? 0.28 : 0.32;
	const lines: Array<string | null> =
		a.vehicleBody === "airstream"
			? [
					row(
						"Body",
						`${label(c.base)}, unwrapped, from the roof down to the belt band`,
					),
					row(
						"Belt band",
						`${label(c.band)}, 0.35 m tall, at counter height, from the nose cap to the tail cap on both sides`,
					),
					row(
						"Lower skirt",
						"polished aluminium below the belt band, unwrapped",
					),
					row(
						"Logo panel",
						`${label(c.panel)}, a rounded rectangle 1.4 m wide × 0.8 m tall, on the curbside ahead of the service hatch`,
					),
					row(
						"Trim",
						`${label(c.trim)}, a 40 mm pinstripe on the top edge of the belt band, and the service hatch frame`,
					),
				]
			: [
					row(
						"Upper wall",
						`${label(c.base)}, from the roof edge down to 62% of the wall height, on all four sides`,
					),
					row(
						"Lower third",
						`${label(c.band)}, from 62% of the wall height down to the bottom edge, on all four sides`,
					),
					row(
						"Trim",
						`${label(c.trim)}, a 40 mm pinstripe on the top edge of the lower third, and the service hatch frame`,
					),
					row(
						"Roof edge",
						`${label(c.base)}, with a brushed aluminium drip rail`,
					),
				];
	lines.push(
		a.hasBrand
			? row(
					"Wordmark",
					`"${a.brand}" in ${type}, color ${label(wordColor)}, cap height ${cap} m, one line`,
				)
			: row("Wordmark", "none — the logo panel and sign faces stay blank"),
		a.hasBrand
			? row(
					"Wordmark, curbside",
					a.vehicleBody === "airstream"
						? "centered on the logo panel"
						: "on the upper wall between the front corner and the service hatch, centered in the upper-wall color",
				)
			: null,
		a.hasBrand
			? row(
					"Wordmark, roadside",
					"same size and height as the curbside, centered on the wall",
				)
			: null,
		a.hasBrand
			? row(
					"Wordmark, rear",
					a.vehicleBody === "airstream"
						? `on the rear end cap, centered, cap height 0.20 m, color ${label(c.band)}`
						: "centered above the rear door, cap height 0.20 m",
				)
			: null,
		row("Emblem", a.emblem),
		row(
			"Emblem position",
			a.hasBrand
				? "directly to the left of the curbside wordmark, 0.6 m tall, in the wordmark color and the band color"
				: "centered on the curbside logo area, 0.6 m tall",
		),
		hasFeature(a.brief, "roof-sign")
			? row(
					"Roof sign",
					a.hasBrand
						? `a 1.2 m × 0.4 m illuminated box sign on the roof centerline, ${label(c.band)} face with "${a.brand}" in ${label(isDark(c.band) ? CREAM : INK)}`
						: `a 1.2 m × 0.4 m illuminated box sign on the roof centerline, ${label(c.band)} face, no lettering`,
				)
			: null,
		row("Film finish", finishPhraseFor(a.brief)),
		"Use this exact color layout on each side, in each view.",
		"Do not swap the band color and the body color.",
	);
	return { title: "Wrap artwork", lines };
}

/** Every surface, named. Photoreal models render what they are told is there. */
export function materialsSection(
	a: Pick<ArtArgs, "vehicleBody" | "brief">,
): SteSection {
	return {
		title: "Materials and finishes",
		lines: [
			row(
				"Shell",
				a.vehicleBody === "airstream"
					? "polished riveted aluminium sheet; mirror-bright with soft sky reflections; vertical rivet lines every 0.6 m"
					: "smooth flat aluminium composite panels with tight 3 mm seams; corners with a 25 mm radius",
			),
			row(
				"Service hatch",
				"brushed stainless steel frame 40 mm wide; top-hinged door held open by two black gas struts",
			),
			row(
				"Counter",
				"fold-down brushed stainless steel shelf, 0.30 m deep, below the hatch sill",
			),
			row(
				"Entry door",
				"flush door in the wall color, chrome handle and lock, black rubber seal",
			),
			row(
				"Running gear",
				"black steel A-frame tongue; black fenders; 15-inch steel wheels with silver centers; black tires",
			),
			row(
				"Stabilizers",
				"black scissor jacks at all four corners, deployed onto small square pads",
			),
			row("Roof", "white low-profile rooftop HVAC unit; two low roof vents"),
			row(
				"Lights",
				"small LED marker lights: amber at the front corners, red at the rear corners",
			),
			hasFeature(a.brief, "awning")
				? row(
						"Awning",
						"retractable fabric awning in the trim color above the service hatch, two diagonal support arms",
					)
				: null,
			hasFeature(a.brief, "night-lighting")
				? row(
						"Exterior lights",
						"warm-white LED strip along the top edge of the hatch opening; two downlights on the curbside wall",
					)
				: null,
			"Every surface is new and clean: no dents, rust, scratches, dirt or stickers.",
		],
	};
}

/** Where the photograph is taken, and what the frame must not contain. */
export function environmentSection(
	brief: DesignBrief | null | undefined,
	time: "day" | "night" = "day",
): SteSection {
	const scene = sceneFor(brief);
	return {
		title: "Environment",
		lines: [
			row(
				"Setting",
				time === "night"
					? `${scene}; at night, the ground is wet and reflects the lights`
					: scene,
			),
			row(
				"Weather",
				time === "night"
					? "clear night after light rain; no fog"
					: "clear and dry; a few soft clouds",
			),
			row(
				"Background",
				"soft and out of focus; no legible signs, no logos, no other vehicles",
			),
			row(
				"Props",
				"none: no tables, chairs, bins, cones, menu stands or people",
			),
			"The trailer is the only sharp subject in the frame.",
		],
	};
}

/** The galley, one station per row, in the order the line works. */
export function stationRows(line: LineProfile): string[] {
	return line.galley
		.split(/\(\d+\)\s*/)
		.map((s) => s.replace(/,\s*$/, "").trim())
		.filter(Boolean)
		.map((s, i) => `Station ${i + 1}: ${s}`);
}

/**
 * A short descriptive paragraph in STE: what the picture shows, as a
 * photographer's brief. This is the part the model reads as "the image";
 * everything after it is the specification that pins it down.
 */
export function sceneSentences(
	a: ArtArgs,
	view: "hero" | "rear" | "side" | "interior" | "front" | "counter" | "night",
): string[] {
	const c = colorPlan(a.colors, a.vehicleBody);
	const ft = Math.round(a.lengthM * 3.28084);
	const bodyName =
		a.vehicleBody === "airstream"
			? "polished aluminium Airstream trailer"
			: "square concession trailer";
	const who = a.hasBrand
		? `for "${a.brand}", a ${a.businessLabel.toLowerCase()} business`
		: `for a ${a.businessLabel.toLowerCase()} business`;
	const wrap =
		a.vehicleBody === "airstream"
			? `The aluminium body has a ${c.band.name} belt band and a ${c.panel.name} logo panel.`
			: `The walls are ${c.base.name} on top with a ${c.band.name} lower third.`;
	const common = [`The subject is a new ${ft}-foot ${bodyName} ${who}.`, wrap];
	switch (view) {
		case "hero":
			return [
				...common,
				"The trailer stands alone at its trading pitch, ready to serve.",
				`The service hatch is open, and ${a.line.heroGlimpse} is visible inside.`,
				"The image looks like a professional product photograph for a catalog cover.",
			];
		case "rear":
			return [
				...common,
				"The image shows the rear and the roadside wall, with no openings on the roadside.",
				"The trailer is parked and level on its stabilizer jacks.",
			];
		case "side":
			return [
				...common,
				"The image is a clean presentation drawing of the curbside wall, as on a sales sheet.",
			];
		case "interior":
			return [
				`The image shows the inside of the ${ft}-foot trailer, ready for service.`,
				"Stainless steel equipment stands in one line along the curbside wall.",
				"The space is bright, clean and organized, like a new commercial kitchen.",
				`Brand color ${c.band.name} shows only on accent panels and the counter front.`,
			];
		case "front":
			return [
				`The image looks straight into the open service hatch of the trailer ${who}.`,
				"The line inside is visible from left to right, ready for the first order.",
			];
		case "counter":
			return [
				`The image is a close product photograph at the hatch counter of the trailer ${who}.`,
				`${a.line.signature} sits on the counter and is the hero of the frame.`,
			];
		case "night":
			return [
				...common,
				"It is night, and the trailer is the brightest object in the scene.",
				"Warm light from the open hatch falls across the ground in front of it.",
			];
	}
}
