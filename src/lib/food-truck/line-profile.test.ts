import { describe, expect, it } from "vitest";
import { updateBrain } from "./brain";
import { CONCEPT_VIEWS } from "./constants";
import { conceptPrompts, emblemFor } from "./images";
import { lineProfileFor } from "./line-profile";
import { buildSalesVideoPrompt } from "./sales";
import { layoutFor } from "./tools";

/**
 * Semantic drift locks: the business the buyer named decides what the
 * renders and clips show. Each case here is a drift the pipeline produced.
 */

const base = {
	brand: "Mega Matcha",
	vehicleLabel: "Airstream · Mid",
	vehicleBody: "airstream" as const,
	lengthM: 6,
	widthM: 2.2,
	heightM: 2.7,
	colors: "green, cream",
	vibe: "playful",
	serveMode: "hatch-serve" as const,
	hasBrand: true,
};

const prompt = (
	businessType: string,
	menuKeywords: string[],
	view: string,
	vehicleBody: "airstream" | "square" = "airstream",
) =>
	conceptPrompts({
		...base,
		vehicleBody,
		businessType,
		menuKeywords,
		equipment: layoutFor(businessType, "airstream-m", false, menuKeywords)
			.equipment,
	}).find((p) => p.label === view)?.prompt ?? "";

describe("line profiles", () => {
	it("splits cold drinks into boba and juice by menu", () => {
		expect(lineProfileFor("cold-drinks", ["boba"]).id).toBe("boba");
		expect(lineProfileFor("cold-drinks", ["juice", "smoothie"]).id).toBe(
			"juice",
		);
		expect(lineProfileFor("cold-drinks", []).id).toBe("boba");
		expect(lineProfileFor("bakery", ["churros"]).id).toBe("fried-dessert");
	});

	it("classifies tacos as Mexican, not Asian", () => {
		const brain = updateBrain(null, "Taco truck with birria tacos");
		expect(brain.businessType).toBe("mexican");
		expect(emblemFor("mexican")).toMatch(/taco/);
	});

	it("gives a juice bar a juice emblem, not a boba cup", () => {
		expect(emblemFor("cold-drinks", ["juice"])).not.toMatch(/boba/);
		expect(emblemFor("cold-drinks", ["boba"])).toMatch(/boba/);
	});
});

describe("renders stay in category", () => {
	it("a boba interior has no hot line and says so", () => {
		const interior = prompt("cold-drinks", ["boba"], "interior_layout");
		expect(interior).toMatch(/tapioca/);
		expect(interior).toMatch(/no extraction canopy/);
		expect(interior).not.toMatch(/hot station|Ansul|heat gantry/);
		const front = prompt("cold-drinks", ["boba"], "front_elevation");
		expect(front).not.toMatch(/hot station|make-rail/);
		const assembly = prompt("cold-drinks", ["boba"], "assembly_theater");
		expect(assembly).not.toMatch(/steam rising|hot station/);
	});

	it("the boba layout lists the tea equipment", () => {
		const layout = layoutFor("cold-drinks", "airstream-m", false, ["boba"]);
		expect(layout.equipment).toContain("boba-tea-brewers");
		expect(layout.equipment).toContain("sealing-machine");
	});

	it("never asks for a rear door on an Airstream", () => {
		const rear = prompt("grill", ["burgers"], "exterior_rear");
		expect(rear).not.toMatch(/a rear service door/);
		expect(rear).toMatch(/no door in it/);
		expect(prompt("grill", ["burgers"], "exterior_rear", "square")).toMatch(
			/single rear door/,
		);
	});

	it("names the curbside in the hero and has no AI technical drawing", () => {
		expect(prompt("grill", [], "exterior_hero")).toMatch(/CURBSIDE/);
		expect(CONCEPT_VIEWS).not.toContain("roof_plan");
		expect(prompt("grill", [], "side_elevation")).toMatch(/no dimension lines/);
	});
});

describe("video stays in category and outside the openings", () => {
	const ctx = {
		brand: "Mega Matcha",
		vehicleLabel: "Airstream · Mid",
		colors: "green",
		vibe: "playful",
		businessType: "cold-drinks",
		menu: "brown sugar boba",
	};

	it("films a boba line with no steam, heat or garnish pans", () => {
		for (const text of [
			buildSalesVideoPrompt("walkthrough", ctx),
			buildSalesVideoPrompt("hero-orbit", ctx),
			buildSalesVideoPrompt("night-cinematic", ctx),
		]) {
			expect(text).not.toMatch(/steam, heat and food|garnish pans|steam still/);
			expect(text).toMatch(/no fryers/i);
		}
		expect(buildSalesVideoPrompt("walkthrough", ctx)).toMatch(/tapioca/);
	});

	it("juice bars are not filmed as boba bars", () => {
		const text = buildSalesVideoPrompt("walkthrough", {
			...ctx,
			menu: "fresh juice",
		});
		expect(text).not.toMatch(/tapioca/);
		expect(text).toMatch(/juicer/);
	});

	it("respects each camera's opening rule", () => {
		// Outside clips look in through the hatch; the walkthrough stands
		// inside and never leaves. Neither travels through an opening.
		expect(buildSalesVideoPrompt("walkthrough", ctx)).toMatch(
			/THE CAMERA IS INSIDE/,
		);
		for (const kind of ["hero-orbit", "night-cinematic"] as const) {
			expect(buildSalesVideoPrompt(kind, ctx)).toMatch(
				/stays outside the trailer and looks in/,
			);
		}
	});
});
