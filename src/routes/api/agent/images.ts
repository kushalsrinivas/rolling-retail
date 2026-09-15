import { createFileRoute } from "@tanstack/react-router";
import {
	CONCEPT_VIEWS,
	getBusiness,
	getVehicle,
} from "#/lib/food-truck/constants";
import { runStarterConcepts } from "#/lib/food-truck/images";
import { creditsLeft, getOrCreateSession } from "#/lib/food-truck/session";

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

					const run = await runStarterConcepts(session.creditsUsed, {
						vehicleId: vehicle?.id ?? null,
						inspirationImage: session.inspirationImage,
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
					return Response.json({
						images: run.images,
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
			// ── Legacy GET (ADK file-based) kept as a compat shim ──
			GET: async ({ request }) => {
				const url = new URL(request.url);
				if (!url.searchParams.get("file")) {
					return Response.json({
						images: [],
						engine: "langgraph",
						notice:
							"File-based ADK images are retired. POST to this route to generate concepts.",
						labels: [...LABELS],
					});
				}
				return Response.json(
					{
						error:
							"ADK artifact images are retired in the LangGraph build. Regenerate via POST.",
					},
					{ status: 410 },
				);
			},
		},
	},
});
