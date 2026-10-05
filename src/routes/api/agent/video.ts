import { createFileRoute } from "@tanstack/react-router";
import { getBusiness } from "#/lib/food-truck/constants";
import { videoReferenceViews } from "#/lib/food-truck/continuity";
import { emblemFor, equipmentPhrase } from "#/lib/food-truck/images";
import {
	buildSalesVideoPrompt,
	SALES_VIDEO_PRESETS,
	type SalesVideoContext,
	type SalesVideoKind,
} from "#/lib/food-truck/sales";
import { defaultOpenings } from "#/lib/food-truck/openings";
import {
	conceptsByView,
	currentDesign,
	getOrCreateSession,
	persistSession,
	restoreSession,
	type VideoJob,
} from "#/lib/food-truck/session";
import { renderArgsFor } from "#/lib/food-truck/render-inputs";
import { hydrateReferences } from "#/lib/food-truck/store";
import { pollSalesVideo, startSalesVideo } from "#/lib/food-truck/video";

const KINDS = new Set(SALES_VIDEO_PRESETS.map((p) => p.kind));

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
				// The "no stills" check moved below reference selection — the
				// server now sources references from its own stored renders, so a
				// client that sends none is no longer necessarily empty-handed.
				if (refs.some((r) => r.length > 12_000_000)) {
					return Response.json(
						{ error: "Reference image too large." },
						{ status: 413 },
					);
				}
				const session = getOrCreateSession(body.sessionId);
				await restoreSession(session.sessionId).catch(() => {});
				/*
				 * The clip is briefed from the same design record as the stills
				 * — never from client strings or the regex brain. The old route
				 * read the brain, so after a confirmed revision the film was
				 * briefed on the previous colors while filming the new renders.
				 */
				const r = renderArgsFor(session);
				const ctx: SalesVideoContext = {
					brand: r.brand || "the business",
					hasBrand: Boolean(r.brand),
					vehicleLabel: r.vehicleLabel,
					vehicleBody: r.vehicleBody ?? null,
					lengthM: r.lengthM ?? null,
					widthM: r.widthM ?? null,
					heightM: r.heightM ?? null,
					openings:
						currentDesign(session)?.spec.openings ??
						(r.vehicleBody && r.lengthM
							? defaultOpenings(r.vehicleBody, r.lengthM)
							: null),
					businessLabel:
						getBusiness(r.businessType)?.label ?? r.businessType ?? null,
					businessType: r.businessType ?? null,
					menu: r.menuKeywords?.slice(0, 5).join(", ") || null,
					equipment: r.equipment?.length ? equipmentPhrase(r.equipment) : null,
					serveMode: r.serveMode ?? "hatch-serve",
					colors: r.colors ?? "brand colors",
					vibe: r.vibe ?? "bold street-food",
					brief: session.brief,
					emblem: emblemFor(r.businessType ?? "combined", r.menuKeywords ?? []),
				};
				/*
				 * Reference selection: the still that actually shows the space
				 * this clip films leads, then the identity anchor.
				 *
				 * This used to be "master hero first, then whatever the buyer
				 * starred", so a walkthrough was briefed on an exterior
				 * three-quarter and had to invent the galley — a different one
				 * every run. The server picks from its own stored renders so the
				 * clip cannot disagree with the deck, and only falls back to the
				 * bytes the client sent when this session has nothing stored.
				 */
				// Stored renders are files; the video model needs their bytes.
				const stored = await hydrateReferences(conceptsByView(session));
				const refViews: string[] = [];
				const planned: string[] = [];
				for (const view of videoReferenceViews(kind)) {
					const url = stored[view];
					if (!url || planned.includes(url)) continue;
					planned.push(url);
					refViews.push(view);
					if (planned.length >= 3) break;
				}
				const videoRefs = planned.length > 0 ? planned : refs.slice(0, 3);
				const referenceViews = planned.length > 0 ? refViews : [];

				if (videoRefs.length === 0) {
					return Response.json(
						{
							error: "Generate concepts first — video needs an approved still.",
						},
						{ status: 400 },
					);
				}

				const prompt = buildSalesVideoPrompt(kind, ctx, referenceViews);
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
					part: 1,
					seriesId: "",
				};
				job.seriesId = job.id;
				try {
					const started = await startSalesVideo({
						kind,
						ctx,
						prompt,
						references: videoRefs,
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
						: /video start 4\d\d/.test(msg)
							? 502
							: 500;
					return Response.json({ error: msg, video: job }, { status });
				}
				session.videos.unshift(job);
				session.videos = session.videos.slice(0, 10);
				persistSession(session);
				return Response.json({ video: job });
			},
			// ── Poll: ?sessionId=&videoId= → pending | ready | error ──
			// Ready videos are stored to disk and served as URLs — data URLs
			// up to 24MB on every poll used to round-trip through the client.
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const videoId = url.searchParams.get("videoId");
				const session = getOrCreateSession(
					url.searchParams.get("sessionId") ?? undefined,
				);
				await restoreSession(session.sessionId).catch(() => {});
				const storeUrl = async (
					dataUrl: string | null,
				): Promise<string | null> => {
					if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
					try {
						const { storeDataUrl } = await import("#/lib/food-truck/store");
						return await storeDataUrl(dataUrl, "video");
					} catch {
						return dataUrl;
					}
				};
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
										url: await storeUrl(s.videoDataUrl),
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
					if (job.url) job.url = (await storeUrl(job.url)) ?? job.url;
					return Response.json({ video: job });
				}
				try {
					const s = await pollSalesVideo(job.operationId);
					if (s.status === "ready") {
						job.status = "ready";
						job.url = await storeUrl(s.videoDataUrl);
						// The file URL the client plays must survive a reload, so
						// the snapshot carries it (persistSession keeps file URLs).
						persistSession(session);
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
