import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONCEPT_VIEWS } from "./constants";
import { ANCHOR_VIEW } from "./continuity";
import { conceptPrompts, runStarterConcepts } from "./images";

/**
 * The round, end to end, over a fake image model.
 *
 * What is under test is the pipeline's one real promise: after the anchor, no
 * render is ever generated from text alone — every call carries the finished
 * pixels of the views it depends on, and a view that fails neither vanishes
 * nor poisons the views downstream of it.
 */

// No factory photo on disk, so reference sets are purely generated renders.
vi.mock("./references", () => ({
	factoryReference: async () => null,
	clearReferenceCache: () => {},
}));

const ARGS = {
	brand: "BIB Burgers",
	vehicleLabel: "Airstream · Mid",
	vehicleBody: "airstream" as const,
	lengthM: 6,
	widthM: 2.2,
	heightM: 2.7,
	colors: "matte black, orange",
	vibe: "bold",
	businessType: "grill",
	menuKeywords: ["smash burgers"],
	equipment: ["griddle-chargrill"],
	serveMode: "hatch-serve" as const,
	brainNote: "test round",
};

/**
 * The prompt text identifies the view: the request body is
 * `${prompt} ${lock}`, and `conceptPrompts` is deterministic.
 */
const PROMPTS = conceptPrompts({ ...ARGS, hasBrand: true });

interface Call {
	view: string;
	/** `data` payloads of the attached reference images, in order. */
	refs: string[];
	text: string;
}

let calls: Call[] = [];

function viewOf(text: string): string {
	return PROMPTS.find((p) => text.startsWith(p.prompt))?.label ?? "?";
}

/** Each view returns a uniquely identifiable payload so refs trace back. */
function stubModel(opts: { failOn?: string[]; throwOn?: string[] } = {}) {
	calls = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url: string, init: { body: string }) => {
			const parts = JSON.parse(init.body).contents[0].parts as Array<{
				text?: string;
				inlineData?: { data: string };
			}>;
			const text = parts[0].text ?? "";
			const view = viewOf(text);
			calls.push({
				view,
				text,
				refs: parts
					.slice(1)
					.map((p) => p.inlineData?.data ?? "")
					.filter(Boolean),
			});

			if (opts.throwOn?.includes(view)) throw new Error("network exploded");
			if (opts.failOn?.includes(view)) {
				return { ok: false, status: 500, json: async () => ({}) };
			}
			return {
				ok: true,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										inlineData: { mimeType: "image/png", data: `IMG-${view}` },
									},
								],
							},
						},
					],
				}),
			};
		}),
	);
}

const call = (view: string) => calls.find((c) => c.view === view);

beforeEach(() => {
	vi.stubEnv("GOOGLE_API_KEY", "test-key");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("concept round", () => {
	it("returns a record for every view and consumes one credit", async () => {
		stubModel();
		const run = await runStarterConcepts(0, ARGS);
		expect(run.images.map((i) => i.label).sort()).toEqual(
			[...CONCEPT_VIEWS].sort(),
		);
		expect(run.images.every((i) => i.status === "ready")).toBe(true);
		expect(run.creditsUsed).toBe(1);
	});

	it("generates the anchor from text and every other view from references", async () => {
		stubModel();
		await runStarterConcepts(0, ARGS);

		expect(call(ANCHOR_VIEW)?.refs).toHaveLength(0);
		for (const view of CONCEPT_VIEWS) {
			if (view === ANCHOR_VIEW) continue;
			const c = call(view);
			expect(c, view).toBeTruthy();
			// The whole point of the rewrite: nothing downstream is text-only.
			expect(c?.refs.length, view).toBeGreaterThan(0);
			expect(c?.text, view).toContain("CONTINUITY LOCK");
		}
	});

	it("hands each view the actual pixels of its dependencies", async () => {
		stubModel();
		await runStarterConcepts(0, ARGS);
		expect(call("front_elevation")?.refs).toEqual([
			"IMG-interior_layout",
			`IMG-${ANCHOR_VIEW}`,
		]);
	});

	it("chains interior views off each other, not only off the hero", async () => {
		stubModel();
		await runStarterConcepts(0, ARGS);
		expect(call("assembly_theater")?.refs).toEqual([
			"IMG-front_elevation",
			"IMG-interior_layout",
		]);
	});

	it("keeps going when one view fails, and marks it failed", async () => {
		stubModel({ failOn: ["night_exterior"] });
		const run = await runStarterConcepts(0, ARGS);
		expect(run.images).toHaveLength(CONCEPT_VIEWS.length);
		const night = run.images.find((i) => i.label === "night_exterior");
		expect(night?.status).toBe("failed");
		expect(night?.error).toBeTruthy();
		expect(run.images.filter((i) => i.status === "ready")).toHaveLength(
			CONCEPT_VIEWS.length - 1,
		);
	});

	it("survives a throw without losing the rest of the stage", async () => {
		// A throw inside Promise.all used to reject the whole wave and discard
		// every sibling render with it.
		stubModel({ throwOn: ["roof_plan"] });
		const run = await runStarterConcepts(0, ARGS);
		expect(run.images).toHaveLength(CONCEPT_VIEWS.length);
		expect(run.images.find((i) => i.label === "roof_plan")?.status).toBe(
			"failed",
		);
		expect(run.images.find((i) => i.label === "night_exterior")?.status).toBe(
			"ready",
		);
	});

	it("never chains a failed render into a later view", async () => {
		stubModel({ failOn: ["interior_layout"] });
		await runStarterConcepts(0, ARGS);
		// interior_layout fell back to a placeholder; front_elevation must lean
		// on the anchor rather than inherit a broken room.
		expect(call("front_elevation")?.refs).not.toContain("IMG-interior_layout");
		expect(call("front_elevation")?.refs).toContain(`IMG-${ANCHOR_VIEW}`);
	});

	it("records which views each render was conditioned on", async () => {
		stubModel();
		const run = await runStarterConcepts(0, ARGS);
		const theater = run.images.find((i) => i.label === "assembly_theater");
		expect(theater?.references).toEqual(["front_elevation", "interior_layout"]);
	});

	it("reports progress that advances to the full count", async () => {
		stubModel();
		const seen: Array<{ completed: number; total: number }> = [];
		await runStarterConcepts(0, ARGS, (_batch, p) =>
			seen.push({ completed: p.completed, total: p.total }),
		);
		expect(seen.length).toBeGreaterThan(0);
		expect(seen.every((p) => p.total === CONCEPT_VIEWS.length)).toBe(true);
		expect(seen.at(-1)?.completed).toBe(CONCEPT_VIEWS.length);
	});

	it("retries a subset against the renders already in hand", async () => {
		stubModel();
		const retry = await runStarterConcepts(0, {
			...ARGS,
			only: ["night_exterior"],
			completed: {
				exterior_hero: "data:image/png;base64,IMG-exterior_hero",
				side_elevation: "data:image/png;base64,IMG-side_elevation",
			},
		});
		expect(retry.images.map((i) => i.label)).toEqual(["night_exterior"]);
		// One model call, and it inherited the existing world rather than
		// building a new one.
		expect(calls).toHaveLength(1);
		expect(calls[0].refs).toEqual(["IMG-exterior_hero", "IMG-side_elevation"]);
	});
});
