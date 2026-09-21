/**
 * Visual continuity — the rule that makes nine renders one truck.
 *
 * The old pipeline generated a hero, then fired the remaining eight off in
 * parallel batches with the hero attached as a single "livery" reference.
 * That fixes the wrap and nothing else: the interior views had never seen
 * each other, so the counter moved, the splashback changed colour and the
 * make-rail grew a pass a view later. Each render was an independent guess
 * that happened to share a palette.
 *
 * This module treats the round as one continuous visual world instead. Every
 * view declares which earlier views it must inherit from; the generation
 * order falls out of those declarations, and each render is handed the
 * finished pixels of its dependencies as references. The exterior hero is the
 * anchor for the whole property, `interior_layout` is the anchor for
 * everything seen inside it, and nothing after the anchor is ever generated
 * from text alone.
 *
 * Pure and client-safe: no fs, no fetch, no env.
 */
import { CONCEPT_VIEWS, type ConceptView } from "./constants";

/**
 * What a given reference image is *for*. The role is written into the prompt
 * so the model knows whether it is looking at a shell it must copy, a space
 * it must stay inside, or a mood board it may merely borrow from.
 */
export type ReferenceRole =
	/** A real photograph of the factory's shell. Geometry truth. */
	| "body"
	/** The render that established this property's visual identity. */
	| "anchor"
	/** An earlier render of the same space, from another angle. */
	| "spatial"
	/** A buyer's photo. Styling direction only — never a body to copy. */
	| "inspiration";

export interface RenderReference {
	url: string;
	role: ReferenceRole;
	/** Concept view this came from, or a short source name for body/inspiration. */
	from: string;
}

interface ViewPlan {
	/** Attach the factory's catalog photo of this shell. */
	body: boolean;
	/**
	 * Earlier views this one inherits from, most important first. The first
	 * entry is the view whose framing this render is closest to.
	 */
	spatial: readonly ConceptView[];
}

/**
 * The reference graph.
 *
 * Read it as "to draw X you must already have Y". Ordering inside `spatial`
 * matters: the image model weights earlier references more heavily, so the
 * closest-matching viewpoint goes first and the identity anchor second.
 */
export const REFERENCE_PLAN: Record<ConceptView, ViewPlan> = {
	// The anchor. Only real-world input: the factory's shell, plus whatever
	// master and inspiration the session already carries.
	exterior_hero: { body: true, spatial: [] },

	// Exterior siblings: same shell, same livery, different camera.
	side_elevation: { body: true, spatial: ["exterior_hero"] },
	exterior_rear: { body: true, spatial: ["exterior_hero"] },

	// The interior anchor. Takes palette, branding and finish from the hero;
	// the catalog photo is an exterior and would only waste a slot.
	interior_layout: { body: false, spatial: ["exterior_hero"] },

	// Looking into the same galley from outside the hatch — this is
	// interior_layout's room, so that render leads and the hero follows.
	front_elevation: {
		body: false,
		spatial: ["interior_layout", "exterior_hero"],
	},

	// The same counter again, from a customer's eyes. Both interior views
	// lead; the hero is not needed a third time.
	assembly_theater: {
		body: false,
		spatial: ["front_elevation", "interior_layout"],
	},

	// Same truck after dark: the livery has to survive the lighting change.
	night_exterior: { body: false, spatial: ["exterior_hero", "side_elevation"] },

	// A technical plan, but of a real footprint — the elevation fixes the
	// length and the roof furniture.
	roof_plan: { body: true, spatial: ["side_elevation", "exterior_hero"] },

	// Identity board. Needs the livery's palette and wordmark, nothing else.
	brand_mark: { body: false, spatial: ["exterior_hero"] },
};

/** The view every other view ultimately inherits from. */
export const ANCHOR_VIEW: ConceptView = "exterior_hero";

/**
 * Generation order, derived from the graph rather than hand-maintained
 * alongside it. Views in the same stage have no dependency on each other and
 * run concurrently; a stage never starts until the previous one has landed,
 * because its references are the previous one's output.
 *
 * Throws on a cycle — a plan that cannot be generated is a bug, not a
 * runtime condition to degrade around.
 */
export function conceptStages(): ConceptView[][] {
	const remaining = new Set<ConceptView>(CONCEPT_VIEWS);
	const done = new Set<ConceptView>();
	const stages: ConceptView[][] = [];

	while (remaining.size > 0) {
		const stage = [...remaining].filter((v) =>
			REFERENCE_PLAN[v].spatial.every((dep) => done.has(dep)),
		);
		if (stage.length === 0) {
			throw new Error(
				`continuity: unsatisfiable reference plan for ${[...remaining].join(", ")}`,
			);
		}
		for (const v of stage) {
			remaining.delete(v);
		}
		// Added after the whole stage resolves, so same-stage views never
		// reference each other — they are generated in parallel.
		for (const v of stage) done.add(v);
		stages.push(stage);
	}
	return stages;
}

/** Gemini weights earlier images more; past four the tail stops mattering. */
export const MAX_REFERENCES = 4;

export interface BuildReferenceArgs {
	view: ConceptView;
	/** Finished renders from this round, by view. Placeholders excluded. */
	completed: Partial<Record<ConceptView, string>>;
	/** Factory catalog photo of this shell, if one is on disk. */
	bodyPhoto?: string | null;
	/**
	 * The session's cross-round master hero. Stands in as the anchor when this
	 * round's own hero failed, so a regeneration stays the same product.
	 */
	masterPhoto?: string | null;
	/** Buyer's uploaded photo — only ever attached to the anchor render. */
	inspiration?: string | null;
}

const isPhoto = (u: string | null | undefined): u is string =>
	typeof u === "string" &&
	u.startsWith("data:image/") &&
	!u.startsWith("data:image/svg");

/**
 * The reference set for one view, in the order the model should see it.
 *
 * Never returns an empty set for a non-anchor view when any anchor exists —
 * "generated from text alone" is the failure mode this whole module is here
 * to prevent.
 */
export function buildReferences(args: BuildReferenceArgs): RenderReference[] {
	const plan = REFERENCE_PLAN[args.view];
	const out: RenderReference[] = [];
	const seen = new Set<string>();

	const push = (
		url: string | null | undefined,
		role: ReferenceRole,
		from: string,
	) => {
		if (!isPhoto(url) || seen.has(url) || out.length >= MAX_REFERENCES) return;
		seen.add(url);
		out.push({ url, role, from });
	};

	// Closest viewpoint first, then the identity anchor.
	for (const dep of plan.spatial) {
		const url = args.completed[dep];
		push(url, dep === ANCHOR_VIEW ? "anchor" : "spatial", dep);
	}

	// The round's own hero failed (or this IS the hero): fall back to the
	// session master so the product still carries across rounds.
	if (args.view !== ANCHOR_VIEW && !out.some((r) => r.role === "anchor")) {
		push(args.masterPhoto, "anchor", "previous round");
	}
	if (args.view === ANCHOR_VIEW) {
		push(args.masterPhoto, "anchor", "previous round");
	}

	if (plan.body) push(args.bodyPhoto, "body", "factory catalog photo");

	// Mood only reaches the anchor. Re-sending it downstream invites the model
	// to copy somebody else's truck into a view the hero already styled.
	if (args.view === ANCHOR_VIEW) {
		push(args.inspiration, "inspiration", "buyer photo");
	}

	return out;
}

/**
 * The instruction block that turns references into a constraint.
 *
 * Written as an explicit inventory ("image 2 is the same galley from the
 * hatch") plus a closed list of things the model may not touch, because a
 * general "be consistent" is exactly the phrasing these models ignore.
 */
export function continuityLock(
	refs: RenderReference[],
	geometry: string | null | undefined,
): string {
	if (refs.length === 0) {
		return geometry
			? `BODY LOCK: the trailer has ${geometry}. Keep every one of those features, in the same place. Do not invent additional doors, hatches or windows.`
			: "";
	}

	const lines: string[] = [];
	const pretty = (v: string) => v.replace(/_/g, " ");

	refs.forEach((r, i) => {
		const n = i + 1;
		if (r.role === "body") {
			lines.push(
				`Reference image ${n} is a photograph of the actual trailer shell this build uses${
					geometry ? `, which has ${geometry}` : ""
				}. Reproduce that shell exactly: silhouette, proportions, panel lines, and the position of every door, hatch, window, vent, wheel and jack.`,
			);
		} else if (r.role === "anchor") {
			lines.push(
				`Reference image ${n} is the APPROVED MASTER RENDER of this exact truck (${pretty(r.from)}). It defines the property's visual identity: wrap artwork, brand colours, logo placement, signage typography, materials, finishes and lighting character. Treat it as a photograph of a vehicle that already exists.`,
			);
		} else if (r.role === "spatial") {
			lines.push(
				`Reference image ${n} is the same truck already rendered from another viewpoint (${pretty(r.from)}). Everything visible in both views must match: layout and position of every unit, counter heights and runs, equipment, materials, flooring, wall and ceiling finishes, window and hatch placement, colour palette and spatial proportions.`,
			);
		} else {
			lines.push(
				`Reference image ${n} is a mood photo the buyer shared. Borrow only its palette, typography feel and finish. Do NOT copy its body shape, layout or fittings — they belong to somebody else's truck.`,
			);
		}
	});

	return [
		`CONTINUITY LOCK — ${refs.length} reference image${refs.length === 1 ? "" : "s"} attached.`,
		...lines,
		"Preserve the exact visual identity and architectural context established by these references. You are photographing a vehicle that already exists; the ONLY thing this view changes is the camera position and, where the brief says so, the time of day.",
		DRIFT_NEGATIVES,
	].join(" ");
}

/**
 * The closed list. Everything here is a drift this pipeline has actually
 * produced, so it is worth the tokens to name each one.
 */
export const DRIFT_NEGATIVES =
	"DO NOT: redesign, reinterpret, replace or reinvent any element; change the body shape, length or proportions; add, remove or move furniture, counters, appliances or fittings; change the floor plan or room dimensions; change materials, flooring, wall colours, ceilings or splashbacks; move, add or remove windows, doors, hatches or vents; alter architectural details; change the interior design language or the overall aesthetic; change the wrap artwork or brand colours; add decoration, props, plants or objects that are not in the references; invent text, lettering, slogans, prices or gibberish; change the lighting design (a stated time-of-day change may alter the light, never the fixtures).";

/**
 * Which render a sales clip should be filmed from.
 *
 * A video briefed on the exterior hero and asked for a serve-up walkthrough
 * has to invent the interior, and invents a different one every time. Each
 * preset now leads with the still that shows the space it films, best match
 * first; the caller keeps the anchor in the set so identity survives.
 */
export function videoReferenceViews(kind: string): ConceptView[] {
	if (kind === "walkthrough")
		return ["assembly_theater", "front_elevation", "interior_layout"];
	if (kind === "night-cinematic") return ["night_exterior", "exterior_hero"];
	if (kind === "tour")
		return ["exterior_hero", "interior_layout", "front_elevation"];
	return ["exterior_hero", "side_elevation", "exterior_rear"];
}
