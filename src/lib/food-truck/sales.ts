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

export type SalesVideoKind = "hero-orbit" | "walkthrough" | "night-cinematic";

export interface SalesVideoPreset {
	kind: SalesVideoKind;
	label: string;
	blurb: string;
}

export const SALES_VIDEO_PRESETS: SalesVideoPreset[] = [
	{
		kind: "hero-orbit",
		label: "Hero orbit · 10s",
		blurb: "Slow cinematic orbit around the product",
	},
	{
		kind: "walkthrough",
		label: "Serve-up walkthrough · 10s",
		blurb: "Hatch to counter, food assembly in motion",
	},
	{
		kind: "night-cinematic",
		label: "Night cinematic · 10s",
		blurb: "Glowing hatch, street-food-at-night mood",
	},
];

export interface SalesVideoContext {
	brand: string;
	vehicleLabel: string;
	colors: string;
	vibe: string;
}

/**
 * Reference-locked prompt: the model films the approved stills, never
 * reinterprets them. Geometry, materials, colors, branding stay as shown.
 */
export function buildSalesVideoPrompt(
	kind: SalesVideoKind,
	ctx: SalesVideoContext,
): string {
	const product = `${ctx.brand || "the business"} food truck (${ctx.vehicleLabel}, ${ctx.colors}, ${ctx.vibe})`;
	const lock =
		"Match the reference images exactly — same geometry, materials, colors, proportions, branding and realism. Do not redesign the product; film it as shown.";
	if (kind === "walkthrough") {
		return `10-second product video of the ${product}. Start outside the open service hatch, glide along the counter as staff assemble food on the hot station, finish on a finished item handed across. Warm appetizing light. ${lock}`;
	}
	if (kind === "night-cinematic") {
		return `10-second cinematic night video of the ${product}. Wet pavement reflections, hatch glowing warmly, illuminated signage on, a few customers silhouetted. Slow push-in, moody premium street-food vibe. ${lock}`;
	}
	return `10-second cinematic product video of the ${product}. Slowly orbit around the product at golden hour while maintaining its exact appearance from the references. ${lock}`;
}
