/**
 * Sales-video generation via Gemini Omni Flash (Interactions API).
 *
 * Same API key as stills. Approved stills (auto-hero master + starred) go in
 * as reference images so the video films the approved product instead of
 * reinterpreting it.
 *
 * Shape per ai.google.dev/gemini-api/docs/omni: POST /v1beta/interactions
 * with x-goog-api-key, {model, input:[{type,text|image}], response_format,
 * background:true}; poll GET /v1beta/interactions/{id}; video arrives in
 * steps[].content[] as {type:"video", mime_type, data|uri}.
 * OMNI_ENDPOINT overrides the create URL if Google renames it.
 */
import {
	buildSalesVideoPrompt,
	type SalesVideoContext,
	type SalesVideoKind,
} from "./sales";

function omniKey() {
	return (
		process.env.GOOGLE_API_KEY ||
		process.env.GEMINI_API_KEY ||
		process.env.GOOGLE_GENAI_API_KEY ||
		""
	);
}

export function videoModel() {
	return process.env.VIDEO_MODEL || "gemini-omni-1.1-flash";
}

function interactionsUrl() {
	if (process.env.OMNI_ENDPOINT) return process.env.OMNI_ENDPOINT;
	return "https://generativelanguage.googleapis.com/v1beta/interactions";
}

function omniHeaders(key: string) {
	return {
		"Content-Type": "application/json",
		"x-goog-api-key": key,
		"Api-Revision": "2026-05-20",
	};
}

function splitDataUrl(u: string): { mimeType: string; data: string } | null {
	const m = u.match(/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s);
	return m?.[1] && m?.[2] ? { mimeType: m[1], data: m[2] } : null;
}

type Interaction = Record<string, unknown>;

interface VideoContent {
	type?: unknown;
	mime_type?: unknown;
	mimeType?: unknown;
	data?: unknown;
	uri?: unknown;
}

/** First video payload in steps[].content[], if the interaction has one. */
function findVideoContent(data: Interaction): VideoContent | null {
	const steps = Array.isArray(data.steps)
		? (data.steps as Array<Record<string, unknown>>)
		: [];
	for (const step of steps) {
		const content = Array.isArray(step.content)
			? (step.content as Array<Record<string, unknown>>)
			: [];
		for (const item of content) {
			if (item.type === "video") return item as VideoContent;
		}
	}
	return null;
}

async function videoContentToDataUrl(
	video: VideoContent,
	key: string,
): Promise<string | null> {
	if (typeof video.data === "string" && video.data) {
		const mime =
			typeof video.mime_type === "string"
				? video.mime_type
				: typeof video.mimeType === "string"
					? video.mimeType
					: "video/mp4";
		return `data:${mime};base64,${video.data}`;
	}
	if (typeof video.uri === "string" && video.uri) {
		return downloadVideoUri(video.uri, key);
	}
	return null;
}

export interface VideoStart {
	operationId: string;
	model: string;
	/** Set when the create response already carries the finished video. */
	readyUrl: string | null;
}

export async function startSalesVideo(args: {
	kind: SalesVideoKind;
	ctx: SalesVideoContext;
	/** Up to 3 approved still data-URLs (master first). */
	references: string[];
}): Promise<VideoStart> {
	const key = omniKey();
	if (!key) throw new Error("video needs GOOGLE_API_KEY");
	const model = videoModel();
	const input: unknown[] = [
		{ type: "text", text: buildSalesVideoPrompt(args.kind, args.ctx) },
	];
	for (const ref of args.references.slice(0, 3)) {
		const split = splitDataUrl(ref);
		if (split)
			input.push({
				type: "image",
				mime_type: split.mimeType,
				data: split.data,
			});
	}
	const res = await fetch(interactionsUrl(), {
		method: "POST",
		headers: omniHeaders(key),
		body: JSON.stringify({
			model,
			input,
			response_format: { type: "video", delivery: "uri" },
			background: true,
		}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`video start ${res.status} ${text.slice(0, 200)}`);
	}
	const data = (await res.json()) as Interaction;
	const id =
		typeof data.id === "string"
			? data.id
			: typeof data.name === "string"
				? data.name
				: null;
	if (!id) throw new Error("video start: no interaction id");
	const video = findVideoContent(data);
	return {
		operationId: id,
		model,
		readyUrl: video ? await videoContentToDataUrl(video, key) : null,
	};
}

export type VideoStatus =
	| { status: "pending" }
	| { status: "ready"; videoDataUrl: string }
	| { status: "error"; error: string };

/** Extend a finished part into the next 10s continuation (stateful edit). */
export async function extendSalesVideo(args: {
	previousInteractionId: string;
	prompt: string;
}): Promise<VideoStart> {
	const key = omniKey();
	if (!key) throw new Error("video needs GOOGLE_API_KEY");
	const model = videoModel();
	const res = await fetch(interactionsUrl(), {
		method: "POST",
		headers: omniHeaders(key),
		body: JSON.stringify({
			model,
			input: [{ type: "text", text: args.prompt }],
			previous_interaction_id: args.previousInteractionId,
			response_format: { type: "video", delivery: "uri" },
			background: true,
		}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`video extend ${res.status} ${text.slice(0, 200)}`);
	}
	const data = (await res.json()) as Interaction;
	const id =
		typeof data.id === "string"
			? data.id
			: typeof data.name === "string"
				? data.name
				: null;
	if (!id) throw new Error("video extend: no interaction id");
	const video = findVideoContent(data);
	return {
		operationId: id,
		model,
		readyUrl: video ? await videoContentToDataUrl(video, key) : null,
	};
}
/** One poll of an interaction — follows Google-hosted URIs until ACTIVE. */
export async function pollSalesVideo(
	operationId: string,
): Promise<VideoStatus> {
	const key = omniKey();
	if (!key) return { status: "error", error: "video needs GOOGLE_API_KEY" };
	const base = interactionsUrl().replace(/\/$/, "");
	const id = encodeURIComponent(operationId).replace(/%2F/g, "/");
	const res = await fetch(`${base}/${id}`, { headers: omniHeaders(key) });
	if (!res.ok) {
		if (res.status === 404)
			return { status: "error", error: "video job not found" };
		return { status: "pending" };
	}
	const data = (await res.json()) as Interaction;
	const video = findVideoContent(data);
	if (video) {
		const url = await videoContentToDataUrl(video, key);
		if (url) return { status: "ready", videoDataUrl: url };
	}
	if (
		data.status === "failed" ||
		data.done === true ||
		typeof data.error === "string"
	) {
		const err =
			typeof data.error === "string" ? data.error : "video generation failed";
		return { status: "error", error: err };
	}
	return { status: "pending" };
}

const MAX_VIDEO_BYTES = 24_000_000;

async function downloadVideoUri(
	uri: string,
	key: string,
): Promise<string | null> {
	try {
		const res = await fetch(uri, { headers: omniHeaders(key) });
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength > MAX_VIDEO_BYTES || buf.byteLength === 0) return null;
		return `data:video/mp4;base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}
