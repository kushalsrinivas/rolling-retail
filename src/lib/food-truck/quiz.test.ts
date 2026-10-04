import { describe, expect, it } from "vitest";
import {
	extrasNote,
	QUIZ_EXTRAS,
	QUIZ_PALETTES,
	QUIZ_STYLES,
	quizToDirect,
} from "./quiz";

describe("quiz catalog", () => {
	it("uses only vibe/color words the rest of the system understands", async () => {
		const { paletteFor } = await import("./palette");
		const { resolveWrap } = await import("./wrap-color");
		for (const s of QUIZ_STYLES) {
			for (const c of s.colors) {
				expect(resolveWrap([c]), `${s.id}:${c}`).not.toBeNull();
			}
			// Vibe words must survive as-is (brain + prompts match on words).
			expect(s.vibe.length).toBeGreaterThan(0);
		}
		for (const p of QUIZ_PALETTES) {
			expect(paletteFor(p.colors).primary, p.id).toBeTruthy();
		}
	});

	it("collapses picks to capped comma strings for the intake path", () => {
		const { vibe, colors } = quizToDirect({
			styles: ["midnight", "diner", "street", "coastal"],
			palettes: ["p-neon", "p-ember"],
			extras: [],
		});
		expect(vibe.split(", ").length).toBeLessThanOrEqual(3);
		expect(colors.split(", ").length).toBeLessThanOrEqual(4);
		expect(vibe).toContain("premium");
	});

	it("empty picks stay empty — everything is skippable", () => {
		expect(quizToDirect({ styles: [], palettes: [], extras: [] })).toEqual({
			vibe: "",
			colors: "",
		});
		expect(extrasNote({ styles: [], palettes: [], extras: [] })).toBe("");
	});

	it("extras map to plain must-have notes", () => {
		const note = extrasNote({
			styles: [],
			palettes: [],
			extras: ["menu-board", "night-lighting"],
		});
		expect(note).toContain("menu board");
		expect(note).toContain("night");
		for (const e of QUIZ_EXTRAS) expect(e.note.length).toBeGreaterThan(0);
	});
});
