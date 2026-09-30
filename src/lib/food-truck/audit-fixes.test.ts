import { describe, expect, it } from "vitest";
import { updateBrain } from "./brain";
import { DRIFT_NEGATIVES } from "./continuity";
import { applyPatch, specFromIntake, versionStamp } from "./design-record";
import { conceptPrompts } from "./images";
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

	it("fails a prompt with no medium lock", () => {
		const spec = specFromIntake({ vehicleId: "airstream-m", colors: "cream" });
		const r = qaPromptForSpec(
			"a beautiful food truck photograph of the curbside and roadside with no gradients",
			spec,
		);
		expect(r.pass).toBe(false);
		expect(r.failures.join(" ")).toMatch(/medium lock/);
	});
});

describe("medium locks (photo vs drawing)", () => {
	const args = {
		brand: "Sage Birria",
		vehicleLabel: "Airstream · Mid",
		vehicleBody: "airstream" as const,
		lengthM: 6,
		widthM: 2.2,
		heightM: 2.7,
		colors: "cream, sage green",
		vibe: "premium",
		businessType: "mexican",
		menuKeywords: ["birria tacos"],
		equipment: ["griddle", "extraction-hood"],
		serveMode: "hatch-serve" as const,
	};

	it("every view declares its medium, so the medium is never a per-run decision", () => {
		for (const { label, prompt } of conceptPrompts(args)) {
			expect(prompt, label).toMatch(
				/not a 3d render|illustration|mockup|direction board/i,
			);
		}
	});

	it("the interior is an eye-level photograph, never an overhead/section", () => {
		const interior = conceptPrompts(args).find(
			(p) => p.label === "interior_layout",
		)?.prompt;
		expect(interior).toBeTruthy();
		expect(interior).toMatch(/eye-level/);
		expect(interior).toMatch(/18mm/);
		expect(interior).not.toMatch(/high-angle|three-quarter overhead/);
		expect(interior).toMatch(/no dollhouse|no.*sectional/i);
	});

	it("the continuity lock bans medium drift on every view that carries it", () => {
		expect(DRIFT_NEGATIVES).toMatch(/blueprint/);
		expect(DRIFT_NEGATIVES).toMatch(/isometric/);
		expect(DRIFT_NEGATIVES).toMatch(/cutaway/);
	});
});
