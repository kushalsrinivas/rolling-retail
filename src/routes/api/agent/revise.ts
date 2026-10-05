import { createFileRoute } from "@tanstack/react-router";
import { emptyBrain } from "#/lib/food-truck/brain";
import { STARTER_AUTO_VIEWS } from "#/lib/food-truck/constants";
import {
	applyPatch,
	specFromIntake,
	versionStamp,
} from "#/lib/food-truck/design-record";
import { runRound, viewsOnScreen } from "#/lib/food-truck/round";
import {
	commitDesignVersion,
	creditsLeft,
	currentDesign,
	getOrCreateSession,
	persistSession,
	restoreSession,
} from "#/lib/food-truck/session";

/** Spec fields → the words the continuity lock names as changeable. */
const CHANGE_WORDS: Record<string, string> = {
	palette: "the wrap colors and brand colors",
	brand: "the brand name lettering",
	vibe: "the overall styling of the wrap",
	menu: "the food and drink shown on the counter",
	equipment: "the equipment line",
	businessType: "the business, its equipment line and its food",
	vehicleId: "the trailer body",
	serveMode: "the service layout",
	openings: "the openings",
};

/** A body or business change invalidates every earlier pixel. */
const STRUCTURAL = new Set(["vehicleId", "businessType", "serveMode"]);

function sse(obj: unknown) {
	return `data: ${JSON.stringify(obj)}\n\n`;
}

/**
 * Apply a proposed change and re-render — the step that closes the loop
 * between "make it teal" in the chat and teal pixels on the canvas.
 *
 * POST { sessionId, proposalId } → SSE: proposal_applied, images_start,
 * images…, images_done, done. The patch comes from the stored proposal,
 * never from the request body, so what renders is what the buyer saw.
 */
export const Route = createFileRoute("/api/agent/revise")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: { sessionId?: string; proposalId?: string } = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId || !body.proposalId) {
					return Response.json(
						{ error: "sessionId and proposalId are required" },
						{ status: 400 },
					);
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				const proposal = s.proposals[body.proposalId];
				if (!proposal) {
					return Response.json(
						{ error: "That change request has expired." },
						{ status: 404 },
					);
				}
				if (proposal.status !== "pending") {
					return Response.json(
						{ error: `That change was already ${proposal.status}.` },
						{ status: 409 },
					);
				}
				if (creditsLeft(s) <= 0) {
					return Response.json(
						{
							error:
								"You've used your free design rounds. Request a quote and our team will keep refining it with you.",
							creditsLeft: 0,
						},
						{ status: 402 },
					);
				}

				if (!currentDesign(s)) {
					const b = s.brain ?? emptyBrain();
					commitDesignVersion(
						s,
						specFromIntake({
							brandName: b.brandName ?? undefined,
							businessType: b.businessType ?? undefined,
							menu: b.menuKeywords.join(", ") || undefined,
							colors: b.colors.join(", ") || undefined,
							vibe: b.vibeWords.join(", ") || undefined,
							vehicleId: b.vehicleId ?? undefined,
							service: b.walkIn ? "walk-in" : "hatch",
						}),
						{ changeSummary: "Design v1.", state: "concept" },
					);
				}
				const current = currentDesign(s);
				if (!current) {
					return Response.json(
						{ error: "No design to revise." },
						{ status: 409 },
					);
				}

				const patch = { ...proposal.patch };
				if (proposal.removeColors.length && !patch.colors) {
					const drop = new Set(
						proposal.removeColors.map((c) => c.toLowerCase()),
					);
					patch.colors = current.spec.colors.filter(
						(c) => !drop.has(c.toLowerCase()),
					);
				}
				const { spec, changed } = applyPatch(current.spec, patch);
				if (changed.length === 0) {
					proposal.status = "dismissed";
					persistSession(s);
					return Response.json(
						{
							error:
								"That change matches the current design — nothing to re-render.",
						},
						{ status: 409 },
					);
				}
				const rec = commitDesignVersion(s, spec, {
					changeSummary: proposal.changeSummary,
					state: "revision",
				});
				proposal.status = "applied";
				proposal.version = rec.version;

				// Keep the brain in step with the record the renders now read.
				const brain = s.brain ?? emptyBrain();
				brain.colors = [...spec.colors];
				brain.vibeWords = [...spec.vibe];
				brain.menuKeywords = [...spec.menu];
				brain.vehicleId = spec.vehicleId;
				brain.businessType = spec.businessType as never;
				brain.walkIn = spec.serveMode === "walk-in";
				if (spec.hasBrand) brain.brandName = spec.brand;
				s.brain = brain;
				persistSession(s);

				const fresh = changed.some((c) => STRUCTURAL.has(c));
				const onScreen = viewsOnScreen(s);
				const views =
					fresh || onScreen.length === 0 ? [...STARTER_AUTO_VIEWS] : onScreen;

				const stream = new ReadableStream({
					async start(controller) {
						const send = (obj: unknown) =>
							controller.enqueue(new TextEncoder().encode(sse(obj)));
						send({
							type: "proposal_applied",
							proposalId: proposal.id,
							version: rec.version,
							stamp: versionStamp(rec.version, rec.state),
							changed,
						});
						try {
							await runRound(
								s,
								{
									views,
									charge: true,
									fresh,
									allowedChanges: fresh
										? null
										: changed.map((c) => CHANGE_WORDS[c] ?? c),
								},
								send,
							);
						} catch (err) {
							console.warn("[food-truck] revise round failed:", err);
							send({
								type: "images_done",
								images: [],
								views: [],
								failed: views,
								error:
									"The render did not finish. Your change is saved — try re-rendering from the canvas.",
								creditsLeft: creditsLeft(s),
							});
						}
						send({ type: "done", creditsLeft: creditsLeft(s) });
						controller.close();
					},
				});
				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache, no-transform",
						Connection: "keep-alive",
					},
				});
			},
			/** Dismiss: "Not now" on the proposal card. */
			DELETE: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				const proposalId = url.searchParams.get("proposalId");
				if (!sessionId || !proposalId) {
					return Response.json(
						{ error: "sessionId and proposalId are required" },
						{ status: 400 },
					);
				}
				await restoreSession(sessionId);
				const s = getOrCreateSession(sessionId);
				const p = s.proposals[proposalId];
				if (p && p.status === "pending") {
					p.status = "dismissed";
					persistSession(s);
				}
				return Response.json({ ok: true });
			},
		},
	},
});
