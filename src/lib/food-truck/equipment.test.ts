import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, getVehicle, VEHICLES } from "./constants";
import { layoutFor } from "./tools";
import {
	allEquipment,
	getEquipment,
	MIN_AISLE_M,
	planGalley,
	powerBudget,
} from "./equipment";

const airstreamM = getVehicle("airstream-m")!;
const square3m = getVehicle("square-3m")!;

describe("equipment catalogue", () => {
	it("covers every id referenced by a business type", () => {
		const missing = new Set<string>();
		for (const b of BUSINESS_TYPES) {
			for (const need of b.needs) {
				if (!getEquipment(need)) missing.add(`${b.id}:${need}`);
			}
		}
		expect([...missing]).toEqual([]);
	});

	it("resolves every id layoutFor actually emits", () => {
		// The 3D view is fed from layout.equipment, which uses its own names for
		// a few units. Any id that does not resolve is a unit missing from the
		// model and from the power budget.
		const unresolved = new Set<string>();
		for (const business of BUSINESS_TYPES) {
			for (const vehicle of VEHICLES) {
				for (const walkIn of [true, false]) {
					const layout = layoutFor(business.id, vehicle.id, walkIn);
					for (const id of layout.equipment) {
						if (!getEquipment(id)) unresolved.add(id);
					}
				}
			}
		}
		expect([...unresolved].sort()).toEqual([]);
	});

	it("maps the alias vocabulary onto one catalogue entry", () => {
		expect(getEquipment("under-counter-refrigeration")).toBe(
			getEquipment("refrigeration"),
		);
		expect(getEquipment("hvac-optional")).toBe(getEquipment("hvac"));
	});

	it("counts a unit once when two ids resolve to it", () => {
		const both = powerBudget(["refrigeration", "under-counter-refrigeration"]);
		expect(both.totalWatts).toBe(powerBudget(["refrigeration"]).totalWatts);
	});

	it("keeps canopies, tills and water tanks out of the galley run", () => {
		const plan = planGalley(
			["extraction-hood", "till", "fresh-grey-water-tanks", "griddle"],
			airstreamM,
		);
		const run = plan.placed.filter(
			(p) => (p.spec.mount ?? "floor") === "floor",
		);
		expect(run.map((p) => p.spec.id)).toEqual(["griddle"]);
	});

	it("gives every unit a real footprint", () => {
		for (const e of allEquipment()) {
			expect(e.widthM, e.id).toBeGreaterThan(0);
			expect(e.depthM, e.id).toBeGreaterThan(0);
			expect(e.heightM, e.id).toBeGreaterThan(0);
			expect(e.watts, e.id).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("planGalley", () => {
	const grill = BUSINESS_TYPES.find((b) => b.id === "grill")!;

	it("places every unit when there is room", () => {
		const plan = planGalley([...grill.needs], airstreamM);
		expect(plan.overflow).toEqual([]);
		expect(plan.placed).toHaveLength(grill.needs.length);
	});

	it("puts the hand sink first in the run", () => {
		const plan = planGalley([...grill.needs], airstreamM);
		const floor = plan.placed
			.filter((p) => (p.spec.mount ?? "floor") === "floor")
			.filter((p) => p.wall === "curbside")
			.sort((a, b) => a.offsetM - b.offsetM);
		expect(floor[0].spec.id).toBe("hand-basin");
	});

	it("hangs the extraction canopy over the hot line, not in the run", () => {
		const plan = planGalley([...grill.needs], airstreamM);
		const hood = plan.placed.find((p) => p.spec.id === "extraction-hood")!;
		const griddle = plan.placed.find((p) => p.spec.id === "griddle-chargrill")!;
		expect(hood.spec.mount).toBe("overhead");
		expect(hood.offsetM).toBe(griddle.offsetM);
		expect(hood.wall).toBe(griddle.wall);
	});

	it("never overlaps two units on the same wall", () => {
		const plan = planGalley([...grill.needs], airstreamM);
		for (const wall of ["curbside", "streetside"] as const) {
			const run = plan.placed
				.filter((p) => p.wall === wall && (p.spec.mount ?? "floor") === "floor")
				.sort((a, b) => a.offsetM - b.offsetM);
			for (let i = 1; i < run.length; i++) {
				expect(run[i].offsetM).toBeGreaterThanOrEqual(
					run[i - 1].offsetM + run[i - 1].spec.widthM,
				);
			}
		}
	});

	it("spills onto the opposite wall when the run is short", () => {
		// A grill line fits a 10ft box exactly; a pizza line does not.
		const pizza = BUSINESS_TYPES.find((b) => b.id === "pizza")!;
		expect(
			planGalley([...grill.needs], square3m).placed.some(
				(p) => p.wall === "streetside",
			),
		).toBe(false);
		expect(
			planGalley([...pizza.needs], square3m).placed.some(
				(p) => p.wall === "streetside",
			),
		).toBe(true);
	});

	it("keeps units inside the usable run", () => {
		const plan = planGalley([...grill.needs], square3m);
		for (const p of plan.placed) {
			if ((p.spec.mount ?? "floor") !== "floor") continue;
			expect(p.offsetM + p.spec.widthM).toBeLessThanOrEqual(plan.usableRunM);
		}
	});

	it("reports an aisle that closes up as both walls fill", () => {
		const roomy = planGalley([...grill.needs], airstreamM);
		const tight = planGalley([...grill.needs], square3m);
		expect(tight.aisleM).toBeLessThan(roomy.aisleM);
	});

	it("flags a two-sided fit-out in a narrow box as unworkable", () => {
		// Pizza uses both walls of a 10ft box, which leaves no working aisle —
		// the trade-off the buyer needs to see before the factory quotes it.
		const pizza = BUSINESS_TYPES.find((b) => b.id === "pizza")!;
		expect(planGalley([...pizza.needs], square3m).aisleM).toBeLessThan(
			MIN_AISLE_M,
		);
		expect(planGalley([...pizza.needs], airstreamM).aisleM).toBeGreaterThan(
			MIN_AISLE_M,
		);
	});
});

describe("powerBudget", () => {
	it("sums nameplate load and applies a diversity factor", () => {
		const b = powerBudget(["fryer", "refrigeration"]);
		expect(b.totalWatts).toBe(14400);
		expect(b.designWatts).toBe(Math.round(14400 * 0.7));
		expect(b.designWatts).toBeLessThan(b.totalWatts);
	});

	it("puts a coffee bar on a 30A supply", () => {
		const coffee = BUSINESS_TYPES.find((b) => b.id === "coffee")!;
		expect(powerBudget([...coffee.needs]).supply).toBe("30A / 240V");
	});

	it("puts a fryer line on 50A, not 30A", () => {
		const fried = BUSINESS_TYPES.find((b) => b.id === "fried")!;
		const b = powerBudget([...fried.needs]);
		expect(b.supply).toBe("50A / 240V");
		expect(b.overShore).toBe(false);
	});

	it("pushes a fryer plus a chargrill past any shore supply", () => {
		const b = powerBudget([
			"fryer",
			"griddle-chargrill",
			"extraction-hood",
			"refrigeration",
		]);
		expect(b.overShore).toBe(true);
		expect(b.supply).toBe("generator or dual feed");
	});

	it("ranks the biggest draw first so the trade-off is obvious", () => {
		const grill = BUSINESS_TYPES.find((b) => b.id === "grill")!;
		const b = powerBudget([...grill.needs]);
		expect(b.byUnit[0].label).toContain("chargrill");
		for (let i = 1; i < b.byUnit.length; i++) {
			expect(b.byUnit[i].watts).toBeLessThanOrEqual(b.byUnit[i - 1].watts);
		}
	});

	it("ignores units that draw nothing", () => {
		expect(powerBudget(["hand-basin", "prep-counter"]).totalWatts).toBe(0);
	});

	it("converts the design load to amps", () => {
		const b = powerBudget(["fryer"]);
		expect(b.ampsAt240V).toBeCloseTo((14000 * 0.7) / 240, 1);
	});
});
