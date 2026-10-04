import { createFileRoute } from "@tanstack/react-router";
import { llmsFullTxt } from "#/lib/site-index";

export const Route = createFileRoute("/llms-full.txt")({
	server: {
		handlers: {
			GET: async () =>
				new Response(llmsFullTxt(), {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					},
				}),
		},
	},
});
