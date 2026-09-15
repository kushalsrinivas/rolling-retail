/**
 * The builds shown on the landing page.
 *
 * The point of the showcase is recognition: a visitor who runs a coffee cart
 * should see a coffee cart, not a generic box they have to imagine their way
 * into. So each preset is a real use case with its own fit-out, and each one
 * names the parts a buyer would actually look for.
 *
 * Ordered by how often the factory is asked for them. The bookshop is last and
 * deliberate — it is the one that says Rolling Retail is not only food trucks.
 */
import type { VehicleId } from "#/lib/food-truck/constants";

export interface ShowcaseHotspot {
	/** Reads as an invitation: "See the espresso bar". */
	label: string;
	/** Equipment id this focuses on, from the catalogue. */
	equipmentId: string;
	/** One line the buyer learns by clicking. */
	detail: string;
}

export interface ShowcasePreset {
	id: string;
	/** What this build is, in the buyer's words. */
	name: string;
	/** The line under the name. */
	summary: string;
	vehicleId: VehicleId;
	equipmentIds: string[];
	wrapColors: string[];
	hotspots: ShowcaseHotspot[];
}

export const SHOWCASE_PRESETS: ShowcasePreset[] = [
	{
		id: "coffee",
		name: "Coffee bar",
		summary: "Two-group espresso, batch brew, pastry case.",
		vehicleId: "airstream-s",
		equipmentIds: [
			"hand-basin",
			"espresso-machine",
			"grinder",
			"chilled-milk-storage",
			"display-case",
			"till",
			"fresh-grey-water-tanks",
			"led-track-lights",
		],
		wrapColors: ["cream"],
		hotspots: [
			{
				label: "See the espresso bar",
				equipmentId: "espresso-machine",
				detail:
					"Two groups, 4.2 kW. The bar runs along the hatch so the barista never turns their back on the queue.",
			},
			{
				label: "See the power",
				equipmentId: "grinder",
				detail:
					"Machine, grinder and milk fridge come to 4.9 kW — a 30A shore feed covers it without a generator.",
			},
			{
				label: "See the pastry case",
				equipmentId: "display-case",
				detail:
					"Refrigerated and lit, at the hatch. The highest-margin thing on the truck sits where the eye lands.",
			},
		],
	},
	{
		id: "grill",
		name: "Burger kitchen",
		summary: "Griddle and chargrill under full extraction.",
		vehicleId: "airstream-m",
		equipmentIds: [
			"hand-basin",
			"griddle-chargrill",
			"extraction-hood",
			"fire-suppression",
			"refrigeration",
			"drinks-station",
			"ice",
			"till",
			"digital-menu-board",
			"hvac",
		],
		wrapColors: ["matte black"],
		hotspots: [
			{
				label: "See the kitchen",
				equipmentId: "griddle-chargrill",
				detail:
					"Griddle and chargrill on one line, canopy over both, make-rail directly behind so patties travel in a straight line.",
			},
			{
				label: "See the extraction",
				equipmentId: "extraction-hood",
				detail:
					"Stainless canopy with Ansul suppression in the base build — the first thing a health inspector asks about.",
			},
			{
				label: "See the drinks end-cap",
				equipmentId: "drinks-station",
				detail:
					"Ice well and shakes at the far end, away from the grease line. It is where the margin is.",
			},
		],
	},
	{
		id: "bar",
		name: "Mobile bar",
		summary: "Pour stations, glass wash, cellar refrigeration.",
		vehicleId: "square-4m",
		equipmentIds: [
			"hand-basin",
			"pour-stations",
			"glass-wash",
			"cellar-refrigeration",
			"ice",
			"till",
			"led-track-lights",
			"fresh-grey-water-tanks",
		],
		wrapColors: ["navy"],
		hotspots: [
			{
				label: "See the bar",
				equipmentId: "pour-stations",
				detail:
					"Pour stations face the hatch with the ice well between them, so two servers work without crossing.",
			},
			{
				label: "See the glass wash",
				equipmentId: "glass-wash",
				detail:
					"Under-counter washer and tanks. Glassware is what turns a bar from a stall into a venue.",
			},
			{
				label: "See the cellar",
				equipmentId: "cellar-refrigeration",
				detail:
					"Refrigerated storage under the run — kegs and bottles stay at temperature through a full day.",
			},
		],
	},
	{
		id: "merch",
		name: "Merch & retail",
		summary: "Walk-in boutique for drops and events.",
		vehicleId: "airstream-l",
		equipmentIds: [
			"merch-rail",
			"display-wall",
			"fitting-nook",
			"secure-storage",
			"till",
			"led-track-lights",
			"hvac",
		],
		wrapColors: ["orange"],
		hotspots: [
			{
				label: "See the display wall",
				equipmentId: "display-wall",
				detail:
					"Full-height wall down one side, rail down the other, so customers walk a loop instead of a dead end.",
			},
			{
				label: "See the fitting nook",
				equipmentId: "fitting-nook",
				detail:
					"A curtained corner at the rear. Being able to try something on is the difference between a look and a sale.",
			},
			{
				label: "See the storage",
				equipmentId: "secure-storage",
				detail:
					"Lockable stock under the counter — the unit is left on site overnight more often than anyone plans for.",
			},
		],
	},
	{
		id: "bookshop",
		name: "Bookshop",
		summary: "Because it does not have to be food.",
		vehicleId: "square-5m",
		equipmentIds: [
			"bookshelf",
			"reading-bench",
			"till",
			"secure-storage",
			"led-track-lights",
		],
		wrapColors: ["walnut"],
		hotspots: [
			{
				label: "See the bookshelf",
				equipmentId: "bookshelf",
				detail:
					"Shelving down the long wall, braced for transit. Books are heavier per metre than most kitchen equipment.",
			},
			{
				label: "See the reading bench",
				equipmentId: "reading-bench",
				detail:
					"A bench at the rear doors. Somewhere to sit is what makes people stay long enough to buy.",
			},
			{
				label: "See the lighting",
				equipmentId: "led-track-lights",
				detail:
					"Warm track lighting on a low draw — the whole build runs on a domestic feed.",
			},
		],
	},
];
