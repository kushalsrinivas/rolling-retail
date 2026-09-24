import { describe, expect, it } from "vitest";
import { continuityLock, menuBoardReferences } from "./continuity";
import { conceptPrompts, emblemFor } from "./images";
import {
	accentFromColors,
	emptyMenu,
	formatPrice,
	MENU_LIMITS,
	menuArtworkSvg,
	menuBoardPrompt,
	sanitizeMenu,
} from "./menu";
import { buildSalesVideoPrompt, tourContinuationPrompt } from "./sales";

const photo = (tag: string) => `data:image/png;base64,${tag}`;

describe("menu data", () => {
	it("formats bare numbers as dollars and keeps anything else", () => {
		expect(formatPrice("8")).toBe("$8");
		expect(formatPrice("8.5")).toBe("$8.50");
		expect(formatPrice("$12.95")).toBe("$12.95");
		expect(formatPrice("MP")).toBe("MP");
		expect(formatPrice("")).toBe("");
	});

	it("drops blank rows and empty sections", () => {
		const menu = sanitizeMenu({
			tagline: "  Made   to order ",
			sections: [
				{ title: "Empty", items: [{ name: "  ", price: "4" }] },
				{ title: "Burgers", items: [{ name: "Smash", price: "9" }, {}] },
			],
			placement: "nonsense",
		});
		expect(menu?.tagline).toBe("Made to order");
		expect(menu?.sections).toEqual([
			{ title: "Burgers", items: [{ name: "Smash", price: "$9" }] },
		]);
		expect(menu?.placement).toBe("a-frame");
	});

	it("rejects a menu with no items and caps the item count", () => {
		expect(sanitizeMenu({ sections: [] })).toBeNull();
		expect(sanitizeMenu(null)).toBeNull();
		const many = sanitizeMenu({
			sections: [
				{
					title: "",
					items: Array.from({ length: 40 }, (_, i) => ({ name: `Item ${i}` })),
				},
			],
		});
		expect(many?.sections[0].items).toHaveLength(MENU_LIMITS.items);
	});

	it("seeds a draft from what the buyer already said they sell", () => {
		const m = emptyMenu(["smash burgers", "fries"]);
		expect(m.sections[0].items.map((i) => i.name)).toEqual([
			"Smash Burgers",
			"Fries",
		]);
	});

	it("picks the first non-neutral brand colour as the accent", () => {
		expect(accentFromColors(["black", "white", "red"])).toBe("#d23b2f");
		expect(accentFromColors([])).toBe("#f1b32e");
	});
});

describe("menu artwork", () => {
	const menu = sanitizeMenu({
		tagline: "Fish & chips <since 1990>",
		sections: [
			{ title: "Mains", items: [{ name: "Cod & Chips", price: "11" }] },
		],
	});
	if (!menu) throw new Error("fixture");

	it("prints exactly what was typed, escaped", () => {
		const svg = menuArtworkSvg(menu, {
			brand: "Salt & Vinegar",
			accent: "#d23b2f",
			format: "portrait",
		});
		expect(svg).toContain("SALT &amp; VINEGAR");
		expect(svg).toContain("Cod &amp; Chips");
		expect(svg).toContain("$11");
		expect(svg).toContain("&lt;since 1990&gt;");
		expect(svg).not.toMatch(/<since/);
	});

	it("draws at the print aspect ratio for each format", () => {
		const p = menuArtworkSvg(menu, {
			brand: "X",
			accent: "#000",
			format: "portrait",
		});
		const l = menuArtworkSvg(menu, {
			brand: "X",
			accent: "#000",
			format: "landscape",
		});
		expect(p).toContain('width="1200" height="1800"');
		expect(l).toContain('width="1920" height="1080"');
	});
});

describe("menu board render", () => {
	it("anchors on the hero and attaches the artwork last", () => {
		const refs = menuBoardReferences({
			completed: {
				exterior_hero: photo("hero"),
				side_elevation: photo("side"),
			},
			artwork: photo("menu"),
		});
		expect(refs.map((r) => r.role)).toEqual(["anchor", "spatial", "menu"]);
	});

	it("falls back to the session master when the round has no hero", () => {
		const refs = menuBoardReferences({
			completed: {},
			masterPhoto: photo("master"),
			artwork: photo("menu"),
		});
		expect(refs[0]).toMatchObject({ role: "anchor", from: "previous round" });
	});

	it("tells the model the board is the one permitted addition", () => {
		const lock = continuityLock(
			menuBoardReferences({
				completed: { exterior_hero: photo("hero") },
				artwork: photo("menu"),
			}),
			null,
		);
		expect(lock).toContain("MENU ARTWORK");
		expect(lock).toContain("one permitted addition");
	});

	it("puts the board beside the truck, never on the livery", () => {
		const menu = sanitizeMenu({
			sections: [{ title: "", items: [{ name: "Latte", price: "4" }] }],
			placement: "side-board",
		});
		if (!menu) throw new Error("fixture");
		const p = menuBoardPrompt({
			brand: "Bean",
			hasBrand: true,
			vehicleLabel: "Airstream · Mid",
			menu,
		});
		expect(p).toContain("beside the open service hatch");
		expect(p).toContain("The trailer livery itself carries no menu");
		expect(p).toContain("NO PEOPLE");
	});
});

describe("no people in generated imagery", () => {
	const PEOPLE =
		/\b(stylish customers|customers waiting|customer POV|chef in|staff (?:cook|visible|working)|silhouetted at|handed across|waiting customer|small queue)\b/i;

	it("keeps people out of every concept view", () => {
		const prompts = conceptPrompts({
			brand: "Scoops",
			vehicleLabel: "Square Trailer · 13 ft",
			vehicleBody: "square",
			lengthM: 4,
			widthM: 2.1,
			heightM: 2.6,
			colors: "pink, cream",
			vibe: "playful",
			businessType: "ice-cream",
			menuKeywords: ["gelato"],
			equipment: [],
			serveMode: "hatch-serve",
			hasBrand: true,
		});
		for (const p of prompts) {
			expect(p.prompt, p.label).not.toMatch(PEOPLE);
		}
		const hero = prompts.find((p) => p.label === "exterior_hero");
		expect(hero?.prompt).toContain("NO PEOPLE");
	});

	it("keeps people out of every sales video", () => {
		const ctx = {
			brand: "Scoops",
			vehicleLabel: "Square",
			colors: "pink",
			vibe: "fun",
		};
		for (const kind of [
			"hero-orbit",
			"walkthrough",
			"night-cinematic",
			"tour",
		] as const) {
			expect(buildSalesVideoPrompt(kind, ctx), kind).not.toMatch(PEOPLE);
		}
		expect(tourContinuationPrompt(2, ctx)).not.toMatch(PEOPLE);
		expect(tourContinuationPrompt(3, ctx)).not.toMatch(PEOPLE);
	});
});

describe("brand emblem", () => {
	it("describes a detailed object, not a minimalist icon", () => {
		expect(emblemFor("ice-cream")).toMatch(/lattice/);
		expect(emblemFor("ice-cream")).toMatch(/mix-ins/);
		const prompts = conceptPrompts({
			brand: "Scoops",
			vehicleLabel: "Square",
			vehicleBody: "square",
			lengthM: 4,
			widthM: 2.1,
			heightM: 2.6,
			colors: "pink",
			vibe: "playful",
			businessType: "ice-cream",
			menuKeywords: [],
			equipment: [],
			serveMode: "hatch-serve",
		});
		const mark = prompts.find((p) => p.label === "brand_mark")?.prompt ?? "";
		expect(mark).not.toMatch(/minimalist/i);
		expect(mark).toMatch(/lattice/);
	});
});
