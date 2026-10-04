import { createFileRoute } from "@tanstack/react-router";
import { llmsTxt } from "#/lib/site-index";

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: async () =>
				new Response(llmsTxt(), {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					},
				}),
		},
	},
});
