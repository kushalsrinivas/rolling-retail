import { useCallback, useRef, useState } from "react";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
}

export interface GeneratedImage {
	label: string;
	filename: string;
	url: string;
	timestamp: Date;
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

interface UseChatReturn {
	messages: ChatMessage[];
	images: GeneratedImage[];
	metrics: DeploymentMetrics | null;
	events: EventRecommendation[];
	analytics: PlatformAnalytics | null;
	isStreaming: boolean;
	isConnecting: boolean;
	isGeneratingImages: boolean;
	error: string | null;
	sendMessage: (text: string) => Promise<void>;
	sendContextMessage: (contextLabel: string, contextValue: string, userQuestion?: string) => Promise<void>;
	clearError: () => void;
}

function generateId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ParseResult {
	text: string;
	images: Array<{ label: string; filename: string }>;
	metrics: DeploymentMetrics | null;
	events: EventRecommendation[];
	analytics: PlatformAnalytics | null;
	isGeneratingImages: boolean;
}

/**
 * Recursively search any object for an array of image objects with filename keys.
 */
function findImagesInObject(obj: unknown): Array<{ label: string; filename: string }> {
	const results: Array<{ label: string; filename: string }> = [];
	if (!obj || typeof obj !== "object") return results;

	if (Array.isArray(obj)) {
		for (const item of obj) {
			if (item && typeof item === "object" && "filename" in item) {
				results.push({
					label: (item as Record<string, string>).label || "concept",
					filename: (item as Record<string, string>).filename,
				});
			} else {
				results.push(...findImagesInObject(item));
			}
		}
		return results;
	}

	const record = obj as Record<string, unknown>;
	if ("images" in record && Array.isArray(record.images)) {
		return findImagesInObject(record.images);
	}
	for (const val of Object.values(record)) {
		const found = findImagesInObject(val);
		if (found.length > 0) return found;
	}
	return results;
}

/**
 * Parses accumulated SSE data from ADK.
 * Extracts model text, detects generate_brand_images function calls,
 * and extracts image filenames from function responses.
 */
function extractEvents(obj: unknown): EventRecommendation[] {
	if (!obj || typeof obj !== "object") return [];
	const rec = obj as Record<string, unknown>;
	if (Array.isArray(rec.events)) {
		return rec.events.filter(
			(e: unknown) => e && typeof e === "object" && "fit_score" in (e as Record<string, unknown>),
		) as EventRecommendation[];
	}
	if (rec.response && typeof rec.response === "object") return extractEvents(rec.response);
	if (rec.result && typeof rec.result === "object") return extractEvents(rec.result);
	for (const val of Object.values(rec)) {
		if (val && typeof val === "object") {
			const found = extractEvents(val);
			if (found.length > 0) return found;
		}
	}
	return [];
}

function extractAnalytics(obj: unknown): PlatformAnalytics | null {
	if (!obj || typeof obj !== "object") return null;
	const rec = obj as Record<string, unknown>;
	if (rec.platform_stats && rec.top_products) return obj as PlatformAnalytics;
	if (rec.response && typeof rec.response === "object") return extractAnalytics(rec.response);
	if (rec.result && typeof rec.result === "object") return extractAnalytics(rec.result);
	for (const val of Object.values(rec)) {
		if (val && typeof val === "object") {
			const found = extractAnalytics(val);
			if (found) return found;
		}
	}
	return null;
}

function extractMetrics(obj: unknown): DeploymentMetrics | null {
	if (!obj || typeof obj !== "object") return null;
	const rec = obj as Record<string, unknown>;
	if (rec.roi_projections && rec.comparison && rec.scoring) {
		return obj as DeploymentMetrics;
	}
	if (rec.response && typeof rec.response === "object") {
		return extractMetrics(rec.response);
	}
	if (rec.result && typeof rec.result === "object") {
		return extractMetrics(rec.result);
	}
	for (const val of Object.values(rec)) {
		if (val && typeof val === "object") {
			const found = extractMetrics(val);
			if (found) return found;
		}
	}
	return null;
}

/**
 * ADK streams the full conversation history after each tool call, which means
 * model text parts from earlier turns get re-sent. We deduplicate by tracking
 * which turn IDs (or content hashes) we've already counted toward the display text.
 *
 * Strategy: collect text only from the LAST contiguous block of model events
 * before any function response, because ADK always appends new model output at
 * the end. We identify "replay" events by checking if a model turn's text was
 * already seen in a prior event within the same stream.
 */
function parseSSEEvents(raw: string): ParseResult {
	const lines = raw.split("\n");
	const images: Array<{ label: string; filename: string }> = [];
	let metrics: DeploymentMetrics | null = null;
	let events: EventRecommendation[] = [];
	let analytics: PlatformAnalytics | null = null;
	let isGeneratingImages = false;

	// Collect all parsed events first
	const parsedEvents: Array<{ role: string; parts: unknown[]; raw: unknown }> = [];

	for (const line of lines) {
		if (!line.startsWith("data: ")) continue;
		const jsonStr = line.slice(6).trim();
		if (!jsonStr || jsonStr === "[DONE]") continue;
		try {
			const event = JSON.parse(jsonStr);
			const content = event?.content;
			if (!content) continue;
			parsedEvents.push({
				role: content.role ?? "",
				parts: Array.isArray(content.parts) ? content.parts : [],
				raw: event,
			});
		} catch {
			// partial JSON — skip
		}
	}

	// Extract tool data from ALL events (we need all function responses regardless of order)
	for (const ev of parsedEvents) {
		if (ev.role === "model") {
			for (const part of ev.parts as Array<Record<string, unknown>>) {
				const fnCall = (part.functionCall || part.function_call) as Record<string, unknown> | undefined;
				if (fnCall?.name === "generate_brand_images") {
					isGeneratingImages = true;
				}
			}
		}
		if (ev.role === "user") {
			for (const part of ev.parts as Array<Record<string, unknown>>) {
				const resp = (part.functionResponse || part.function_response) as Record<string, unknown> | undefined;
				if (!resp) continue;
				const name = (resp.name as string) || "";
				const payload = resp.response || resp.result || resp;
				if (name === "generate_brand_images") {
					isGeneratingImages = false;
					images.push(...findImagesInObject(payload));
				}
				if (name === "generate_deployment_metrics") {
					const m = extractMetrics(payload);
					if (m) metrics = m;
				}
				if (name === "generate_event_recommendations") {
					const e = extractEvents(payload);
					if (e.length > 0) events = e;
				}
				if (name === "get_platform_analytics") {
					const a = extractAnalytics(payload);
					if (a) analytics = a;
				}
			}
		}

		// Fallback deep search
		const rawStr = JSON.stringify(ev.raw);
		if (images.length === 0 && rawStr.includes("generate_brand_images") && rawStr.includes("filename")) {
			const found = findImagesInObject(ev.raw);
			if (found.length > 0) { images.push(...found); isGeneratingImages = false; }
		}
		if (!metrics && rawStr.includes("roi_projections")) metrics = extractMetrics(ev.raw);
		if (events.length === 0 && rawStr.includes("fit_score")) events = extractEvents(ev.raw);
		if (!analytics && rawStr.includes("platform_stats")) analytics = extractAnalytics(ev.raw);
	}

	// --- Deduplicate model text ---
	// ADK replays the full conversation history in its SSE stream, meaning old
	// model turns get re-sent alongside the new response. We only want text from
	// the FINAL model reply (the last contiguous block of model events after the
	// last user event of any kind).
	//
	// Strategy: find the last "user" event (whether it's a function response or a
	// replayed user message) and take model text only from events after it. This
	// ensures we skip all replayed history.
	let lastUserIdx = -1;
	for (let i = 0; i < parsedEvents.length; i++) {
		if (parsedEvents[i].role === "user") lastUserIdx = i;
	}

	const startIdx = lastUserIdx === -1 ? 0 : lastUserIdx + 1;

	// Collect text from model events after the last user event.
	// ADK may send cumulative text (each event contains all prior text plus new)
	// so we deduplicate: if a later text starts with an earlier text, it's
	// cumulative and we only keep the longest version.
	const textParts: string[] = [];
	for (let i = startIdx; i < parsedEvents.length; i++) {
		const ev = parsedEvents[i];
		if (ev.role !== "model") continue;
		for (const part of ev.parts as Array<Record<string, unknown>>) {
			if (typeof part.text === "string" && part.text.length > 0) {
				textParts.push(part.text);
			}
		}
	}

	// Deduplicate cumulative streaming: if a later part starts with an earlier
	// part, the earlier one is subsumed. Otherwise concatenate (incremental tokens).
	let fullText = "";
	for (let i = 0; i < textParts.length; i++) {
		const current = textParts[i];
		const next = textParts[i + 1];
		if (next && next.startsWith(current)) {
			continue; // skip — next part already contains this text
		}
		if (fullText && current.startsWith(fullText)) {
			fullText = current; // cumulative: replace with longer version
		} else {
			fullText += current;
		}
	}

	return { text: fullText, images, metrics, events, analytics, isGeneratingImages };
}

export function useChat(): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content:
				"Hey! I'm the Rolling Retail onboarding specialist. Tell me about your brand and I'll help plan your mobile retail deployment — from vehicle design to location scoring. As we chat, I'll generate visual concepts for your brand on the left panel. What's your brand all about?",
			timestamp: new Date(),
		},
	]);
	const [images, setImages] = useState<GeneratedImage[]>([]);
	const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null);
	const [events, setEvents] = useState<EventRecommendation[]>([]);
	const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isGeneratingImages, setIsGeneratingImages] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const userIdRef = useRef(`u_${generateId()}`);
	const sessionIdRef = useRef(`s_${generateId()}`);
	const sessionCreatedRef = useRef(false);

	const ensureSession = useCallback(async () => {
		if (sessionCreatedRef.current) return;

		const res = await fetch("/api/agent/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: userIdRef.current,
				sessionId: sessionIdRef.current,
			}),
		});

		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.error || `Session creation failed (${res.status})`);
		}

		sessionCreatedRef.current = true;
	}, []);

	const sendMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isStreaming) return;

			setError(null);

			const userMsg: ChatMessage = {
				id: `user-${generateId()}`,
				role: "user",
				content: trimmed,
				timestamp: new Date(),
			};

			const assistantMsgId = `assistant-${generateId()}`;

			setMessages((prev) => [...prev, userMsg]);
			setIsConnecting(true);

			try {
				await ensureSession();

				const res = await fetch("/api/agent/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: userIdRef.current,
						sessionId: sessionIdRef.current,
						message: trimmed,
					}),
				});

				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					throw new Error(data.error || `Agent request failed (${res.status})`);
				}

				setIsConnecting(false);
				setIsStreaming(true);

				setMessages((prev) => [
					...prev,
					{
						id: assistantMsgId,
						role: "assistant",
						content: "",
						timestamp: new Date(),
						isStreaming: true,
					},
				]);

				const reader = res.body?.getReader();
				if (!reader) throw new Error("No response stream");

				const decoder = new TextDecoder();
				let accumulated = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					accumulated += decoder.decode(value, { stream: true });
					const parsed = parseSSEEvents(accumulated);

					setIsGeneratingImages(parsed.isGeneratingImages);

					if (parsed.text) {
						setMessages((prev) =>
							prev.map((m) =>
								m.id === assistantMsgId
									? { ...m, content: parsed.text, isStreaming: true }
									: m,
							),
						);
					}

					if (parsed.images.length > 0) {
						const now = new Date();
						const newImages: GeneratedImage[] = parsed.images.map((img) => ({
							label: img.label,
							filename: img.filename,
							url: `/api/agent/images?file=${encodeURIComponent(img.filename)}`,
							timestamp: now,
						}));

						setImages((prev) => {
							const existingNames = new Set(prev.map((p) => p.filename));
							const fresh = newImages.filter(
								(ni) => !existingNames.has(ni.filename),
							);
							return fresh.length > 0 ? [...prev, ...fresh] : prev;
						});
					}

					if (parsed.metrics) {
						setMetrics(parsed.metrics);
					}
					if (parsed.events.length > 0) {
						setEvents(parsed.events);
					}
					if (parsed.analytics) {
						setAnalytics(parsed.analytics);
					}
				}

				const final = parseSSEEvents(accumulated);
				setIsGeneratingImages(false);

				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId
							? {
									...m,
									content:
										final.text ||
										"I didn't get a response. Could you try again?",
									isStreaming: false,
								}
							: m,
					),
				);

				if (final.images.length > 0) {
					const now = new Date();
					const newImages: GeneratedImage[] = final.images.map((img) => ({
						label: img.label,
						filename: img.filename,
						url: `/api/agent/images?file=${encodeURIComponent(img.filename)}`,
						timestamp: now,
					}));
					setImages((prev) => {
						const existingNames = new Set(prev.map((p) => p.filename));
						const fresh = newImages.filter(
							(ni) => !existingNames.has(ni.filename),
						);
						return fresh.length > 0 ? [...prev, ...fresh] : prev;
					});
				}

				if (final.metrics) {
					setMetrics(final.metrics);
				}
				if (final.events.length > 0) {
					setEvents(final.events);
				}
				if (final.analytics) {
					setAnalytics(final.analytics);
				}
			} catch (err) {
				const errorMsg =
					err instanceof Error ? err.message : "Something went wrong";
				setError(errorMsg);

				setMessages((prev) =>
					prev.filter(
						(m) => m.id !== assistantMsgId || m.content.length > 0,
					),
				);
			} finally {
				setIsStreaming(false);
				setIsConnecting(false);
				setIsGeneratingImages(false);
			}
		},
		[isStreaming, ensureSession],
	);

	const sendContextMessage = useCallback(
		async (contextLabel: string, contextValue: string, userQuestion?: string) => {
			const question = userQuestion?.trim() || `Tell me more about this: ${contextLabel}`;
			const fullMessage = `[Context: ${contextLabel} = ${contextValue}]\n\n${question}`;
			await sendMessage(fullMessage);
		},
		[sendMessage],
	);

	const clearError = useCallback(() => setError(null), []);

	return {
		messages,
		images,
		metrics,
		events,
		analytics,
		isStreaming,
		isConnecting,
		isGeneratingImages,
		error,
		sendMessage,
		sendContextMessage,
		clearError,
	};
}
