/**
 * The intake a buyer sees before the blank prompt box.
 *
 * A chat that opens on "dump everything" is daunting — the honest reaction is
 * "what am I supposed to type?" Asking a few concrete questions first is
 * kinder, and it also guarantees the brief is good enough to generate from,
 * which is what makes the first set of concepts land.
 *
 * Every field is skippable on purpose. Plenty of buyers have no brand colours
 * and no competitors in mind yet; making them answer would lose them.
 *
 * The shape is config rather than markup so the next client gets their own
 * questions without a rewrite — the fields below are Food Truck Factory's.
 */
import { BUSINESS_TYPES, VEHICLES } from "./constants";

export type IntakeFieldType =
	| "text"
	| "textarea"
	| "choice"
	| "chips"
	| "image";

export interface IntakeField {
	id: string;
	label: string;
	/** Shown under the label — why we're asking. */
	hint?: string;
	type: IntakeFieldType;
	placeholder?: string;
	options?: Array<{ value: string; label: string; blurb?: string }>;
	/** Suggestions the buyer can tap instead of typing. */
	suggestions?: string[];
	/** Only `false` is meaningful; everything defaults to skippable. */
	required?: boolean;
}

export interface IntakeStep {
	id: string;
	title: string;
	subtitle?: string;
	fields: IntakeField[];
}

export interface IntakeConfig {
	/** Shown on the opening screen. */
	welcomeTitle: string;
	welcomeBody: string;
	steps: IntakeStep[];
	/** One-tap starting points for a buyer who wants to look before they type. */
	templates: Array<{
		id: string;
		label: string;
		blurb: string;
		values: Record<string, string>;
	}>;
}

export const FOOD_TRUCK_INTAKE: IntakeConfig = {
	welcomeTitle: "Let's design your truck",
	welcomeBody:
		"A few quick questions so the first concepts look like your business, not a stock photo. Skip anything you haven't decided yet.",
	steps: [
		{
			id: "brand",
			title: "Your brand",
			subtitle: "Just what you have — none of this is required.",
			fields: [
				{
					id: "brandName",
					label: "Business name",
					type: "text",
					placeholder: "e.g. BIB Burgers",
				},
				{
					id: "businessType",
					label: "What will you serve?",
					hint: "This sets the equipment line and the layout.",
					type: "choice",
					options: BUSINESS_TYPES.map((b) => ({
						value: b.id,
						label: b.label,
						blurb: b.note,
					})),
				},
				{
					id: "menu",
					label: "Signature items",
					hint: "The two or three things you want people queuing for.",
					type: "text",
					placeholder: "e.g. smash burgers, chicken burgers, shakes",
				},
			],
		},
		{
			id: "look",
			title: "The look",
			subtitle: "Colours and feel. Tap a suggestion or type your own.",
			fields: [
				{
					id: "colors",
					label: "Brand colours",
					hint: "No brand colours yet? Skip it and we'll propose some.",
					type: "chips",
					suggestions: [
						"matte black",
						"cream",
						"orange",
						"red",
						"teal",
						"navy",
						"stainless steel",
						"pink",
					],
				},
				{
					id: "vibe",
					label: "How should it feel?",
					type: "chips",
					suggestions: [
						"premium",
						"playful",
						"minimal",
						"retro",
						"bold",
						"rustic",
						"neon",
						"clean",
					],
				},
				{
					id: "inspiration",
					label: "Got a photo you like?",
					hint: "A truck, a storefront, a palette — anything. We'll borrow the styling, not the bodywork.",
					type: "image",
				},
			],
		},
		{
			id: "build",
			title: "The build",
			subtitle: "A starting point — you can change this at any time.",
			fields: [
				{
					id: "vehicleId",
					label: "Body",
					type: "choice",
					options: VEHICLES.map((v) => ({
						value: v.id,
						label: v.label,
						blurb: v.blurb,
					})),
				},
				{
					id: "service",
					label: "How do customers order?",
					type: "choice",
					options: [
						{
							value: "hatch",
							label: "At a hatch",
							blurb: "They order outside. Most food trucks work this way.",
						},
						{
							value: "walk-in",
							label: "They walk inside",
							blurb:
								"Needs a wider body and more of the floor given to customers.",
						},
					],
				},
				{
					id: "notes",
					label: "Anything you must have?",
					hint: "Specific equipment, a material, an idea you can't stop thinking about. Better to say it now than at the end of the build.",
					type: "textarea",
					placeholder:
						"e.g. the burger assembly has to be visible from the counter",
				},
			],
		},
	],
	templates: [
		{
			id: "smash-burger",
			label: "Smash burger trailer",
			blurb: "Grill line, hatch service, drinks end-cap",
			values: {
				businessType: "grill",
				menu: "smash burgers, chicken burgers, shakes",
				colors: "matte black, cream, orange",
				vibe: "bold, a little premium",
				vehicleId: "airstream-m",
				service: "hatch",
			},
		},
		{
			id: "coffee-bar",
			label: "Specialty coffee bar",
			blurb: "Espresso, pastry case, morning throughput",
			values: {
				businessType: "coffee",
				menu: "espresso, filter, pastries",
				colors: "cream, walnut, stainless steel",
				vibe: "minimal, premium",
				vehicleId: "airstream-s",
				service: "hatch",
			},
		},
		{
			id: "merch",
			label: "Merch & retail truck",
			blurb: "Walk-in boutique for events and drops",
			values: {
				businessType: "retail",
				menu: "apparel, limited drops",
				colors: "black, neon",
				vibe: "bold, playful",
				vehicleId: "airstream-l",
				service: "walk-in",
			},
		},
	],
};

export type IntakeAnswers = Record<string, string>;

/**
 * Turn the answers into the opening message.
 *
 * It reads as something a buyer would actually have written, because it
 * becomes the first turn of the conversation and the agent's system prompt
 * asks it to absorb a brief rather than interrogate.
 */
export function composeBrief(
	answers: IntakeAnswers,
	config: IntakeConfig = FOOD_TRUCK_INTAKE,
): string {
	const get = (id: string) => answers[id]?.trim();
	const labelFor = (fieldId: string, value: string) => {
		for (const step of config.steps) {
			for (const field of step.fields) {
				if (field.id !== fieldId) continue;
				return field.options?.find((o) => o.value === value)?.label ?? value;
			}
		}
		return value;
	};

	const parts: string[] = [];
	const brand = get("brandName");
	const business = get("businessType");

	parts.push(
		brand
			? `I'm building ${brand}.`
			: "I'm building a new mobile food business.",
	);
	if (business) parts.push(`It's ${labelFor("businessType", business)}.`);
	if (get("menu")) parts.push(`The menu is ${get("menu")}.`);
	if (get("colors")) parts.push(`Brand colours: ${get("colors")}.`);
	if (get("vibe")) parts.push(`It should feel ${get("vibe")}.`);
	if (get("vehicleId")) {
		const label = labelFor("vehicleId", get("vehicleId")!);
		const article = /^[aeiou]/i.test(label) ? "an" : "a";
		parts.push(`I'm looking at ${article} ${label}.`);
	}
	if (get("service")) {
		parts.push(
			get("service") === "walk-in"
				? "Customers should be able to walk inside."
				: "Customers order at the hatch.",
		);
	}
	if (get("notes")) parts.push(`Must-haves: ${get("notes")}.`);

	if (parts.length <= 1) {
		// Nothing was filled in. Say so plainly rather than sending a bare line
		// the agent has to interrogate its way out of.
		return "I'd like to see some ideas — I haven't settled on the details yet. Show me a few directions and I'll react to them.";
	}
	return parts.join(" ");
}
