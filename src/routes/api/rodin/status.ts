import { createFileRoute } from "@tanstack/react-router";

/**
 * Rodin's API base. Configurable so the flow can be exercised against a local
 * stub without spending credits, and so a self-hosted endpoint is possible —
 * the meeting raised keeping generation in-house for data-sensitivity reasons.
 */
function rodinBase() {
	return (process.env.RODIN_API_BASE ?? "https://api.hyper3d.com").replace(
		/\/$/,
		"",
	);
}

export const Route = createFileRoute("/api/rodin/status")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const API_KEY = process.env.RODIN_API_KEY;
				if (!API_KEY) {
					return Response.json(
						{ error: "RODIN_API_KEY not configured" },
						{ status: 500 },
					);
				}

				try {
					const body = await request.json();
					const { subscription_key } = body;

					if (!subscription_key) {
						return Response.json(
							{ error: "Missing subscription_key" },
							{ status: 400 },
						);
					}

					const response = await fetch(`${rodinBase()}/api/v2/status`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${API_KEY}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ subscription_key }),
					});

					if (!response.ok) {
						const errorText = await response.text();
						return Response.json(
							{
								error: `Status check failed: ${response.status}`,
								details: errorText,
							},
							{ status: response.status },
						);
					}

					const data = await response.json();
					return Response.json(data);
				} catch (error) {
					console.error("Error in Rodin status route:", error);
					return Response.json(
						{ error: "Failed to check status" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
