import { describe, expect, it } from "vitest";
import { CONCEPT_VIEWS } from "./constants";
import {
	buildSalesVideoPrompt,
	coversAllConceptViews,
	pickApprovedReferences,
	pickMasterReference,
	SALES_VIDEO_PRESETS,
	salesSlideFor,
	TOUR_PARTS,
	tourContinuationPrompt,
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

	it("chains a 30s tour from three parts that each advance the take", () => {
		expect(TOUR_PARTS).toBe(3);
		const part1 = buildSalesVideoPrompt("tour", CTX);
		const beats = [2, 3].map((part) => tourContinuationPrompt(part, CTX));
		const all = [part1, ...beats];

		// Three genuinely different beats — the old parts 2 and 3 were near-copies.
		expect(new Set(all).size).toBe(3);
		expect(part1).toMatch(/PART 1 OF 3/);
		expect(beats[0]).toMatch(/PART 2 OF 3/);
		expect(beats[1]).toMatch(/PART 3 OF 3/);

		for (const b of beats) {
			expect(b).toContain("BIB Burgers");
			// Each continuation says where the previous part left off.
			expect(b).toMatch(/CONTINUITY:/);
			expect(b).toMatch(/exact frame the previous part ended on/);
			expect(b).toMatch(/REFERENCE LOCK/);
		}

		// Part 1 hands off at the hatch, part 2 works the line, part 3 closes wide.
		expect(part1).toMatch(/END THE SHOT framed square on the open hatch/);
		expect(beats[0]).toMatch(/serve line/);
		expect(beats[0]).toMatch(/part 3 picks up from this frame/);
		expect(beats[1]).toMatch(/final frame/);
		expect(beats[1]).toMatch(/hero angle the tour opened on/);
	});

	it("holds one time of day across the whole tour so parts cut together", () => {
		const all = [
			buildSalesVideoPrompt("tour", CTX),
			tourContinuationPrompt(2, CTX),
			tourContinuationPrompt(3, CTX),
		];
		for (const p of all) expect(p).toMatch(/golden.hour/i);
	});
});
