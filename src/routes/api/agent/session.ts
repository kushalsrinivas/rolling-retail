import { createFileRoute } from "@tanstack/react-router";
import {
	BUSINESS_TYPES,
	FREE_VISUAL_CREDITS,
	GUIDED_STEPS,
	VEHICLES,
} from "#/lib/food-truck/constants";
import { getOrCreateSession } from "#/lib/food-truck/session";

export const Route = createFileRoute("/api/agent/session")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json().catch(() => ({}))) as {
						sessionId?: string;
					};
					const s = getOrCreateSession(body.sessionId);
					return Response.json({
						sessionId: s.sessionId,
						credits: {
							included: s.creditsIncluded,
							used: s.creditsUsed,
							left: Math.max(0, s.creditsIncluded - s.creditsUsed),
						},
						vehicles: VEHICLES,
						businessTypes: BUSINESS_TYPES,
						steps: GUIDED_STEPS,
						freeVisualCredits: FREE_VISUAL_CREDITS,
						engine: "langgraph",
					});
				} catch (error) {
					console.error("[food-truck] session error:", error);
					return Response.json(
						{ error: "Failed to create session" },
						{ status: 500 },
					);
				}
			},
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const s = getOrCreateSession(
					url.searchParams.get("sessionId") ?? undefined,
				);
				return Response.json({
					sessionId: s.sessionId,
					credits: {
						included: s.creditsIncluded,
						used: s.creditsUsed,
						left: Math.max(0, s.creditsIncluded - s.creditsUsed),
					},
					engine: "langgraph",
				});
			},
		},
	},
});
