import * as fs from "node:fs";
import * as path from "node:path";
import { createFileRoute } from "@tanstack/react-router";

function getImagesDir(): string {
	const candidates = [
		path.resolve(process.cwd(), "brand_outputs/images"),
		path.resolve(process.cwd(), "../brand_outputs/images"),
		path.resolve(process.cwd(), "../../brand_outputs/images"),
	];

	for (const dir of candidates) {
		if (fs.existsSync(dir)) return dir;
	}

	return candidates[1];
}

export const Route = createFileRoute("/api/agent/images")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const IMAGES_DIR = getImagesDir();
				const url = new URL(request.url);
				const filename = url.searchParams.get("file");

				if (!filename) {
					try {
						const files = fs
							.readdirSync(IMAGES_DIR)
							.filter((f: string) => f.endsWith(".png"))
							.sort()
							.reverse();

						return Response.json({ images: files, dir: IMAGES_DIR });
					} catch (e) {
						return Response.json({
							images: [],
							error: String(e),
							dir: IMAGES_DIR,
						});
					}
				}

				const safe = path.basename(filename);
				const filepath = path.join(IMAGES_DIR, safe);

				if (!fs.existsSync(filepath)) {
					return Response.json(
						{
							error: "Image not found",
							path: filepath,
							dir: IMAGES_DIR,
							exists: fs.existsSync(IMAGES_DIR),
						},
						{ status: 404 },
					);
				}

				const buffer = fs.readFileSync(filepath);
				return new Response(buffer, {
					status: 200,
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "public, max-age=3600",
						"Content-Length": String(buffer.length),
					},
				});
			},
		},
	},
});
