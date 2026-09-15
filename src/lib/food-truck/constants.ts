/**
 * Food Truck Factory — designer domain constants.
 *
 * Scope is intentionally constrained to what the factory can actually build:
 * Airstreams + square trailers for the US market. Keeping this list tight is
 * what prevents inconsistent renders and impossible body-shape changes
 * downstream.
 */

export const VEHICLES = [
	{
		id: "airstream-s",
		label: "Airstream · Small",
		body: "airstream" as const,
		lengthM: 4,
		widthM: 2.1,
		heightM: 2.6,
		wrapSqm: 28,
		blurb: "Iconic rounded body. Best curb appeal, tightest kitchen.",
	},
	{
		id: "airstream-m",
		label: "Airstream · Mid",
		body: "airstream" as const,
		lengthM: 6,
		widthM: 2.2,
		heightM: 2.7,
		wrapSqm: 38,
		blurb: "The US best-seller. Walk-in or hatch-serve layouts.",
	},
	{
		id: "airstream-l",
		label: "Airstream · Large",
		body: "airstream" as const,
		lengthM: 8,
		widthM: 2.4,
		heightM: 2.8,
		wrapSqm: 48,
		blurb: "Flagship footprint. Full line + merch wall.",
	},
	{
		id: "square-3m",
		label: "Square Trailer · 10 ft",
		body: "square" as const,
		lengthM: 3,
		widthM: 2,
		heightM: 2.5,
		wrapSqm: 22,
		blurb: "Cheapest to wrap. Beverage / merch starter.",
	},
	{
		id: "square-4m",
		label: "Square Trailer · 13 ft",
		body: "square" as const,
		lengthM: 4,
		widthM: 2.1,
		heightM: 2.6,
		wrapSqm: 28,
		blurb: "Balanced food cart. Fryer OR griddle, not both.",
	},
	{
		id: "square-5m",
		label: "Square Trailer · 16 ft",
		body: "square" as const,
		lengthM: 5,
		widthM: 2.2,
		heightM: 2.6,
		wrapSqm: 34,
		blurb: "Full menu + drinks in one box.",
	},
] as const;

export type VehicleId = (typeof VEHICLES)[number]["id"];

export const BUSINESS_TYPES = [
	{
		id: "fried",
		label: "Fried Food & Fish and Chips",
		needs: ["fryer", "extraction-hood", "hand-basin", "refrigeration", "till"],
		note: "Fryer, extraction and power requirements shape the layout.",
	},
	{
		id: "grill",
		label: "Grill, Burgers & Barbecue",
		needs: [
			"griddle-chargrill",
			"extraction-hood",
			"hand-basin",
			"refrigeration",
			"till",
		],
		note: "Griddle, chargrill and hot-holding define the service line.",
	},
	{
		id: "pizza",
		label: "Pizza & Italian",
		needs: [
			"pizza-oven",
			"dough-prep",
			"extraction-hood",
			"hand-basin",
			"refrigeration",
		],
		note: "Oven choice and dough preparation drive space and extraction.",
	},
	{
		id: "asian",
		label: "Asian & World Kitchen",
		needs: [
			"wok-rice-station",
			"extraction-hood",
			"hand-basin",
			"refrigeration",
			"till",
		],
		note: "High-heat cooking and rapid servery shape the workflow.",
	},
	{
		id: "breakfast",
		label: "Breakfast & Brunch",
		needs: ["griddle", "coffee-machine", "hand-basin", "refrigeration", "till"],
		note: "Morning throughput, coffee and griddle define the plan.",
	},
	{
		id: "coffee",
		label: "Coffee & Espresso Bar",
		needs: [
			"espresso-machine",
			"grinder",
			"chilled-milk-storage",
			"hand-basin",
			"till",
		],
		note: "Water, power and bar flow are critical at peak service.",
	},
	{
		id: "cold-drinks",
		label: "Bubble Tea, Juices & Cold Drinks",
		needs: ["ice", "refrigeration", "prep-counter", "hand-basin", "till"],
		note: "Cold storage, ice and organized prep underpin the menu.",
	},
	{
		id: "bakery",
		label: "Bakery, Patisserie & Desserts",
		needs: [
			"display-case",
			"chilled-storage",
			"finishing-counter",
			"hand-basin",
			"till",
		],
		note: "Display, chilled storage and finishing space lead the design.",
	},
	{
		id: "ice-cream",
		label: "Ice Cream & Gelato",
		needs: ["freezers", "servery", "hand-basin", "till"],
		note: "Freezer capacity and servery flow shape power and layout.",
	},
	{
		id: "bar",
		label: "Mobile Bar & Pour",
		needs: ["pour-stations", "glass-wash", "refrigeration", "ice", "till"],
		note: "Cellar-style storage, glass wash and servery define the bar.",
	},
	{
		id: "retail",
		label: "Retail Boutique & Merchandise",
		needs: ["display-wall", "till", "secure-storage"],
		note: "Walk-in display and considered till flow maximizes conversion.",
	},
	{
		id: "combined",
		label: "Combined Food & Drink",
		needs: [
			"hot-station",
			"drinks-station",
			"hand-basin",
			"refrigeration",
			"till",
		],
		note: "A balanced hot line with a high-margin drinks station.",
	},
] as const;

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]["id"];

/** Retired ids still seen in older sessions — mapped forward, never shown. */
export const LEGACY_BUSINESS_ALIASES: Record<string, BusinessTypeId> = {
	beverage: "cold-drinks",
	merch: "retail",
	combo: "combined",
};

export const GUIDED_STEPS = [
	{ id: "brand", label: "Brand & business" },
	{ id: "vehicle", label: "Vehicle" },
	{ id: "layout", label: "Layout & equipment" },
	{ id: "wrap", label: "Wrap & signage" },
	{ id: "review", label: "Review & spec" },
] as const;

/**
 * Dimensions are stored metric (the factory's own drawings are metric) but
 * FTF sells into the US, so everything buyer-facing renders in feet.
 */
export function toFt(metres: number) {
	return Math.round(metres * 3.28084 * 10) / 10;
}

export function toSqft(sqm: number) {
	return Math.round(sqm * 10.7639);
}

/** Buyer-facing footprint string, e.g. `20 × 7.2 × 8.9 ft`. */
export function footprintFt(v: {
	lengthM: number;
	widthM: number;
	heightM: number;
}) {
	return `${toFt(v.lengthM)} × ${toFt(v.widthM)} × ${toFt(v.heightM)} ft`;
}

export const FREE_VISUAL_CREDITS = 5;

/**
 * The fixed geometry of each body, written out for the image model.
 *
 * Generations drift because a text brief alone never pins the shell down: one
 * view grows a hatch the next view has never heard of. Pairing a real catalog
 * photo with this description — and an instruction that only cosmetics may
 * change — is what keeps all nine views describing the same trailer, and what
 * keeps the render something the factory can actually build.
 */
export const VEHICLE_GEOMETRY: Record<"airstream" | "square", string> = {
	airstream:
		"riveted polished aluminium monocoque with a continuous rounded belt line, " +
		"curved nose and tail end caps, no square corners anywhere on the shell; " +
		"A-frame tongue and coupler at the front; single entry door on the curbside " +
		"(passenger side) toward the rear, hinged on its forward edge; one serving " +
		"hatch cut into the curbside ahead of the door, hinged along its top edge and " +
		"propped open upward as an awning; two roof vents and a rooftop HVAC unit; " +
		"single axle with a rounded wheel arch each side; stabilizer jacks at all four corners",
	square:
		"flat vertical side walls meeting a flat roof at square corners with a small " +
		"radius, bonded sheet skin over a welded frame; A-frame tongue and coupler at " +
		"the front; a rear door on the back wall, hinged on its curbside edge; single " +
		"entry door on the curbside toward the rear; one serving hatch cut into the " +
		"curbside ahead of the door, hinged along its top edge and propped open upward " +
		"as an awning; roof vents and a rooftop HVAC unit; single axle with a square " +
		"fender each side; stabilizer jacks at all four corners",
};

export function geometryFor(body: "airstream" | "square") {
	return VEHICLE_GEOMETRY[body];
}

export function getVehicle(id: string | null | undefined) {
	return VEHICLES.find((v) => v.id === id) ?? null;
}

export function getBusiness(id: string | null | undefined) {
	if (!id) return null;
	const direct = BUSINESS_TYPES.find((b) => b.id === id) ?? null;
	if (direct) return direct;
	const aliased = LEGACY_BUSINESS_ALIASES[id];
	if (aliased) return BUSINESS_TYPES.find((b) => b.id === aliased) ?? null;
	return null;
}
