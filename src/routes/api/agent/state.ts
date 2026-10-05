import { createFileRoute } from "@tanstack/react-router";
import { versionStamp } from "#/lib/food-truck/design-record";
import {
	creditsLeft,
	currentDesign,
	getOrCreateSession,
	listConcepts,
	displayText,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Session rehydrate API — what the buyer's browser needs after a reload.
 *
 * History comes back as the buyer saw it: display text (never the
 * bracketed context the model reads) plus the brief, render and proposal
 * cards, each proposal carrying its current status so an applied change
 * does not offer "Apply" again.
 */
export const Route = createFileRoute("/api/agent/state")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return Response.json(
						{ error: "sessionId is required" },
						{ status: 400 },
					);
				}
				// Restore BEFORE the get-or-create: a fresh server must read the
				// disk snapshot, not answer with the blank stub it just made.
				await restoreSession(sessionId);
				const s = getOrCreateSession(sessionId);
				const current = currentDesign(s);
				return Response.json(
					{
						sessionId: s.sessionId,
						createdAt: s.createdAt,
						credits: {
							included: s.creditsIncluded,
							used: s.creditsUsed,
							left: creditsLeft(s),
						},
						history: s.history
							.map((h) => {
								const data =
									h.kind === "proposal" && h.data?.id
										? {
												...h.data,
												status:
													s.proposals[String(h.data.id)]?.status ??
													h.data.status,
												version: s.proposals[String(h.data.id)]?.version,
											}
										: h.data;
								return {
									role: h.role,
									content: displayText(h),
									kind: h.kind,
									data,
								};
							})
							.filter((h) => h.kind || h.content.trim().length > 0),
						brain: s.brain,
						images: listConcepts(s),
						videos: s.videos,
						design: {
							current,
							versions: s.designVersions,
							approvals: [...s.approvals].sort(
								(a, b) => b.createdAt - a.createdAt,
							),
							stamp: current
								? versionStamp(current.version, current.state)
								: null,
							brief: s.brief,
						},
						lead: s.lead,
						spec: s.spec,
						menu: s.menu,
						inspiration: Boolean(s.inspirationImage),
					},
					{ headers: { "Cache-Control": "no-store" } },
				);
			},
		},
	},
});
