import { createFileRoute } from "@tanstack/react-router";
import { listLeads } from "#/lib/food-truck/session";

/**
 * Factory pipeline: every designer session that produced a lead or spec
 * handoff. This is what Food Truck Factory sales sees for follow-up —
 * including cold sessions that never converted.
 */
export const Route = createFileRoute("/api/agent/leads")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const leads = listLeads();
					return Response.json({
						leads,
						count: leads.length,
						engine: "langgraph",
					});
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
