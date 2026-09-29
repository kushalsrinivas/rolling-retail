import { createFileRoute } from "@tanstack/react-router";
import {
	applyPatch,
	type SpecPatch,
	versionStamp,
} from "#/lib/food-truck/design-record";
import {
	approvalsFor,
	commitDesignVersion,
	currentDesign,
	getOrCreateSession,
	persistSession,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Design record API — the versioned source of truth.
 * GET ?sessionId= → current version + history + approvals + stamp.
 * POST { sessionId, patch, changeSummary } → structured change request:
 * "make it cream" becomes { colors: [...] }, committed as a child version
 * after the customer confirms. Revisions change only what was asked.
 */
export const Route = createFileRoute("/api/agent/design")({
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
				const current = currentDesign(s);
				return Response.json({
					current,
					versions: s.designVersions,
					approvals: approvalsFor(s),
					stamp: current ? versionStamp(current.version, current.state) : null,
				});
			},
			POST: async ({ request }) => {
				let body: {
					sessionId?: string;
					patch?: SpecPatch;
					changeSummary?: string;
				} = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId) {
					return Response.json(
						{ error: "sessionId is required" },
						{ status: 400 },
					);
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				const current = currentDesign(s);
				if (!current) {
					return Response.json(
						{ error: "No design version yet — submit intake first." },
						{ status: 409 },
					);
				}
				if (!body.patch || typeof body.patch !== "object") {
					return Response.json({ error: "patch is required" }, { status: 400 });
				}
				const { spec, changed } = applyPatch(current.spec, body.patch);
				if (changed.length === 0) {
					return Response.json({
						current,
						changed: [],
						notice: "No fields changed.",
					});
				}
				const rec = commitDesignVersion(s, spec, {
					changeSummary:
						body.changeSummary ??
						`Changed ${changed.join(", ")} via revision request.`,
					state: "revision",
				});
				persistSession(s);
				return Response.json({
					current: rec,
					changed,
					allowedChanges: changed,
					stamp: versionStamp(rec.version, rec.state),
				});
			},
		},
	},
});
