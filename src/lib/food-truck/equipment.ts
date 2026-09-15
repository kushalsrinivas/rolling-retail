/**
 * The equipment catalogue behind the 3D configurator.
 *
 * Food trucks draw from a small, predictable set of appliances, so the fit-out
 * can be modelled in code rather than generated: real footprints, real power
 * draw, arranged along the galley by service order. That is what makes the 3D
 * view the source of truth — change the business type and the layout, the
 * power budget and every generated camera angle all follow from here.
 *
 * Dimensions are metres, matching VEHICLES. Power is watts at 120/240V, taken
 * from typical commercial single-phase equipment; they are planning figures,
 * not a spec any one manufacturer's model will match exactly.
 */

/** Where a unit sits in the service run, low number = closer to the hatch front. */
export type EquipmentZone =
	| "service"
	| "cold"
	| "hot"
	| "prep"
	| "sink"
	| "storage";

export interface EquipmentSpec {
	id: string;
	label: string;
	zone: EquipmentZone;
	/** Along the galley run. */
	widthM: number;
	/** Wall to aisle. */
	depthM: number;
	heightM: number;
	watts: number;
	/**
	 * Where the unit lives. Only "floor" consumes galley run — a canopy hangs
	 * over the line, a till sits on the counter, and water tanks live under the
	 * deck, so none of them shorten the run or narrow the aisle.
	 */
	mount?: EquipmentMount;
}

export type EquipmentMount = "floor" | "overhead" | "counter" | "subfloor";

/** Anything not standing on the floor rides along without taking run. */
function takesRun(spec: EquipmentSpec) {
	return (spec.mount ?? "floor") === "floor";
}

const SPECS: EquipmentSpec[] = [
	// ── Service ──
	{
		id: "till",
		label: "POS / till",
		zone: "service",
		widthM: 0.35,
		depthM: 0.4,
		heightM: 0.3,
		watts: 150,
		mount: "counter",
	},
	{
		id: "servery",
		label: "Servery counter",
		zone: "service",
		widthM: 1.0,
		depthM: 0.7,
		heightM: 0.9,
		watts: 0,
	},
	{
		id: "display-case",
		label: "Refrigerated display case",
		zone: "service",
		widthM: 1.2,
		depthM: 0.7,
		heightM: 1.2,
		watts: 600,
	},
	{
		id: "display-wall",
		label: "Merchandise display wall",
		zone: "service",
		widthM: 1.6,
		depthM: 0.35,
		heightM: 1.8,
		watts: 100,
	},
	{
		id: "pour-stations",
		label: "Pour stations",
		zone: "service",
		widthM: 1.2,
		depthM: 0.6,
		heightM: 0.9,
		watts: 0,
	},

	// ── Hot line ──
	{
		id: "fryer",
		label: "Twin-basket fryer",
		zone: "hot",
		widthM: 0.4,
		depthM: 0.7,
		heightM: 0.9,
		watts: 14000,
	},
	{
		id: "griddle",
		label: "Flat-top griddle",
		zone: "hot",
		widthM: 0.9,
		depthM: 0.7,
		heightM: 0.9,
		watts: 7200,
	},
	{
		id: "griddle-chargrill",
		label: "Griddle + chargrill",
		zone: "hot",
		widthM: 1.2,
		depthM: 0.7,
		heightM: 0.9,
		watts: 10800,
	},
	{
		id: "pizza-oven",
		label: "Deck pizza oven",
		zone: "hot",
		widthM: 1.1,
		depthM: 0.85,
		heightM: 1.4,
		watts: 6600,
	},
	{
		id: "wok-rice-station",
		label: "Wok + rice station",
		zone: "hot",
		widthM: 1.0,
		depthM: 0.75,
		heightM: 0.9,
		watts: 8000,
	},
	{
		id: "hot-station",
		label: "Hot station",
		zone: "hot",
		widthM: 1.1,
		depthM: 0.7,
		heightM: 0.9,
		watts: 9000,
	},
	{
		id: "extraction-hood",
		label: "Extraction canopy",
		zone: "hot",
		widthM: 1.8,
		depthM: 0.8,
		heightM: 0.5,
		watts: 750,
		mount: "overhead",
	},

	// ── Drinks / coffee ──
	{
		id: "coffee-machine",
		label: "Batch coffee brewer",
		zone: "prep",
		widthM: 0.5,
		depthM: 0.5,
		heightM: 0.6,
		watts: 3000,
		mount: "counter",
	},
	{
		id: "espresso-machine",
		label: "Two-group espresso machine",
		zone: "prep",
		widthM: 0.75,
		depthM: 0.55,
		heightM: 0.55,
		watts: 4200,
		mount: "counter",
	},
	{
		id: "grinder",
		label: "Espresso grinder",
		zone: "prep",
		widthM: 0.2,
		depthM: 0.35,
		heightM: 0.6,
		watts: 400,
		mount: "counter",
	},
	{
		id: "drinks-station",
		label: "Drinks station",
		zone: "prep",
		widthM: 0.9,
		depthM: 0.7,
		heightM: 0.9,
		watts: 1200,
	},
	{
		id: "ice",
		label: "Ice machine / well",
		zone: "cold",
		widthM: 0.6,
		depthM: 0.6,
		heightM: 0.9,
		watts: 800,
	},
	{
		id: "glass-wash",
		label: "Glass washer",
		zone: "sink",
		widthM: 0.6,
		depthM: 0.6,
		heightM: 0.85,
		watts: 3000,
	},

	// ── Cold ──
	{
		id: "refrigeration",
		label: "Under-counter refrigeration",
		zone: "cold",
		widthM: 0.7,
		depthM: 0.7,
		heightM: 0.9,
		watts: 400,
	},
	{
		id: "chilled-storage",
		label: "Chilled storage",
		zone: "cold",
		widthM: 0.7,
		depthM: 0.7,
		heightM: 0.9,
		watts: 500,
	},
	{
		id: "chilled-milk-storage",
		label: "Chilled milk storage",
		zone: "cold",
		widthM: 0.45,
		depthM: 0.6,
		heightM: 0.9,
		watts: 200,
	},
	{
		id: "freezers",
		label: "Freezer wells",
		zone: "cold",
		widthM: 1.0,
		depthM: 0.7,
		heightM: 0.9,
		watts: 900,
	},

	// ── Prep ──
	{
		id: "prep-counter",
		label: "Prep counter",
		zone: "prep",
		widthM: 0.9,
		depthM: 0.7,
		heightM: 0.9,
		watts: 0,
	},
	{
		id: "finishing-counter",
		label: "Finishing counter",
		zone: "prep",
		widthM: 0.9,
		depthM: 0.7,
		heightM: 0.9,
		watts: 0,
	},
	{
		id: "dough-prep",
		label: "Dough prep + mixer",
		zone: "prep",
		widthM: 0.8,
		depthM: 0.7,
		heightM: 0.9,
		watts: 370,
	},

	// ── Hygiene / storage ──
	{
		id: "hand-basin",
		label: "Hand sink",
		zone: "sink",
		widthM: 0.4,
		depthM: 0.4,
		heightM: 0.9,
		watts: 0,
	},
	{
		id: "secure-storage",
		label: "Secure storage",
		zone: "storage",
		widthM: 0.6,
		depthM: 0.6,
		heightM: 1.8,
		watts: 0,
	},

	// ── Names layoutFor emits for the base build. These are part of what the
	// factory fits as standard, so they belong in the power budget and the
	// model even though nobody picks them off a menu. ──
	{
		id: "fire-suppression",
		label: "Ansul fire suppression",
		zone: "hot",
		widthM: 1.8,
		depthM: 0.3,
		heightM: 0.2,
		watts: 0,
		mount: "overhead",
	},
	{
		id: "fresh-grey-water-tanks",
		label: "Fresh + grey water tanks",
		zone: "sink",
		widthM: 0.9,
		depthM: 0.5,
		heightM: 0.45,
		watts: 0,
		mount: "subfloor",
	},
	{
		id: "water-filtration",
		label: "Water filtration",
		zone: "sink",
		widthM: 0.3,
		depthM: 0.25,
		heightM: 0.5,
		watts: 0,
		mount: "subfloor",
	},
	{
		id: "digital-menu-board",
		label: "Digital menu board",
		zone: "service",
		widthM: 1.1,
		depthM: 0.08,
		heightM: 0.6,
		watts: 180,
		mount: "overhead",
	},
	{
		id: "led-track-lights",
		label: "LED track lighting",
		zone: "service",
		widthM: 1.6,
		depthM: 0.08,
		heightM: 0.08,
		watts: 120,
		mount: "overhead",
	},
	{
		id: "hvac",
		label: "Rooftop HVAC",
		zone: "storage",
		widthM: 0.9,
		depthM: 0.75,
		heightM: 0.3,
		watts: 1500,
		mount: "overhead",
	},
	{
		id: "rear-walk-in-door",
		label: "Rear walk-in door",
		zone: "service",
		widthM: 0.8,
		depthM: 0.08,
		heightM: 1.9,
		watts: 0,
		mount: "overhead",
	},
	{
		id: "cellar-refrigeration",
		label: "Cellar refrigeration",
		zone: "cold",
		widthM: 0.9,
		depthM: 0.7,
		heightM: 0.9,
		watts: 700,
	},
	{
		id: "reserve-freezers",
		label: "Reserve freezers",
		zone: "cold",
		widthM: 0.8,
		depthM: 0.7,
		heightM: 0.9,
		watts: 700,
	},
	{
		id: "dipping-cabinet",
		label: "Gelato dipping cabinet",
		zone: "cold",
		widthM: 1.2,
		depthM: 0.75,
		heightM: 1.1,
		watts: 1100,
	},
];

const BY_ID = new Map(SPECS.map((s) => [s.id, s]));

/**
 * layoutFor names a few units differently from BUSINESS_TYPES.needs. Rather
 * than have two catalogues drift apart, both vocabularies resolve here.
 */
const ALIASES: Record<string, string> = {
	"under-counter-refrigeration": "refrigeration",
	"hvac-optional": "hvac",
	"chilled-milk": "chilled-milk-storage",
	"ice-well": "ice",
	pos: "till",
};

export function getEquipment(id: string): EquipmentSpec | null {
	return BY_ID.get(id) ?? BY_ID.get(ALIASES[id] ?? "") ?? null;
}

export function allEquipment(): EquipmentSpec[] {
	return [...SPECS];
}

/**
 * Service order along the galley. The hand sink comes first because it is the
 * first thing a health inspector looks for, and the hot line sits mid-run under
 * the canopy rather than beside the till.
 */
const ZONE_ORDER: EquipmentZone[] = [
	"sink",
	"service",
	"hot",
	"prep",
	"cold",
	"storage",
];

export interface PlacedEquipment {
	spec: EquipmentSpec;
	/** Distance from the front of the box to this unit's near edge, metres. */
	offsetM: number;
	/** "curbside" is the serving side; overflow runs down the opposite wall. */
	wall: "curbside" | "streetside";
}

export interface GalleyLayout {
	placed: PlacedEquipment[];
	/** Units that did not fit on either wall. */
	overflow: EquipmentSpec[];
	/** Clear walking aisle between the two runs, metres. */
	aisleM: number;
	usableRunM: number;
	/** Dead length at each end of the box. */
	marginM: number;
	curbsideUsedM: number;
	streetsideUsedM: number;
}

/**
 * Nose and tail are not usable galley. On a box trailer that is just structure;
 * on an Airstream the shell curves inward, so a counter pushed to the end would
 * pass straight through the skin — the margin has to follow the body.
 */
export function galleyMarginM(vehicle: {
	widthM: number;
	heightM?: number;
	body?: string;
}) {
	if (vehicle.body !== "airstream") return 0.35;
	const radius =
		Math.min(vehicle.widthM, vehicle.heightM ?? vehicle.widthM) * 0.42;
	return Math.round(Math.max(0.35, radius * 0.85) * 100) / 100;
}
/** A commercial kitchen needs a working aisle; below this the layout is unbuildable. */
export const MIN_AISLE_M = 0.75;

/**
 * Lay the equipment out along the box. Units run down the curbside (serving)
 * wall in service order and spill onto the streetside wall when that runs out.
 * Overhead and countertop units ride above other equipment and take no run.
 */
export function planGalley(
	equipmentIds: string[],
	vehicle: {
		lengthM: number;
		widthM: number;
		heightM?: number;
		body?: string;
	},
): GalleyLayout {
	const marginM = galleyMarginM(vehicle);
	const usableRunM = Math.max(0, vehicle.lengthM - marginM * 2);
	// Aliases mean two ids can resolve to one unit; place it once.
	const specs = Array.from(
		new Map(
			equipmentIds
				.map(getEquipment)
				.filter((s): s is EquipmentSpec => s !== null)
				.map((s) => [s.id, s]),
		).values(),
	);

	const floorUnits = specs.filter(takesRun);
	const riders = specs.filter((s) => !takesRun(s));

	floorUnits.sort(
		(a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone),
	);

	const placed: PlacedEquipment[] = [];
	const overflow: EquipmentSpec[] = [];
	let curbside = 0;
	let streetside = 0;

	for (const spec of floorUnits) {
		if (curbside + spec.widthM <= usableRunM) {
			placed.push({ spec, offsetM: curbside, wall: "curbside" });
			curbside += spec.widthM;
		} else if (streetside + spec.widthM <= usableRunM) {
			placed.push({ spec, offsetM: streetside, wall: "streetside" });
			streetside += spec.widthM;
		} else {
			overflow.push(spec);
		}
	}

	// Riders sit over the run they belong to — the canopy over the hot line,
	// the till and espresso machine on the service counter.
	for (const spec of riders) {
		const anchor = placed.find((p) => p.spec.zone === spec.zone);
		placed.push({
			spec,
			offsetM: anchor?.offsetM ?? 0,
			wall: anchor?.wall ?? "curbside",
		});
	}

	// Depth taken by a run of equipment, for the aisle that is left.
	const depthOf = (wall: "curbside" | "streetside") =>
		placed
			.filter((p) => p.wall === wall && takesRun(p.spec))
			.reduce((max, p) => Math.max(max, p.spec.depthM), 0);

	return {
		placed,
		overflow,
		aisleM:
			Math.round(
				(vehicle.widthM - depthOf("curbside") - depthOf("streetside")) * 100,
			) / 100,
		usableRunM,
		marginM,
		curbsideUsedM: Math.round(curbside * 100) / 100,
		streetsideUsedM: Math.round(streetside * 100) / 100,
	};
}

export interface PowerBudget {
	totalWatts: number;
	/** Diversified load — nothing runs everything flat out at once. */
	designWatts: number;
	ampsAt240V: number;
	/** The shore supply this needs: 30A, 50A, or a generator. */
	supply: "30A / 240V" | "50A / 240V" | "generator or dual feed";
	overShore: boolean;
	byUnit: Array<{ label: string; watts: number }>;
}

/**
 * Diversity factor: a kitchen never draws every appliance's nameplate rating
 * simultaneously. 0.7 is the usual planning allowance for a single hot line.
 */
const DIVERSITY = 0.7;
const SHORE_50A_WATTS = 12_000;
const SHORE_30A_WATTS = 7_200;

export function powerBudget(equipmentIds: string[]): PowerBudget {
	const specs = Array.from(
		new Map(
			equipmentIds
				.map(getEquipment)
				.filter((s): s is EquipmentSpec => s !== null)
				.map((s) => [s.id, s]),
		).values(),
	);

	const byUnit = specs
		.filter((s) => s.watts > 0)
		.map((s) => ({ label: s.label, watts: s.watts }))
		.sort((a, b) => b.watts - a.watts);

	const totalWatts = byUnit.reduce((sum, u) => sum + u.watts, 0);
	const designWatts = Math.round(totalWatts * DIVERSITY);
	const supply =
		designWatts <= SHORE_30A_WATTS
			? "30A / 240V"
			: designWatts <= SHORE_50A_WATTS
				? "50A / 240V"
				: "generator or dual feed";

	return {
		totalWatts,
		designWatts,
		ampsAt240V: Math.round((designWatts / 240) * 10) / 10,
		supply,
		overShore: designWatts > SHORE_50A_WATTS,
		byUnit,
	};
}
