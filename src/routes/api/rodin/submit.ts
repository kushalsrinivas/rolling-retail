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

export const Route = createFileRoute("/api/rodin/submit")({
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
					const formData = await request.formData();

					const response = await fetch(`${rodinBase()}/api/v2/rodin`, {
						method: "POST",
						headers: { Authorization: `Bearer ${API_KEY}` },
						body: formData,
					});

					if (!response.ok) {
						const errorText = await response.text();
						return Response.json(
							{
								error: `API request failed: ${response.status}`,
								details: errorText,
							},
							{ status: response.status },
						);
					}

					const data = await response.json();
					return Response.json(data);
				} catch (error) {
					console.error("Error in Rodin submit route:", error);
					return Response.json(
						{ error: "Failed to process request" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
