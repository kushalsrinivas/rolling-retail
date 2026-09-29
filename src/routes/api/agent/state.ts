import { createFileRoute } from "@tanstack/react-router";
import { versionStamp } from "#/lib/food-truck/design-record";
import {
	creditsLeft,
	currentDesign,
	getOrCreateSession,
	listConcepts,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Session rehydrate API — what the buyer's browser needs after a reload.
 *
 * The designer keeps everything (messages, brain, design record, renders,
 * clips) server-side, but the browser only held the session id in memory, so
 * any reload — a refresh, a backgrounded tab the phone reclaimed — landed
 * the customer back on the empty intake with the same work invisible.
 * This route is the reader side: restore ?sessionId= and hand back exactly
 * the state the UI hydrates from.
 *
 * History is displayed-stripped: the bracketed designer-context digests the
 * panel never sent the buyer's way are dropped from user turns.
 */
function displayContent(content: string): string {
	return content
		.replace(/^\[(?:Designer context|Brain|SYSTEM)[^\]]*\]\s*/g, "")
		.trim();
}

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
						history: s.history.map((h) => ({
							role: h.role,
							content:
								h.role === "user" ? displayContent(h.content) : h.content,
						})),
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
