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
import { warning } from "./ste";

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
	| "inspiration"
	/** The buyer's menu artwork. Goes on the menu board and nowhere else. */
	| "menu";

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
 * References for the on-demand `menu_board` render: the approved exterior
 * (this round's hero, else the session master) so the truck is the same one,
 * then the menu artwork it has to carry. Deliberately no body photo — the
 * hero already fixes the shell, and the artwork needs the slot.
 */
export function menuBoardReferences(args: {
	completed: Partial<Record<string, string>>;
	masterPhoto?: string | null;
	artwork: string;
}): RenderReference[] {
	const out: RenderReference[] = [];
	const hero = args.completed[ANCHOR_VIEW];
	if (isPhoto(hero)) out.push({ url: hero, role: "anchor", from: ANCHOR_VIEW });
	else if (isPhoto(args.masterPhoto))
		out.push({ url: args.masterPhoto, role: "anchor", from: "previous round" });
	const side = args.completed.side_elevation;
	if (isPhoto(side))
		out.push({ url: side, role: "spatial", from: "side_elevation" });
	if (isPhoto(args.artwork))
		out.push({ url: args.artwork, role: "menu", from: "menu artwork" });
	return out;
}

/**
 * Per-role instructions for one reference image, in STE.
 *
 * Each role gets its own short sentences rather than one long clause, so the
 * model cannot read "borrow the palette" as permission to copy the body.
 */
function referenceLines(
	r: RenderReference,
	n: number,
	geometry: string | null | undefined,
): string[] {
	const pretty = r.from.replace(/_/g, " ");
	if (r.role === "body") {
		return [
			`Reference image ${n} is a photograph of the actual trailer shell for this build.`,
			geometry ? `Shell data: ${geometry}.` : "",
			`Copy the shell in image ${n} exactly: silhouette, proportions and panel lines.`,
			`Copy the position of each door, hatch, window, vent, wheel and jack from image ${n}.`,
		].filter(Boolean);
	}
	if (r.role === "anchor") {
		return [
			`Reference image ${n} is the APPROVED MASTER RENDER of this trailer (${pretty}).`,
			`Image ${n} sets the wrap artwork, brand colors, logo position, sign lettering, materials and finishes.`,
			`Treat image ${n} as a photograph of a trailer that exists now.`,
		];
	}
	if (r.role === "spatial") {
		return [
			`Reference image ${n} is the same trailer from a different viewpoint (${pretty}).`,
			`Each item that shows in image ${n} and in the new view must be identical.`,
			"This includes the position of each unit, counter heights, equipment, materials, floor, walls and ceiling.",
		];
	}
	if (r.role === "menu") {
		return [
			`Reference image ${n} is the buyer's finished MENU ARTWORK.`,
			`Put image ${n} on the menu board face only, as a flat printed insert.`,
			`Copy its layout, words, prices and colors exactly. Do not write new menu text.`,
		];
	}
	return [
		`Reference image ${n} is a mood photo the buyer shared.`,
		`Borrow only the palette, the lettering style and the finish from image ${n}.`,
		"Do NOT copy its body shape, layout or fittings. They belong to a different trailer.",
		`Do not paste image ${n}, or an object from it, onto the trailer as a sticker or graphic.`,
		"The wrap must look like one professionally designed vinyl livery that follows the body curves.",
	];
}

/**
 * The instruction block that turns references into a constraint.
 *
 * Written as an explicit inventory ("image 2 is the same galley from the
 * hatch") plus a closed list of things the model may not touch, because a
 * general "be consistent" is exactly the phrasing these models ignore.
 * Formatted as an STE appendix to the view's specification.
 */
export function continuityLock(
	refs: RenderReference[],
	geometry: string | null | undefined,
	/** Fields the customer explicitly asked to change — everything else stays locked. */
	allowedChanges?: readonly string[] | null,
): string {
	if (refs.length === 0) {
		return geometry
			? steAppendix("BODY LOCK", [
					`Shell data: ${geometry}.`,
					"Keep each of these features in the same position.",
					warning(
						"Do not add doors, hatches or windows.",
						"The shell data is the complete list.",
					),
				])
			: "";
	}

	const lines: string[] = [
		`${refs.length} reference image${refs.length === 1 ? " is" : "s are"} attached. They are numbered in the order you receive them.`,
	];
	refs.forEach((r, i) => {
		lines.push(...referenceLines(r, i + 1, geometry));
	});
	if (allowedChanges?.length) {
		lines.push(
			`This is a targeted revision. You MAY change only: ${allowedChanges.join(", ")}.`,
			"Keep all other items identical to the references.",
		);
	} else {
		lines.push(
			"Keep the visual identity and the architecture of the references.",
		);
	}
	lines.push(
		"You photograph a trailer that exists now.",
		"The ONLY thing this view changes is the camera position, and the time of day where the specification says so.",
	);
	if (refs.some((r) => r.role === "menu")) {
		lines.push(
			"The one permitted addition is the menu board with the menu artwork. The warnings apply to all other items.",
		);
	}
	lines.push(...DRIFT_WARNINGS);
	return steAppendix("CONTINUITY LOCK", lines);
}

/** An STE appendix: lettered lines under a heading, appended to a document. */
function steAppendix(title: string, lines: readonly string[]): string {
	return [`APPENDIX: ${title}`, ...lines.map((l, i) => `A.${i + 1} ${l}`)].join(
		"\n",
	);
}

/**
 * The closed list. Everything here is a drift this pipeline has actually
 * produced, so it is worth the tokens to name each one. One WARNING per
 * drift, each a command — STE puts the prohibition first, the reason after.
 */
export const DRIFT_WARNINGS: readonly string[] = [
	warning("Do not redesign, reinterpret, replace or reinvent an item."),
	warning("Do not change the body shape, length or proportions."),
	warning(
		"Do not add, remove or move furniture, counters, appliances or fittings.",
	),
	warning("Do not change the floor plan or room dimensions."),
	warning(
		"Do not change materials, flooring, wall colours, ceilings or splashbacks.",
	),
	warning("Do not move, add or remove windows, doors, hatches or vents."),
	warning("Do not change the wrap artwork or the brand colors."),
	warning(
		"Do not add decoration, props, plants or objects that the references do not show.",
	),
	warning(
		"Do not write new text, lettering, slogans, prices or random characters.",
	),
	warning(
		"Do not add people.",
		"This includes customers, staff, chefs, passers-by, silhouettes and hands.",
	),
	warning(
		"Do not change the light fixtures.",
		"A stated time-of-day change can change the light, but not the fixtures.",
	),
	warning(
		"Do not change the medium.",
		"A photograph stays a photograph. An illustration stays an illustration.",
	),
	warning(
		"Do not make a blueprint, technical drawing, floor plan, sectional, cutaway, dollhouse, isometric, axonometric or wireframe view.",
	),
];

/** The same warnings as one block, for callers that quote them inline. */
export const DRIFT_NEGATIVES = DRIFT_WARNINGS.join(" ");

/**
 * Which render a sales clip should be filmed from.
 *
 * A video briefed on the exterior hero and asked for a serve-up walkthrough
 * has to invent the interior, and invents a different one every time. Each
 * preset now leads with the still that shows the space it films, best match
 * first; the caller keeps the anchor in the set so identity survives.
 */
export function videoReferenceViews(kind: string): ConceptView[] {
	// The walkthrough stands INSIDE the galley, so it is briefed on the
	// interior render first — the overhead 3/4 view of the full equipment
	// run — then the eye-level line and the identity anchor.
	if (kind === "walkthrough")
		return ["interior_layout", "front_elevation", "exterior_hero"];
	// Clips otherwise stay outside the trailer and look in through the hatch,
	// so the hatch-view still (front_elevation) is the interior reference,
	// never the overhead render the camera could not reach.
	if (kind === "night-cinematic") return ["night_exterior", "exterior_hero"];
	return ["exterior_hero", "side_elevation", "exterior_rear"];
}
