import { beforeEach, describe, expect, it } from "vitest";
import {
	commitDesignVersion,
	displayText,
	getOrCreateSession,
	type TruckSession,
} from "./session";
import { specFromIntake } from "./design-record";
import { canvasDigest, renderArgsFor } from "./render-inputs";
import { describePatch, runRound, viewsOnScreen } from "./round";

function freshSession(): TruckSession {
	return getOrCreateSession(`test_${Math.random().toString(36).slice(2)}`);
}

beforeEach(() => {
	// No key: the image model returns placeholders without touching the network.
	process.env.GOOGLE_API_KEY = "";
	process.env.GEMINI_API_KEY = "";
	process.env.GOOGLE_GENAI_API_KEY = "";
});

describe("chat history the buyer sees", () => {
	it("strips every bracketed context block from old user turns", () => {
		const text = displayText({
			role: "user",
			content:
				"[Designer context: x]\n\n[Project brain — biz:grill]\n\n[Canvas — no renders yet.]\n\nMake it teal",
		});
		expect(text).toBe("Make it teal");
	});

	it("prefers the stored display text", () => {
		expect(
			displayText({
				role: "user",
				content: "[x]\n\nhello",
				display: "hello there",
			}),
		).toBe("hello there");
	});
});

describe("proposal cards", () => {
	it("describe a patch in plain lines", () => {
		const lines = describePatch({
			patch: {
				colors: ["teal", "cream"],
				vehicleId: "square-5m",
				brand: "Taco Loco",
			},
			removeColors: ["red"],
		});
		expect(lines).toContain("Colors → teal, cream");
		expect(lines).toContain("Remove red");
		expect(lines).toContain('Name → "Taco Loco"');
		expect(lines.join(" ")).toMatch(/Square Trailer · 16 ft/);
	});
});

describe("renders read the design record, not the brain", () => {
	it("a confirmed revision wins over stale brain words", () => {
		const s = freshSession();
		s.brain = {
			brandName: "Old",
			colors: ["red"],
			vibeWords: [],
			businessType: "grill",
			menuKeywords: [],
			vehicleId: "airstream-m",
			vehicleSource: "picker",
			walkIn: false,
			customerNotes: [],
			equipmentHints: [],
			unknowns: [],
			confidence: {
				brand: 0,
				business: 0,
				space: 0,
				customer: 0,
				aesthetic: 0,
			},
			signals: 0,
			updatedAt: 0,
		};
		commitDesignVersion(
			s,
			specFromIntake({
				brandName: "Taco Loco",
				businessType: "mexican",
				colors: "teal, cream",
				vehicleId: "square-4m",
			}),
			{ changeSummary: "v1", state: "concept" },
		);
		const args = renderArgsFor(s);
		expect(args.colors).toBe("teal, cream");
		expect(args.brand).toBe("Taco Loco");
		expect(args.vehicleId).toBe("square-4m");
		expect(args.businessType).toBe("mexican");
		expect(canvasDigest(s)).toMatch(/design v1/);
	});
});

describe("a render round", () => {
	it("announces exactly the views it renders and records itself in the timeline", async () => {
		const s = freshSession();
		commitDesignVersion(
			s,
			specFromIntake({ businessType: "coffee", vehicleId: "airstream-s" }),
			{
				changeSummary: "v1",
				state: "concept",
			},
		);
		const events: Array<Record<string, unknown>> = [];
		const result = await runRound(
			s,
			{ views: ["exterior_hero", "interior_layout"], charge: true },
			(e) => events.push(e),
		);
		const start = events.find((e) => e.type === "images_start");
		expect(start?.views).toEqual(["exterior_hero", "interior_layout"]);
		expect(events.at(-1)?.type).toBe("images_done");
		// Placeholders are failures, and a round where nothing rendered is free.
		expect(result.failed).toEqual(["exterior_hero", "interior_layout"]);
		expect(s.creditsUsed).toBe(0);
		const card = s.history.at(-1);
		expect(card?.kind).toBe("renders");
		expect(card?.display).toBe("");
		expect(viewsOnScreen(s)).toEqual([]);
	});
});
