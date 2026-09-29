/**
 * Palette roles — "green" is not a vinyl.
 *
 * The brain stores colors as words in sentence order. Renders, the 3D model
 * and the shop need roles (primary / secondary / accent / neutral) with hex
 * values and a nearest film reference the customer can hold against a
 * physical swatch. Screen color is approximate; approval is against film.
 *
 * Pure and client-safe.
 */
import { resolveWrap } from "./wrap-color";

export interface PaletteRole {
	/** The word the buyer used, e.g. "sage green". */
	name: string;
	hex: string;
	/** Nearest production film, e.g. "3M 2080 Series". */
	film: string;
}

export interface DesignPalette {
	primary: PaletteRole | null;
	secondary: PaletteRole | null;
	accent: PaletteRole | null;
	neutral: PaletteRole | null;
}

const NEUTRALS = new Set([
	"matte black",
	"black",
	"white",
	"cream",
	"beige",
	"gray",
	"grey",
	"stainless steel",
	"silver",
	"chrome",
	"wood",
	"walnut",
]);

const FILM_BY_HEX: Array<{ match: RegExp; film: string }> = [
	{ match: /^#1c1c1f|^#141416/i, film: "3M 2080 Matte Black (M12)" },
	{ match: /^#f5f5f5/i, film: "3M 2080 Gloss White" },
	{
		match: /^#efe4cf|^#ddccb0/i,
		film: "3M 2080 Matte Cream — confirm against swatch",
	},
	{
		match: /^#c8ccd0|^#c0c4c8|^#e6e9ec/i,
		film: "Bare / brushed aluminum — no film",
	},
	{
		match: /^#c8322b|^#6d2029/i,
		film: "3M 2080 Red family — confirm against swatch",
	},
	{
		match: /^#2a5ec2|^#1b2a52/i,
		film: "3M 2080 Blue family — confirm against swatch",
	},
	{
		match: /^#2f8a4d|^#1f8a8a|^#9caf88/i,
		film: "3M 2080 Green family — confirm against swatch",
	},
	{
		match: /^#e8c018|^#e2761f/i,
		film: "3M 2080 Yellow/Orange family — confirm against swatch",
	},
	{
		match: /^#7c4bc4|^#dd5d94/i,
		film: "3M 2080 Purple/Pink family — confirm against swatch",
	},
	{
		match: /^#c9a227|^#b5952f|^#b4633a/i,
		film: "3M 2080 Metallic family — confirm against swatch",
	},
	{
		match: /^#6b4a2f|^#5a3a24|^#9c6b3f/i,
		film: "Wood-grain architectural film — confirm against swatch",
	},
	{ match: /^#8a8d91/i, film: "3M 2080 Matte Grey" },
	{
		match: /^#39ff6a/i,
		film: "Fluorescent overlaminate — short life outdoors, confirm",
	},
];

export function filmFor(hex: string): string {
	for (const f of FILM_BY_HEX) {
		if (f.match.test(hex)) return f.film;
	}
	return "Nearest 3M/Avery cast film — confirm against a physical swatch";
}

function roleFor(name: string): PaletteRole {
	const wrap = resolveWrap([name]);
	const hex = wrap?.hex ?? "#8a8d91";
	return { name, hex, film: filmFor(hex) };
}

/**
 * Assign roles in sentence order: first named color is primary, second is
 * secondary, third is accent, first neutral found is neutral. At most 3
 * colors plus neutral ever reach the renderer (durability rule).
 */
export function paletteFor(colors: readonly string[]): DesignPalette {
	const names = colors.slice(0, 4);
	const neutralName = names.find((n) => NEUTRALS.has(n.toLowerCase())) ?? null;
	const chroma = names.filter((n) => n !== neutralName).slice(0, 3);
	return {
		primary: chroma[0] ? roleFor(chroma[0]) : null,
		secondary: chroma[1] ? roleFor(chroma[1]) : null,
		accent: chroma[2] ? roleFor(chroma[2]) : null,
		neutral: neutralName ? roleFor(neutralName) : null,
	};
}

/** "cream and sage green" → "sage green (primary #9CAF88), cream (neutral …)". */
export function palettePhrase(p: DesignPalette): string {
	const bits: string[] = [];
	if (p.primary) bits.push(`${p.primary.name} (primary ${p.primary.hex})`);
	if (p.secondary)
		bits.push(`${p.secondary.name} (secondary ${p.secondary.hex})`);
	if (p.accent) bits.push(`${p.accent.name} (accent ${p.accent.hex})`);
	if (p.neutral) bits.push(`${p.neutral.name} (neutral ${p.neutral.hex})`);
	return bits.join(", ") || "brand colors";
}
