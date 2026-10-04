/**
 * ASD-STE100 (Simplified Technical English) prompt format.
 *
 * Every image and video prompt in this pipeline is written as a short
 * technical specification instead of a paragraph of adjectives. The model
 * reads a numbered document: a task, a closed list of terms, a data table,
 * then one instruction per sentence and the warnings last.
 *
 * Why STE: run-on prose prompts let the model weight a mood word over a
 * geometry fact. STE removes that lottery —
 *  - one topic per section, one instruction per sentence;
 *  - imperative, active voice ("Put the camera…", not "the camera should be…");
 *  - descriptive sentences ≤ 25 words, procedural sentences ≤ 20 words;
 *  - one term for one thing, defined once in TERMS and never swapped for a
 *    synonym (the trailer is never also "the truck", "the van", "the unit");
 *  - data as `Key: value` rows, which the standard treats as tables;
 *  - WARNING lines that start with a command and give the reason.
 *
 * `steLint` enforces the sentence-length rule so a later edit cannot quietly
 * drift back into prose. Data rows are exempt — they are tables, not text.
 *
 * Pure and client-safe.
 */

export interface SteSection {
	title: string;
	/**
	 * Lines in order. A `Key: value` line is a data row. Any other line is
	 * text and must obey the sentence rules.
	 */
	lines: readonly (string | null | undefined | false)[];
}

export interface SteDocument {
	/** e.g. "RENDER SPECIFICATION". */
	kind: string;
	/** e.g. "EXTERIOR HERO". */
	title: string;
	sections: readonly SteSection[];
}

/** The header the model sees first. Kept STE itself. */
export const STE_HEADER =
	"Writing standard: ASD-STE100 Simplified Technical English. Each line is one instruction or one fact. Obey all lines. The warnings have priority.";

/**
 * Render a document. Sections are numbered `1`, lines `1.1`, so the model
 * (and a human reading the log) can cite "rule 4.3" unambiguously.
 */
export function steDocument(doc: SteDocument): string {
	const out: string[] = [`${doc.kind}: ${doc.title}`, STE_HEADER];
	let n = 0;
	for (const section of doc.sections) {
		const lines = section.lines.filter(
			(l): l is string => typeof l === "string" && l.trim().length > 0,
		);
		if (lines.length === 0) continue;
		n += 1;
		out.push("", `${n}. ${section.title.toUpperCase()}`);
		lines.forEach((line, i) => {
			out.push(`${n}.${i + 1} ${line.trim()}`);
		});
	}
	return out.join("\n");
}

/** A WARNING line: a command, then the reason. */
export function warning(command: string, reason?: string): string {
	return reason ? `WARNING: ${command} ${reason}` : `WARNING: ${command}`;
}

/** A `Key: value` data row. Falsy values drop the row. */
export function row(key: string, value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	return `${key}: ${value}`;
}

/** Terms used by every prompt. One word, one meaning. */
export const STE_TERMS = {
	trailer:
		"Trailer: the one food trailer in this specification. No other vehicle exists.",
	curbside:
		"Curbside: the long side with the service hatch and the entry door.",
	roadside:
		"Roadside: the long side opposite the curbside. It has no openings.",
	front: "Front: the end with the A-frame tongue and the coupler.",
	hatch:
		"Service hatch: the one serving opening. Its door hinges at the top and props open upward.",
	wrap: "Wrap: the printed and cut vinyl film on the trailer skin.",
	line: "Line: the row of equipment inside, along the curbside wall.",
} as const;

export type SteTerm = keyof typeof STE_TERMS;

export function termsSection(terms: readonly SteTerm[]): SteSection {
	return { title: "Terms", lines: terms.map((t) => STE_TERMS[t]) };
}

/** Descriptive sentences — STE100 rule 4.1 (25 words). */
export const STE_MAX_DESCRIPTIVE = 25;
/** Procedural sentences — STE100 rule 5.1 (20 words). */
export const STE_MAX_PROCEDURAL = 20;

const DATA_ROW = /^[A-Z][A-Za-z0-9 ,/&()'-]{1,60}: /;
const LINE_NUMBER = /^\d+(\.\d+)?\.?\s+/;

/**
 * Heuristic procedural test: STE procedures start with an imperative verb.
 * The list covers every verb these prompts use to open an instruction.
 */
const IMPERATIVES =
	/^(WARNING: )?(make|put|show|keep|use|do|frame|point|move|hold|set|add|copy|let|start|end|stop|count|check|match|light|place|aim|stay|give|turn|pass|push|pull|settle|open|close|apply|fill|leave|write|draw|photograph|film|record|reproduce|follow|borrow|obey|align|center|continue|rest|begin|look|include|cut|dolly|tilt|drift|orbit|decelerate)\b/i;

export interface SteIssue {
	line: string;
	sentence: string;
	words: number;
	limit: number;
}

function sentencesOf(text: string): string[] {
	// Split on sentence ends. Decimals ("1.05m") and times ("3.0 s") keep
	// their dot because the next character is a digit, not a space.
	return text
		.split(/(?<=[.!?])\s+(?=[A-Z"(])/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function wordCount(sentence: string): number {
	return sentence
		.replace(/^WARNING:\s*/, "")
		.split(/\s+/)
		.filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/**
 * Check every text line against the STE sentence-length rules.
 * Returns the offending sentences; an empty array is a pass.
 */
export function steLint(prompt: string): SteIssue[] {
	const issues: SteIssue[] = [];
	for (const raw of prompt.split("\n")) {
		const line = raw.replace(LINE_NUMBER, "").trim();
		if (!line) continue;
		// Headings and data rows are tables, not sentences.
		if (/^[A-Z0-9 &:—/-]+$/.test(line)) continue;
		if (DATA_ROW.test(line) && !line.startsWith("WARNING:")) continue;
		for (const sentence of sentencesOf(line)) {
			const limit = IMPERATIVES.test(sentence)
				? STE_MAX_PROCEDURAL
				: STE_MAX_DESCRIPTIVE;
			const words = wordCount(sentence);
			if (words > limit) issues.push({ line, sentence, words, limit });
		}
	}
	return issues;
}
