import { describe, expect, it } from "vitest";
import { CONCEPT_VIEWS } from "./constants";
import {
	buildSalesVideoPrompt,
	coversAllConceptViews,
	pickApprovedReferences,
	pickMasterReference,
	SALES_VIDEO_PRESETS,
	salesSlideFor,
} from "./sales";

const PHOTO = (s: string) => `data:image/png;base64,${s}`;
const SVG = "data:image/svg+xml;charset=utf-8,%3Csvg%3E";

describe("sales asset pipeline", () => {
	it("maps every concept view to a deck slide", () => {
		expect(coversAllConceptViews()).toEqual([]);
		for (const v of CONCEPT_VIEWS) expect(salesSlideFor(v)).toBeTruthy();
	});

	it("picks the hero as master, skipping placeholders", () => {
		const images = [
			{ label: "exterior_hero", url: SVG },
			{ label: "interior_layout", url: PHOTO("aaa") },
			{ label: "exterior_hero", url: PHOTO("hero") },
		];
		expect(pickMasterReference(images)).toBe(PHOTO("hero"));
	});

	it("falls back to the first real photo, null when none", () => {
		expect(
			pickMasterReference([{ label: "night_exterior", url: PHOTO("n") }]),
		).toBe(PHOTO("n"));
		expect(
			pickMasterReference([{ label: "exterior_hero", url: SVG }]),
		).toBeNull();
		expect(pickMasterReference([])).toBeNull();
	});

	it("approves starred stills excluding the master, max two", () => {
		const master = PHOTO("hero");
		const images = [
			{ label: "exterior_hero", url: master, favorite: true },
			{ label: "a", url: PHOTO("a"), favorite: true },
			{ label: "b", url: PHOTO("b"), favorite: true },
			{ label: "c", url: PHOTO("c"), favorite: true },
			{ label: "d", url: PHOTO("d") },
			{ label: "e", url: SVG, favorite: true },
		];
		expect(pickApprovedReferences(images, master)).toEqual([
			PHOTO("a"),
			PHOTO("b"),
		]);
	});

	const CTX = {
		brand: "BIB Burgers",
		hasBrand: true,
		vehicleLabel: "Airstream · Mid",
		vehicleBody: "airstream" as const,
		lengthM: 6,
		widthM: 2.2,
		colors: "matte black, orange",
		vibe: "bold",
		businessLabel: "Grill, Burgers & Barbecue",
		menu: "smash burgers, loaded fries",
		equipment: "flat-top griddle and chargrill, make-rail",
		serveMode: "hatch-serve" as const,
	};

	it("builds a distinct, reference-locked shot list per preset", () => {
		const prompts = SALES_VIDEO_PRESETS.map((p) =>
			buildSalesVideoPrompt(p.kind, CTX),
		);
		expect(new Set(prompts).size).toBe(SALES_VIDEO_PRESETS.length);
		expect(SALES_VIDEO_PRESETS.length).toBe(3);
		for (const p of prompts) {
			expect(p).toContain("BIB Burgers");
			// Locked to the approved stills, and told what not to invent.
			expect(p).toMatch(/REFERENCE LOCK/);
			expect(p).toMatch(/DO NOT:/);
			// A shot list against the clock, not a one-line mood note.
			expect(p).toMatch(/SHOT LIST/);
			expect(p).toMatch(/10\.0s/);
			expect(p).toMatch(/LIGHT:/);
		}
	});

	it("briefs the video on the same build facts as the stills", () => {
		const p = buildSalesVideoPrompt("hero-orbit", CTX);
		expect(p).toContain("Airstream · Mid");
		expect(p).toContain("6m × 2.2m");
		expect(p).toMatch(/Airstream-style trailer/);
		expect(p).toContain("grill, burgers & barbecue");
		expect(p).toContain("matte black, orange");
		expect(p).toContain("smash burgers, loaded fries");
		expect(p).toContain("flat-top griddle and chargrill");
		expect(p).toMatch(/serve hatch/);
	});

	it("letters nothing when the business has no name yet", () => {
		const p = buildSalesVideoPrompt("hero-orbit", {
			...CTX,
			brand: "the business",
			hasBrand: false,
		});
		expect(p).toContain("as-yet-unnamed business");
		expect(p).toMatch(/invent text, lettering/);
	});

	it("still builds a usable prompt from the minimum context", () => {
		const p = buildSalesVideoPrompt("walkthrough", {
			brand: "BIB Burgers",
			vehicleLabel: "Airstream Mid",
			colors: "matte black",
			vibe: "bold",
		});
		expect(p).toContain("BIB Burgers");
		expect(p).toMatch(/REFERENCE LOCK/);
		// No menu or equipment line is invented when none was supplied.
		expect(p).not.toMatch(/Menu on the board/);
		expect(p).not.toMatch(/Equipment visible/);
	});

	it("the walkthrough is filmed from inside the galley", () => {
		const p = buildSalesVideoPrompt("walkthrough", CTX, [
			"interior_layout",
			"front_elevation",
			"exterior_hero",
		]);
		expect(p).toMatch(/INSIDE WALKTHROUGH/);
		expect(p).toMatch(/camera stands INSIDE/);
		// Its own camera rule, not the outside one.
		expect(p).toMatch(/THE CAMERA IS INSIDE/);
		expect(p).not.toMatch(/stays outside the trailer and looks in/);
		// The interior reference is named as the galley it is filming.
		expect(p).toMatch(/image 1 is the approved interior layout/);
		// The wide-angle brief sells the size without inventing space.
		expect(p).toMatch(/24mm/);
		expect(p).toMatch(/bigger than the trailer's footprint/);
		// The line passes in the profile's order.
		expect(p).toMatch(/griddle and chargrill under the canopy/);
	});

	it("positions every opening by exact distance and closes the world", () => {
		const p = buildSalesVideoPrompt("hero-orbit", CTX, ["exterior_hero"]);
		// Airstream-m defaults: hatch at 0.35 × 6m, door at 0.72 × 6m.
		expect(p).toMatch(/EXACT OPENINGS/);
		expect(p).toContain("leading edge 2.1m back from the front wall");
		expect(p).toContain("leading edge 4.32m back from the front wall");
		// Count check: 1 hatch, 1 door, 0 windows — and nothing else exists.
		expect(p).toMatch(/2 openings in total: 1 serving hatch, 1 door, 0 windows/);
		expect(p).toMatch(/no other windows/);
		expect(p).toMatch(/exactly 2 openings/);
	});

	it("the record's openings win over the body defaults", () => {
		const p = buildSalesVideoPrompt("hero-orbit", {
			...CTX,
			openings: [
				{
					type: "hatch",
					side: "curbside",
					xFromFront: 1.5,
					width: 2.0,
					height: 1.1,
					sillHeight: 1.05,
					hinge: "top",
				},
			],
		});
		expect(p).toContain("leading edge 1.5m back from the front wall");
		expect(p).not.toContain("leading edge 2.1m back from the front wall");
		expect(p).toMatch(/1 openings in total: 1 serving hatch, 0 doors, 0 windows/);
	});

	it("a context with no body still builds, without an openings brief", () => {
		const p = buildSalesVideoPrompt("walkthrough", {
			brand: "BIB Burgers",
			vehicleLabel: "Airstream Mid",
			colors: "matte black",
			vibe: "bold",
		});
		expect(p).not.toMatch(/EXACT OPENINGS/);
		expect(p).toMatch(/GEOMETRY IS FIXED/);
	});

	it("the 360 orbit completes a full circle", () => {
		const p = buildSalesVideoPrompt("hero-orbit", CTX);
		expect(p).toMatch(/full 360° orbit/);
		expect(p).toMatch(/back to the opening angle/);
		// A genuine orbit, not a half turn.
		expect(p).not.toMatch(/180°/);
		// Still locked to the outside camera rule.
		expect(p).toMatch(/stays outside the trailer and looks in/);
	});
});
