/**
 * The six bodies we build, as product pages.
 *
 * Dimensions come from VEHICLES — the same numbers the designer, the renders
 * and the spec sheet use — so a product page can never disagree with the
 * configurator. Planning ranges are the only figures that live here.
 *
 * PLANNING RANGES: typical all-in builds (shell, base build, one equipment
 * line, standard wrap) for budgeting. Sales confirms them against the
 * current price book; every page labels them as ranges, not quotes.
 */
import {
	getVehicle,
	toFt,
	toSqft,
	type VehicleId,
} from "#/lib/food-truck/constants";

export interface TruckModel {
	slug: string;
	vehicleId: VehicleId;
	name: string;
	/** Short positioning line. */
	headline: string;
	summary: string;
	bestFor: string[];
	notFor: string[];
	/** Use-case slugs this body is the default for. */
	useCases: string[];
	planningRange: [number, number];
	highlights: string[];
	crew: string;
	peak: string;
}

export const TRUCKS: TruckModel[] = [
	{
		slug: "square-trailer-10ft",
		vehicleId: "square-3m",
		name: "Square Trailer 10 ft",
		headline: "The lowest-cost way to start trading.",
		summary:
			"A compact concession trailer for one cold or coffee line. Light enough for a mid-size pickup, cheap to wrap, and simple to permit because there is no hot-food line to approve.",
		bestFor: [
			"Coffee and espresso",
			"Boba and juice",
			"Ice cream",
			"Hatch-serve merch",
		],
		notFor: ["Hot food lines", "Walk-in retail"],
		useCases: ["coffee-trailer", "boba-tea-trailer", "ice-cream-trailer"],
		planningRange: [45000, 70000],
		highlights: [
			"Smallest wrap area in the range",
			"One operator at a time, two at peak",
			"No extraction or fire suppression needed for cold lines",
		],
		crew: "1–2",
		peak: "Up to ~60 orders/hour on a cold line",
	},
	{
		slug: "square-trailer-13ft",
		vehicleId: "square-4m",
		name: "Square Trailer 13 ft",
		headline: "The balanced build for one hot line.",
		summary:
			"Room for a single hot station under extraction, cold support and a drinks end-cap. It is the trailer we recommend most often to a first-time operator with a hot menu.",
		bestFor: ["Tacos", "Burgers and grill", "Breakfast", "High-volume coffee"],
		notFor: ["Two hot stations (fryer AND griddle)", "Walk-in retail"],
		useCases: ["taco-trailer", "burger-trailer"],
		planningRange: [60000, 95000],
		highlights: [
			"One griddle, fryer or oven — never a row of them",
			"Propane cooking under a UL 300 suppression system",
			"Fits a 30A or 50A shore feed for the electrics",
		],
		crew: "2–3",
		peak: "~60–120 orders/hour with a focused menu",
	},
	{
		slug: "square-trailer-16ft",
		vehicleId: "square-5m",
		name: "Square Trailer 16 ft",
		headline: "Full menu and drinks in one box.",
		summary:
			"The longest square body. It carries a hot line plus a dedicated drinks station, so two people never cross paths at peak. Built for festivals, stadium pitches and catering.",
		bestFor: ["Pizza", "Festival main-stage volume", "Combined food and drink"],
		notFor: ["Tight city curbs", "Light tow vehicles"],
		useCases: ["pizza-trailer"],
		planningRange: [75000, 120000],
		highlights: [
			"Separate drinks station protects the food line",
			"Room for a deck oven and dough prep",
			"Rear door for stock loading",
		],
		crew: "3–4",
		peak: "120+ orders/hour with a tuned menu",
	},
	{
		slug: "airstream-small",
		vehicleId: "airstream-s",
		name: "Airstream Small",
		headline: "Maximum curb appeal, minimum weight.",
		summary:
			"The iconic riveted aluminum shell at its most compact. It photographs better than any other body we build, which is why coffee brands, weddings and premium caterers choose it.",
		bestFor: [
			"Specialty coffee",
			"Wine and spritz bars",
			"Weddings and private hire",
		],
		notFor: ["Hot food at volume", "Walk-in retail"],
		useCases: ["coffee-trailer", "mobile-bar-trailer"],
		planningRange: [85000, 125000],
		highlights: [
			"Polished aluminum with a belt-line wrap band",
			"Single serving hatch with a lift-up awning door",
			"The strongest brand presence per square foot",
		],
		crew: "1–2",
		peak: "~40–80 orders/hour",
	},
	{
		slug: "airstream-mid",
		vehicleId: "airstream-m",
		name: "Airstream Mid",
		headline: "Our best-seller: a real kitchen in an icon.",
		summary:
			"Long enough for one hot station with cold support, or a full bar. The Mid is the body most of our hatch-serve Airstream builds start from.",
		bestFor: [
			"Burgers and grill",
			"Mobile bars",
			"Premium tacos",
			"Brewery residencies",
		],
		notFor: ["Walk-in retail", "Two hot stations"],
		useCases: ["burger-trailer", "mobile-bar-trailer", "taco-trailer"],
		planningRange: [110000, 160000],
		highlights: [
			"One hot station under extraction, or a full pour line",
			"Hatch-serve or walk-in layouts",
			"Rooftop HVAC for hot climates",
		],
		crew: "2–3",
		peak: "~60–100 orders/hour",
	},
	{
		slug: "airstream-large",
		vehicleId: "airstream-l",
		name: "Airstream Large",
		headline: "A walk-in store on wheels.",
		summary:
			"Customers step inside. The Large is a boutique, a brand experience or a product demo space — never a hot kitchen. It is the body brands use for tours and launches.",
		bestFor: [
			"Retail pop-ups",
			"Brand activations",
			"Product demos",
			"Merch tours",
		],
		notFor: ["Any hot food line"],
		useCases: ["retail-popup-trailer"],
		planningRange: [140000, 200000],
		highlights: [
			"Walk-in floor plan with a display wall",
			"Till near the door for throughput",
			"Lockable overnight stock storage",
		],
		crew: "2–3",
		peak: "Dwell-time retail, not queue volume",
	},
];

export function getTruck(slug: string): TruckModel | undefined {
	return TRUCKS.find((t) => t.slug === slug);
}

export function truckForVehicle(vehicleId: string): TruckModel | undefined {
	return TRUCKS.find((t) => t.vehicleId === vehicleId);
}

export function truckSpecs(t: TruckModel) {
	const v = getVehicle(t.vehicleId);
	if (!v) return null;
	return {
		body:
			v.body === "airstream"
				? "Riveted aluminum Airstream"
				: "Square steel-frame trailer",
		lengthFt: toFt(v.lengthM),
		widthFt: toFt(v.widthM),
		heightFt: toFt(v.heightM),
		wrapSqft: toSqft(v.wrapSqm),
		lengthM: v.lengthM,
	};
}

export function usd(n: number): string {
	return `$${Math.round(n / 1000)}k`;
}

export function rangeLabel(r: readonly [number, number]): string {
	return `${usd(r[0])}–${usd(r[1])}`;
}
