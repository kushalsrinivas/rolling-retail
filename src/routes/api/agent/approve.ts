import { createFileRoute } from "@tanstack/react-router";
import {
	approvalsFor,
	approveDesignVersion,
	currentDesign,
	getOrCreateSession,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Approval API — "favorite" is browser state, approval is server-side.
 * POST { sessionId, version, by } freezes that version with who/when and
 * moves the render anchor to it. A regenerate can never overwrite it.
 */
export const Route = createFileRoute("/api/agent/approve")({
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
				await restoreSession(sessionId);
				const s = getOrCreateSession(sessionId);
				return Response.json({
					approvals: approvalsFor(s),
					current: currentDesign(s),
				});
			},
			POST: async ({ request }) => {
				let body: { sessionId?: string; version?: number; by?: string } = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId || typeof body.version !== "number") {
					return Response.json(
						{ error: "sessionId and numeric version are required" },
						{ status: 400 },
					);
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				const approval = approveDesignVersion(s, body.version, body.by ?? null);
				if (!approval) {
					// The server no longer holds the version the page shows — most
					// often a restart that lost the session store, or a page left
					// open across a redeploy. Say so, and hand back what we do hold
					// so the page can re-sync instead of failing silently.
					const current = currentDesign(s);
					console.warn(
						`[food-truck] approve: v${body.version} not found for ${s.sessionId} (have ${s.designVersions.map((v) => v.version).join(",") || "none"})`,
					);
					return Response.json(
						{
							error: current
								? `Your design moved on to v${current.version}. We've refreshed it — please approve again.`
								: "We couldn't find this design on our side. Refresh the page; if it's still missing, ask the designer to re-render it.",
							code: current ? "version_moved" : "design_missing",
							current,
						},
						{ status: 409 },
					);
				}
				return Response.json({ approval, approvals: approvalsFor(s) });
			},
		},
	},
});
