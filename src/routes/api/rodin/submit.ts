import { createFileRoute } from "@tanstack/react-router";

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

					const response = await fetch(
						"https://api.hyper3d.com/api/v2/rodin",
						{
							method: "POST",
							headers: { Authorization: `Bearer ${API_KEY}` },
							body: formData,
						},
					);

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
