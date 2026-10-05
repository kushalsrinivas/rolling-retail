import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
	BUSINESS_TYPES,
	footprintFt,
	getBusiness,
	getVehicle,
	VEHICLES,
} from "./constants";

export {
	estimateFor,
	type EstimateResult,
	type LayoutResult,
	layoutFor,
} from "./layout";

import { estimateFor, layoutFor } from "./layout";

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
