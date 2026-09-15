import { useCallback, useRef, useState } from "react";
import type { ProjectBrain } from "#/lib/food-truck/brain";

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
	"Welcome to the Factory Designer. Please share your brand, menu, colours, service style and any inspiration — I will organise it into a factory-buildable layout and prepare visual concepts once I have enough detail. What are you building?";

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
	const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
	const [leads, setLeads] = useState<PipelineLead[]>([]);
	const [vehicleId, setVehicleId] = useState<string>("airstream-m");
	const [businessType, setBusinessType] = useState<string>("combined");
	const [brandName, setBrandName] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

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

	const mergeImages = useCallback(
		(incoming: Array<{ label: string; filename: string; url: string }>) => {
			const now = new Date();
			setImages((prev) => {
				const existing = new Set(prev.map((p) => p.label));
				const fresh = incoming
					.filter((i) => !existing.has(i.label))
					.map((i) => ({
						label: i.label,
						filename: i.filename,
						url: i.url,
						timestamp: now,
					}));
				return fresh.length > 0 ? [...prev, ...fresh] : prev;
			});
		},
		[],
	);

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
				setIsGeneratingImages(false);
			} else if (type === "brain") {
				setBrain(evt.brain as ProjectBrain);
			} else if (type === "images_start") {
				setIsGeneratingImages(true);
			} else if (type === "images") {
				mergeImages(
					(evt.images ?? []) as Array<{
						label: string;
						filename: string;
						url: string;
					}>,
				);
				setIsGeneratingImages(false);
				if (typeof evt.creditsLeft === "number")
					setCreditsLeft(evt.creditsLeft as number);
			}
		},
		[refreshLeads, mergeImages],
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

	const generateConcepts = useCallback(
		async (opts?: { colors?: string; vibe?: string }) => {
			if (isGeneratingImages) return;
			setError(null);
			setIsGeneratingImages(true);
			try {
				const sessionId = await ensureSession();
				const res = await fetch("/api/agent/images", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId,
						brand: brandName.trim() || "New Brand",
						vehicleId,
						colors: opts?.colors || "bold brand colours",
						vibe: opts?.vibe || businessType,
					}),
				});
				const data = (await res.json()) as {
					images?: Array<{ label: string; url: string; filename: string }>;
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
				await sendMessage(
					`I just generated the full 9-view concept set (exterior hero, rear, side elevation, interior layout, front elevation, assembly theater, night, roof plan, brand mark) for ${brandName} on the current vehicle. Which direction should we develop — and what should change?`,
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Concept generation failed",
				);
			} finally {
				setIsGeneratingImages(false);
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
		],
	);

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
		clearError,
	};
}
