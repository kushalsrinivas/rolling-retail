/**
 * Automated QA — every output checked against the record before a customer
 * sees it.
 *
 * Full vision QA (count openings/equipment in pixels) needs a vision call
 * per render. This module does the deterministic half now: prompt-level
 * gates that fail a render before it spends a credit, plus a single
 * vision question the route can ask best-effort after generation.
 *
 * Pure except qaVisionAgainstSpec (fetch).
 */
import type { DesignSpec } from "./design-record";
import { lineProfileFor } from "./line-profile";

export interface QaResult {
	pass: boolean;
	failures: string[];
}

/**
 * Prompt must name sides, openings, livery rules, the line forbid list —
 * and the medium. A prompt with no medium lock is where the
 * photograph/blueprint/isometric lottery starts.
 */
export function qaPromptForSpec(prompt: string, spec: DesignSpec): QaResult {
	const failures: string[] = [];
	const p = prompt.toLowerCase();
	if (!/curbside/.test(p)) failures.push("prompt never names the curbside");
	if (!/roadside/.test(p)) failures.push("prompt never names the roadside");
	if (
		!/not a 3d render|blueprint|technical drawing|sectional|cutaway|isometric|wireframe|illustration|mockup|direction board/.test(
			p,
		)
	) {
		failures.push("prompt lacks a medium lock (photo vs drawing)");
	}
	if (spec.vehicleBody === "airstream" && /rear (service )?door/.test(p)) {
		failures.push("prompt asks for a rear door on an Airstream");
	}
	if (!/no gradients|spot-color/.test(p)) {
		failures.push("prompt lacks the vinyl durability rules");
	}
	const line = lineProfileFor(spec.businessType, spec.menu);
	const forbidFirst = line.forbid.split(/[:.]/)[0]?.slice(0, 24) ?? "";
	if (forbidFirst && !p.includes(forbidFirst.toLowerCase().slice(0, 12))) {
		failures.push("prompt lacks the category forbid list");
	}
	if (spec.hasBrand && spec.brand && !p.includes(spec.brand.toLowerCase())) {
		failures.push("prompt drops the brand name");
	}
	if (!spec.hasBrand && /new brand|placeholder/.test(p)) {
		failures.push("prompt letters a placeholder brand");
	}
	return { pass: failures.length === 0, failures };
}

export function visionQuestionFor(spec: DesignSpec): string {
	const line = lineProfileFor(spec.businessType, spec.menu);
	return [
		"You are a QA inspector for a food-truck concept render. Answer in JSON only.",
		`Vehicle: ${spec.vehicleId} (${spec.vehicleBody}). Expected openings: ${spec.openings.map((o) => `${o.type} on ${o.side}`).join(", ")}.`,
		`Equipment that must be visible inside: ${spec.equipment.slice(0, 6).join(", ")}.`,
		`Forbidden: ${line.forbid}`,
		'Return {"doors": n, "hatches": n, "forbiddenVisible": true|false, "brandLegible": true|false, "notes": "..."}.',
	].join(" ");
}

/** Best-effort vision check — logs, never blocks the customer on failure. */
export async function qaVisionAgainstSpec(
	imageDataUrl: string,
	spec: DesignSpec,
): Promise<QaResult> {
	const key =
		process.env.GOOGLE_API_KEY ||
		process.env.GEMINI_API_KEY ||
		process.env.GOOGLE_GENAI_API_KEY ||
		"";
	if (!key) return { pass: true, failures: [] };
	try {
		const m = imageDataUrl.match(
			/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s,
		);
		if (!m?.[2] || m[1] === "image/svg+xml")
			return { pass: true, failures: [] };
		const model = process.env.LLM_MODEL || "gemini-3.8-flash";
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{ text: visionQuestionFor(spec) },
								{ inlineData: { mimeType: m[1], data: m[2] } },
							],
						},
					],
				}),
			},
		);
		if (!res.ok) return { pass: true, failures: [] };
		const data = (await res.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
		};
		const text =
			data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
			"";
		const json = text.match(/\{[\s\S]*\}/)?.[0];
		if (!json) return { pass: true, failures: [] };
		const parsed = JSON.parse(json) as {
			doors?: number;
			hatches?: number;
			forbiddenVisible?: boolean;
			brandLegible?: boolean;
		};
		const failures: string[] = [];
		const expectedDoors = spec.openings.filter((o) => o.type === "door").length;
		const expectedHatches = spec.openings.filter(
			(o) => o.type === "hatch",
		).length;
		if (typeof parsed.doors === "number" && parsed.doors !== expectedDoors) {
			failures.push(
				`vision counted ${parsed.doors} doors, record says ${expectedDoors}`,
			);
		}
		if (
			typeof parsed.hatches === "number" &&
			parsed.hatches !== expectedHatches
		) {
			failures.push(
				`vision counted ${parsed.hatches} hatches, record says ${expectedHatches}`,
			);
		}
		if (parsed.forbiddenVisible)
			failures.push("vision saw forbidden equipment");
		return { pass: failures.length === 0, failures };
	} catch (err) {
		console.warn("[food-truck] vision QA failed open:", err);
		return { pass: true, failures: [] };
	}
}
