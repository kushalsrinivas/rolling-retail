import { describe, expect, it } from "vitest";
import { updateBrain } from "./brain";
import { applyPatch, specFromIntake, versionStamp } from "./design-record";
import { paletteFor, palettePhrase } from "./palette";
import { elevationSvg, planSvg } from "./plan-svg";
import { qaPromptForSpec } from "./qa";

describe("brain color negation + food masks (audit table)", () => {
	it("ice cream does not become cream", () => {
		const b = updateBrain(null, "Soft serve ice cream truck");
		expect(b.colors).not.toContain("cream");
	});
	it("wood-fired does not become wood", () => {
		const b = updateBrain(null, "Wood-fired pizza");
		expect(b.colors).not.toContain("wood");
	});
	it("rejected red is removed, sage kept in order", () => {
		const b = updateBrain(
			null,
			"I don't like red, make it cream and sage green",
		);
		expect(b.colors).not.toContain("red");
		expect(b.colors).toContain("cream");
		expect(b.colors).toContain("sage green");
		expect(b.colors[0]).toBe("cream");
	});
	it("remove the graphic drops a color", () => {
		const b1 = updateBrain(null, "Brand colors red, cream");
		const b2 = updateBrain(b1, "Remove red");
		expect(b2.colors).not.toContain("red");
		expect(b2.colors).toContain("cream");
	});
});

describe("palette roles", () => {
	it("assigns primary/neutral with film refs", () => {
		const p = paletteFor(["sage green", "cream"]);
		expect(p.primary?.name).toBe("sage green");
		expect(p.primary?.hex).toBe("#9caf88");
		expect(p.primary?.film).toMatch(/3M/);
		expect(p.neutral?.name).toBe("cream");
		expect(palettePhrase(p)).toMatch(/primary/);
	});
});

describe("design record", () => {
	it("intake preserves words regex would lose", () => {
		const spec = specFromIntake({
			brandName: "Sage Birria",
			businessType: "mexican",
			menu: "birria tacos, wings",
			colors: "cream, sage green",
			vehicleId: "airstream-m",
			service: "hatch",
		});
		expect(spec.menu).toContain("birria tacos");
		expect(spec.menu).toContain("wings");
		expect(spec.colors).toContain("sage green");
		expect(spec.palette.primary?.hex).toBe("#9caf88");
		expect(spec.openings.length).toBeGreaterThan(0);
		expect(spec.equipment.length).toBeGreaterThan(0);
	});
	it("patch changes only what was asked", () => {
		const spec = specFromIntake({
			colors: "red, black",
			vehicleId: "square-4m",
		});
		const { spec: next, changed } = applyPatch(spec, {
			colors: ["cream", "sage green"],
		});
		expect(changed).toEqual(["palette"]);
		expect(next.colors).toEqual(["cream", "sage green"]);
		expect(next.vehicleId).toBe(spec.vehicleId);
	});
	it("stamp names version + state", () => {
		expect(versionStamp(4, "concept")).toMatch(
			/CONCEPT.*v4.*not for construction/,
		);
		expect(versionStamp(2, "approved")).toMatch(/APPROVED/);
	});
});

describe("deterministic plan", () => {
	it("draws real dimensions with a concept title block", () => {
		const spec = specFromIntake({
			brandName: "Test",
			vehicleId: "airstream-m",
		});
		const svg = planSvg(spec, 2);
		expect(svg).toMatch(/CONCEPT.*v2.*NOT FOR CONSTRUCTION/);
		expect(svg).toMatch(/6m/);
		const el = elevationSvg(spec, 2);
		expect(el).toMatch(/curbside elevation/);
	});
});

describe("prompt QA", () => {
	it("fails a prompt that never names a side", () => {
		const spec = specFromIntake({ vehicleId: "airstream-m", colors: "cream" });
		const r = qaPromptForSpec(
			"a beautiful food truck with no side named",
			spec,
		);
		expect(r.pass).toBe(false);
		expect(r.failures.join(" ")).toMatch(/curbside/);
	});
});
