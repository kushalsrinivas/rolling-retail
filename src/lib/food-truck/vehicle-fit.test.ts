import { describe, expect, it } from "vitest";
import { getVehicle } from "./constants";
import { layoutFor } from "./tools";

/**
 * Builder doctrine locks: compact beats big, one hot station per unit, and
 * the Large is a walk-in merch/experience body — never a hot F&B kitchen.
 * Each case here is a first-timer mistake the shop corrects on day one.
 */
describe("vehicle roles", () => {
	it("flags a hot line on the Large as wrong", () => {
		for (const type of ["grill", "fried", "mexican", "pizza", "coffee"]) {
			const l = layoutFor(type, "airstream-l", false, []);
			expect(l.vehicleFit, type).toBe("wrong");
			expect(l.vehicleNote ?? "").toMatch(/Small\/Mid|square/i);
		}
	});

	it("fits hot food on Small/Mid hatch-serve", () => {
		expect(layoutFor("grill", "airstream-m", false, []).vehicleFit).toBe(
			"fit",
		);
		expect(layoutFor("mexican", "airstream-s", false, []).vehicleFit).toBe(
			"fit",
		);
		expect(layoutFor("fried", "square-4m", false, []).vehicleFit).toBe("fit");
	});

	it("fits walk-in merch on the Large", () => {
		const l = layoutFor("retail", "airstream-l", true, []);
		expect(l.vehicleFit).toBe("fit");
		expect(l.vehicleNote).toBeNull();
	});

	it("calls walk-in retail on a short body a stretch", () => {
		const l = layoutFor("retail", "square-3m", true, []);
		expect(l.vehicleFit).toBe("stretch");
		expect(l.vehicleNote ?? "").toMatch(/tight/);
	});

	it("the Large's own blurb rules out a hot kitchen", () => {
		expect(getVehicle("airstream-l")?.blurb).toMatch(/Not a hot kitchen/);
	});
});
