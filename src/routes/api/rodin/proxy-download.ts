import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/rodin/proxy-download")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const fileUrl = url.searchParams.get("url");

					if (!fileUrl) {
						return Response.json(
							{ error: "Missing url parameter" },
							{ status: 400 },
						);
					}

					const response = await fetch(fileUrl);

					if (!response.ok) {
						return Response.json(
							{
								error: `Failed to fetch file: ${response.status}`,
							},
							{ status: response.status },
						);
					}

					const fileContent = await response.arrayBuffer();
					const contentType =
						response.headers.get("content-type") || "application/octet-stream";

					return new Response(fileContent, {
						headers: {
							"Content-Type": contentType,
							"Content-Disposition": `attachment; filename="${fileUrl.split("/").pop()}"`,
							"Access-Control-Allow-Origin": "*",
							"Cache-Control": "no-cache",
						},
					});
				} catch (error) {
					console.error("Error in proxy download route:", error);
					return Response.json(
						{ error: "Failed to proxy download" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
