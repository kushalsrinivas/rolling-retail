import * as fs from "node:fs";
import * as path from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const ADK_URL = process.env.ADK_URL || "http://localhost:8000";
const APP_NAME = process.env.ADK_APP_NAME || "agent";

function getImagesDir(): string {
	const candidates = [
		path.resolve(process.cwd(), "brand_outputs/images"),
		path.resolve(process.cwd(), "../brand_outputs/images"),
		path.resolve(process.cwd(), "../../brand_outputs/images"),
	];

	for (const dir of candidates) {
		if (fs.existsSync(dir)) return dir;
	}

	return candidates[0];
}

async function fetchFromAdk(
	userId: string,
	sessionId: string,
	filename: string,
): Promise<Response | null> {
	const artifactUrl = `${ADK_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}/artifacts/${encodeURIComponent(filename)}`;
	try {
		const res = await fetch(artifactUrl);
		if (!res.ok) return null;

		const part = (await res.json()) as {
			inline_data?: { data?: string; mime_type?: string };
			inlineData?: { data?: string; mimeType?: string };
		};

		const inlineData = part.inline_data || part.inlineData;
		const base64 = inlineData?.data;
		const mimeType =
			inlineData?.mime_type || inlineData?.mimeType || "image/png";

		if (!base64) return null;

		const buffer = Buffer.from(base64, "base64");
		return new Response(buffer, {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Cache-Control": "public, max-age=3600",
				"Content-Length": String(buffer.length),
			},
		});
	} catch {
		return null;
	}
}

export const Route = createFileRoute("/api/agent/images")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const filename = url.searchParams.get("file");
				const userId = url.searchParams.get("userId");
				const sessionId = url.searchParams.get("sessionId");

				if (!filename) {
					if (userId && sessionId) {
						const listUrl = `${ADK_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}/artifacts`;
						try {
							const res = await fetch(listUrl);
							if (res.ok) {
								const data = await res.json();
								return Response.json({
									images: data.artifacts || data.filenames || data,
								});
							}
						} catch {
							// fall through to local listing
						}
					}

					const IMAGES_DIR = getImagesDir();
					try {
						const files = fs
							.readdirSync(IMAGES_DIR)
							.filter((f: string) => f.endsWith(".png"))
							.sort()
							.reverse();

						return Response.json({ images: files });
					} catch {
						return Response.json({ images: [] });
					}
				}

				if (userId && sessionId) {
					const adkResponse = await fetchFromAdk(
						userId,
						sessionId,
						filename,
					);
					if (adkResponse) return adkResponse;
				}

				const IMAGES_DIR = getImagesDir();
				const safe = path.basename(filename);
				const filepath = path.join(IMAGES_DIR, safe);

				if (!fs.existsSync(filepath)) {
					return Response.json(
						{ error: "Image not found", filename: safe },
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
