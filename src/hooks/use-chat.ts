/**
 * The designer's client state: one conversation, one canvas, kept in step.
 *
 * The chat and the canvas used to be two separate stories. Renders landed
 * in the panel without a word in the chat; a change asked for in the chat
 * never reached the renders; every round opened nine slots for a three-view
 * round and left six of them to "fail". This hook now treats the chat as the
 * timeline of the design:
 *
 *   brief card → first renders card → proposal card → Apply → renders card …
 *
 * and the canvas as the live view of the latest version. Every render —
 * auto, revision, extra angle, retry — goes through the server's single
 * round runner and comes back as the same events.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectBrain } from "#/lib/food-truck/brain";
import { CONCEPT_VIEWS, RENDER_VIEWS } from "#/lib/food-truck/constants";
import type { MenuDesign } from "#/lib/food-truck/menu";
import {
	pickApprovedReferences,
	pickMasterReference,
	type SalesVideoKind,
} from "#/lib/food-truck/sales";
import { track } from "#/lib/track";

/**
 * The session id and the in-progress menu are kept in localStorage so a
 * reload re-hydrates the design from GET /api/agent/state instead of
 * landing the buyer back on an empty intake.
 */
const SESSION_KEY = "ftf_sessionId";
const MENU_DRAFT_KEY = "ftf_menuDraft";

export type MessageRole = "user" | "assistant";

export interface RendersCardData {
	views: string[];
	failed?: string[];
	version?: number | null;
	stamp?: string | null;
	/** What produced it, for the card's headline. */
	reason?: "first" | "revision" | "more" | "retry" | "regenerate";
}

export interface ProposalCardData {
	id: string;
	changeSummary: string;
	changes: string[];
	viewCount: number;
	creditsLeft?: number;
	status: "pending" | "applying" | "applied" | "dismissed";
	version?: number;
}

export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
	notice?: boolean;
	/** Attached inspiration photo preview (user messages). */
	image?: string;
	/** Structured cards in the timeline. Plain text when omitted. */
	kind?: "brief" | "renders" | "proposal";
	renders?: RendersCardData;
	proposal?: ProposalCardData;
}

export interface GeneratedImage {
	label: string;
	filename: string;
	url: string;
	timestamp: Date;
	favorite?: boolean;
	/** Only the views a round is actually rendering get a pending slot. */
	status: "pending" | "ready" | "failed";
	error?: string;
	/** Views this render was conditioned on — surfaced as provenance. */
	references?: string[];
	/**
	 * The latest round for this view failed, so these are the previous
	 * version's pixels. The canvas says so instead of passing them off as new.
	 */
	stale?: boolean;
}

/** Where a generation round has got to, for one honest progress display. */
export interface PipelineProgress {
	phase: "idle" | "renders" | "videos" | "finalizing" | "complete";
	step: string;
	rendersDone: number;
	rendersTotal: number;
	videosDone: number;
	videosTotal: number;
}

/** "interior_layout" → "interior layout", for progress copy. */
export function prettyView(view: string): string {
	return view.replace(/_/g, " ");
}

/** Buyer-facing names for each view. */
export const VIEW_TITLES: Record<string, string> = {
	exterior_hero: "Exterior",
	side_elevation: "Curbside",
	interior_layout: "Interior line",
	exterior_rear: "Rear",
	front_elevation: "Through the hatch",
	assembly_theater: "At the counter",
	night_exterior: "At night",
	brand_mark: "Brand mark",
	menu_board: "Menu board",
};

export function viewTitle(view: string): string {
	return VIEW_TITLES[view] ?? prettyView(view);
}

const IDLE_PROGRESS: PipelineProgress = {
	phase: "idle",
	step: "",
	rendersDone: 0,
	rendersTotal: 0,
	videosDone: 0,
	videosTotal: 0,
};

export interface GeneratedVideo {
	id: string;
	kind: string;
	status: "pending" | "ready" | "error";
	url?: string | null;
	error?: string | null;
	part?: number;
	seriesId?: string;
	operationId?: string | null;
}

export interface PipelineLead {
	sessionId: string;
	createdAt: number;
	lastSeen: number;
	lead: Record<string, unknown> | null;
	brandName: string | null;
	vehicle: string | null;
	stage: string | null;
}

export interface TruckLayout {
	layoutName: string;
	serveMode: string;
	zones: string[];
	equipment: string[];
	powerNotes: string;
	complianceNotes: string[];
	why: string[];
}

export interface TruckEstimate {
	vehicleLabel: string;
	wrapSqm: number;
	wrapSqft: number;
	wrapTier: string;
	wrapLow: number;
	wrapHigh: number;
	signageLow: number;
	signageHigh: number;
	leadTimeWeeks: string;
	bom: Array<{ item: string; detail: string }>;
}

export interface TruckSpec {
	brandName: string;
	business: string;
	vehicle: string;
	footprintM: string;
	equipment: string[];
	brandColors: string[];
	buyerContact: string;
	privacy: string;
	nextSteps: string[];
}

export interface DesignState {
	current?: {
		version: number;
		state: string;
		changeSummary?: string | null;
		spec?: Record<string, unknown>;
	} | null;
	versions?: Array<{
		version: number;
		state: string;
		changeSummary?: string | null;
	}>;
	approvals?: Array<{
		version: number;
		by?: string | null;
		createdAt: number;
	}>;
	stamp?: string | null;
}

type IncomingImage = {
	label: string;
	filename?: string;
	url: string;
	status?: string;
	error?: string;
	references?: string[];
};

function generateId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME =
	"Hi — I'm your Rolling Retail designer. Tell me what you'll serve and how you want it to feel, or share a photo you like. I'll lay out a trailer our factory can build and show it to you inside and out.";

const OUT_OF_ROUNDS =
	"You've used your free design rounds. Request a quote and our team will keep refining it with you.";

/** Read an SSE response, one parsed event at a time. */
async function readSse(
	res: Response,
	onEvent: (evt: Record<string, unknown>) => void,
): Promise<void> {
	const reader = res.body?.getReader();
	if (!reader) throw new Error("No response stream");
	const decoder = new TextDecoder();
	let buf = "";
	const flush = (frame: string) => {
		for (const line of frame.split("\n")) {
			if (!line.startsWith("data: ")) continue;
			try {
				onEvent(JSON.parse(line.slice(6)) as Record<string, unknown>);
			} catch {
				/* partial frame */
			}
		}
	};
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });
		const frames = buf.split("\n\n");
		buf = frames.pop() ?? "";
		for (const f of frames) flush(f);
	}
	if (buf.trim()) flush(buf.trim());
}

export function useChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content: WELCOME,
			timestamp: new Date(),
		},
	]);
	const [images, setImages] = useState<GeneratedImage[]>([]);
	const [progress, setProgress] = useState<PipelineProgress>(IDLE_PROGRESS);
	const [brain, setBrain] = useState<ProjectBrain | null>(null);
	const [layout, setLayout] = useState<TruckLayout | null>(null);
	const [estimate, setEstimate] = useState<TruckEstimate | null>(null);
	const [spec, setSpec] = useState<TruckSpec | null>(null);
	const [lead, setLead] = useState<Record<string, unknown> | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isGeneratingImages, setIsGeneratingImages] = useState(false);
	const [videos, setVideos] = useState<GeneratedVideo[]>([]);
	const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
	const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
	const [vehicleId, setVehicleId] = useState<string>("");
	const [businessType, setBusinessType] = useState<string>("");
	const [brandName, setBrandName] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isRenderingMenu, setIsRenderingMenu] = useState(false);
	const [menuDraft, setMenuDraft] = useState<MenuDesign | null>(null);
	const [design, setDesign] = useState<DesignState | null>(null);
	const [isApproving, setIsApproving] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	/** The view the canvas shows large. Chat thumbnails set it. */
	const [selectedView, setSelectedView] = useState<string | null>(null);

	const sessionIdRef = useRef<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	/** Id of the assistant bubble currently receiving text. */
	const streamingIdRef = useRef<string | null>(null);
	/** Why the round in flight started — for the renders card headline. */
	const roundReasonRef = useRef<RendersCardData["reason"]>("first");

	const pushMessage = useCallback(
		(m: Omit<ChatMessage, "id" | "timestamp">) => {
			setMessages((prev) => [
				...prev,
				{
					...m,
					id: `${m.kind ?? m.role}-${generateId()}`,
					timestamp: new Date(),
				},
			]);
		},
		[],
	);

	const patchProposal = useCallback(
		(id: string, patch: Partial<ProposalCardData>) => {
			setMessages((prev) =>
				prev.map((m) =>
					m.kind === "proposal" && m.proposal?.id === id
						? { ...m, proposal: { ...m.proposal, ...patch } }
						: m,
				),
			);
		},
		[],
	);

	const refreshDesign = useCallback(async () => {
		const sid = sessionIdRef.current;
		if (!sid) return;
		try {
			const res = await fetch(
				`/api/agent/design?sessionId=${encodeURIComponent(sid)}`,
			);
			if (!res.ok) return;
			setDesign((await res.json()) as DesignState);
		} catch {
			/* design bar is best-effort */
		}
	}, []);

	const ensureSession = useCallback(async () => {
		if (sessionIdRef.current) return sessionIdRef.current;
		const res = await fetch("/api/agent/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		if (!res.ok)
			throw new Error(
				"We couldn't start your design. Please refresh and try again.",
			);
		const data = (await res.json()) as {
			sessionId: string;
			credits?: { left: number };
		};
		sessionIdRef.current = data.sessionId;
		setSessionId(data.sessionId);
		try {
			localStorage.setItem(SESSION_KEY, data.sessionId);
		} catch {
			/* storage disabled — rehydrate just won't work */
		}
		if (typeof data.credits?.left === "number")
			setCreditsLeft(data.credits.left);
		void refreshDesign();
		return data.sessionId;
	}, [refreshDesign]);

	/**
	 * Fold renders into the view-keyed set. Latest wins; a failed render never
	 * displaces a good one, mirroring the server's own rule.
	 */
	const mergeImages = useCallback((incoming: IncomingImage[]) => {
		if (incoming.length === 0) return;
		const now = new Date();
		setImages((prev) => {
			const byView = new Map(prev.map((p) => [p.label, p]));
			for (const i of incoming) {
				const held = byView.get(i.label);
				const status: GeneratedImage["status"] =
					i.status === "failed"
						? "failed"
						: i.status === "pending"
							? "pending"
							: "ready";
				if (
					status === "failed" &&
					held?.url &&
					(held.status === "ready" || held.status === "pending")
				) {
					byView.set(i.label, {
						...held,
						status: "ready",
						stale: true,
						error: i.error,
					});
					continue;
				}
				byView.set(i.label, {
					label: i.label,
					filename: i.filename ?? `${i.label}.png`,
					url: i.url,
					timestamp: now,
					status,
					error: i.error,
					references: i.references,
					favorite: held?.favorite,
					stale: status === "ready" ? false : held?.stale,
				});
			}
			return RENDER_VIEWS.map((v) => byView.get(v)).filter(
				(v): v is GeneratedImage => Boolean(v),
			);
		});
	}, []);

	/** Open a pending slot for exactly the views this round renders. */
	const openRenderSlots = useCallback((views: readonly string[]) => {
		const now = new Date();
		setImages((prev) => {
			const byView = new Map(prev.map((p) => [p.label, p]));
			for (const v of views) {
				const held = byView.get(v);
				byView.set(v, {
					label: v,
					filename: `${v}.png`,
					// A re-render keeps showing the old pixels until the new ones land.
					url: held?.url ?? "",
					timestamp: now,
					status: "pending",
					favorite: held?.favorite,
				});
			}
			return RENDER_VIEWS.map((view) => byView.get(view)).filter(
				(x): x is GeneratedImage => Boolean(x),
			);
		});
	}, []);

	/** Ask the server what it actually produced, and settle every slot. */
	const reconcileImages = useCallback(async () => {
		const sid = sessionIdRef.current;
		if (!sid) return;
		try {
			const res = await fetch(
				`/api/agent/images?sessionId=${encodeURIComponent(sid)}`,
			);
			if (!res.ok) return;
			const data = (await res.json()) as {
				images?: IncomingImage[];
				creditsLeft?: number;
			};
			if (Array.isArray(data.images)) mergeImages(data.images);
			setImages((prev) =>
				prev.map((i) =>
					i.status === "pending"
						? i.url
							? { ...i, status: "ready" }
							: {
									...i,
									status: "failed",
									error: "This view didn't come back from the renderer.",
								}
						: i,
				),
			);
			if (typeof data.creditsLeft === "number")
				setCreditsLeft(data.creditsLeft);
		} catch {
			/* reconciliation is best-effort */
		}
	}, [mergeImages]);

	/* ── Session rehydrate ── */
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const savedId = localStorage.getItem(SESSION_KEY);
				if (savedId) {
					sessionIdRef.current = savedId;
					setSessionId(savedId);
					const res = await fetch(
						`/api/agent/state?sessionId=${encodeURIComponent(savedId)}`,
					);
					if (res.ok && !cancelled) {
						const data = (await res.json()) as {
							history?: Array<{
								role: "user" | "assistant";
								content: string;
								kind?: ChatMessage["kind"];
								data?: Record<string, unknown>;
							}>;
							brain?: ProjectBrain;
							credits?: { left: number };
							images?: IncomingImage[];
							videos?: GeneratedVideo[];
							design?: DesignState;
							lead?: Record<string, unknown>;
						};
						if (Array.isArray(data.history) && data.history.length > 0) {
							setMessages([
								{
									id: "welcome",
									role: "assistant",
									content: WELCOME,
									timestamp: new Date(),
								},
								...data.history.map((h) => ({
									id: `restored-${generateId()}`,
									role: h.role,
									content: String(h.content ?? ""),
									timestamp: new Date(),
									kind: h.kind,
									renders:
										h.kind === "renders"
											? (h.data as unknown as RendersCardData)
											: undefined,
									proposal:
										h.kind === "proposal"
											? (h.data as unknown as ProposalCardData)
											: undefined,
								})),
							]);
						}
						if (data.brain) {
							setBrain(data.brain);
							if (data.brain.brandName) setBrandName(data.brain.brandName);
							if (data.brain.vehicleId) setVehicleId(data.brain.vehicleId);
							if (data.brain.businessType)
								setBusinessType(data.brain.businessType);
						}
						if (typeof data.credits?.left === "number")
							setCreditsLeft(data.credits.left);
						if (Array.isArray(data.images)) mergeImages(data.images);
						if (Array.isArray(data.videos)) setVideos(data.videos);
						if (data.design?.current) setDesign(data.design);
						if (data.lead) setLead(data.lead);
					}
				}
				const menuJson = localStorage.getItem(MENU_DRAFT_KEY);
				if (menuJson && !cancelled)
					setMenuDraft(JSON.parse(menuJson) as MenuDesign);
			} catch {
				/* rehydration is best-effort — a fresh start still works */
			} finally {
				if (!cancelled) setHydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [mergeImages]);

	useEffect(() => {
		if (!menuDraft) return;
		try {
			localStorage.setItem(MENU_DRAFT_KEY, JSON.stringify(menuDraft));
		} catch {
			/* storage disabled */
		}
	}, [menuDraft]);

	const approveVersion = useCallback(
		async (version: number) => {
			const sid = sessionIdRef.current;
			if (!sid || isApproving) return;
			setIsApproving(true);
			setError(null);
			try {
				const res = await fetch("/api/agent/approve", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: sid,
						version,
						by: brandName.trim() || undefined,
					}),
				});
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
					code?: string;
				};
				if (!res.ok) {
					// The server's view of the design differs from the page's —
					// re-sync so the next click approves what actually exists.
					if (data.code) await refreshDesign();
					throw new Error(
						data.error || "We couldn't save your approval. Please try again.",
					);
				}
				track("design_approved", { version });
				await refreshDesign();
				pushMessage({
					role: "assistant",
					content: `**Design v${version} approved.** Our build team now has a version they can quote from. Share your name and the best way to reach you, and I'll send it across with your spec.`,
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Approval failed");
			} finally {
				setIsApproving(false);
			}
		},
		[isApproving, brandName, refreshDesign, pushMessage],
	);

	/** Every stream (chat, revise) speaks the same event language. */
	const applyStreamEvent = useCallback(
		(evt: Record<string, unknown>) => {
			const type = evt.type as string;
			if (type === "text") {
				const delta = String(evt.delta ?? "");
				const id = streamingIdRef.current;
				if (!delta || !id) return;
				setMessages((prev) =>
					prev.map((m) =>
						m.id === id ? { ...m, content: m.content + delta } : m,
					),
				);
			} else if (type === "layout") {
				setLayout(evt.layout as TruckLayout);
			} else if (type === "estimate") {
				setEstimate(evt.estimate as TruckEstimate);
			} else if (type === "spec") {
				setSpec(evt.spec as TruckSpec);
			} else if (type === "lead") {
				setLead(evt.lead as Record<string, unknown>);
			} else if (type === "done") {
				if (typeof evt.creditsLeft === "number")
					setCreditsLeft(evt.creditsLeft as number);
			} else if (type === "brain") {
				const b = evt.brain as ProjectBrain;
				setBrain(b);
				if (b?.vehicleId) setVehicleId(b.vehicleId);
				if (b?.businessType) setBusinessType(b.businessType);
				if (b?.brandName) setBrandName(b.brandName);
			} else if (type === "proposal") {
				pushMessage({
					role: "assistant",
					content: "",
					kind: "proposal",
					proposal: evt.proposal as ProposalCardData,
				});
			} else if (type === "proposal_applied") {
				patchProposal(String(evt.proposalId), {
					status: "applied",
					version: evt.version as number,
				});
				roundReasonRef.current = "revision";
			} else if (type === "images_start") {
				const views = Array.isArray(evt.views) ? (evt.views as string[]) : [];
				setIsGeneratingImages(true);
				openRenderSlots(views);
				if (views[0]) setSelectedView((cur) => cur ?? views[0]);
				setProgress({
					phase: "renders",
					step: "Preparing the render brief",
					rendersDone: 0,
					rendersTotal: views.length,
					videosDone: 0,
					videosTotal: 0,
				});
			} else if (type === "images") {
				mergeImages((evt.images ?? []) as IncomingImage[]);
				const p = evt.progress as
					| { completed?: number; total?: number; generating?: string[] }
					| undefined;
				if (p) {
					setProgress((prev) => ({
						...prev,
						phase: "renders",
						step: p.generating?.length
							? `Rendering ${p.generating.map(viewTitle).join(", ").toLowerCase()}`
							: prev.step,
						rendersDone: p.completed ?? prev.rendersDone,
						rendersTotal: p.total ?? prev.rendersTotal,
					}));
				}
			} else if (type === "images_done") {
				mergeImages((evt.images ?? []) as IncomingImage[]);
				setIsGeneratingImages(false);
				setProgress((prev) => ({
					...prev,
					phase: "complete",
					step: "",
					rendersDone: prev.rendersTotal,
				}));
				if (typeof evt.creditsLeft === "number")
					setCreditsLeft(evt.creditsLeft as number);
				if (typeof evt.error === "string") setError(evt.error);
				const views = (evt.views ?? []) as string[];
				const failed = (evt.failed ?? []) as string[];
				if (views.length || failed.length) {
					pushMessage({
						role: "assistant",
						content: "",
						kind: "renders",
						renders: {
							views,
							failed,
							version: (evt.version as number | null) ?? null,
							stamp: (evt.stamp as string | null) ?? null,
							reason: roundReasonRef.current,
						},
					});
					if (views[0]) setSelectedView(views[0]);
				}
				roundReasonRef.current = "first";
				void reconcileImages();
				void refreshDesign();
			}
		},
		[
			mergeImages,
			openRenderSlots,
			reconcileImages,
			refreshDesign,
			pushMessage,
			patchProposal,
		],
	);

	const sendMessage = useCallback(
		async (text: string, opts?: { image?: string; kind?: "brief" }) => {
			const trimmed = text.trim();
			if ((!trimmed && !opts?.image) || isStreaming) return;
			setError(null);
			const assistantId = `assistant-${generateId()}`;
			streamingIdRef.current = assistantId;
			setMessages((prev) => [
				...prev,
				{
					id: `user-${generateId()}`,
					role: "user",
					content: trimmed,
					timestamp: new Date(),
					image: opts?.image,
					kind: opts?.kind,
				},
				{
					id: assistantId,
					role: "assistant",
					content: "",
					timestamp: new Date(),
					isStreaming: true,
				},
			]);
			setIsConnecting(true);
			try {
				const sid = await ensureSession();
				setIsConnecting(false);
				setIsStreaming(true);
				abortRef.current = new AbortController();
				const res = await fetch("/api/agent/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: sid,
						message: trimmed,
						image: opts?.image,
						kind: opts?.kind,
					}),
					signal: abortRef.current.signal,
				});
				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as {
						error?: string;
					};
					throw new Error(
						data.error || "The designer didn't answer. Please try again.",
					);
				}
				await readSse(res, applyStreamEvent);
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId
							? {
									...m,
									isStreaming: false,
									content:
										m.content ||
										"Done — take a look at the canvas and tell me what to change.",
								}
							: m,
					),
				);
			} catch (err) {
				if ((err as Error).name === "AbortError") {
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantId ? { ...m, isStreaming: false } : m,
						),
					);
				} else {
					setError(err instanceof Error ? err.message : "Something went wrong");
					setMessages((prev) =>
						prev.filter((m) => m.id !== assistantId || m.content.length > 0),
					);
				}
				setIsGeneratingImages(false);
			} finally {
				streamingIdRef.current = null;
				setIsStreaming(false);
				setIsConnecting(false);
			}
		},
		[isStreaming, ensureSession, applyStreamEvent],
	);

	/** Apply a proposed change: new version + re-render, streamed. */
	const applyProposal = useCallback(
		async (proposalId: string) => {
			if (isGeneratingImages) return;
			setError(null);
			patchProposal(proposalId, { status: "applying" });
			roundReasonRef.current = "revision";
			try {
				const sid = await ensureSession();
				const res = await fetch("/api/agent/revise", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId: sid, proposalId }),
				});
				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as {
						error?: string;
						creditsLeft?: number;
					};
					if (typeof data.creditsLeft === "number")
						setCreditsLeft(data.creditsLeft);
					patchProposal(proposalId, {
						status: res.status === 409 ? "dismissed" : "pending",
					});
					throw new Error(
						data.error || "That change didn't go through. Please try again.",
					);
				}
				track("revision_applied", { proposalId });
				await readSse(res, applyStreamEvent);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "That change didn't go through.",
				);
				setIsGeneratingImages(false);
			}
		},
		[isGeneratingImages, ensureSession, applyStreamEvent, patchProposal],
	);

	const dismissProposal = useCallback(
		async (proposalId: string) => {
			patchProposal(proposalId, { status: "dismissed" });
			const sid = sessionIdRef.current;
			if (!sid) return;
			try {
				await fetch(
					`/api/agent/revise?sessionId=${encodeURIComponent(sid)}&proposalId=${encodeURIComponent(proposalId)}`,
					{ method: "DELETE" },
				);
			} catch {
				/* dismiss is local-first */
			}
		},
		[patchProposal],
	);

	/**
	 * Canvas-driven renders. `more` and `retry` are free; `regenerate` spends
	 * a round. The server briefs the round from the design record — the
	 * client sends no colors, brand or vehicle of its own.
	 */
	const renderViews = useCallback(
		async (
			views: string[] | undefined,
			mode: "more" | "retry" | "regenerate",
		) => {
			if (isGeneratingImages) return;
			setError(null);
			setIsGeneratingImages(true);
			roundReasonRef.current = mode;
			const targets = views?.length
				? views
				: images
						.filter(
							(i) =>
								i.status === "ready" &&
								(CONCEPT_VIEWS as readonly string[]).includes(i.label),
						)
						.map((i) => i.label);
			openRenderSlots(targets);
			setProgress({
				phase: "renders",
				step:
					mode === "regenerate"
						? "Re-rendering your design"
						: `Rendering ${targets.map(viewTitle).join(", ").toLowerCase()}`,
				rendersDone: 0,
				rendersTotal: targets.length || 3,
				videosDone: 0,
				videosTotal: 0,
			});
			try {
				const sid = await ensureSession();
				const res = await fetch("/api/agent/images", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId: sid, views, mode }),
				});
				const data = (await res.json()) as {
					images?: IncomingImage[];
					views?: string[];
					failed?: string[];
					version?: number | null;
					stamp?: string | null;
					creditsLeft?: number;
					error?: string;
				};
				if (typeof data.creditsLeft === "number")
					setCreditsLeft(data.creditsLeft);
				if (!res.ok)
					throw new Error(
						res.status === 402
							? OUT_OF_ROUNDS
							: data.error || "The render didn't finish. Please try again.",
					);
				mergeImages(data.images ?? []);
				pushMessage({
					role: "assistant",
					content: "",
					kind: "renders",
					renders: {
						views: data.views ?? [],
						failed: data.failed ?? [],
						version: data.version,
						stamp: data.stamp,
						reason: mode,
					},
				});
				if (data.views?.[0]) setSelectedView(data.views[0]);
				void refreshDesign();
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "The render didn't finish.",
				);
			} finally {
				setIsGeneratingImages(false);
				roundReasonRef.current = "first";
				await reconcileImages();
				setProgress((prev) => ({ ...prev, phase: "complete", step: "" }));
			}
		},
		[
			isGeneratingImages,
			images,
			ensureSession,
			openRenderSlots,
			mergeImages,
			pushMessage,
			refreshDesign,
			reconcileImages,
		],
	);

	const retryFailedRenders = useCallback(async () => {
		const failed = images
			.filter(
				(i) =>
					(i.status === "failed" || i.stale) &&
					(CONCEPT_VIEWS as readonly string[]).includes(i.label),
			)
			.map((i) => i.label);
		if (failed.length === 0) return;
		await renderViews(failed, "retry");
	}, [images, renderViews]);

	/** A favorite is a marker, not a sign-off, and never speaks for the buyer. */
	const toggleFavorite = useCallback((label: string) => {
		setImages((prev) =>
			prev.map((img) =>
				img.label === label ? { ...img, favorite: !img.favorite } : img,
			),
		);
	}, []);

	const clearError = useCallback(() => setError(null), []);

	/* ── Menu board ── */
	const renderMenuBoard = useCallback(
		async (menu: MenuDesign, artwork: string) => {
			if (isRenderingMenu) return;
			setError(null);
			setIsRenderingMenu(true);
			try {
				const sid = await ensureSession();
				const res = await fetch("/api/agent/menu", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: sid,
						brand: brandName.trim() || undefined,
						vehicleId,
						menu,
						artwork,
						render: true,
					}),
				});
				const data = (await res.json()) as {
					image?: IncomingImage;
					creditsLeft?: number;
					error?: string;
				};
				if (typeof data.creditsLeft === "number")
					setCreditsLeft(data.creditsLeft);
				if (!res.ok || !data.image) {
					throw new Error(
						res.status === 402
							? OUT_OF_ROUNDS
							: data.error || "The menu board didn't render. Please try again.",
					);
				}
				mergeImages([data.image]);
				setSelectedView("menu_board");
				pushMessage({
					role: "assistant",
					content: "",
					kind: "renders",
					renders: { views: ["menu_board"], reason: "more" },
				});
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Menu board render failed",
				);
			} finally {
				setIsRenderingMenu(false);
			}
		},
		[
			isRenderingMenu,
			ensureSession,
			brandName,
			vehicleId,
			mergeImages,
			pushMessage,
		],
	);

	/* ── Sales video ── */
	const generateVideo = useCallback(
		async (kind: SalesVideoKind = "hero-orbit") => {
			if (isGeneratingVideo) return;
			setError(null);
			const ready = images.filter((i) => i.status === "ready");
			const master = pickMasterReference(ready);
			const refs = [
				...(master ? [master] : []),
				...pickApprovedReferences(ready, master),
			].slice(0, 3);
			if (refs.length === 0) {
				setError(
					"Render your trailer first — the film is shot from your renders.",
				);
				return;
			}
			setIsGeneratingVideo(true);
			setProgress((prev) => ({
				...prev,
				phase: "videos",
				step: "Filming from your renders",
				videosDone: 0,
				videosTotal: 1,
			}));
			try {
				const sid = await ensureSession();
				const started = await fetch("/api/agent/video", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: sid,
						kind,
						brand: brandName.trim() || undefined,
						vehicleId: vehicleId || undefined,
						businessType: businessType || undefined,
						colors: brain?.colors.slice(0, 3).join(", ") || undefined,
						vibe: brain?.vibeWords.slice(0, 2).join(", ") || undefined,
						equipment: layout?.equipment,
						serveMode: layout?.serveMode,
						references: refs,
					}),
				});
				const startData = (await started.json().catch(() => ({}))) as {
					video?: GeneratedVideo;
					error?: string;
				};
				if (!started.ok || !startData.video)
					throw new Error(
						startData.error || "The film didn't start. Please try again.",
					);
				const job = { ...startData.video, kind } as GeneratedVideo;
				setVideos((prev) => [job, ...prev.filter((v) => v.id !== job.id)]);
				let current = job;
				for (let i = 0; i < 90 && current.status === "pending"; i++) {
					await new Promise((r) => setTimeout(r, 4000));
					const params = new URLSearchParams({
						sessionId: sid,
						videoId: job.id,
					});
					if (job.operationId)
						params.set("operationId", String(job.operationId));
					const poll = await fetch(`/api/agent/video?${params.toString()}`);
					const pollData = (await poll.json().catch(() => ({}))) as {
						video?: GeneratedVideo;
					};
					if (!poll.ok || !pollData.video) break;
					current = pollData.video;
					setVideos((prev) =>
						prev.map((v) => (v.id === current.id ? current : v)),
					);
				}
				setProgress((prev) => ({
					...prev,
					phase: "finalizing",
					step: "",
					videosDone: current.status === "ready" ? 1 : prev.videosDone,
				}));
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Video generation failed",
				);
			} finally {
				setIsGeneratingVideo(false);
				setProgress((prev) => ({ ...prev, phase: "complete", step: "" }));
			}
		},
		[
			isGeneratingVideo,
			images,
			ensureSession,
			brandName,
			businessType,
			vehicleId,
			brain,
			layout,
		],
	);

	/** Where the buyer is in the journey — drives the header stepper. */
	const hasRenders = images.some((i) => i.status === "ready");
	const approved = (design?.approvals ?? []).length > 0;
	const journeyStep: "brief" | "concepts" | "refine" | "approve" | "quote" =
		lead
			? "quote"
			: approved
				? "quote"
				: (design?.current?.version ?? 0) > 1
					? "approve"
					: hasRenders
						? "refine"
						: messages.length > 1
							? "concepts"
							: "brief";

	return {
		messages,
		images,
		videos,
		isGeneratingVideo,
		generateVideo,
		brain,
		layout,
		estimate,
		spec,
		lead,
		toggleFavorite,
		design,
		refreshDesign,
		approveVersion,
		isApproving,
		ensureSession,
		sessionId,
		hydrated,
		isStreaming,
		isConnecting,
		isGeneratingImages,
		progress,
		retryFailedRenders,
		renderViews,
		applyProposal,
		dismissProposal,
		selectedView,
		setSelectedView,
		creditsLeft,
		vehicleId,
		setVehicleId,
		businessType,
		setBusinessType,
		brandName,
		setBrandName,
		journeyStep,
		error,
		sendMessage,
		renderMenuBoard,
		isRenderingMenu,
		menuDraft,
		setMenuDraft,
		clearError,
	};
}
