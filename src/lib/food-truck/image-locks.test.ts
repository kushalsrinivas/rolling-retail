import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geometryFor } from "./constants";
import { generateTruckImage } from "./images";

const PNG_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_URL2 = PNG_URL.replace("iVBORw0", "iVBORw1");
const PNG_URL3 = PNG_URL.replace("iVBORw0", "iVBORw2");
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

describe("continuity locks", () => {
	it("tells the model the factory photo is the shell it must keep", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [
				{ url: PNG_URL, role: "body", from: "factory catalog photo" },
			],
			geometry: geometryFor("airstream"),
		});
		expect(seen.text).toContain("CONTINUITY LOCK");
		expect(seen.text).toContain("Reference image 1 is a photograph");
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

	it("numbers each reference in the order the model receives it", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [
				{ url: PNG_URL, role: "spatial", from: "interior_layout" },
				{ url: PNG_URL2, role: "anchor", from: "exterior_hero" },
				{ url: PNG_URL3, role: "body", from: "factory catalog photo" },
			],
			geometry: geometryFor("airstream"),
		});
		expect(seen.parts).toHaveLength(3);
		expect(seen.text).toContain("Reference image 1 is the same truck");
		expect(seen.text).toContain("interior layout");
		expect(seen.text).toContain("Reference image 2 is the APPROVED MASTER");
		expect(seen.text).toContain("Reference image 3 is a photograph");
	});

	it("renumbers rather than desyncs when a reference cannot be decoded", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [
				{ url: SVG_PLACEHOLDER, role: "body", from: "factory catalog photo" },
				{ url: PNG_URL, role: "anchor", from: "exterior_hero" },
			],
		});
		// The SVG is dropped from the parts, so the anchor must become image 1
		// — the old three-slot version left the numbering pointing at a gap.
		expect(seen.parts).toHaveLength(1);
		expect(seen.text).toContain("Reference image 1 is the APPROVED MASTER");
		expect(seen.text).not.toContain("Reference image 2");
	});

	it("treats a buyer's photo as style only, never a body to copy", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [
				{ url: PNG_URL, role: "body", from: "factory catalog photo" },
				{ url: PNG_URL2, role: "inspiration", from: "buyer photo" },
			],
			geometry: geometryFor("airstream"),
		});
		expect(seen.text).toContain("mood photo the buyer shared");
		expect(seen.text).toContain("Do NOT copy its body shape");
	});

	it("spells out the drift it must not introduce", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [{ url: PNG_URL, role: "anchor", from: "exterior_hero" }],
		});
		for (const forbidden of [
			"add, remove or move furniture",
			"change the floor plan or room dimensions",
			"move, add or remove windows, doors, hatches or vents",
			"change materials, flooring, wall colours",
			"ONLY thing this view changes is the camera position",
		]) {
			expect(seen.text).toContain(forbidden);
		}
	});

	it("never chains an SVG placeholder as a reference", async () => {
		const seen = captureRequest();
		await generateTruckImage({
			...base,
			references: [
				{ url: SVG_PLACEHOLDER, role: "body", from: "factory catalog photo" },
				{ url: SVG_PLACEHOLDER, role: "anchor", from: "exterior_hero" },
			],
		});
		expect(seen.parts).toHaveLength(0);
		expect(seen.text).not.toContain("CONTINUITY LOCK");
	});

	it("adds no lock text at all when there is nothing to lock", async () => {
		const seen = captureRequest();
		await generateTruckImage(base);
		expect(seen.text).toBe("A side elevation.");
	});
});

describe("unnamed businesses", () => {
	it("letters the truck when the buyer has named it", async () => {
		const { conceptPrompts } = await import("./images");
		const hero = conceptPrompts({
			brand: "BIB Burgers",
			vehicleLabel: "Airstream · Mid",
			vehicleBody: "airstream",
			lengthM: 6,
			widthM: 2.2,
			heightM: 2.7,
			colors: "matte black",
			vibe: "bold",
			businessType: "grill",
			menuKeywords: [],
			equipment: [],
			serveMode: "hatch-serve",
			hasBrand: true,
		})[0];
		expect(hero.prompt).toContain('brand name "BIB Burgers"');
	});

	it("leaves the signage blank rather than painting a placeholder", async () => {
		const { conceptPrompts } = await import("./images");
		const hero = conceptPrompts({
			brand: "the business",
			vehicleLabel: "Airstream · Mid",
			vehicleBody: "airstream",
			lengthM: 6,
			widthM: 2.2,
			heightM: 2.7,
			colors: "matte black",
			vibe: "bold",
			businessType: "grill",
			menuKeywords: [],
			equipment: [],
			serveMode: "hatch-serve",
			hasBrand: false,
		})[0];
		expect(hero.prompt).toContain("has not named the business");
		expect(hero.prompt).toContain("unlettered");
		expect(hero.prompt).not.toContain("New Brand");
	});

	it("letters no view at all when the business is unnamed", async () => {
		const { conceptPrompts } = await import("./images");
		const base = {
			brand: "the business",
			vehicleLabel: "Airstream · Mid",
			vehicleBody: "airstream" as const,
			lengthM: 6,
			widthM: 2.2,
			heightM: 2.7,
			colors: "matte black",
			vibe: "bold",
			businessType: "grill",
			menuKeywords: [],
			equipment: [],
			serveMode: "hatch-serve" as const,
		};
		// Six views used to inject the brand independently of the ctx line, so an
		// unnamed truck came back with a placeholder painted down its side.
		for (const view of conceptPrompts({ ...base, hasBrand: false })) {
			expect(view.prompt, view.label).not.toContain('the business"');
			expect(view.prompt, view.label).not.toMatch(/sign reading "/);
		}
	});

	it("still letters every view once the business is named", async () => {
		const { conceptPrompts } = await import("./images");
		const views = conceptPrompts({
			brand: "BIB Burgers",
			vehicleLabel: "Airstream · Mid",
			vehicleBody: "airstream",
			lengthM: 6,
			widthM: 2.2,
			heightM: 2.7,
			colors: "matte black",
			vibe: "bold",
			businessType: "grill",
			menuKeywords: [],
			equipment: [],
			serveMode: "hatch-serve",
			hasBrand: true,
		});
		const lettered = views.filter((v) => v.prompt.includes("BIB Burgers"));
		expect(lettered.length).toBeGreaterThanOrEqual(5);
	});
});
