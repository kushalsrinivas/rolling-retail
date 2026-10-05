import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
	BUSINESS_TYPES,
	footprintFt,
	getBusiness,
	getVehicle,
	LEGACY_BUSINESS_ALIASES,
	toFt,
	toSqft,
	VEHICLES,
} from "./constants";
import { lineProfileFor } from "./line-profile";

export interface LayoutResult {
	layoutName: string;
	serveMode: "hatch-serve" | "walk-in" | "hybrid";
	zones: string[];
	equipment: string[];
	powerNotes: string;
	complianceNotes: string[];
	why: string[];
	/**
	 * Whether the body fits the business. A hot cooking line on the Large is
	 * "wrong" — the Large is a walk-in merch/experience body, never a hot
	 * F&B kitchen — so the agent steers the menu to a smaller body instead
	 * of briefing an unbuildable kitchen.
	 */
	vehicleFit: "fit" | "stretch" | "wrong";
	vehicleNote: string | null;
}

export interface EstimateResult {
	vehicleLabel: string;
	wrapSqm: number;
	wrapSqft: number;
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
	"mexican",
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
				station:
					"Fryer bank under extraction (left), dump and heat lamp (right)",
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
		case "mexican":
			return {
				station:
					"Plancha and steam wells under extraction (left), salsa rail and tortilla warmer by the pass (right)",
				equipment: [
					"griddle",
					"hot-station",
					"extraction-hood",
					"fire-suppression",
				],
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

function serveryFor(
	businessType: string,
	menu: readonly string[] = [],
): {
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
					"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
				],
			};
		case "bakery":
			// Churros and doughnuts are fried to order: a fryer line, not a
			// pastry case, and the extraction and suppression that come with it.
			if (lineProfileFor(businessType, menu).id === "fried-dessert") {
				return {
					layoutName: "Fried dessert line",
					stations: [
						"Serve hatch with flip-up awning and fold-down counter",
						"Countertop fryer under extraction, sugar and topping station beside it",
						"Hot chocolate and drinks at the finishing end of the line",
						"Hand basin at the line entry",
						"Menu board above the hatch, fascia sign on the roof edge",
					],
					equipment: [
						"fryer",
						"extraction-hood",
						"fire-suppression",
						"prep-counter",
						"hand-basin",
						"under-counter-refrigeration",
						"fresh-grey-water-tanks",
						"till",
						"digital-menu-board",
					],
					power:
						"Fryers need mains hook-up with generator provision. Battery alone will not carry frying.",
					compliance: [
						"Frying requires extraction and fire suppression in the factory base build.",
						"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
					],
				};
			}
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
					"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
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
					"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
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
					"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
				],
			};
		default: {
			// Cold drinks covers two different lines. The menu decides which;
			// with no menu yet the category's lead (bubble tea) wins. This
			// branch used to key on businessType === "cold-drinks", which is
			// the only type that reaches it, so the boba line never appeared.
			const isJuice = lineProfileFor(businessType, menu).id === "juice";
			return {
				layoutName: isJuice ? "Juice and smoothie bar" : "Bubble tea bar",
				stations: isJuice
					? [
							"Serve hatch with flip-up awning and fold-down counter",
							"Juicer and blenders on the prep run, fresh fruit display facing the hatch",
							"Ice and under-counter refrigeration directly under the hatch",
							"Hand basin at the end of the prep run",
							"Menu board above the hatch, fascia sign on the roof edge",
						]
					: [
							"Serve hatch with flip-up awning and fold-down counter",
							"Tea and syrup prep with topping station directly under the hatch",
							"Cup sealer and ice well on the finishing end of the line",
							"Hand basin at the end of the prep run",
							"Menu board above the hatch, fascia sign on the roof edge",
						],
				equipment: isJuice
					? [
							"drinks-station",
							"ice",
							"under-counter-refrigeration",
							"prep-counter",
							"hand-basin",
							"fresh-grey-water-tanks",
							"till",
							"digital-menu-board",
						]
					: [
							"boba-tea-brewers",
							"sealing-machine",
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
					"Hand sink and enclosed fresh/grey water tanks are required for health department plan review in most US counties.",
				],
			};
		}
	}
}

export function layoutFor(
	businessType: string,
	vehicleId: string,
	walkIn: boolean,
	/** Menu items — splits lines one business type covers (boba vs juice). */
	menu: readonly string[] = [],
): LayoutResult {
	const normalised =
		(LEGACY_BUSINESS_ALIASES[businessType] as string | undefined) ??
		businessType;
	const business = getBusiness(normalised);
	const vehicle = getVehicle(vehicleId);
	const body = vehicle?.body ?? "square";
	const long = (vehicle?.lengthM ?? 4) >= 5;

	// Builder rule, enforced not suggested: hot food lives on Small/Mid
	// hatch-serve or a square; the Large is walk-in merch/experience. A hot
	// line briefed on the Large is unbuildable on power and weight, so it is
	// flagged wrong here rather than rendered.
	const isFood = !RETAIL_TYPES.has(normalised);
	let vehicleFit: LayoutResult["vehicleFit"] = "fit";
	let vehicleNote: string | null = null;
	if (isFood && vehicle?.id === "airstream-l") {
		vehicleFit = "wrong";
		vehicleNote =
			"The Large Airstream is a walk-in merch/experience body — customers come inside, no cooking line. Brief this menu on the Small/Mid or a square hatch-serve instead: compact is the point (less weight, more energy margin).";
	} else if (walkIn && normalised === "retail" && (vehicle?.lengthM ?? 4) < 4) {
		vehicleFit = "stretch";
		vehicleNote =
			"Walk-in retail wants 4m+ of body for an aisle plus display; this unit will be tight.";
	}

	if (RETAIL_TYPES.has(normalised)) {
		return {
			layoutName: walkIn ? "Walk-in boutique" : "Hybrid serve with step-in",
			serveMode: walkIn ? "walk-in" : "hybrid",
			vehicleFit,
			vehicleNote,
			zones: [
				"Entry and queue outside with A-board menu",
				"Display wall with lockable overnight storage",
				"Till counter near the door for throughput",
				long
					? "Rear stockroom (around 20% of the unit)"
					: "Under-counter stock",
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
		const servery = serveryFor(normalised, menu);
		return {
			layoutName:
				body === "airstream" && normalised === "coffee"
					? "Airstream espresso bar"
					: servery.layoutName,
			serveMode: walkIn ? "hybrid" : "hatch-serve",
			vehicleFit,
			vehicleNote,
			zones: servery.stations,
			equipment: servery.equipment,
			powerNotes: servery.power,
			complianceNotes: servery.compliance,
			why: [
				"Cold chain directly under the hatch means fewer steps per order.",
				"An organized menu board above the hatch supports average order value.",
			],
		};
	}

	// Hot-food family: fried, grill, pizza, asian, breakfast, combined
	const hot = hotStationFor(
		HOT_TYPES.has(normalised) ? normalised : "combined",
	);
	return {
		layoutName: long ? "Full hot line with drinks station" : "Compact hot line",
		serveMode: walkIn ? "hybrid" : "hatch-serve",
		vehicleFit,
		vehicleNote,
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
			"Cooking heat is propane-fired under extraction — it never sits on the battery bank or the shore feed. The electrics (cold chain, water, till, lights, extraction fan) plan mains hook-up with a generator inlet from day one.",
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

export function estimateFor(
	vehicleId: string,
	wrapTier: string,
	signage: string[],
	menuBoard: boolean,
	hvac: boolean,
): EstimateResult {
	const vehicle = getVehicle(vehicleId);
	const wrapSqm = vehicle?.wrapSqm ?? 30;
	const wrapSqft = toSqft(wrapSqm);
	const premium =
		wrapTier.toLowerCase().includes("3m") ||
		wrapTier.toLowerCase().includes("premium");
	// US factory planning numbers in USD per square foot, installed (film +
	// labor), intentionally ranges not quotes. Premium covers 3M cast film with
	// overlaminate, which is what an Airstream's compound curves actually need.
	const perSqftLow = premium ? 18 : 12;
	const perSqftHigh = premium ? 28 : 18;
	const wrapLow = Math.round(wrapSqft * perSqftLow);
	const wrapHigh = Math.round(wrapSqft * perSqftHigh);
	const signageLow = signage.length * 300 + (menuBoard ? 1200 : 0);
	const signageHigh = signage.length * 800 + (menuBoard ? 3000 : 0);
	const bom: EstimateResult["bom"] = [
		{
			item: vehicle?.label ?? "Trailer",
			detail: `${toFt(vehicle?.lengthM ?? 4)} ft box · factory base build`,
		},
		{
			item: `Wrap film (${premium ? "3M premium" : "standard"})`,
			detail: `~${wrapSqft} sq ft incl. waste + seams`,
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
		wrapSqft,
		wrapTier: premium ? "3M premium" : "standard",
		wrapLow,
		wrapHigh,
		signageLow,
		signageHigh,
		leadTimeWeeks:
			"6–10 weeks after visual sign-off (wrap and build scheduling)",
		bom,
	};
}

export function createFoodTruckTools() {
	const recommendLayout = new DynamicStructuredTool({
		name: "recommend_layout",
		description:
			"Recommend a factory-buildable interior layout. Call once business type + vehicle + walk-in preference are known. Encodes hot-line, servery and walk-in retail rules. One hot station per compact unit, cooking heat on propane. Hot F&B is briefed on Small/Mid/square bodies only — the Large Airstream is walk-in merch/experience, never a hot kitchen (the tool flags that combination as vehicleFit wrong).",
		schema: z.object({
			businessType: z
				.enum([
					"fried",
					"grill",
					"pizza",
					"asian",
					"mexican",
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
			menuItems: z
				.array(z.string())
				.optional()
				.describe(
					"Signature menu items as the buyer said them, e.g. ['brown sugar boba', 'taro milk tea']. Decides between lines one business type covers, such as boba vs juice.",
				),
		}),
		func: async ({ businessType, vehicleId, walkIn, menuItems }) => {
			const result = layoutFor(businessType, vehicleId, walkIn, menuItems);
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
			"Build the buyer-facing spec sheet (investor one-pager + factory handover). Call at review time when brand, business, vehicle, equipment and colors are settled.",
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
				footprintM: vehicle ? footprintFt(vehicle) : "tbd",
				equipment,
				brandColors,
				buyerContact:
					contact || "Not captured yet — the factory should follow up",
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

	const proposeChange = new DynamicStructuredTool({
		name: "propose_change",
		description:
			"Turn a revision request ('make it cream', 'remove red', 'add a fryer') into a structured patch against the versioned design record. Call BEFORE re-rendering so the customer confirms the patch — revisions change only the patched fields, everything else stays locked. Returns the patch + changed fields for the customer to confirm.",
		schema: z.object({
			colors: z
				.array(z.string())
				.optional()
				.describe(
					"Full replacement palette in sentence order, e.g. ['cream','sage green']",
				),
			removeColors: z
				.array(z.string())
				.optional()
				.describe("Colors to drop, e.g. ['red']"),
			brandName: z.string().optional().describe("New brand name, if renaming"),
			businessType: z
				.string()
				.optional()
				.describe(
					`New category if the buyer corrected it: ${BUSINESS_TYPES.map((b) => b.id).join(", ")}`,
				),
			menuItems: z
				.array(z.string())
				.optional()
				.describe("Replacement menu items, if the offer changed"),
			vibe: z.array(z.string()).optional().describe("Replacement vibe words"),
			vehicleId: z
				.string()
				.optional()
				.describe(`New body, one of: ${VEHICLES.map((v) => v.id).join(", ")}`),
			serveMode: z
				.enum(["hatch-serve", "walk-in"])
				.optional()
				.describe("Change how customers order, if the buyer asked"),
			changeSummary: z
				.string()
				.describe(
					"One line for the version timeline, e.g. 'Palette → cream + sage green.'",
				),
		}),
		func: async (args) => {
			// The route commits the patch after customer confirmation; the
			// tool's job is to make the request explicit and reviewable.
			const patch: Record<string, unknown> = {};
			if (args.colors) patch.colors = args.colors;
			if (args.brandName) patch.brand = args.brandName;
			if (args.businessType) patch.businessType = args.businessType;
			if (args.menuItems) patch.menu = args.menuItems;
			if (args.vibe) patch.vibe = args.vibe;
			if (args.vehicleId) patch.vehicleId = args.vehicleId;
			if (args.serveMode) patch.serveMode = args.serveMode;
			return JSON.stringify({
				patch,
				removeColors: args.removeColors ?? [],
				changeSummary: args.changeSummary,
				note: "Show the customer this patch and confirm before re-rendering. Only patched fields change.",
			});
		},
	});

	return {
		recommendLayout,
		estimateBuild,
		buildSpecSheet,
		saveLead,
		proposeChange,
	};
}

export const TOOL_LIST_HINT = `Available tools: recommend_layout, estimate_build, build_spec_sheet, save_lead, propose_change. Business types: ${BUSINESS_TYPES.map((b) => b.id).join(", ")}. Vehicles: ${VEHICLES.map((v) => v.id).join(", ")}.`;
