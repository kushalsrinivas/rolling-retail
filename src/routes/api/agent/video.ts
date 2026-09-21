import { createFileRoute } from "@tanstack/react-router";
import { getBusiness, getVehicle } from "#/lib/food-truck/constants";
import { equipmentPhrase } from "#/lib/food-truck/images";
import {
	buildSalesVideoPrompt,
	SALES_VIDEO_PRESETS,
	type SalesVideoContext,
	type SalesVideoKind,
	tourContinuationPrompt,
} from "#/lib/food-truck/sales";
import { getOrCreateSession, type VideoJob } from "#/lib/food-truck/session";
import {
	extendSalesVideo,
	pollSalesVideo,
	startSalesVideo,
} from "#/lib/food-truck/video";

const KINDS = new Set(SALES_VIDEO_PRESETS.map((p) => p.kind));

/** Trim a client-supplied string, or fall back. */
function str(v: unknown, fallback: string): string {
	return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function newId() {
	return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const Route = createFileRoute("/api/agent/video")({
	server: {
		handlers: {
			// ── Start: approved stills in, Omni Flash interaction out ──
			POST: async ({ request }) => {
				let body: {
					sessionId?: string;
					kind?: string;
					brand?: string;
					vehicleId?: string;
					vehicleLabel?: string;
					businessType?: string;
					colors?: string;
					vibe?: string;
					/** Equipment ids from the live layout, if the buyer has one yet. */
					equipment?: string[];
					serveMode?: string;
					references?: string[];
					/** Ready video job id to continue from (tour chaining). */
					extendJobId?: string;
					/**
					 * Stateless chaining fallback: the previous part's provider
					 * interaction id + series/part, so tours keep chaining when the
					 * next request lands on a fresh serverless instance whose
					 * in-memory session has no record of the earlier part.
					 */
					previousOperationId?: string;
					seriesId?: string;
					part?: number;
				};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				const kind: SalesVideoKind =
					body.kind && KINDS.has(body.kind as SalesVideoKind)
						? (body.kind as SalesVideoKind)
						: "hero-orbit";
				const refs = Array.isArray(body.references)
					? body.references.filter(
							(r): r is string =>
								typeof r === "string" && r.startsWith("data:image/"),
						)
					: [];
				if (refs.length === 0 && !body.extendJobId) {
					return Response.json(
						{
							error: "Generate concepts first — video needs an approved still.",
						},
						{ status: 400 },
					);
				}
				if (refs.some((r) => r.length > 12_000_000)) {
					return Response.json(
						{ error: "Reference image too large." },
						{ status: 413 },
					);
				}
				const session = getOrCreateSession(body.sessionId);
				const brain = session.brain;

				/*
				 * The stills are briefed on body, dimensions, menu, equipment and
				 * service model; the video used to get four loose strings, so it
				 * filmed a generic trailer. Same brain, same vehicle table, same
				 * equipment phrasing — the clip now describes this build.
				 */
				const vehicle =
					getVehicle(body.vehicleId ?? brain?.vehicleId) ??
					getVehicle("airstream-m");
				const business = getBusiness(body.businessType ?? brain?.businessType);
				const equipmentIds =
					body.equipment?.filter((e) => typeof e === "string") ??
					brain?.equipmentHints ??
					[];
				const brand = str(body.brand, brain?.brandName ?? "");
				const serveMode: SalesVideoContext["serveMode"] =
					body.serveMode === "walk-in" ||
					body.serveMode === "hybrid" ||
					body.serveMode === "hatch-serve"
						? body.serveMode
						: brain?.walkIn
							? "walk-in"
							: "hatch-serve";

				const ctx: SalesVideoContext = {
					brand: brand || "the business",
					hasBrand: Boolean(brand),
					vehicleLabel: str(
						body.vehicleLabel,
						vehicle?.label ?? "food trailer",
					),
					vehicleBody: vehicle?.body ?? null,
					lengthM: vehicle?.lengthM ?? null,
					widthM: vehicle?.widthM ?? null,
					businessLabel: business?.label ?? null,
					menu: brain?.menuKeywords.slice(0, 5).join(", ") || null,
					equipment: equipmentIds.length ? equipmentPhrase(equipmentIds) : null,
					serveMode,
					colors: str(
						body.colors,
						brain?.colors.slice(0, 3).join(", ") || "brand colors",
					),
					vibe: str(
						body.vibe,
						brain?.vibeWords.slice(0, 2).join(", ") || "bold street-food",
					),
				};
				// ── Extension: continue a ready part (no stills needed) ──
				// Session lookup first; stateless fallback (previousOperationId +
				// seriesId/part) for serverless instances with no session memory.
				const base = body.extendJobId
					? session.videos.find((v) => v.id === body.extendJobId)
					: undefined;
				const previousOperationId =
					base?.operationId ?? body.previousOperationId ?? null;
				const wantsExtend = Boolean(
					body.extendJobId || body.previousOperationId,
				);
				if (wantsExtend && !previousOperationId) {
					return Response.json(
						{ error: "Video to extend not found." },
						{ status: 404 },
					);
				}
				if (base && base.status !== "ready") {
					return Response.json(
						{ error: "Previous part is not ready yet." },
						{ status: 409 },
					);
				}
				const part = wantsExtend
					? base
						? base.part + 1
						: typeof body.part === "number" && body.part >= 2 && body.part <= 3
							? body.part
							: 2
					: 1;
				const prompt = base
					? tourContinuationPrompt(part, ctx)
					: buildSalesVideoPrompt(kind, ctx);
				const job: VideoJob = {
					id: newId(),
					kind,
					prompt,
					status: "pending",
					operationId: null,
					url: null,
					error: null,
					createdAt: Date.now(),
					updatedAt: Date.now(),
					part,
					seriesId: base?.seriesId ?? "",
				};
				job.seriesId = base?.seriesId || body.seriesId || job.id;
				try {
					const started = previousOperationId
						? await extendSalesVideo({
								previousInteractionId: previousOperationId,
								prompt,
							})
						: await startSalesVideo({
								kind,
								ctx,
								references: refs.slice(0, 3),
							});
					job.operationId = started.operationId;
					if (started.readyUrl) {
						job.status = "ready";
						job.url = started.readyUrl;
					}
				} catch (err) {
					const msg = err instanceof Error ? err.message : "Video start failed";
					job.status = "error";
					job.error = msg;
					job.updatedAt = Date.now();
					session.videos.unshift(job);
					session.videos = session.videos.slice(0, 10);
					const status = msg.includes("GOOGLE_API_KEY")
						? 503
						: /video (start|extend) 4\d\d/.test(msg)
							? 502
							: 500;
					return Response.json({ error: msg, video: job }, { status });
				}
				session.videos.unshift(job);
				session.videos = session.videos.slice(0, 10);
				return Response.json({ video: job });
			},
			// ── Poll: ?sessionId=&videoId= → pending | ready | error ──
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const videoId = url.searchParams.get("videoId");
				const session = getOrCreateSession(
					url.searchParams.get("sessionId") ?? undefined,
				);
				const job = session.videos.find((v) => v.id === videoId);
				// Stateless poll fallback: the client re-sends the provider
				// interaction id, so polling survives a fresh serverless instance.
				const fallbackOperationId = url.searchParams.get("operationId");
				if (!job) {
					if (fallbackOperationId && videoId) {
						try {
							const s = await pollSalesVideo(fallbackOperationId);
							if (s.status === "ready")
								return Response.json({
									video: {
										id: videoId,
										status: "ready",
										url: s.videoDataUrl,
										operationId: fallbackOperationId,
									},
								});
							if (s.status === "error")
								return Response.json({
									video: {
										id: videoId,
										status: "error",
										error: s.error,
										operationId: fallbackOperationId,
									},
								});
						} catch {
							/* fall through to 404 */
						}
					}
					return Response.json({ error: "Video not found" }, { status: 404 });
				}
				if (job.status !== "pending" || !job.operationId) {
					return Response.json({ video: job });
				}
				try {
					const s = await pollSalesVideo(job.operationId);
					if (s.status === "ready") {
						job.status = "ready";
						job.url = s.videoDataUrl;
					} else if (s.status === "error") {
						job.status = "error";
						job.error = s.error;
					}
					job.updatedAt = Date.now();
				} catch (err) {
					job.status = "error";
					job.error = err instanceof Error ? err.message : "Video poll failed";
					job.updatedAt = Date.now();
				}
				return Response.json({ video: job });
			},
		},
	},
});
