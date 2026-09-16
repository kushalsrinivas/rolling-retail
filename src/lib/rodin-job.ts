/**
 * Turning one chosen concept into a real 3D model.
 *
 * The expensive half of the pipeline, so it is deliberately opt-in: the
 * parametric Three.js trailer is free and instant and covers layout, power and
 * clearances. This runs only when a buyer points at one render and asks for a
 * mesh — which is the whole reason the flow is 2D first, 3D second.
 *
 * The existing studio polls with a recursive setTimeout that has no attempt
 * cap, no overall timeout and no way to stop when the component goes away, so
 * a stuck job polls until the tab closes. This one is bounded and abortable.
 */

export type RodinPhase =
	| "idle"
	| "submitting"
	| "generating"
	| "done"
	| "error";

export interface RodinProgress {
	phase: RodinPhase;
	/** 0–1 where known, otherwise null for an indeterminate bar. */
	fraction: number | null;
	message: string;
}

/** Rodin jobs run for minutes, not seconds; past this something is wrong. */
const MAX_WAIT_MS = 6 * 60_000;
const POLL_MS = 3_000;

export class RodinError extends Error {}

/** Rodin's codes are not for buyers to read. */
export function explainRodinError(code: string, message?: string): string {
	switch (code) {
		case "API_INSUFFICIENT_FUNDS":
			return "The 3D generation account is out of credits. Top it up at hyper3d.com and try again.";
		case "API_NO_ACTIVE_SUBSCRIPTION":
			return "The 3D generation account has no active plan. Subscribe at hyper3d.com and try again.";
		case "API_UNAUTHORIZED":
		case "API_INVALID_KEY":
			return "The 3D generation key was rejected. Check RODIN_API_KEY.";
		case "API_RATE_LIMITED":
			return "Too many models at once. Give it a minute and try again.";
		default:
			// Rodin usually sends a readable message next to the code; it beats
			// showing a buyer an identifier we have never seen before.
			return message
				? `3D generation is unavailable: ${message}`
				: `The modeller refused the job (${code}).`;
	}
}

function dataUrlToBlob(dataUrl: string): Blob {
	const match = dataUrl.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
	if (!match) throw new RodinError("That concept is not a readable image.");
	const [, mime, payload] = match;
	const binary = atob(payload);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}

export interface GenerateArgs {
	/** The concept render to reconstruct, as a data URL. */
	imageDataUrl: string;
	/** What the model is, in words — Rodin uses this alongside the image. */
	prompt: string;
	signal?: AbortSignal;
	onProgress?: (p: RodinProgress) => void;
	/** Poll interval override. Exists so tests do not wait in real seconds. */
	pollMs?: number;
}

/**
 * Submit, poll to completion, and return a URL the viewer can load.
 *
 * Defaults are the conservative ones. The studio ships Gen-2 at a 500k-face
 * quality override, which is the most expensive combination Rodin offers and
 * is far more mesh than a trailer shell needs.
 */
export async function generateModelFromConcept({
	imageDataUrl,
	prompt,
	signal,
	onProgress,
	pollMs = POLL_MS,
}: GenerateArgs): Promise<{ viewerUrl: string; downloadUrl: string }> {
	const report = (
		phase: RodinPhase,
		message: string,
		fraction: number | null = null,
	) => onProgress?.({ phase, message, fraction });

	report("submitting", "Sending your concept to the modeller…");

	const form = new FormData();
	form.append("images", dataUrlToBlob(imageDataUrl), "concept.png");
	form.append("prompt", prompt);
	form.append("condition_mode", "concat");
	form.append("geometry_file_format", "glb");
	form.append("material", "PBR");
	form.append("quality", "medium");
	form.append("tier", "Regular");
	form.append("mesh_mode", "Raw");
	form.append("use_hyper", "false");
	form.append("TAPose", "false");

	const submitRes = await fetch("/api/rodin/submit", {
		method: "POST",
		body: form,
		signal,
	});
	if (!submitRes.ok) {
		const body = await submitRes.json().catch(() => null);
		throw new RodinError(
			body?.error === "RODIN_API_KEY not configured"
				? "3D generation is not configured on this deployment."
				: `The modeller refused the job (${submitRes.status}).`,
		);
	}

	const submitted = (await submitRes.json()) as {
		uuid?: string;
		error?: string;
		message?: string;
		jobs?: { subscription_key?: string };
	};

	// Rodin reports refusals in the body with HTTP 200, so a green status code
	// means nothing on its own — without this the run fails several steps later
	// with a message that does not say what went wrong.
	if (submitted.error && submitted.error !== "OK") {
		throw new RodinError(explainRodinError(submitted.error, submitted.message));
	}

	const subscriptionKey = submitted.jobs?.subscription_key;
	const taskUuid = submitted.uuid;
	if (!subscriptionKey || !taskUuid) {
		throw new RodinError("The modeller did not return a job to follow.");
	}

	const startedAt = Date.now();
	report("generating", "Building the mesh…");

	while (true) {
		if (signal?.aborted) throw new RodinError("Cancelled.");
		if (Date.now() - startedAt > MAX_WAIT_MS) {
			throw new RodinError(
				"The model is taking longer than expected. It may still finish — try again in a few minutes.",
			);
		}

		await new Promise((resolve) => setTimeout(resolve, pollMs));
		if (signal?.aborted) throw new RodinError("Cancelled.");

		const statusRes = await fetch("/api/rodin/status", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ subscription_key: subscriptionKey }),
			signal,
		});
		if (!statusRes.ok) continue; // A blip mid-job is not a failed job.

		const status = (await statusRes.json()) as {
			jobs?: Array<{ status?: string }>;
		};
		const jobs = status.jobs ?? [];
		if (jobs.length === 0) continue;

		if (jobs.some((j) => j.status === "Failed")) {
			throw new RodinError("The modeller could not build this concept.");
		}

		const done = jobs.filter((j) => j.status === "Done").length;
		report(
			"generating",
			"Building the mesh…",
			jobs.length > 0 ? done / jobs.length : null,
		);

		if (done === jobs.length) break;
	}

	report("generating", "Fetching the model…", 1);

	const downloadRes = await fetch("/api/rodin/download", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ task_uuid: taskUuid }),
		signal,
	});
	if (!downloadRes.ok)
		throw new RodinError("Could not fetch the finished model.");

	const download = (await downloadRes.json()) as {
		error?: string;
		list?: Array<{ name: string; url: string }>;
	};
	if (download.error && download.error !== "OK") {
		throw new RodinError(
			`Could not fetch the finished model: ${download.error}`,
		);
	}

	const glb = download.list?.find((f) => f.name.toLowerCase().endsWith(".glb"));
	if (!glb) throw new RodinError("The modeller returned no .glb to show.");

	report("done", "Model ready.", 1);
	return {
		// Rodin's signed URL is cross-origin; the proxy is what makes it loadable.
		viewerUrl: `/api/rodin/proxy-download?url=${encodeURIComponent(glb.url)}`,
		downloadUrl: glb.url,
	};
}
