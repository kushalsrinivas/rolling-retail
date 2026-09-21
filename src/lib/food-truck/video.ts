/**
 * Sales-video generation via Gemini Omni Flash (Interactions API).
 *
 * Same API key as stills. Approved stills (auto-hero master + starred) go in
 * as reference images so the video films the approved product instead of
 * reinterpreting it.
 *
 * NOTE: the Interactions REST shape is new — OMNI_ENDPOINT overrides the
 * default if Google renames it. Provider errors surface honestly (502/503)
 * and never break the stills pipeline.
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

function splitDataUrl(u: string): { mimeType: string; data: string } | null {
	const m = u.match(/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s);
	return m?.[1] && m?.[2] ? { mimeType: m[1], data: m[2] } : null;
}

export interface VideoStart {
	operationId: string;
	model: string;
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
	const parts: unknown[] = [
		{ text: buildSalesVideoPrompt(args.kind, args.ctx) },
	];
	for (const ref of args.references.slice(0, 3)) {
		const split = splitDataUrl(ref);
		if (split) parts.push({ inlineData: split });
	}
	const res = await fetch(
		`${interactionsUrl()}?key=${encodeURIComponent(key)}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				input: [{ parts }],
				responseFormat: { delivery: "uri" },
			}),
		},
	);
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`video start ${res.status} ${text.slice(0, 200)}`);
	}
	const data = (await res.json()) as Record<string, unknown>;
	const id =
		typeof data.name === "string"
			? data.name
			: typeof data.id === "string"
				? data.id
				: typeof data.interactionId === "string"
					? data.interactionId
					: null;
	if (!id) throw new Error("video start: no interaction id");
	return { operationId: id, model };
}

export type VideoStatus =
	| { status: "pending" }
	| { status: "ready"; videoDataUrl: string }
	| { status: "error"; error: string };

/** One poll of an interaction — follows Google-hosted URIs until ACTIVE. */
export async function pollSalesVideo(
	operationId: string,
): Promise<VideoStatus> {
	const key = omniKey();
	if (!key) return { status: "error", error: "video needs GOOGLE_API_KEY" };
	const base = interactionsUrl().replace(/\/$/, "");
	const id = encodeURIComponent(operationId).replace(/%2F/g, "/");
	const res = await fetch(`${base}/${id}?key=${encodeURIComponent(key)}`);
	if (!res.ok) {
		if (res.status === 404)
			return { status: "error", error: "video job not found" };
		return { status: "pending" };
	}
	const data = (await res.json()) as Record<string, unknown>;
	const steps = Array.isArray(data.steps)
		? (data.steps as Array<Record<string, unknown>>)
		: [];
	for (const step of steps) {
		const video = (step.video ?? step.outputVideo) as
			| Record<string, unknown>
			| undefined;
		if (!video) continue;
		if (typeof video.uri === "string" && video.uri) {
			if (video.state === "ACTIVE" || video.state === undefined) {
				const dl = await downloadVideoUri(video.uri, key);
				if (dl) return { status: "ready", videoDataUrl: dl };
				if (video.state === undefined) return { status: "pending" };
			}
			return { status: "pending" };
		}
		const inline = video.inlineData as
			| { mimeType?: string; data?: string }
			| undefined;
		if (inline?.data) {
			return {
				status: "ready",
				videoDataUrl: `data:${inline.mimeType || "video/mp4"};base64,${inline.data}`,
			};
		}
	}
	if (data.done === true || data.state === "FAILED") {
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
		const sep = uri.includes("?") ? "&" : "?";
		const res = await fetch(`${uri}${sep}key=${encodeURIComponent(key)}`);
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength > MAX_VIDEO_BYTES || buf.byteLength === 0) return null;
		return `data:video/mp4;base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}
