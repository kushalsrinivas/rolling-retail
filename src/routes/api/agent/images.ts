import { createFileRoute } from "@tanstack/react-router";
import {
	CONCEPT_VIEWS,
	getBusiness,
	getVehicle,
} from "#/lib/food-truck/constants";
import { runStarterConcepts } from "#/lib/food-truck/images";
import {
	adoptMasterFromImages,
	conceptsByView,
	creditsLeft,
	getOrCreateSession,
	listConcepts,
	putConcepts,
} from "#/lib/food-truck/session";

const LABELS = CONCEPT_VIEWS;

export const Route = createFileRoute("/api/agent/images")({
	server: {
		handlers: {
			// ── Manual flow: POST generates the full 9-view concept set ──
			POST: async ({ request }) => {
				try {
					const body = (await request.json().catch(() => ({}))) as {
						sessionId?: string;
						brand?: string;
						vehicleId?: string;
						colors?: string;
						vibe?: string;
						brainNote?: string;
						/** Retry just these views, inheriting the round's references. */
						only?: string[];
					};
					const session = getOrCreateSession(body.sessionId);
					if (creditsLeft(session) <= 0) {
						return Response.json(
							{
								error: "Visual credits exhausted",
								creditsLeft: 0,
								topUpRequired: true,
							},
							{ status: 402 },
						);
					}
					const brain = session.brain;
					const brand =
						(body.brand || brain?.brandName || "BIB Truck").trim() ||
						"BIB Truck";
					const vehicle = getVehicle(body.vehicleId ?? brain?.vehicleId ?? "");
					const vehicleLabel = vehicle?.label ?? "Square Trailer 4m";
					const business = getBusiness(brain?.businessType ?? "");
					const colors =
						body.colors ||
						brain?.colors.slice(0, 3).join(", ") ||
						"brand colors";
					const vibe =
						body.vibe ||
						brain?.vibeWords.slice(0, 2).join(", ") ||
						brain?.businessType ||
						"bold street-food";
					const serveMode =
						brain?.walkIn === null
							? "hatch-serve"
							: brain?.walkIn
								? "walk-in"
								: "hatch-serve";

					// A targeted retry reuses the round's existing renders as
					// references instead of starting a fresh visual world.
					const only = Array.isArray(body.only)
						? CONCEPT_VIEWS.filter((v) => body.only?.includes(v))
						: undefined;
					// An `only` list that names nothing real must not quietly fall
					// through to a full round — that spends a credit the caller
					// never asked for.
					if (Array.isArray(body.only) && only?.length === 0) {
						return Response.json(
							{
								error: `Unknown view(s): ${body.only.join(", ")}`,
								labels: [...CONCEPT_VIEWS],
							},
							{ status: 400 },
						);
					}

					const run = await runStarterConcepts(session.creditsUsed, {
						vehicleId: vehicle?.id ?? null,
						inspirationImage: session.inspirationImage,
						masterReference: session.masterImageUrl,
						only: only?.length ? only : undefined,
						completed: conceptsByView(session),
						brand,
						vehicleLabel,
						vehicleBody: vehicle?.body ?? "square",
						lengthM: vehicle?.lengthM ?? 4,
						widthM: vehicle?.widthM ?? 2.1,
						heightM: vehicle?.heightM ?? 2.6,
						colors,
						vibe,
						businessType: brain?.businessType ?? "combined",
						menuKeywords: brain?.menuKeywords ?? [],
						equipment: business?.needs ?? [],
						serveMode,
						brainNote: body.brainNote,
					});
					session.creditsUsed = run.creditsUsed;
					session.visualRounds += 1;
					adoptMasterFromImages(session, run.images);
					putConcepts(session, run.images);
					return Response.json({
						images: listConcepts(session),
						creditsLeft: creditsLeft(session),
						creditsUsed: session.creditsUsed,
					});
				} catch (error) {
					console.error("[food-truck] images POST error:", error);
					return Response.json(
						{ error: "Image generation failed" },
						{ status: 500 },
					);
				}
			},
			/*
			 * ── Reconcile: the authoritative list of this session's renders ──
			 *
			 * The panel calls this once a run settles. SSE is the fast path, but
			 * a dropped or truncated frame used to lose a render permanently
			 * because nothing else ever held it; now the client can always ask
			 * what the server actually produced.
			 */
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return Response.json({
						images: [],
						engine: "langgraph",
						labels: [...LABELS],
						notice: "Pass ?sessionId= to read this session's renders.",
					});
				}
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
