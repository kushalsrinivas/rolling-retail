/**
 * Customer stories.
 *
 * EVERY STORY HERE IS ILLUSTRATIVE. The businesses, people and numbers are
 * composite examples built from typical builds, and every page that renders
 * them says so above the fold. Replace them with real case studies — with the
 * customer's written permission — as they come in, and drop the label then.
 */
import type { Story } from "./types";

export const STORIES_ARE_ILLUSTRATIVE = true;

export const STORIES: Story[] = [
	{
		slug: "morning-ritual-coffee",
		business: "Morning Ritual Coffee",
		title: "From a pop-up tent to a 10 ft espresso trailer",
		description:
			"An illustrative example: how a weekend coffee pop-up chose a compact square trailer, kept the build simple and moved to five-day trading.",
		location: "Austin, Texas (example)",
		truckSlug: "square-trailer-10ft",
		useCaseSlug: "coffee-trailer",
		stats: [
			{ label: "Body", value: "Square 10 ft" },
			{ label: "Design rounds", value: "3 of 5" },
			{ label: "Peak service", value: "~55 cups/hr" },
		],
		body: [
			{
				type: "p",
				text: "Dana ran a coffee pop-up under a tent at weekend markets. The coffee was good; the setup was not. Two hours to build, two hours to pack, and a generator that tripped every time the grinder and the machine ran together.",
			},
			{ type: "h2", text: "The brief" },
			{
				type: "p",
				text: "In the designer, Dana answered the brief in about four minutes: specialty coffee, markets and an office park, mornings only, under 60 cups an hour, one person on the bar. The recommendation was the 10 ft square trailer — not an Airstream, which Dana had assumed — because the menu needed wall, not length.",
			},
			{ type: "h2", text: "What changed in the design" },
			{
				type: "ul",
				items: [
					"Round one put the grinder on the back wall. Dana asked for it on the hatch side so customers could watch — one plain-language change, one re-render.",
					"Round two switched the wrap from gloss to matte cream with a terracotta band, borrowed from a café photo Dana uploaded.",
					"Round three added a fold-down condiment shelf below the hatch.",
				],
			},
			{
				type: "p",
				text: "The power table flagged the original generator as too small for a two-group machine. The specification moved the build to a 50A shore inlet with a generator inlet for markets.",
			},
			{ type: "h2", text: "The result" },
			{
				type: "p",
				text: "Setup time dropped from two hours to twenty minutes. With no cooking line there was no hood to approve, so plan review was the shortest step of the project.",
			},
		],
		quote: {
			text: "I came in wanting an Airstream. The designer showed me why the small square box was the better business, and it was right.",
			who: "Dana, owner (illustrative example)",
		},
	},
	{
		slug: "la-plancha-tacos",
		business: "La Plancha",
		title: "A taco trailer designed around one fast line",
		description:
			"An illustrative example: a taco operator sizes a 13 ft trailer for festival volume without overbuilding, and gets hood and suppression right first time.",
		location: "Phoenix, Arizona (example)",
		truckSlug: "square-trailer-13ft",
		useCaseSlug: "taco-trailer",
		stats: [
			{ label: "Body", value: "Square 13 ft" },
			{ label: "Hot stations", value: "1 plancha" },
			{ label: "Peak service", value: "~100 orders/hr" },
		],
		body: [
			{
				type: "p",
				text: "Marco had cooked for a restaurant group for ten years and wanted his own line. His first instinct was a 20 ft truck with a fryer, a griddle and a flat-top. Every first-time hot-food operator we talk to has the same instinct.",
			},
			{ type: "h2", text: "Compact beats big" },
			{
				type: "p",
				text: "The designer recommended the 13 ft square trailer with one plancha and steam wells under extraction, a salsa rail at the pass, and a drinks station. The reasoning was simple: one hot station keeps weight, propane use and electrical load down, and a focused taco menu does not need a second heat source.",
			},
			{
				type: "callout",
				title: "Why it mattered",
				text: "A second hot station would have doubled the hood length and pushed the electrics past a 50A feed. That is a bigger generator, a heavier tow and a longer plan review.",
			},
			{ type: "h2", text: "Built for the heat" },
			{
				type: "p",
				text: "Phoenix summers made rooftop HVAC a requirement, not an option. The wrap went satin black with a bright orange band — chosen in the quiz — because black gloss shows every scratch from festival parking lots.",
			},
		],
		quote: {
			text: "The renders sold my partners on it. The spec sheet sold the bank.",
			who: "Marco, owner (illustrative example)",
		},
	},
	{
		slug: "field-and-fold-retail",
		business: "Field & Fold",
		title: "A walk-in Airstream boutique for a seasonal tour",
		description:
			"An illustrative example: an apparel brand plans a walk-in retail Airstream for a 12-city summer tour and designs it for photos as much as sales.",
		location: "Nashville, Tennessee (example)",
		truckSlug: "airstream-large",
		useCaseSlug: "retail-popup-trailer",
		stats: [
			{ label: "Body", value: "Airstream Large" },
			{ label: "Layout", value: "Walk-in" },
			{ label: "Tour stops", value: "12 cities" },
		],
		body: [
			{
				type: "p",
				text: "Field & Fold sells outdoor apparel online and wanted a physical presence at summer festivals without signing a lease. The brief: walk-in, premium, built for photos, with enough stock storage to trade all day.",
			},
			{ type: "h2", text: "Designing for dwell time" },
			{
				type: "p",
				text: "Retail is the one use the Large Airstream is built for. The layout put a lit display wall along the curbside, the till by the door for flow, and a rear stockroom using about a fifth of the floor.",
			},
			{
				type: "ul",
				items: [
					"Rooftop HVAC for a July tour across the South.",
					"Satin wrap so the polished aluminum and the brand band photograph without glare.",
					"Lockable storage so stock stays in the trailer overnight between stops.",
				],
			},
			{ type: "h2", text: "One design, many uses" },
			{
				type: "p",
				text: "The team used the concept renders in their sponsor deck and the night render for the tour announcement — weeks before the trailer was built.",
			},
		],
		quote: {
			text: "We had launch assets before we had a trailer. That alone paid for the time we spent in the designer.",
			who: "Head of brand (illustrative example)",
		},
	},
];

export function getStory(slug: string): Story | undefined {
	return STORIES.find((s) => s.slug === slug);
}
