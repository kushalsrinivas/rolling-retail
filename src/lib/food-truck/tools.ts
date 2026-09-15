import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
	BUSINESS_TYPES,
	getBusiness,
	getVehicle,
	LEGACY_BUSINESS_ALIASES,
	VEHICLES,
} from "./constants";

export interface LayoutResult {
	layoutName: string;
	serveMode: "hatch-serve" | "walk-in" | "hybrid";
	zones: string[];
	equipment: string[];
	powerNotes: string;
	complianceNotes: string[];
	why: string[];
}

export interface EstimateResult {
	vehicleLabel: string;
	wrapSqm: number;
	wrapTier: string;
	wrapLow: number;
	wrapHigh: number;
	signageLow: number;
	signageHigh: number;
	leadTimeWeeks: string;
	bom: Array<{ item: string; detail: string }>;
}

const RETAIL_TYPES = new Set(["retail"]);
const SERVE_OVER_COUNTER_TYPES = new Set([
	"coffee",
	"cold-drinks",
	"bakery",
	"ice-cream",
	"bar",
]);

const HOT_TYPES = new Set([
	"fried",
	"grill",
	"pizza",
	"asian",
	"breakfast",
	"combined",
]);

function hotStationFor(businessType: string): {
	station: string;
	equipment: string[];
} {
	switch (businessType) {
		case "fried":
			return {
				station: "Fryer bank under extraction (left), dump and heat lamp (right)",
				equipment: ["fryer", "extraction-hood", "fire-suppression"],
			};
		case "grill":
			return {
				station:
					"Griddle and chargrill under extraction (left), hot-hold gantry over pass (right)",
				equipment: ["griddle-chargrill", "extraction-hood", "fire-suppression"],
			};
		case "pizza":
			return {
				station:
					"Pizza oven under extraction (left), dough prep and finishing (right)",
				equipment: ["pizza-oven", "extraction-hood", "fire-suppression"],
			};
		case "asian":
			return {
				station:
					"Wok and rice station under extraction (left), rapid servery pass (right)",
				equipment: ["wok-rice-station", "extraction-hood", "fire-suppression"],
			};
		case "breakfast":
			return {
				station:
					"Griddle under extraction (left), coffee and toast finishing (right)",
				equipment: [
					"griddle",
					"coffee-machine",
					"extraction-hood",
					"fire-suppression",
				],
			};
		default:
			return {
				station:
					"Hot station under extraction (left), drinks end-cap with ice and refrigeration (right)",
				equipment: [
					"hot-station",
					"extraction-hood",
					"fire-suppression",
					"drinks-station",
				],
			};
	}
}

function serveryFor(businessType: string): {
	layoutName: string;
	stations: string[];
	equipment: string[];
	power: string;
	compliance: string[];
} {
	switch (businessType) {
		case "coffee":
			return {
				layoutName: "Espresso bar line",
				stations: [
					"Serve hatch with flip-up awning and fold-down counter",
					"Espresso machine and grinder on the bar run, chilled milk below",
					"Water filtration and hand basin at the end of the bar",
					"Menu board above the hatch, fascia sign on the roof edge",
				],
				equipment: [
					"espresso-machine",
					"grinder",
					"water-filtration",
					"under-counter-refrigeration",
					"hand-basin",
					"fresh-grey-water-tanks",
					"till",
					"digital-menu-board",
				],
				power:
					"Espresso and refrigeration need mains hook-up with generator provision. Battery alone will not carry peak service.",
				compliance: [
					"Hand basin and enclosed water tanks are required for council sign-off in most UK boroughs.",
				],
			};
		case "bakery":
			return {
				layoutName: "Patisserie servery",
				stations: [
					"Serve hatch with display case at customer height",
					"Chilled storage and dry store directly behind the counter",
					"Finishing counter with hand basin at the end of the run",
					"Menu board above the hatch, fascia sign on the roof edge",
				],
				equipment: [
					"display-case",
					"chilled-storage",
					"finishing-counter",
					"hand-basin",
					"fresh-grey-water-tanks",
					"till",
					"digital-menu-board",
				],
				power:
					"Chilled display and lighting suit mains hook-up with battery support for short off-grid pitches.",
				compliance: [
					"Hand basin and enclosed water tanks are required for council sign-off in most UK boroughs.",
				],
			};
		case "ice-cream":
			return {
				layoutName: "Gelato servery",
				stations: [
					"Serve hatch with dipping cabinet at customer height",
					"Reserve freezers and dry store directly behind the counter",
					"Hand basin at the end of the run, cone and sauce station by the hatch",
					"Menu board above the hatch, fascia sign on the roof edge",
				],
				equipment: [
					"dipping-cabinet",
					"reserve-freezers",
					"hand-basin",
					"till",
					"digital-menu-board",
				],
				power:
					"Freezers need continuous power. Specify mains hook-up with generator provision for all-day trading.",
				compliance: [
					"Hand basin and enclosed water tanks are required for council sign-off in most UK boroughs.",
				],
			};
		case "bar":
			return {
				layoutName: "Mobile bar line",
				stations: [
					"Serve hatch with pour stations facing the queue",
					"Cellar-style chilled storage and ice directly under the hatch",
					"Glass wash and hand basin at the end of the bar",
					"Back-bar display and menu board above the hatch",
				],
				equipment: [
					"pour-stations",
					"glass-wash",
					"cellar-refrigeration",
					"ice",
					"hand-basin",
					"till",
					"digital-menu-board",
				],
				power:
					"Refrigeration and glass wash need mains hook-up with generator provision for evening service.",
				compliance: [
					"Alcohol service usually needs a Temporary Event Notice or premises licence — confirm with the council early.",
					"Hand basin and enclosed water tanks are required for council sign-off in most UK boroughs.",
				],
			};
		default:
			return {
				layoutName: "Cold drinks servery",
				stations: [
					"Serve hatch with flip-up awning and fold-down counter",
					"Ice and under-counter refrigeration directly under the hatch",
					"Prep run with hand basin at the end of the line",
					"Menu board above the hatch, fascia sign on the roof edge",
				],
				equipment: [
					"ice",
					"under-counter-refrigeration",
					"prep-counter",
					"hand-basin",
					"fresh-grey-water-tanks",
					"till",
					"digital-menu-board",
				],
				power:
					"Ice and refrigeration need mains hook-up with generator provision. Battery alone will not carry a full trading day.",
				compliance: [
					"Hand basin and enclosed water tanks are required for council sign-off in most UK boroughs.",
				],
			};
	}
}

export function layoutFor(
	businessType: string,
	vehicleId: string,
	walkIn: boolean,
): LayoutResult {
	const normalised =
		(LEGACY_BUSINESS_ALIASES[businessType] as string | undefined) ??
		businessType;
	const business = getBusiness(normalised);
	const vehicle = getVehicle(vehicleId);
	const body = vehicle?.body ?? "square";
	const long = (vehicle?.lengthM ?? 4) >= 5;

	if (RETAIL_TYPES.has(normalised)) {
		return {
			layoutName: walkIn ? "Walk-in boutique" : "Hybrid serve with step-in",
			serveMode: walkIn ? "walk-in" : "hybrid",
			zones: [
				"Entry and queue outside with A-board menu",
				"Display wall with lockable overnight storage",
				"Till counter near the door for throughput",
				long ? "Rear stockroom (around 20% of the unit)" : "Under-counter stock",
			],
			equipment: [
				"display-wall",
				"till",
				"secure-storage",
				"led-track-lights",
				"hvac-optional",
			],
			powerNotes:
				"Light power pack: lighting, till and device charging. No extraction load, so battery with mains hook-up covers a full day.",
			complianceNotes: [
				"No hot-food approval route — the fastest factory lead time.",
				"Keep an 800mm clear egress route if customers step inside.",
			],
			why: [
				`${vehicle?.label ?? "This unit"} fits a step-in aisle without rebuilding the shell.`,
				"Till at the door keeps the queue moving during busy periods.",
			],
		};
	}

	if (SERVE_OVER_COUNTER_TYPES.has(normalised)) {
		const servery = serveryFor(normalised);
		return {
			layoutName:
				body === "airstream" && normalised === "coffee"
					? "Airstream espresso bar"
					: servery.layoutName,
			serveMode: walkIn ? "hybrid" : "hatch-serve",
			zones: servery.stations,
			equipment: servery.equipment,
			powerNotes: servery.power,
			complianceNotes: servery.compliance,
			why: [
				"Cold chain directly under the hatch means fewer steps per order.",
				"An organised menu board above the hatch supports average order value.",
			],
		};
	}

	// Hot-food family: fried, grill, pizza, asian, breakfast, combined
	const hot = hotStationFor(HOT_TYPES.has(normalised) ? normalised : "combined");
	return {
		layoutName: long ? "Full hot line with drinks station" : "Compact hot line",
		serveMode: walkIn ? "hybrid" : "hatch-serve",
		zones: [
			"Serve hatch centred on the long wall",
			hot.station,
			"Hand basin at the line entry — the first thing an officer sees",
			"Drinks station with ice and refrigeration (supports margin)",
			"Till at the hatch corner, separated from the food pass",
		],
		equipment: [
			...hot.equipment,
			"hand-basin",
			"ice",
			"under-counter-refrigeration",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
			...(walkIn ? ["rear-walk-in-door", "hvac"] : ["hvac-optional"]),
		],
		powerNotes:
			"A hot line needs mains power. Extraction, cooking equipment and climate control rarely coexist on battery — plan mains hook-up with a generator inlet from day one.",
		complianceNotes: [
			`${business?.label ?? "Hot food"} requires extraction, fire suppression and a hand basin in the factory base build.`,
			"Buyer-supplied appliance models must be confirmed before cut-outs — no on-site cutting.",
		],
		why: [
			`${vehicle?.label ?? "This unit"} ${long ? "has room for a full hot station and a drinks station." : "suits one focused hot station, with drinks supporting margin."}`,
			"Till separated from the food pass avoids congestion at the hatch.",
		],
	};
}

function estimateFor(
	vehicleId: string,
	wrapTier: string,
	signage: string[],
	menuBoard: boolean,
	hvac: boolean,
): EstimateResult {
	const vehicle = getVehicle(vehicleId);
	const wrapSqm = vehicle?.wrapSqm ?? 30;
	const premium =
		wrapTier.toLowerCase().includes("3m") ||
		wrapTier.toLowerCase().includes("premium");
	// Factory planning numbers (wrap film + labor), intentionally ranges not quotes.
	const perSqmLow = premium ? 95 : 55;
	const perSqmHigh = premium ? 140 : 85;
	const wrapLow = Math.round(wrapSqm * perSqmLow);
	const wrapHigh = Math.round(wrapSqm * perSqmHigh);
	const signageLow =
		signage.length * 250 + (menuBoard ? 900 : 0) + (hvac ? 0 : 0);
	const signageHigh = signage.length * 600 + (menuBoard ? 2200 : 0);
	const bom: EstimateResult["bom"] = [
		{
			item: vehicle?.label ?? "Trailer",
			detail: `${vehicle?.lengthM ?? 4}m box · factory base build`,
		},
		{
			item: `Wrap film (${premium ? "3M premium" : "standard"})`,
			detail: `~${wrapSqm} sqm incl. waste + seams`,
		},
		...signage.map((s) => ({ item: "Signage", detail: s })),
		...(menuBoard
			? [
					{
						item: "Digital menu board",
						detail:
							"rugged, weather-sealed · specify update method (USB / Wi-Fi / HDMI)",
					},
				]
			: []),
		...(hvac
			? [
					{
						item: "HVAC",
						detail: "roof unit · required for walk-in / hot climates",
					},
				]
			: []),
		{
			item: "Hand sink + tanks",
			detail: "required for any food/beverage path",
		},
	];
	return {
		vehicleLabel: vehicle?.label ?? vehicleId,
		wrapSqm,
		wrapTier: premium ? "3M premium" : "standard",
		wrapLow,
		wrapHigh,
		signageLow,
		signageHigh,
		leadTimeWeeks: "6–10 weeks after visual sign-off (wrap and build scheduling)",
		bom,
	};
}

export function createFoodTruckTools() {
	const recommendLayout = new DynamicStructuredTool({
		name: "recommend_layout",
		description:
			"Recommend a factory-buildable interior layout. Call once business type + vehicle + walk-in preference are known. Encodes hot-line, servery and walk-in retail rules.",
		schema: z.object({
			businessType: z
				.enum([
					"fried",
					"grill",
					"pizza",
					"asian",
					"breakfast",
					"coffee",
					"cold-drinks",
					"bakery",
					"ice-cream",
					"bar",
					"retail",
					"combined",
				])
				.describe("What the buyer sells"),
			vehicleId: z
				.string()
				.describe(`One of: ${VEHICLES.map((v) => v.id).join(", ")}`),
			walkIn: z
				.boolean()
				.describe("True if the public walks inside the vehicle"),
		}),
		func: async ({ businessType, vehicleId, walkIn }) => {
			const result = layoutFor(businessType, vehicleId, walkIn);
			return JSON.stringify(result);
		},
	});

	const estimateBuild = new DynamicStructuredTool({
		name: "estimate_build",
		description:
			"Estimate wrap area (sqm), wrap + signage cost ranges, BOM and lead time. Call when wrap tier / signage / menu board / HVAC are discussed. Returns RANGES, never a final quote.",
		schema: z.object({
			vehicleId: z
				.string()
				.describe(`One of: ${VEHICLES.map((v) => v.id).join(", ")}`),
			wrapTier: z.string().describe("'3M premium' or 'standard'"),
			signage: z
				.array(z.string())
				.default([])
				.describe("e.g. ['roof blade sign','window vinyl']"),
			menuBoard: z.boolean().default(false),
			hvac: z.boolean().default(false),
		}),
		func: async ({ vehicleId, wrapTier, signage, menuBoard, hvac }) => {
			return JSON.stringify(
				estimateFor(vehicleId, wrapTier, signage, menuBoard, hvac),
			);
		},
	});

	const buildSpecSheet = new DynamicStructuredTool({
		name: "build_spec_sheet",
		description:
			"Build the buyer-facing spec sheet (investor one-pager + factory handover). Call at review time when brand, business, vehicle, equipment and colours are settled.",
		schema: z.object({
			brandName: z.string(),
			businessType: z.string(),
			vehicleId: z.string(),
			equipment: z.array(z.string()).default([]),
			brandColors: z.array(z.string()).default([]),
			contact: z
				.string()
				.default("")
				.describe("Buyer name and contact details for factory follow-up"),
		}),
		func: async ({
			brandName,
			businessType,
			vehicleId,
			equipment,
			brandColors,
			contact,
		}) => {
			const vehicle = getVehicle(vehicleId);
			const business = getBusiness(businessType);
			const spec = {
				brandName,
				business: business?.label ?? businessType,
				vehicle: vehicle?.label ?? vehicleId,
				footprintM: vehicle
					? `${vehicle.lengthM} × ${vehicle.widthM} × ${vehicle.heightM}h`
					: "tbd",
				equipment,
				brandColors,
				buyerContact: contact || "Not captured yet — the factory should follow up",
				privacy:
					"Each buyer design is private to that buyer. The factory will not reproduce it for competitors without consent.",
				nextSteps: [
					"Factory confirms cut-outs against buyer-supplied appliance models",
					"Visual sign-off, deposit, then build slot",
					"Progress photographs shared during the build",
				],
			};
			return JSON.stringify(spec);
		},
	});

	const saveLead = new DynamicStructuredTool({
		name: "save_lead",
		description:
			"Save the factory lead handover: full chat summary + buyer contact + chosen configuration. Call once at the end (or when the buyer goes quiet) so sales can follow up.",
		schema: z.object({
			brandName: z.string(),
			contact: z.string().describe("Name and contact details"),
			summary: z
				.string()
				.describe(
					"2-4 sentence buyer summary: concept, vehicle, budget signals",
				),
			stage: z
				.string()
				.default("new")
				.describe("new | designing | quoted | cold"),
		}),
		func: async ({ brandName, contact, summary, stage }) => {
			// Persisted by the API route (in-memory + JSONL log). Tool returns the record.
			return JSON.stringify({
				saved: true,
				brandName,
				contact,
				stage,
				summary,
				capturedAt: new Date().toISOString(),
				pipelineNote:
					"Surfaced in factory pipeline as a non-converted designer session for follow-up.",
			});
		},
	});

	return { recommendLayout, estimateBuild, buildSpecSheet, saveLead };
}

export const TOOL_LIST_HINT = `Available tools: recommend_layout, estimate_build, build_spec_sheet, save_lead. Business types: ${BUSINESS_TYPES.map((b) => b.id).join(", ")}. Vehicles: ${VEHICLES.map((v) => v.id).join(", ")}.`;
