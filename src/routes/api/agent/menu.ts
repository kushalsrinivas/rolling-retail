import { createFileRoute } from "@tanstack/react-router";
import { getVehicle } from "#/lib/food-truck/constants";
import { runMenuBoard } from "#/lib/food-truck/images";
import { sanitizeMenu } from "#/lib/food-truck/menu";
import {
	conceptsByView,
	creditsLeft,
	getOrCreateSession,
	listConcepts,
	putConcepts,
} from "#/lib/food-truck/session";

/** A 1200×1800 PNG of a menu is well under this; anything bigger is not one. */
const MAX_ARTWORK_CHARS = 8_000_000;

export const Route = createFileRoute("/api/agent/menu")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const sessionId = new URL(request.url).searchParams.get("sessionId");
				if (!sessionId) return Response.json({ menu: null });
				return Response.json({ menu: getOrCreateSession(sessionId).menu });
			},
			/*
			 * Saves the menu and, when `render` is set, places it in the world
			 * as the `menu_board` view. The artwork arrives already rasterised:
			 * the browser draws the exact SVG the buyer previewed, so the render
			 * is conditioned on the same pixels they approved.
			 */
			POST: async ({ request }) => {
				try {
					const body = (await request.json().catch(() => ({}))) as {
						sessionId?: string;
						brand?: string;
						vehicleId?: string;
						menu?: unknown;
						artwork?: string;
						render?: boolean;
					};
					const session = getOrCreateSession(body.sessionId);
					const menu = sanitizeMenu(body.menu);
					if (!menu) {
						return Response.json(
							{ error: "Add at least one menu item first." },
							{ status: 400 },
						);
					}
					session.menu = menu;
					if (!body.render) {
						return Response.json({ menu, creditsLeft: creditsLeft(session) });
					}

					const artwork =
						typeof body.artwork === "string" &&
						/^data:image\/(png|jpeg);base64,/.test(body.artwork) &&
						body.artwork.length <= MAX_ARTWORK_CHARS
							? body.artwork
							: null;
					if (!artwork) {
						return Response.json(
							{ error: "Menu artwork missing or unreadable." },
							{ status: 400 },
						);
					}
					if (creditsLeft(session) <= 0) {
						return Response.json(
							{
								error: "Visual credits exhausted",
								creditsLeft: 0,
								topUpRequired: true,
							},
							{ status: 402 },
						);
					}

					const brain = session.brain;
					const brandName = (body.brand || brain?.brandName || "").trim();
					const vehicle = getVehicle(body.vehicleId ?? brain?.vehicleId ?? "");
					const image = await runMenuBoard({
						brand: brandName || "the business",
						hasBrand: Boolean(brandName),
						vehicleLabel: vehicle?.label ?? "Square Trailer 4m",
						vehicleBody: vehicle?.body ?? "square",
						menu,
						artwork,
						completed: conceptsByView(session),
						masterReference: session.masterImageUrl,
					});
					// A board that could not be anchored never reached the model,
					// so it costs nothing.
					if (!image.model.startsWith("placeholder (no")) {
						session.creditsUsed += 1;
					}
					putConcepts(session, [image]);
					return Response.json({
						menu,
						image,
						images: listConcepts(session),
						creditsLeft: creditsLeft(session),
					});
				} catch (error) {
					console.error("[food-truck] menu POST error:", error);
					return Response.json(
						{ error: "Menu board render failed" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
