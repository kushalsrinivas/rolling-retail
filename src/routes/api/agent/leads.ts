import { createFileRoute } from "@tanstack/react-router";
import { listLeads } from "#/lib/food-truck/session";

/**
 * Factory pipeline: every designer session that produced a lead or spec
 * handoff. This is what Food Truck Factory sales sees for follow-up —
 * including cold sessions that never converted.
 *
 * It returns every buyer's contact details, so it is staff-only. Until real
 * accounts land it is gated on a shared secret; without FACTORY_DASHBOARD_TOKEN
 * set the endpoint stays closed rather than falling open.
 */
function authorized(request: Request) {
	const expected = process.env.FACTORY_DASHBOARD_TOKEN;
	if (!expected) return false;
	const header = request.headers.get("authorization") ?? "";
	const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
	const supplied = bearer || request.headers.get("x-factory-token") || "";
	if (supplied.length !== expected.length) return false;
	// Constant-time-ish compare so the token can't be probed byte by byte.
	let diff = 0;
	for (let i = 0; i < expected.length; i++) {
		diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return diff === 0;
}

export const Route = createFileRoute("/api/agent/leads")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!authorized(request)) {
					return Response.json(
						{ error: "Unauthorized" },
						{ status: 401, headers: { "Cache-Control": "no-store" } },
					);
				}
				try {
					const leads = listLeads();
					return Response.json(
						{ leads, count: leads.length, engine: "langgraph" },
						{ headers: { "Cache-Control": "no-store" } },
					);
				} catch (error) {
					console.error("[food-truck] leads error:", error);
					return Response.json(
						{ error: "Failed to load pipeline" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
