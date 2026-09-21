import { describe, expect, it } from "vitest";
import { updateBrain } from "./brain";
import { footprintFt, getVehicle, toFt, toSqft, VEHICLES } from "./constants";
import { estimateFor } from "./tools";

describe("US unit conversion", () => {
	it("converts metres to feet", () => {
		expect(toFt(6)).toBeCloseTo(19.7, 1);
		expect(toFt(2.2)).toBeCloseTo(7.2, 1);
	});

	it("converts square metres to square feet", () => {
		expect(toSqft(38)).toBe(409);
		expect(toSqft(22)).toBe(237);
	});

	it("renders a buyer-facing footprint in feet", () => {
		expect(footprintFt(getVehicle("airstream-m")!)).toBe("19.7 × 7.2 × 8.9 ft");
	});

	it("labels every square trailer in feet, not metres", () => {
		for (const v of VEHICLES.filter((v) => v.body === "square")) {
			expect(v.label).toContain("ft");
			expect(v.label).not.toMatch(/\d\s?m\b/);
		}
	});
});

describe("estimateFor — US pricing", () => {
	it("prices a standard wrap at $12–18 per square foot", () => {
		const e = estimateFor("airstream-m", "standard", [], false, false);
		expect(e.wrapSqft).toBe(409);
		expect(e.wrapLow).toBe(409 * 12);
		expect(e.wrapHigh).toBe(409 * 18);
	});

	it("prices a 3M premium wrap higher than standard", () => {
		const std = estimateFor("airstream-m", "standard", [], false, false);
		const prem = estimateFor("airstream-m", "3M premium", [], false, false);
		expect(prem.wrapLow).toBeGreaterThan(std.wrapLow);
		expect(prem.wrapTier).toBe("3M premium");
	});

	it("lands a mid Airstream wrap in a plausible US range", () => {
		const e = estimateFor("airstream-m", "standard", [], false, false);
		expect(e.wrapLow).toBeGreaterThan(3_000);
		expect(e.wrapHigh).toBeLessThan(10_000);
	});

	it("adds signage and menu-board cost", () => {
		const e = estimateFor(
			"square-4m",
			"standard",
			["hatch blade"],
			true,
			false,
		);
		expect(e.signageLow).toBe(300 + 1200);
		expect(e.signageHigh).toBe(800 + 3000);
	});

	it("reports the BOM box size in feet", () => {
		const e = estimateFor("square-5m", "standard", [], false, false);
		expect(e.bom[0].detail).toContain("ft box");
		expect(e.bom[1].detail).toContain("sq ft");
	});
});

describe("vehicle extraction from US phrasing", () => {
	const vehicleFor = (text: string) => updateBrain(null, text).vehicleId;

	it("resolves feet to the matching square trailer", () => {
		expect(vehicleFor("I want a 10 ft trailer")).toBe("square-3m");
		expect(vehicleFor("looking at a 13ft concession trailer")).toBe(
			"square-4m",
		);
		expect(vehicleFor("a 16 foot trailer please")).toBe("square-5m");
	});

	it("still understands the metric phrasing", () => {
		expect(vehicleFor("a 5m square trailer")).toBe("square-5m");
	});

	it("does not mistake an Airstream for a trailer", () => {
		expect(vehicleFor("a large airstream")).toBe("airstream-l");
	});
});
