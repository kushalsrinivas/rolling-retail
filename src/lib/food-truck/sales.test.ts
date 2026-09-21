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

	it("builds reference-locked prompts for all three presets", () => {
		const ctx = {
			brand: "BIB Burgers",
			vehicleLabel: "Airstream Mid",
			colors: "matte black, orange",
			vibe: "bold",
		};
		const prompts = SALES_VIDEO_PRESETS.map((p) =>
			buildSalesVideoPrompt(p.kind, ctx),
		);
		expect(new Set(prompts).size).toBe(3);
		for (const p of prompts) {
			expect(p).toContain("BIB Burgers");
			expect(p).toMatch(/exact/i);
		}
	});
});
