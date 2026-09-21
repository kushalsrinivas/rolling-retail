import { describe, expect, it } from "vitest";
import { CONCEPT_VIEWS, type ConceptView } from "./constants";
import {
	ANCHOR_VIEW,
	buildReferences,
	conceptStages,
	continuityLock,
	MAX_REFERENCES,
	REFERENCE_PLAN,
	videoReferenceViews,
} from "./continuity";

const photo = (tag: string) => `data:image/png;base64,${tag}`;
const SVG = "data:image/svg+xml;charset=utf-8,%3Csvg%3E";

/** Every view finished, so reference selection is what is under test. */
const allDone = Object.fromEntries(
	CONCEPT_VIEWS.map((v) => [v, photo(v)]),
) as Record<ConceptView, string>;

describe("reference graph", () => {
	it("plans a reference set for every concept view", () => {
		for (const v of CONCEPT_VIEWS) expect(REFERENCE_PLAN[v]).toBeTruthy();
		expect(Object.keys(REFERENCE_PLAN).sort()).toEqual(
			[...CONCEPT_VIEWS].sort(),
		);
	});

	it("generates the anchor first and alone", () => {
		const stages = conceptStages();
		expect(stages[0]).toEqual([ANCHOR_VIEW]);
	});

	it("covers every view exactly once across the stages", () => {
		const flat = conceptStages().flat();
		expect(flat).toHaveLength(CONCEPT_VIEWS.length);
		expect(new Set(flat).size).toBe(CONCEPT_VIEWS.length);
	});

	it("never schedules a view before the renders it references", () => {
		const done = new Set<ConceptView>();
		for (const stage of conceptStages()) {
			for (const v of stage) {
				for (const dep of REFERENCE_PLAN[v].spatial) {
					expect(done.has(dep), `${v} needs ${dep}`).toBe(true);
				}
			}
			for (const v of stage) done.add(v);
		}
	});

	it("keeps the round to a handful of sequential waves", () => {
		// Each stage is a round-trip to the image model; the graph is there for
		// continuity, not to serialise nine calls.
		expect(conceptStages().length).toBeLessThanOrEqual(4);
	});
});

describe("reference selection", () => {
	it("gives every non-anchor view at least one visual reference", () => {
		for (const view of CONCEPT_VIEWS) {
			if (view === ANCHOR_VIEW) continue;
			const refs = buildReferences({ view, completed: allDone });
			expect(refs.length, view).toBeGreaterThan(0);
		}
	});

	it("leads with the closest viewpoint, then the identity anchor", () => {
		const refs = buildReferences({
			view: "front_elevation",
			completed: allDone,
		});
		expect(refs[0].from).toBe("interior_layout");
		expect(refs[0].role).toBe("spatial");
		expect(refs[1].from).toBe(ANCHOR_VIEW);
		expect(refs[1].role).toBe("anchor");
	});

	it("chains interior views off each other, not just off the hero", () => {
		const refs = buildReferences({
			view: "assembly_theater",
			completed: allDone,
		});
		expect(refs.map((r) => r.from)).toEqual([
			"front_elevation",
			"interior_layout",
		]);
	});

	it("falls back to the session master when this round's hero failed", () => {
		const refs = buildReferences({
			view: "side_elevation",
			completed: {},
			masterPhoto: photo("master"),
		});
		expect(refs.some((r) => r.role === "anchor")).toBe(true);
		expect(refs[0].url).toBe(photo("master"));
	});

	it("only ever shows the buyer's photo to the anchor render", () => {
		const onAnchor = buildReferences({
			view: ANCHOR_VIEW,
			completed: {},
			inspiration: photo("mood"),
		});
		expect(onAnchor.some((r) => r.role === "inspiration")).toBe(true);

		// Downstream the hero has already absorbed the mood; re-sending it
		// invites the model to copy that other truck's body.
		const downstream = buildReferences({
			view: "night_exterior",
			completed: allDone,
			inspiration: photo("mood"),
		});
		expect(downstream.some((r) => r.role === "inspiration")).toBe(false);
	});

	it("attaches the factory shell photo only where the plan asks for it", () => {
		const exterior = buildReferences({
			view: "side_elevation",
			completed: allDone,
			bodyPhoto: photo("shell"),
		});
		expect(exterior.some((r) => r.role === "body")).toBe(true);

		const interior = buildReferences({
			view: "assembly_theater",
			completed: allDone,
			bodyPhoto: photo("shell"),
		});
		expect(interior.some((r) => r.role === "body")).toBe(false);
	});

	it("skips placeholders and never repeats the same image", () => {
		const refs = buildReferences({
			view: "night_exterior",
			completed: { exterior_hero: SVG, side_elevation: photo("same") },
			masterPhoto: photo("same"),
		});
		expect(refs.every((r) => !r.url.startsWith("data:image/svg"))).toBe(true);
		expect(new Set(refs.map((r) => r.url)).size).toBe(refs.length);
	});

	it("caps the set so the tail does not dilute the anchor", () => {
		for (const view of CONCEPT_VIEWS) {
			const refs = buildReferences({
				view,
				completed: allDone,
				bodyPhoto: photo("shell"),
				masterPhoto: photo("master"),
				inspiration: photo("mood"),
			});
			expect(refs.length, view).toBeLessThanOrEqual(MAX_REFERENCES);
		}
	});
});

describe("drift lock", () => {
	it("numbers references and forbids redesign", () => {
		const text = continuityLock(
			[
				{ url: photo("a"), role: "spatial", from: "interior_layout" },
				{ url: photo("b"), role: "anchor", from: "exterior_hero" },
			],
			null,
		);
		expect(text).toContain("Reference image 1");
		expect(text).toContain("Reference image 2");
		expect(text).toContain("interior layout");
		expect(text).toContain("camera position");
		expect(text).toContain("DO NOT:");
	});

	it("falls back to words when there is no reference image", () => {
		expect(continuityLock([], "flat vertical side walls")).toContain(
			"flat vertical side walls",
		);
		expect(continuityLock([], null)).toBe("");
	});
});

describe("video references", () => {
	it("films each preset from the still that shows its space", () => {
		expect(videoReferenceViews("walkthrough")[0]).toBe("assembly_theater");
		expect(videoReferenceViews("night-cinematic")[0]).toBe("night_exterior");
		expect(videoReferenceViews("hero-orbit")[0]).toBe("exterior_hero");
		expect(videoReferenceViews("tour")[0]).toBe("exterior_hero");
	});

	it("only ever names real concept views", () => {
		for (const kind of [
			"hero-orbit",
			"walkthrough",
			"night-cinematic",
			"tour",
		]) {
			for (const v of videoReferenceViews(kind)) {
				expect(CONCEPT_VIEWS, `${kind} → ${v}`).toContain(v);
			}
		}
	});
});
