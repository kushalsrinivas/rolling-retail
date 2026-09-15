import { describe, expect, it } from "vitest";
import { resolveWrap } from "./wrap-color";

describe("resolveWrap", () => {
	it("resolves the words the brain actually extracts", () => {
		// These are the ones three.js cannot parse on its own.
		for (const word of ["matte black", "stainless steel", "cream", "chrome"]) {
			expect(resolveWrap([word]), word).not.toBeNull();
		}
	});

	it("always yields a parseable hex", () => {
		expect(resolveWrap(["cream"])?.hex).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it("takes the first colour it recognises", () => {
		expect(resolveWrap(["puce", "black", "orange"])?.hex).toBe(
			resolveWrap(["black"])?.hex,
		);
	});

	it("gives metal a metallic finish and paint a matte one", () => {
		expect(resolveWrap(["chrome"])!.metalness).toBeGreaterThan(0.8);
		expect(resolveWrap(["matte black"])!.roughness).toBeGreaterThan(0.8);
	});

	it("honours a hex the buyer typed", () => {
		expect(resolveWrap(["#ff5500"])?.hex).toBe("#ff5500");
		expect(resolveWrap(["#f50"])?.hex).toBe("#f50");
	});

	it("returns null rather than an unparseable colour", () => {
		expect(resolveWrap(["puce"])).toBeNull();
		expect(resolveWrap([])).toBeNull();
		expect(resolveWrap(null)).toBeNull();
		expect(resolveWrap(["not-a-hex", "#gggggg"])).toBeNull();
	});

	it("is case and whitespace insensitive", () => {
		expect(resolveWrap(["  Matte Black "])?.hex).toBe(
			resolveWrap(["matte black"])?.hex,
		);
	});
});
