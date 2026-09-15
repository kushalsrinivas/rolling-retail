import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTruckImage } from "./images";
import { geometryFor } from "./constants";

const PNG_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const SVG_PLACEHOLDER =
	"data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E";

/** Captures the request body the generator would send to Gemini. */
function captureRequest() {
	const seen: { text?: string; parts?: unknown[] } = {};
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url: string, init: { body: string }) => {
			const parsed = JSON.parse(init.body);
			const parts = parsed.contents[0].parts;
			seen.text = parts[0].text;
			seen.parts = parts.slice(1);
			return {
				ok: true,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{ inlineData: { mimeType: "image/png", data: "AAAA" } },
								],
							},
						},
					],
				}),
			};
		}),
	);
	return seen;
}

const base = {
	brand: "BIB Burgers",
	vehicleLabel: "Airstream · Mid",
	label: "side_elevation",
	prompt: "A side elevation.",
};

beforeEach(() => {
	vi.stubEnv("GOOGLE_API_KEY", "test-key");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("reference locks", () => {
	it("tells the model the factory photo is the shell it must keep", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			bodyReference: PNG_URL,
			geometry: geometryFor("airstream"),
		});
		expect(seen.text).toContain("BODY LOCK");
		expect(seen.text).toContain("reference image 1");
		expect(seen.text).toContain("ONLY cosmetics");
		expect(seen.text).toContain("rounded belt line");
		expect(seen.parts).toHaveLength(1);
	});

	it("still pins geometry in words when no photo is on disk", async () => {
		const seen = captureRequest();
		await generateTruckImage({ ...base, geometry: geometryFor("square") });
		expect(seen.text).toContain("BODY LOCK");
		expect(seen.text).toContain("flat vertical side walls");
		expect(seen.parts).toHaveLength(0);
	});

	it("orders body before livery so geometry outranks the wrap", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			bodyReference: PNG_URL,
			liveryReference: PNG_URL,
			geometry: geometryFor("airstream"),
		});
		expect(seen.text).toContain("BODY LOCK: reference image 1");
		expect(seen.text).toContain("LIVERY LOCK: reference image 2");
		expect(seen.parts).toHaveLength(2);
	});

	it("treats a buyer's photo as style only, never a body to copy", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			bodyReference: PNG_URL,
			inspirationReference: PNG_URL,
			geometry: geometryFor("airstream"),
		});
		expect(seen.text).toContain("STYLE REFERENCE ONLY");
		expect(seen.text).toContain("Do NOT copy its body shape");
	});

	it("never chains an SVG placeholder as a reference", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			bodyReference: SVG_PLACEHOLDER,
			liveryReference: SVG_PLACEHOLDER,
		});
		expect(seen.parts).toHaveLength(0);
		expect(seen.text).not.toContain("BODY LOCK");
	});

	it("adds no lock text at all when there is nothing to lock", async () => {
		const seen = captureRequest();
		await generateTruckImage(base);
		expect(seen.text).toBe("A side elevation.");
	});
});
