import { createFileRoute } from "@tanstack/react-router";
import {
	allValidated,
	defaultFabricationItems,
	type FabricationItem,
	type FabricationStatus,
} from "#/lib/food-truck/fabrication";
import {
	currentDesign,
	getOrCreateSession,
	persistSession,
	restoreSession,
} from "#/lib/food-truck/session";

const store = new Map<string, FabricationItem[]>();

/**
 * Fabricator review screen API.
 * GET ?sessionId= → items + design state.
 * POST { sessionId, id, status, note } → mark one item; all validated moves
 * the design to "fabrication-ready".
 */
export const Route = createFileRoute("/api/agent/fabrication")({
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
				if (!store.has(sessionId))
					store.set(sessionId, defaultFabricationItems());
				return Response.json({
					items: store.get(sessionId),
					design: currentDesign(s),
				});
			},
			POST: async ({ request }) => {
				let body: {
					sessionId?: string;
					id?: string;
					status?: FabricationStatus;
					note?: string;
				} = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId || !body.id || !body.status) {
					return Response.json(
						{ error: "sessionId, id and status are required" },
						{ status: 400 },
					);
				}
				if (
					!["open", "validated", "changed", "needs-decision"].includes(
						body.status,
					)
				) {
					return Response.json({ error: "Unknown status." }, { status: 400 });
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				if (!store.has(body.sessionId))
					store.set(body.sessionId, defaultFabricationItems());
				const items = store.get(body.sessionId) ?? defaultFabricationItems();
				store.set(body.sessionId, items);
				const item = items.find((i) => i.id === body.id);
				if (!item) {
					return Response.json({ error: "Unknown item." }, { status: 404 });
				}
				item.status = body.status;
				item.note = body.note?.slice(0, 500);
				item.updatedAt = Date.now();
				const current = currentDesign(s);
				if (
					current &&
					allValidated(items) &&
					current.state !== "fabrication-ready"
				) {
					current.state = "fabrication-ready";
					persistSession(s);
				}
				return Response.json({ items, design: currentDesign(s) });
			},
		},
	},
});
