/**
 * One render round, streamed — shared by the chat's first auto round and
 * by confirmed revisions, so the canvas and the chat always receive the
 * same events in the same order:
 *
 *   images_start { views, version }  → open exactly these slots
 *   images       { images, progress } → per stage
 *   images_done  { images, views, version, stamp, creditsLeft }
 *
 * The old client opened a slot for every concept view on every round, so a
 * three-view starter round left five tiles to time out as "did not render".
 * Announcing the view list fixes that at the source.
 *
 * Server-only.
 */
import {
	CONCEPT_VIEWS,
	type ConceptView,
	getBusiness,
	getVehicle,
} from "./constants";
import { specFromIntake, versionStamp } from "./design-record";
import { runStarterConcepts } from "./images";
import { renderArgsFor } from "./render-inputs";
import {
	type Proposal,
	adoptMasterFromImages,
	commitDesignVersion,
	conceptsByView,
	creditsLeft,
	currentDesign,
	listConcepts,
	persistSession,
	putConcepts,
	type TruckSession,
} from "./session";

export type RoundEvent = Record<string, unknown> & { type: string };

export interface RoundOptions {
	views: readonly ConceptView[];
	/** Spend a round. Extra angles of the current version are free. */
	charge: boolean;
	/** Fields a confirmed revision may change; everything else is locked. */
	allowedChanges?: readonly string[] | null;
	/**
	 * Start a fresh visual world: no previous renders as references. Used when
	 * the body or the business changed — the old pixels would fight the brief.
	 */
	fresh?: boolean;
}

export interface RoundResult {
	views: ConceptView[];
	ready: string[];
	failed: string[];
	version: number | null;
}

/** Views a revision re-renders: whatever the buyer can currently see. */
export function viewsOnScreen(session: TruckSession): ConceptView[] {
	const ready = new Set(
		Object.values(session.images)
			.filter((i) => i.status === "ready")
			.map((i) => i.label),
	);
	return CONCEPT_VIEWS.filter((v) => ready.has(v));
}

export async function runRound(
	session: TruckSession,
	opts: RoundOptions,
	send: (evt: RoundEvent) => void,
): Promise<RoundResult> {
	// The first round commits v1 from whatever the brain knows, so every
	// later revision has a record to patch.
	if (!currentDesign(session) && session.brain) {
		const b = session.brain;
		commitDesignVersion(
			session,
			specFromIntake({
				brandName: b.brandName ?? undefined,
				businessType: b.businessType ?? undefined,
				menu: b.menuKeywords.join(", ") || undefined,
				colors: b.colors.join(", ") || undefined,
				vibe: b.vibeWords.join(", ") || undefined,
				vehicleId: b.vehicleId ?? undefined,
				service: b.walkIn ? "walk-in" : "hatch",
			}),
			{ changeSummary: "First concepts — design v1.", state: "concept" },
		);
	}
	const record = currentDesign(session);
	const views = [...opts.views];
	send({
		type: "images_start",
		views,
		count: views.length,
		version: record?.version ?? null,
	});

	const base = renderArgsFor(session);
	const run = await runStarterConcepts(
		session.creditsUsed,
		{
			...base,
			masterReference: opts.fresh ? null : base.masterReference,
			completed: opts.fresh ? {} : conceptsByView(session),
			only: views,
			charge: opts.charge,
			allowedChanges: opts.allowedChanges ?? null,
		},
		(batch, progress) => {
			// Persist before announcing: a dropped frame is still recoverable.
			if (batch.length > 0) putConcepts(session, batch);
			send({ type: "images", images: batch, progress });
		},
	);
	session.creditsUsed = run.creditsUsed;
	session.visualRounds += 1;
	if (opts.fresh) session.masterImageUrl = null;
	adoptMasterFromImages(session, run.images);
	putConcepts(session, run.images);
	const ready = run.images
		.filter((i) => i.status === "ready")
		.map((i) => i.label);
	const failed = run.images
		.filter((i) => i.status === "failed")
		.map((i) => i.label);
	const rec = currentDesign(session);
	// The model needs to know the canvas changed, or its next reply talks
	// about renders it has never heard of.
	session.history.push({
		role: "assistant",
		content: `[Rendered ${ready.map((v) => v.replace(/_/g, " ")).join(", ") || "nothing"}${rec ? ` for design v${rec.version}` : ""}.${failed.length ? ` Failed: ${failed.join(", ")}.` : ""}]`,
		display: "",
		kind: "renders",
		data: { views: ready, failed, version: rec?.version ?? null },
	});
	persistSession(session);
	send({
		type: "images_done",
		images: listConcepts(session),
		views: ready,
		failed,
		version: rec?.version ?? null,
		stamp: rec ? versionStamp(rec.version, rec.state) : null,
		creditsLeft: creditsLeft(session),
	});
	return { views, ready, failed, version: rec?.version ?? null };
}

/** A proposal's patch as plain lines for the confirmation card. */
export function describePatch(
	p: Pick<Proposal, "patch" | "removeColors">,
): string[] {
	const out: string[] = [];
	const patch = p.patch;
	if (patch.colors?.length) out.push(`Colors → ${patch.colors.join(", ")}`);
	if (p.removeColors.length) out.push(`Remove ${p.removeColors.join(", ")}`);
	if (patch.brand !== undefined) out.push(`Name → "${patch.brand}"`);
	if (patch.vehicleId)
		out.push(`Body → ${getVehicle(patch.vehicleId)?.label ?? patch.vehicleId}`);
	if (patch.businessType)
		out.push(
			`Business → ${getBusiness(patch.businessType)?.label ?? patch.businessType}`,
		);
	if (patch.serveMode)
		out.push(
			`Service → ${patch.serveMode === "walk-in" ? "walk-in" : "hatch"}`,
		);
	if (patch.menu?.length) out.push(`Menu → ${patch.menu.join(", ")}`);
	if (patch.vibe?.length) out.push(`Style → ${patch.vibe.join(", ")}`);
	return out;
}
