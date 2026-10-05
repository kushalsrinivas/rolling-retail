import { HumanMessage } from "@langchain/core/messages";
import { createFileRoute } from "@tanstack/react-router";
import { brainDigest, brainReady, updateBrain } from "#/lib/food-truck/brain";
import {
	type ConceptView,
	getBusiness,
	STARTER_AUTO_VIEWS,
} from "#/lib/food-truck/constants";
import {
	getFoodTruckAgent,
	hasLlmKey,
	offlineReply,
	toLangChainMessages,
} from "#/lib/food-truck/graph";
import { canvasDigest } from "#/lib/food-truck/render-inputs";
import { describePatch, runRound, viewsOnScreen } from "#/lib/food-truck/round";
import {
	creditsLeft,
	getOrCreateSession,
	listConcepts,
	type ChatTurn,
	type Proposal,
	restoreSession,
} from "#/lib/food-truck/session";
import { layoutFor } from "#/lib/food-truck/tools";

interface ChatBody {
	sessionId?: string;
	message?: string;
	/** Optional attached photo (competitor/inspiration) as a data URL. */
	image?: string;
	/** "brief" marks the quiz's composed opening message. */
	kind?: string;
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
				await restoreSession(session.sessionId);

				// Keep the latest inspiration photo on the session. It used to reach
				// only the LLM turn it arrived on, so "make it look like this" never
				// influenced the renders at all.
				if (image) session.inspirationImage = image;

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
					`[${canvasDigest(session)}]`,
					shouldAutoVisuals
						? `[SYSTEM: brand knowledge is sufficient — after your reply the system WILL auto-generate 3 starter renders (${STARTER_AUTO_VIEWS.map((v) => v.replace(/_/g, " ")).join(", ")}). 1 round. In your reply, state the category you read this as (${getBusiness(brain.businessType ?? "")?.label ?? brain.businessType}) and the equipment line it implies, so the buyer can correct you before the renders land. End with ONE short line saying the first renders are on their way. Do not ask permission.]`
						: null,
					image ? "[Buyer attached an inspiration photo — see image.]" : null,
					text || "What do you see in this photo? How would you build it?",
				]
					.filter(Boolean)
					.join("\n\n");

				session.history.push({
					role: "user",
					content: userText,
					display: text,
					kind: body.kind === "brief" ? "brief" : undefined,
				});

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
						// Cards land in history after the turn's text, matching the
						// order the buyer saw them in.
						const deferredTurns: ChatTurn[] = [];

						const runAutoVisuals = async () => {
							if (!shouldAutoVisuals || creditsLeft(session) <= 0) return;
							try {
								if (!brain.vehicleId) {
									brain.vehicleId = body.context?.vehicleId ?? "airstream-m";
									brain.vehicleSource = "picker";
								}
								await runRound(
									session,
									{
										views: [...STARTER_AUTO_VIEWS] as ConceptView[],
										charge: true,
									},
									(evt) => {
										// The early announcement already opened the slots.
										if (evt.type !== "images_start") send(evt);
									},
								);
							} catch (imgErr) {
								console.warn("[food-truck] auto visuals failed:", imgErr);
								// The canvas must leave its loading state even when the
								// whole round throws, or it spins forever.
								send({
									type: "images_done",
									images: listConcepts(session),
									views: [],
									failed: [...STARTER_AUTO_VIEWS],
									creditsLeft: creditsLeft(session),
									error:
										"The first renders did not finish. Try again from the canvas — it won't cost a round.",
								});
							}
						};

						/** propose_change → a stored, confirmable proposal card. */
						const surfaceProposal = (parsed: Record<string, unknown>) => {
							const id = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
							const proposal: Proposal = {
								id,
								patch: (parsed.patch ?? {}) as Proposal["patch"],
								removeColors: Array.isArray(parsed.removeColors)
									? (parsed.removeColors as string[])
									: [],
								changeSummary: String(parsed.changeSummary ?? "Design change"),
								status: "pending",
								createdAt: Date.now(),
							};
							// One open request at a time: a newer one replaces older pending ones.
							for (const p of Object.values(session.proposals)) {
								if (p.status === "pending") p.status = "dismissed";
							}
							session.proposals[id] = proposal;
							const card = {
								id,
								changeSummary: proposal.changeSummary,
								changes: describePatch(proposal),
								viewCount: Math.max(
									1,
									viewsOnScreen(session).length || STARTER_AUTO_VIEWS.length,
								),
								creditsLeft: creditsLeft(session),
								status: "pending",
							};
							deferredTurns.push({
								role: "assistant",
								content: `[Proposed change for the buyer to confirm: ${proposal.changeSummary}]`,
								display: "",
								kind: "proposal",
								data: card,
							});
							send({ type: "proposal", proposal: card });
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
										brain.menuKeywords,
									),
								});
							} catch {
								/* layout is best-effort — images still fire */
							}
							send({
								type: "images_start",
								views: [...STARTER_AUTO_VIEWS],
								count: STARTER_AUTO_VIEWS.length,
							});
						};

						// ── No LLM key: deterministic offline designer (demo never dies) ──
						if (!hasLlmKey()) {
							send({ type: "brain", brain });
							announceAutoVisuals();
							const reply = offlineReply(
								session.history.map((h) => h.content),
								userText,
								{
									hasPhoto: Boolean(image),
									brain,
									firstRenders: shouldAutoVisuals,
								},
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
							// The full recent history is passed in every turn, so the thread must
							// be fresh — a shared thread id made the checkpointer append the same
							// twenty messages again on every turn.
							const threadId = `${session.sessionId}:${session.history.length}`;
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
													if (parsed.patch && parsed.changeSummary) {
														surfaceProposal(parsed);
													} else if (parsed.layoutName || parsed.zones) {
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
								session.history.push(...deferredTurns);
							} else {
								// Model produced only tool calls with no final text (rare) — nudge.
								const nudge =
									"I've updated your build on the canvas — take a look and tell me what to change next.";
								session.history.push({ role: "assistant", content: nudge });
								session.history.push(...deferredTurns);
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
								{
									hasPhoto: Boolean(image),
									brain,
									firstRenders: shouldAutoVisuals,
								},
							);
							session.history.push({ role: "assistant", content: reply });
							for (const c of chunkWords(reply))
								send({ type: "text", delta: c });

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
