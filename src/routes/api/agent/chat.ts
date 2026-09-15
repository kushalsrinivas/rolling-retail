import { HumanMessage } from "@langchain/core/messages";
import { createFileRoute } from "@tanstack/react-router";
import {
	brainDigest,
	brainReady,
	describeVehicle,
	updateBrain,
} from "#/lib/food-truck/brain";
import { getBusiness, getVehicle } from "#/lib/food-truck/constants";
import { layoutFor } from "#/lib/food-truck/tools";
import {
	getFoodTruckAgent,
	hasLlmKey,
	offlineReply,
	toLangChainMessages,
} from "#/lib/food-truck/graph";
import { runStarterConcepts } from "#/lib/food-truck/images";
import { creditsLeft, getOrCreateSession } from "#/lib/food-truck/session";

interface ChatBody {
	sessionId?: string;
	message?: string;
	/** Optional attached photo (competitor/inspiration) as a data URL. */
	image?: string;
	context?: {
		vehicleId?: string;
		businessType?: string;
		brandName?: string;
	};
}

function sseEncode(obj: unknown) {
	return `data: ${JSON.stringify(obj)}\n\n`;
}

/** Split text into word-chunks so the UI streams even in fallback mode. */
function chunkWords(text: string, size = 6): string[] {
	const words = text.split(/(\s+)/).filter(Boolean);
	const out: string[] = [];
	for (let i = 0; i < words.length; i += size) {
		out.push(words.slice(i, i + size).join(""));
	}
	return out.length ? out : [text];
}

export const Route = createFileRoute("/api/agent/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: ChatBody = {};
				try {
					body = (await request.json()) as ChatBody;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}

				const text = (body.message ?? "").trim();
				const image =
					typeof body.image === "string" && body.image.startsWith("data:image/")
						? body.image
						: null;
				if (!text && !image) {
					return Response.json(
						{ error: "message or image is required" },
						{ status: 400 },
					);
				}
				if (image && image.length > 12_000_000) {
					return Response.json(
						{ error: "Image too large — please attach a photo under ~8MB." },
						{ status: 413 },
					);
				}

				const session = getOrCreateSession(body.sessionId);

				// ── Project Brain: fold this turn's dump into structured memory ──
				// History goes in so a short "yes" after a **Brand** proposal sticks.
				const historyTexts = session.history.map((h) => h.content);
				session.brain = updateBrain(
					session.brain,
					text,
					{
						brandName: body.context?.brandName,
						vehicleId: body.context?.vehicleId,
						businessType: body.context?.businessType,
					},
					historyTexts,
				);
				const brain = session.brain;

				// ── Auto-concept threshold: enough signal + first visuals + credit ──
				const shouldAutoVisuals =
					brainReady(brain) &&
					session.visualRounds === 0 &&
					creditsLeft(session) > 0;

				const hintParts: string[] = [];
				if (body.context?.vehicleId)
					hintParts.push(
						`Buyer shortlisted vehicle: ${body.context.vehicleId}.`,
					);
				if (body.context?.businessType)
					hintParts.push(`Buyer business type: ${body.context.businessType}.`);
				if (body.context?.brandName)
					hintParts.push(`Brand: ${body.context.brandName}.`);
				const userText = [
					hintParts.length
						? `[Designer context: ${hintParts.join(" ")}]`
						: null,
					`[${brainDigest(brain)}]`,
					shouldAutoVisuals
						? "[SYSTEM: brand knowledge is sufficient — after your reply the system WILL auto-generate a complete 9-view concept set (exterior hero, rear, side elevation, interior layout, front elevation, assembly theater, night, roof plan, brand mark). 1 credit. End with ONE short line saying the full concept set is generating. Do not ask permission.]"
						: null,
					image ? "[Buyer attached an inspiration photo — see image.]" : null,
					text || "What do you see in this photo? How would you build it?",
				]
					.filter(Boolean)
					.join("\n\n");

				session.history.push({ role: "user", content: userText });

				const stream = new ReadableStream({
					async start(controller) {
						const send = (obj: unknown) =>
							controller.enqueue(new TextEncoder().encode(sseEncode(obj)));
						const close = () => {
							try {
								send({
									type: "done",
									sessionId: session.sessionId,
									creditsLeft: creditsLeft(session),
								});
							} catch {
								/* noop */
							}
							controller.close();
						};

						// ponytail: one shared auto-visuals runner — called from BOTH the
						// offline and LLM paths so a missing key or LLM hiccup can
						// never silently skip the concept set. Streams per batch.
						const runAutoVisuals = async () => {
							if (!shouldAutoVisuals || creditsLeft(session) <= 0) return;
							try {
								const effectiveVehicleId =
									brain.vehicleId ?? body.context?.vehicleId ?? "airstream-m";
								const vehicle =
									getVehicle(effectiveVehicleId) ??
									getVehicle(brain.vehicleId ?? "");
								const business = getBusiness(brain.businessType ?? "");
								const vehicleLabel =
									vehicle?.label ?? describeVehicle(effectiveVehicleId);
								const serveMode =
									brain.walkIn === null
										? "hatch-serve"
										: brain.walkIn
											? "walk-in"
											: "hatch-serve";
								if (!brain.vehicleId && vehicle) {
									brain.vehicleId = effectiveVehicleId;
									brain.vehicleSource = "picker";
								}
								const run = await runStarterConcepts(
									session.creditsUsed,
									{
										brand:
											(brain.brandName ?? body.context?.brandName?.trim()) ||
											"New Brand",
										vehicleLabel,
										vehicleBody: vehicle?.body ?? "square",
										lengthM: vehicle?.lengthM ?? 4,
										widthM: vehicle?.widthM ?? 2.1,
										heightM: vehicle?.heightM ?? 2.6,
										colors:
											brain.colors.slice(0, 3).join(", ") || "brand colors",
										vibe:
											brain.vibeWords.slice(0, 2).join(", ") ||
											brain.businessType ||
											"bold street-food",
										businessType: brain.businessType ?? "combined",
										menuKeywords: brain.menuKeywords,
										equipment: business?.needs ?? [],
										serveMode,
										brainNote: [
											brain.businessType
												? `${brain.businessType} menu (${brain.menuKeywords.slice(0, 4).join(", ") || "house menu"})`
												: null,
											brain.walkIn === null
												? null
												: brain.walkIn
													? "walk-in interior service"
													: "hatch-serve service",
											"drinks end-cap carries margin",
										]
											.filter(Boolean)
											.join("; "),
									},
									(batch) => send({ type: "images", images: batch }),
								);
								session.creditsUsed = run.creditsUsed;
								session.visualRounds += 1;
							} catch (imgErr) {
								console.warn("[food-truck] auto visuals failed:", imgErr);
							}
						};

						// Signal early so the left panel moves + spinner shows
						// before the (slow) LLM reply and image batches finish.
						const announceAutoVisuals = () => {
							if (!shouldAutoVisuals || creditsLeft(session) <= 0) return;
							try {
								const effectiveVehicleId =
									brain.vehicleId ?? body.context?.vehicleId ?? "airstream-m";
								send({
									type: "layout",
									layout: layoutFor(
										brain.businessType ?? "combined",
										effectiveVehicleId,
										brain.walkIn === true,
									),
								});
							} catch {
								/* layout is best-effort — images still fire */
							}
							send({ type: "images_start", count: 9 });
						};

						// ── No LLM key: deterministic offline designer (demo never dies) ──
						if (!hasLlmKey()) {
							send({ type: "brain", brain });
							announceAutoVisuals();
							const reply = offlineReply(
								session.history.map((h) => h.content),
								userText,
								{ hasPhoto: Boolean(image) },
							);
							session.history.push({ role: "assistant", content: reply });
							for (const c of chunkWords(reply)) {
								send({ type: "text", delta: c });
								await new Promise((r) => setTimeout(r, 18));
							}
							await runAutoVisuals();
							close();
							return;
						}

						// ── LangGraph ReAct agent with live token streaming ──
						try {
							// Project Brain first so the panel builds live alongside chat.
							send({ type: "brain", brain });
							announceAutoVisuals();
							const { agent } = getFoodTruckAgent();
							const threadId = session.sessionId;
							const lcMessages = toLangChainMessages(
								session.history
									.slice(-20)
									.map((h) => ({ role: h.role, content: h.content })),
							);
							// Attach the photo to the current turn (vision).
							if (image) {
								lcMessages[lcMessages.length - 1] = new HumanMessage({
									content: [
										{ type: "text", text: userText },
										{ type: "image_url", image_url: image },
									],
								});
							}

							let fullText = "";
							const seenToolResults = new Set<string>();

							const eventStream = await agent.stream(
								{ messages: lcMessages },
								{
									configurable: { thread_id: threadId },
									streamMode: ["messages", "updates"] as never,
								},
							);

							for await (const evt of eventStream as unknown as Iterable<unknown>) {
								// streamMode emits tuples [mode, payload]
								const tuple = evt as [string, unknown];
								if (!Array.isArray(tuple)) continue;
								const [mode, payload] = tuple;

								if (mode === "messages") {
									const [chunk] = payload as Array<{
										content?: unknown;
										getType?: () => string;
									}>;
									// Stream model prose only — tool result chunks are
									// surfaced as structured layout/estimate/spec events below.
									if (typeof chunk?.getType === "function") {
										try {
											if (chunk.getType() !== "ai") continue;
										} catch {
											/* fall through */
										}
									}
									const content = chunk?.content;
									const delta =
										typeof content === "string"
											? content
											: Array.isArray(content)
												? content
														.map((p) =>
															typeof p === "object" &&
															p !== null &&
															"text" in (p as object)
																? String((p as { text: unknown }).text)
																: "",
														)
														.join("")
												: "";
									if (delta) {
										fullText += delta;
										send({ type: "text", delta });
									}
									continue;
								}

								if (mode === "updates") {
									const updates = payload as Record<
										string,
										{
											messages?: Array<{
												content?: unknown;
												name?: string;
												tool_calls?: unknown;
											}>;
										}
									>;
									for (const [, nodeVal] of Object.entries(updates)) {
										const msgs = nodeVal?.messages ?? [];
										for (const m of msgs) {
											const c = m?.content;
											const textContent =
												typeof c === "string"
													? c
													: Array.isArray(c)
														? c
																.map((p) => (typeof p === "string" ? p : ""))
																.join("")
														: "";
											// Tool results come back as JSON strings — surface structured ones.
											if (
												textContent.startsWith("{") &&
												textContent.endsWith("}")
											) {
												if (seenToolResults.has(textContent)) continue;
												seenToolResults.add(textContent);
												try {
													const parsed = JSON.parse(textContent) as Record<
														string,
														unknown
													>;
													if (parsed.layoutName || parsed.zones) {
														send({ type: "layout", layout: parsed });
													} else if (parsed.wrapSqm || parsed.bom) {
														send({ type: "estimate", estimate: parsed });
													} else if (
														parsed.brandName &&
														parsed.vehicle &&
														parsed.nextSteps
													) {
														session.spec = parsed;
														send({ type: "spec", spec: parsed });
													} else if ((parsed as { saved?: boolean }).saved) {
														session.lead = parsed;
														send({ type: "lead", lead: parsed });
													}
												} catch {
													/* not structured — ignore */
												}
											}
										}
									}
								}
							}

							if (fullText.trim()) {
								session.history.push({ role: "assistant", content: fullText });
							} else {
								// Model produced only tool calls with no final text (rare) — nudge.
								const nudge =
									"I've updated your build panel on the left — take a look and tell me what to change next.";
								session.history.push({ role: "assistant", content: nudge });
								send({ type: "text", delta: nudge });
							}

							// ── Auto concepts: knowledge crossed the threshold ──
							// The buyer never asked — the system decided. This is the loop.
							await runAutoVisuals();
							close();
						} catch (err) {
							console.error("[food-truck] agent error, offline fallback:", err);
							const reply = offlineReply(
								session.history.map((h) => h.content),
								userText,
								{ hasPhoto: Boolean(image) },
							);
							session.history.push({ role: "assistant", content: reply });
							for (const c of chunkWords(reply))
								send({ type: "text", delta: c });
							send({
								type: "notice",
								notice:
									"Live model hiccup — continued in offline mode so the demo keeps running.",
							});
							await runAutoVisuals();
							close();
						}
					},
				});

				return new Response(stream, {
					status: 200,
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache, no-transform",
						Connection: "keep-alive",
						"X-Engine": "langgraph",
					},
				});
			},
		},
	},
});
