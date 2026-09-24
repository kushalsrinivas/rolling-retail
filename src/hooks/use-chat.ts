import { useCallback, useRef, useState } from "react";
import type { ProjectBrain } from "#/lib/food-truck/brain";
import {
	CONCEPT_VIEW_COUNT,
	CONCEPT_VIEWS,
	RENDER_VIEWS,
} from "#/lib/food-truck/constants";
import type { MenuDesign } from "#/lib/food-truck/menu";
import {
	pickApprovedReferences,
	pickMasterReference,
	type SalesVideoKind,
	TOUR_PARTS,
} from "#/lib/food-truck/sales";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
	notice?: boolean;
	/** Attached inspiration photo preview (user messages). */
	image?: string;
}

export interface GeneratedImage {
	label: string;
	filename: string;
	url: string;
	timestamp: Date;
	favorite?: boolean;
	/**
	 * A slot exists for every concept view from the moment a round starts, so
	 * a view that is still rendering or has failed shows as itself rather than
	 * as a gap in the grid.
	 */
	status: "pending" | "ready" | "failed";
	error?: string;
	/** Views this render was conditioned on — surfaced as provenance. */
	references?: string[];
}

/** Where a generation round has got to, for one honest progress display. */
export interface PipelineProgress {
	phase: "idle" | "renders" | "videos" | "finalizing" | "complete";
	/** Human label for the step in flight, e.g. "Rendering interior layout". */
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

export const IDLE_PROGRESS: PipelineProgress = {
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
	/** Provider interaction id — re-sent so tour chaining + polling survive fresh serverless instances. */
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

// ── Deprecated ADK-era aliases (kept so old panels compile during migration) ──
export interface DeploymentMetrics {
	roi_projections: {
		monthly_budget: number;
		days_per_month: number;
		num_locations: number;
		avg_ticket: number;
		price_point: string;
		monthly_impressions: number;
		foot_traffic_encounters: number;
		est_conversions: number;
		projected_monthly_revenue: number;
		conversion_rate: number;
		roi_percentage: number;
	};
	comparison: {
		mobile_monthly_cost: number;
		traditional_lease_cost: number;
		digital_only_cost: number;
		mobile_conversion: number;
		traditional_conversion: number;
		digital_conversion: number;
		mobile_setup: string;
		traditional_setup: string;
		digital_setup: string;
	};
	scoring: {
		weights: Record<string, number>;
		top_location_score: number;
		scores: {
			daytime: number;
			pedestrian: number;
			commercial: number;
			affluence: number;
			composite: number;
		};
	};
	target_markets: string[];
}
export interface EventRecommendation {
	name: string;
	type: string;
	location: string;
	frequency: string;
	season: string;
	total_attendance: number;
	daily_attendance: number;
	fit_score: number;
	fit_reasons: string[];
	projected_daily_impressions: number;
	projected_daily_conversions: number;
	projected_daily_revenue: number;
	permit_type: string;
}
export interface PlatformAnalytics {
	platform_stats: {
		total_orders: number;
		paid_orders: number;
		total_revenue: number;
		avg_order_value: number;
		total_items_sold: number;
		unique_customers: number;
		cities_served: number;
		states_reached: number;
		vendors_hosted: number;
		peak_day: string;
		peak_hours: string[];
		channel_split: { web: number; pos: number };
		monthly_trend: Array<{ month: string; revenue: number; orders: number }>;
	};
	top_products: Array<{ name: string; units_sold: number }>;
	top_categories: Array<{ category: string; units_sold: number; pct: number }>;
	top_locations: Array<{ location: string; transactions: number }>;
	customer_insights: {
		repeat_customer_rate_pct: number;
		multi_item_basket_rate_pct: number;
		marketing_opt_in_rate_pct: number;
	};
}

function generateId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME =
	"Welcome to the Factory Designer. Please share your brand, menu, colors, service style and any inspiration — I will organize it into a factory-buildable layout and prepare visual concepts once I have enough detail. What are you building?";

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
	const [metrics] = useState<DeploymentMetrics | null>(null);
	const [events] = useState<EventRecommendation[]>([]);
	const [analytics] = useState<PlatformAnalytics | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isGeneratingImages, setIsGeneratingImages] = useState(false);
	const [videos, setVideos] = useState<GeneratedVideo[]>([]);
	const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
	const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
	const [leads, setLeads] = useState<PipelineLead[]>([]);
	const [vehicleId, setVehicleId] = useState<string>("airstream-m");
	const [businessType, setBusinessType] = useState<string>("combined");
	const [brandName, setBrandName] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isRenderingMenu, setIsRenderingMenu] = useState(false);
	// Held here, not in the tab, so switching tabs never loses a half-typed menu.
	const [menuDraft, setMenuDraft] = useState<MenuDesign | null>(null);

	const sessionIdRef = useRef<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const ensureSession = useCallback(async () => {
		if (sessionIdRef.current) return sessionIdRef.current;
		const res = await fetch("/api/agent/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sessionId: sessionIdRef.current ?? undefined }),
		});
		if (!res.ok) throw new Error(`Session failed (${res.status})`);
		const data = (await res.json()) as {
			sessionId: string;
			credits?: { left: number };
		};
		sessionIdRef.current = data.sessionId;
		if (typeof data.credits?.left === "number")
			setCreditsLeft(data.credits.left);
		return data.sessionId;
	}, []);

	/**
	 * Fold a batch of renders into the view-keyed set.
	 *
	 * Keyed by view, latest wins. The previous version appended and deduped on
	 * the image bytes, so every regeneration stacked another nine tiles into
	 * the same grid — which is the opposite of "one property seen from nine
	 * angles". A failed render never displaces a good one, mirroring the
	 * server's own rule, so a flaky retry cannot blank a view.
	 */
	const mergeImages = useCallback(
		(
			incoming: Array<{
				label: string;
				filename?: string;
				url: string;
				status?: string;
				error?: string;
				references?: string[];
			}>,
		) => {
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
					if (status === "failed" && held?.status === "ready") continue;
					byView.set(i.label, {
						label: i.label,
						filename: i.filename ?? `${i.label}.png`,
						url: i.url,
						timestamp: now,
						status,
						error: i.error,
						references: i.references,
						// Starring is the buyer's, not the pipeline's.
						favorite: held?.favorite,
					});
				}
				return RENDER_VIEWS.map((v) => byView.get(v)).filter(
					(v): v is GeneratedImage => Boolean(v),
				);
			});
		},
		[],
	);

	/** Open a slot per view so the grid shows the whole round immediately. */
	const openRenderSlots = useCallback(() => {
		const now = new Date();
		setImages((prev) => {
			const byView = new Map(prev.map((p) => [p.label, p]));
			for (const v of CONCEPT_VIEWS) {
				const held = byView.get(v);
				if (held?.status === "ready") continue;
				byView.set(v, {
					label: v,
					filename: `${v}.png`,
					url: "",
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

	/**
	 * Ask the server what it actually produced.
	 *
	 * SSE is the fast path but not a reliable one — a dropped or truncated
	 * frame used to lose a render for good, because nothing but that frame
	 * ever held it. Every round now ends by reconciling against the store.
	 */
	const reconcileImages = useCallback(async () => {
		const sessionId = sessionIdRef.current;
		if (!sessionId) return;
		try {
			const res = await fetch(
				`/api/agent/images?sessionId=${encodeURIComponent(sessionId)}`,
			);
			if (!res.ok) return;
			const data = (await res.json()) as {
				images?: Array<{
					label: string;
					filename?: string;
					url: string;
					status?: string;
					error?: string;
					references?: string[];
				}>;
				creditsLeft?: number;
			};
			if (Array.isArray(data.images) && data.images.length > 0) {
				mergeImages(data.images);
			}
			// Any slot still "pending" after the server has settled never
			// landed — mark it so the grid can offer a retry instead of
			// spinning forever.
			setImages((prev) =>
				prev.map((i) =>
					i.status === "pending"
						? {
								...i,
								status: "failed",
								error: "This view did not come back from the renderer.",
							}
						: i,
				),
			);
			if (typeof data.creditsLeft === "number")
				setCreditsLeft(data.creditsLeft);
		} catch {
			/* reconciliation is best-effort — SSE data still stands */
		}
	}, [mergeImages]);

	const refreshLeads = useCallback(async () => {
		try {
			const res = await fetch("/api/agent/leads");
			if (!res.ok) return;
			const data = (await res.json()) as { leads?: PipelineLead[] };
			if (Array.isArray(data.leads)) setLeads(data.leads);
		} catch {
			/* pipeline is best-effort */
		}
	}, []);

	const applyStreamEvent = useCallback(
		(evt: Record<string, unknown>) => {
			const type = evt.type as string;
			if (type === "text") {
				const delta = String(evt.delta ?? "");
				if (!delta) return;
				setMessages((prev) => {
					const last = prev[prev.length - 1];
					if (last && last.role === "assistant" && last.isStreaming) {
						return [
							...prev.slice(0, -1),
							{ ...last, content: last.content + delta },
						];
					}
					return prev;
				});
			} else if (type === "layout") {
				setLayout(evt.layout as TruckLayout);
			} else if (type === "estimate") {
				setEstimate(evt.estimate as TruckEstimate);
			} else if (type === "spec") {
				setSpec(evt.spec as TruckSpec);
			} else if (type === "lead") {
				setLead(evt.lead as Record<string, unknown>);
				void refreshLeads();
			} else if (type === "notice") {
				setMessages((prev) => [
					...prev,
					{
						id: `notice-${generateId()}`,
						role: "assistant",
						content: String(evt.notice ?? ""),
						timestamp: new Date(),
						notice: true,
					},
				]);
			} else if (type === "done") {
				if (typeof evt.creditsLeft === "number")
					setCreditsLeft(evt.creditsLeft as number);
			} else if (type === "brain") {
				setBrain(evt.brain as ProjectBrain);
			} else if (type === "images_start") {
				setIsGeneratingImages(true);
				openRenderSlots();
				setProgress({
					phase: "renders",
					step: "Preparing the render brief",
					rendersDone: 0,
					rendersTotal:
						typeof evt.count === "number"
							? (evt.count as number)
							: CONCEPT_VIEW_COUNT,
					videosDone: 0,
					videosTotal: 0,
				});
			} else if (type === "images") {
				// A stage announces itself with an empty batch before it runs, so
				// the panel can name the views currently in flight.
				const batch = (evt.images ?? []) as Array<{
					label: string;
					filename: string;
					url: string;
					status?: string;
					error?: string;
					references?: string[];
				}>;
				mergeImages(batch);
				const p = evt.progress as
					| { completed?: number; total?: number; generating?: string[] }
					| undefined;
				if (p) {
					setProgress((prev) => ({
						...prev,
						phase: "renders",
						step: p.generating?.length
							? `Rendering ${p.generating.map(prettyView).join(", ")}`
							: prev.step,
						rendersDone: p.completed ?? prev.rendersDone,
						rendersTotal: p.total ?? prev.rendersTotal,
					}));
				}
			} else if (type === "images_done") {
				mergeImages(
					(evt.images ?? []) as Array<{ label: string; url: string }>,
				);
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
				void reconcileImages();
			}
		},
		[refreshLeads, mergeImages, openRenderSlots, reconcileImages],
	);

	const sendMessage = useCallback(
		async (text: string, opts?: { image?: string }) => {
			const trimmed = text.trim();
			if ((!trimmed && !opts?.image) || isStreaming) return;
			setError(null);
			const assistantId = `assistant-${generateId()}`;
			setMessages((prev) => [
				...prev,
				{
					id: `user-${generateId()}`,
					role: "user",
					content: trimmed,
					timestamp: new Date(),
					image: opts?.image,
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
				const sessionId = await ensureSession();
				setIsConnecting(false);
				setIsStreaming(true);
				abortRef.current = new AbortController();
				const res = await fetch("/api/agent/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId,
						message: trimmed,
						image: opts?.image,
						context: { vehicleId, businessType, brandName },
					}),
					signal: abortRef.current.signal,
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					throw new Error(
						(data as { error?: string }).error ||
							`Designer request failed (${res.status})`,
					);
				}
				const reader = res.body?.getReader();
				if (!reader) throw new Error("No response stream");
				const decoder = new TextDecoder();
				let buf = "";
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					buf += decoder.decode(value, { stream: true });
					const frames = buf.split("\n\n");
					buf = frames.pop() ?? "";
					for (const frame of frames) {
						for (const line of frame.split("\n")) {
							if (!line.startsWith("data: ")) continue;
							try {
								applyStreamEvent(
									JSON.parse(line.slice(6)) as Record<string, unknown>,
								);
							} catch {
								/* partial frame */
							}
						}
					}
				}
				if (buf.trim().startsWith("data: ")) {
					try {
						applyStreamEvent(
							JSON.parse(buf.trim().slice(6)) as Record<string, unknown>,
						);
					} catch {
						/* ignore */
					}
				}
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId
							? {
									...m,
									isStreaming: false,
									content: m.content || "Got it — what should we refine next?",
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
			} finally {
				setIsStreaming(false);
				setIsConnecting(false);
			}
		},
		[
			isStreaming,
			ensureSession,
			applyStreamEvent,
			vehicleId,
			businessType,
			brandName,
		],
	);

	const sendContextMessage = useCallback(
		async (label: string, value: string, question?: string) => {
			await sendMessage(
				`[${label}: ${value}] ${question?.trim() || `Tell me more about ${label}.`}`,
			);
		},
		[sendMessage],
	);

	/**
	 * One visual round.
	 *
	 * `only` retries a subset of views; the server reuses the round's existing
	 * renders as their references, so a retried view rejoins the same visual
	 * world instead of starting a new one.
	 */
	const generateConcepts = useCallback(
		async (opts?: { colors?: string; vibe?: string; only?: string[] }) => {
			if (isGeneratingImages) return;
			setError(null);
			setIsGeneratingImages(true);
			const targets = opts?.only?.length ? opts.only : [...CONCEPT_VIEWS];
			openRenderSlots();
			setProgress({
				phase: "renders",
				step: "Preparing the render brief",
				rendersDone: 0,
				rendersTotal: targets.length,
				videosDone: 0,
				videosTotal: 0,
			});
			try {
				const sessionId = await ensureSession();
				const res = await fetch("/api/agent/images", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId,
						brand: brandName.trim() || "New Brand",
						vehicleId,
						colors: opts?.colors || "bold brand colors",
						vibe: opts?.vibe || businessType,
						only: opts?.only,
					}),
				});
				const data = (await res.json()) as {
					images?: Array<{
						label: string;
						url: string;
						filename: string;
						status?: string;
						error?: string;
						references?: string[];
					}>;
					creditsLeft?: number;
					error?: string;
				};
				if (!res.ok) {
					if (res.status === 402) {
						setError(
							"You have used your 5 complimentary concepts. Please top up or share your contact details and our sales team will unlock more.",
						);
						if (typeof data.creditsLeft === "number")
							setCreditsLeft(data.creditsLeft);
						return;
					}
					throw new Error(
						data.error || `Concept generation failed (${res.status})`,
					);
				}
				mergeImages(data.images ?? []);
				if (typeof data.creditsLeft === "number")
					setCreditsLeft(data.creditsLeft);
				if (opts?.only?.length) return;
				await sendMessage(
					`I just generated the full ${CONCEPT_VIEW_COUNT}-view concept set (exterior hero, rear, side elevation, interior layout, front elevation, assembly theater, night, roof plan, brand mark) for ${brandName} on the current vehicle. Which direction should we develop — and what should change?`,
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Concept generation failed",
				);
			} finally {
				setIsGeneratingImages(false);
				// Settles any slot the round never filled, so nothing spins on.
				await reconcileImages();
				setProgress((prev) => ({ ...prev, phase: "complete", step: "" }));
			}
		},
		[
			isGeneratingImages,
			ensureSession,
			brandName,
			vehicleId,
			businessType,
			sendMessage,
			mergeImages,
			openRenderSlots,
			reconcileImages,
		],
	);

	/** Re-render just the views that failed, keeping the rest as references. */
	const retryFailedRenders = useCallback(async () => {
		// The menu board is not part of a round; it retries from the Menu tab.
		const failed = images
			.filter(
				(i) =>
					i.status === "failed" &&
					(CONCEPT_VIEWS as readonly string[]).includes(i.label),
			)
			.map((i) => i.label);
		if (failed.length === 0) return;
		await generateConcepts({ only: failed });
	}, [images, generateConcepts]);

	const toggleFavorite = useCallback(
		async (label: string) => {
			let starred: boolean | null = null;
			setImages((prev) =>
				prev.map((img) => {
					if (img.label !== label) return img;
					starred = !img.favorite;
					return { ...img, favorite: starred };
				}),
			);
			// Tell the agent to develop the starred direction (not on unstar).
			if (starred) {
				const pretty = label.replace(/_/g, " ");
				await sendMessage(
					`I'm starring the "${pretty}" concept — develop this direction. Keep the same body and brand, tell me what you'd refine next.`,
				);
			}
		},
		[sendMessage],
	);

	const clearError = useCallback(() => setError(null), []);

	/*
	 * ── Menu board ──
	 *
	 * The artwork is rendered in the browser from the exact SVG the buyer
	 * previewed and sent as a PNG, so the board render is conditioned on the
	 * pixels they approved. Costs one visual credit.
	 */
	const renderMenuBoard = useCallback(
		async (menu: MenuDesign, artwork: string) => {
			if (isRenderingMenu) return;
			setError(null);
			setIsRenderingMenu(true);
			try {
				const sessionId = await ensureSession();
				const res = await fetch("/api/agent/menu", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId,
						brand: brandName.trim() || undefined,
						vehicleId,
						menu,
						artwork,
						render: true,
					}),
				});
				const data = (await res.json()) as {
					image?: {
						label: string;
						url: string;
						filename: string;
						status?: string;
						error?: string;
						references?: string[];
					};
					creditsLeft?: number;
					error?: string;
				};
				if (typeof data.creditsLeft === "number")
					setCreditsLeft(data.creditsLeft);
				if (!res.ok || !data.image) {
					throw new Error(
						res.status === 402
							? "You have used your 5 complimentary visuals. Please top up or share your contact details and our sales team will unlock more."
							: data.error || `Menu board render failed (${res.status})`,
					);
				}
				mergeImages([data.image]);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Menu board render failed",
				);
			} finally {
				setIsRenderingMenu(false);
			}
		},
		[isRenderingMenu, ensureSession, brandName, vehicleId, mergeImages],
	);

	/*
	 * ── Sales video ──
	 *
	 * The server now chooses the references: it holds the round's renders and
	 * picks the ones that show the space each preset films (a walkthrough gets
	 * the interior views, not the exterior hero). These bytes are only a
	 * fallback for a session whose renders the server never stored.
	 *
	 * The route polls the provider, we poll the route. Tours chain TOUR_PARTS
	 * 10s segments via previous_interaction_id into ~30s.
	 */
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
					"Generate concepts first — video needs an approved still to film.",
				);
				return;
			}
			setIsGeneratingVideo(true);
			const partsTotal = kind === "tour" ? TOUR_PARTS : 1;
			setProgress((prev) => ({
				...prev,
				phase: "videos",
				step:
					kind === "tour"
						? "Filming the tour · part 1"
						: "Filming the approved stills",
				videosDone: 0,
				videosTotal: partsTotal,
			}));
			try {
				const sessionId = await ensureSession();
				const startPart = async (
					extendJobId?: string,
					prev?: GeneratedVideo | null,
					part?: number,
				): Promise<GeneratedVideo> => {
					const started = await fetch("/api/agent/video", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							sessionId,
							kind,
							brand: brandName.trim() || undefined,
							// The picker values, not a stand-in for them: `vibe` used to
							// carry the business-type id, so every clip was briefed with
							// "grill" as its mood and "food trailer" as its body.
							vehicleId: vehicleId || undefined,
							businessType: businessType || undefined,
							colors: brain?.colors.slice(0, 3).join(", ") || undefined,
							vibe: brain?.vibeWords.slice(0, 2).join(", ") || undefined,
							equipment: layout?.equipment,
							serveMode: layout?.serveMode,
							references: refs,
							extendJobId,
							// Stateless chaining: the next request may land on a fresh
							// serverless instance with no memory of the earlier part.
							previousOperationId: prev?.operationId ?? undefined,
							seriesId: prev?.seriesId ?? undefined,
							part,
						}),
					});
					const startData = (await started.json().catch(() => ({}))) as {
						video?: GeneratedVideo;
						error?: string;
					};
					if (!started.ok || !startData.video) {
						throw new Error(
							startData.error || `Video start failed (${started.status})`,
						);
					}
					return startData.video;
				};
				const pollPart = async (job: GeneratedVideo) => {
					let current = job;
					// Omni 10s renders take minutes, not seconds — 30×4s stranded
					// every tour at part 1. 90×4s ≈ 6 min per part.
					for (let i = 0; i < 90 && current.status === "pending"; i++) {
						await new Promise((r) => setTimeout(r, 4000));
						const params = new URLSearchParams({
							sessionId,
							videoId: job.id,
						});
						if (job.operationId) params.set("operationId", job.operationId);
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
					return current;
				};
				const parts = partsTotal;
				let previous: GeneratedVideo | null = null;
				for (let part = 1; part <= parts; part++) {
					setProgress((prev) => ({
						...prev,
						phase: "videos",
						step:
							parts > 1
								? `Filming the tour · part ${part} of ${parts}`
								: "Filming the approved stills",
						videosDone: part - 1,
					}));
					const job = await startPart(
						previous?.id,
						previous,
						kind === "tour" ? part : undefined,
					);
					setVideos((prev) => [
						{ ...job, kind },
						...prev.filter((v) => v.id !== job.id),
					]);
					const final = await pollPart(job);
					if (final.status !== "ready") {
						if (kind === "tour" && part < parts) {
							setError(
								`Part ${part + 1} wasn't ready in time — part ${final.part ?? part} is playable below; run the tour again to continue it.`,
							);
						}
						break;
					}
					previous = final;
					setProgress((prev) => ({ ...prev, videosDone: part }));
				}
				setProgress((prev) => ({
					...prev,
					phase: "finalizing",
					step: "Assembling the tour",
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

	const guidedStep: "brand" | "vehicle" | "layout" | "wrap" | "review" = spec
		? "review"
		: estimate
			? "wrap"
			: layout
				? "layout"
				: vehicleId
					? "vehicle"
					: "brand";

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
		leads,
		refreshLeads,
		toggleFavorite,
		metrics,
		events,
		analytics,
		isStreaming,
		isConnecting,
		isGeneratingImages,
		isGeneratingImagesAlias: isGeneratingImages,
		progress,
		retryFailedRenders,
		creditsLeft,
		vehicleId,
		setVehicleId,
		businessType,
		setBusinessType,
		brandName,
		setBrandName,
		guidedStep,
		error,
		sendMessage,
		sendContextMessage,
		generateConcepts,
		renderMenuBoard,
		isRenderingMenu,
		menuDraft,
		setMenuDraft,
		clearError,
	};
}
