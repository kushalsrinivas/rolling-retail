import { createFileRoute } from "@tanstack/react-router";
import { elevationSvg, planSvg } from "#/lib/food-truck/plan-svg";
import {
	currentDesign,
	getOrCreateSession,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Deterministic plan — SVG from the design record with real dimensions.
 * Replaces the AI-drawn "roof plan" that hallucinated measurements.
 * GET ?sessionId=&kind=plan|elevation → image/svg+xml, stamped CONCEPT.
 */
export const Route = createFileRoute("/api/agent/plan")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return Response.json(
						{ error: "sessionId is required" },
						{ status: 400 },
					);
				}
				await restoreSession(sessionId);
				const s = getOrCreateSession(sessionId);
				const current = currentDesign(s);
				if (!current) {
					return Response.json(
						{ error: "No design version yet." },
						{ status: 409 },
					);
				}
				const kind =
					url.searchParams.get("kind") === "elevation" ? "elevation" : "plan";
				const svg =
					kind === "elevation"
						? elevationSvg(current.spec, current.version)
						: planSvg(current.spec, current.version);
				return new Response(svg, {
					headers: {
						"Content-Type": "image/svg+xml",
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
