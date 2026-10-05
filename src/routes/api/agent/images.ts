import { createFileRoute } from "@tanstack/react-router";
import {
	CONCEPT_VIEWS,
	type ConceptView,
	STARTER_AUTO_VIEWS,
} from "#/lib/food-truck/constants";
import { runRound, viewsOnScreen } from "#/lib/food-truck/round";
import {
	creditsLeft,
	getOrCreateSession,
	listConcepts,
	restoreSession,
} from "#/lib/food-truck/session";

const LABELS = CONCEPT_VIEWS;

/**
 * Canvas-driven renders (JSON, not SSE).
 *
 * POST { sessionId, views?, mode } where mode is:
 *  - "more"       extra angles of the current version — free;
 *  - "retry"      views that failed — free;
 *  - "regenerate" a fresh take on what is on screen — spends a round.
 *
 * Everything the round is briefed with comes from the design record via
 * renderArgsFor; the client sends no brand, colors or vehicle of its own,
 * so the canvas can never render something the chat did not agree.
 */
export const Route = createFileRoute("/api/agent/images")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json().catch(() => ({}))) as {
						sessionId?: string;
						views?: string[];
						mode?: "more" | "retry" | "regenerate";
					};
					if (!body.sessionId) {
						return Response.json(
							{ error: "sessionId is required" },
							{ status: 400 },
						);
					}
					await restoreSession(body.sessionId);
					const session = getOrCreateSession(body.sessionId);
					const mode = body.mode ?? "regenerate";
					const asked = Array.isArray(body.views)
						? CONCEPT_VIEWS.filter((v) => body.views?.includes(v))
						: [];
					if (Array.isArray(body.views) && asked.length === 0) {
						return Response.json(
							{
								error: `Unknown view(s): ${body.views.join(", ")}`,
								labels: [...CONCEPT_VIEWS],
							},
							{ status: 400 },
						);
					}
					const onScreen = viewsOnScreen(session);
					const views: ConceptView[] = asked.length
						? asked
						: onScreen.length
							? onScreen
							: [...STARTER_AUTO_VIEWS];
					// The first round ever is charged whatever it is called.
					const charge = mode === "regenerate" || session.visualRounds === 0;
					if (charge && creditsLeft(session) <= 0) {
						return Response.json(
							{
								error:
									"You've used your free design rounds. Request a quote and our team will keep refining it with you.",
								creditsLeft: 0,
								topUpRequired: true,
							},
							{ status: 402 },
						);
					}
					const events: Array<Record<string, unknown>> = [];
					const result = await runRound(session, { views, charge }, (e) =>
						events.push(e),
					);
					const done = events.find((e) => e.type === "images_done") ?? {};
					return Response.json({
						images: listConcepts(session),
						views: result.ready,
						failed: result.failed,
						version: result.version,
						stamp: done.stamp ?? null,
						creditsLeft: creditsLeft(session),
						creditsUsed: session.creditsUsed,
					});
				} catch (error) {
					console.error("[food-truck] images POST error:", error);
					return Response.json(
						{ error: "The render did not finish. Please try again." },
						{ status: 500 },
					);
				}
			},
			/** Reconcile: the authoritative list of this session's renders. */
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return Response.json({ images: [], labels: [...LABELS] });
				}
				await restoreSession(sessionId);
				const session = getOrCreateSession(sessionId);
				return Response.json({
					images: listConcepts(session),
					labels: [...LABELS],
					creditsLeft: creditsLeft(session),
				});
			},
		},
	},
});
