import { createFileRoute } from "@tanstack/react-router";
import type { TruckSession } from "#/lib/food-truck/session";
import { currentDesign, listConcepts } from "#/lib/food-truck/session";
import {
	listStoredSessions,
	loadSessionSnapshot,
} from "#/lib/food-truck/store";
import { authorized } from "./leads";

/**
 * CMS feed — every buyer run in one place: quiz picks per round, final
 * design record, AI renders, videos, lead. Reads the same disk snapshots
 * the designer persists, so nothing here can diverge from the record.
 * Staff-only, same token gate as /api/agent/leads.
 */
export const Route = createFileRoute("/api/agent/submissions")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!authorized(request)) {
					return Response.json(
						{ error: "Unauthorized" },
						{ status: 401, headers: { "Cache-Control": "no-store" } },
					);
				}
				try {
					const files = await listStoredSessions();
					const sessions: TruckSession[] = [];
					for (const f of files.slice(0, 200)) {
						const snap = await loadSessionSnapshot<TruckSession>(
							f.replace(/\.json$/, ""),
						);
						if (snap?.sessionId) sessions.push(snap);
					}
					sessions.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
					const submissions = sessions.slice(0, 50).map((s) => {
						const current = currentDesign(s);
						return {
							sessionId: s.sessionId,
							createdAt: s.createdAt,
							lastSeen: s.lastSeen,
							quizSteps: Array.isArray(s.quizSteps) ? s.quizSteps : [],
							spec: current?.spec ?? null,
							version: current?.version ?? null,
							images: listConcepts(s).map((c) => ({
								label: c.label,
								status: c.status,
								url: c.status === "ready" ? c.url : null,
							})),
							videos: (s.videos ?? []).map((v) => ({
								id: v.id,
								kind: v.kind,
								status: v.status,
								url: v.url,
							})),
							lead: s.lead,
							turns: s.history?.length ?? 0,
						};
					});
					return Response.json(
						{ submissions, count: submissions.length },
						{ headers: { "Cache-Control": "no-store" } },
					);
				} catch (error) {
					console.error("[food-truck] submissions error:", error);
					return Response.json(
						{ error: "Failed to load submissions" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
