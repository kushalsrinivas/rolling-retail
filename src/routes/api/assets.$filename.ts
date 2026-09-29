import { createFileRoute } from "@tanstack/react-router";
import { readAssetFile } from "#/lib/food-truck/store";

/** Serve persisted render/video bytes as URLs, not base64 in RAM. */
export const Route = createFileRoute("/api/assets/$filename")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const filename = (params as { filename?: string }).filename ?? "";
				if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|mp4|webm)$/.test(filename)) {
					return Response.json({ error: "Not found" }, { status: 404 });
				}
				const file = await readAssetFile(filename);
				if (!file) {
					return Response.json({ error: "Not found" }, { status: 404 });
				}
				return new Response(new Uint8Array(file.bytes), {
					headers: {
						"Content-Type": file.mime,
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				});
			},
		},
	},
});
