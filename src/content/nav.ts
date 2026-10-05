/**
 * Lightweight link lists for the footer — kept separate from the article
 * bodies so the footer does not pull every guide into every page bundle.
 * `content.test.ts` checks each slug resolves.
 */
export const FOOTER_GUIDES = [
	{ slug: "how-much-does-a-food-trailer-cost", label: "Food trailer cost" },
	{ slug: "what-size-food-trailer-do-i-need", label: "Sizing your trailer" },
	{ slug: "food-trailer-vs-food-truck", label: "Trailer vs truck" },
	{
		slug: "airstream-vs-square-concession-trailer",
		label: "Airstream vs square",
	},
	{
		slug: "food-truck-health-permit-plan-review",
		label: "Permits & plan review",
	},
	{ slug: "food-trailer-power-guide", label: "Power: 30A vs 50A" },
] as const;
