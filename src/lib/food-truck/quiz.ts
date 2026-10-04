/**
 * Style-quiz catalog — the "pick what you like" rounds.
 *
 * Words only, no new pipeline: every vibe/color here is already understood by
 * paletteFor(), the project brain and the render prompts, so picks flow into
 * the existing intake → design-record → single auto-render path unchanged.
 *
 * Photos: each style accepts an optional `image` (public/quiz/*.jpg). Until
 * the factory supplies the 12 curated truck photos, cards render their
 * gradient — same component, one field swap, no code change.
 */

export interface QuizStyle {
	id: string;
	label: string;
	blurb: string;
	vibe: string[];
	colors: string[];
	gradient: string;
	image?: string;
}

export interface QuizPalette {
	id: string;
	label: string;
	colors: string[];
}

export interface QuizExtra {
	id: string;
	label: string;
	blurb: string;
	/** Appended to the brief's must-haves line. */
	note: string;
}

export const QUIZ_STYLES: QuizStyle[] = [
	{
		id: "midnight",
		label: "Midnight Premium",
		blurb: "Black + brass, quiet luxury",
		vibe: ["premium", "minimal"],
		colors: ["matte black", "cream"],
		gradient: "linear-gradient(135deg,#17171c 60%,#c9a35c 60%)",
	},
	{
		id: "diner",
		label: "Retro Diner",
		blurb: "Cherry red + cream, 50s roadside",
		vibe: ["retro", "playful"],
		colors: ["red", "cream"],
		gradient: "linear-gradient(135deg,#b3202c 60%,#f3ead6 60%)",
	},
	{
		id: "street",
		label: "Street Bold",
		blurb: "Orange + black, loud from a block away",
		vibe: ["bold", "playful"],
		colors: ["orange", "matte black"],
		gradient: "linear-gradient(135deg,#e8641b 60%,#1c1c1e 60%)",
	},
	{
		id: "coastal",
		label: "Coastal Clean",
		blurb: "Teal + white, fresh and fast",
		vibe: ["clean", "minimal"],
		colors: ["teal", "cream"],
		gradient: "linear-gradient(135deg,#1f7a8c 60%,#f4f1e8 60%)",
	},
	{
		id: "harbor",
		label: "Harbor Classic",
		blurb: "Navy + cream, trusted local",
		vibe: ["clean", "retro"],
		colors: ["navy", "cream"],
		gradient: "linear-gradient(135deg,#1e2a4a 60%,#efe6d2 60%)",
	},
	{
		id: "steel",
		label: "Raw Steel",
		blurb: "Brushed metal + black, industrial",
		vibe: ["minimal", "bold"],
		colors: ["stainless steel", "matte black"],
		gradient: "linear-gradient(135deg,#9aa1a8 60%,#232326 60%)",
	},
	{
		id: "neon",
		label: "Neon Night",
		blurb: "Black + neon, built for after dark",
		vibe: ["neon", "bold"],
		colors: ["matte black", "pink"],
		gradient: "linear-gradient(135deg,#111116 60%,#ff4fa3 60%)",
	},
	{
		id: "farm",
		label: "Farm Rustic",
		blurb: "Cream + warm wood tones, honest food",
		vibe: ["rustic", "clean"],
		colors: ["cream", "orange"],
		gradient: "linear-gradient(135deg,#efe3c8 60%,#a85b23 60%)",
	},
];

export const QUIZ_PALETTES: QuizPalette[] = [
	{ id: "p-midnight", label: "Midnight", colors: ["matte black", "cream"] },
	{ id: "p-diner", label: "Diner", colors: ["red", "cream"] },
	{ id: "p-ember", label: "Ember", colors: ["orange", "matte black"] },
	{ id: "p-coastal", label: "Coastal", colors: ["teal", "cream"] },
	{ id: "p-harbor", label: "Harbor", colors: ["navy", "cream"] },
	{ id: "p-steel", label: "Steel", colors: ["stainless steel", "matte black"] },
	{ id: "p-neon", label: "Neon", colors: ["matte black", "pink"] },
	{ id: "p-blush", label: "Blush", colors: ["pink", "cream"] },
];

export const QUIZ_EXTRAS: QuizExtra[] = [
	{
		id: "menu-board",
		label: "Big menu board",
		blurb: "Readable from the back of the queue",
		note: "large readable menu board",
	},
	{
		id: "night-lighting",
		label: "Night lighting",
		blurb: "Serve after dark",
		note: "night service lighting",
	},
	{
		id: "roof-sign",
		label: "Roof sign",
		blurb: "Seen over a crowded event",
		note: "roof-mounted sign",
	},
	{
		id: "awning",
		label: "Serving awning",
		blurb: "Shade + rain cover at the hatch",
		note: "serving awning over the hatch",
	},
	{
		id: "visible-kitchen",
		label: "Visible kitchen",
		blurb: "Cooking as theatre",
		note: "burger assembly visible from the counter",
	},
	{
		id: "rear-hatch",
		label: "Rear hatch",
		blurb: "Second serving point",
		note: "second serving hatch at the rear",
	},
];

export interface QuizPicks {
	styles: string[];
	palettes: string[];
	extras: string[];
}

/** Picks → comma strings the existing intake/brain/spec path already eats. */
export function quizToDirect(picks: QuizPicks): {
	vibe: string;
	colors: string;
} {
	const vibe: string[] = [];
	for (const id of picks.styles) {
		const s = QUIZ_STYLES.find((q) => q.id === id);
		for (const v of s?.vibe ?? []) if (!vibe.includes(v)) vibe.push(v);
	}
	const colors: string[] = [];
	for (const id of picks.palettes) {
		const p = QUIZ_PALETTES.find((q) => q.id === id);
		for (const c of p?.colors ?? []) if (!colors.includes(c)) colors.push(c);
	}
	// Styles carry color intent too — fold in what fits.
	for (const id of picks.styles) {
		const s = QUIZ_STYLES.find((q) => q.id === id);
		for (const c of s?.colors ?? []) {
			if (colors.length >= 4) break;
			if (!colors.includes(c)) colors.push(c);
		}
	}
	return { vibe: vibe.slice(0, 3).join(", "), colors: colors.slice(0, 4).join(", ") };
}

export function extrasNote(picks: QuizPicks): string {
	return picks.extras
		.map((id) => QUIZ_EXTRAS.find((e) => e.id === id)?.note)
		.filter(Boolean)
		.join("; ");
}
