import { createFileRoute } from "@tanstack/react-router";
import { sitemapXml } from "#/lib/site-index";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () =>
				new Response(sitemapXml(), {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					},
				}),
		},
	},
});
