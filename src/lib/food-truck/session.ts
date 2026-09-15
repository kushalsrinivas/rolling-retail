import type { ProjectBrain } from "./brain";
import { FREE_VISUAL_CREDITS } from "./constants";

export interface ChatTurn {
	role: "user" | "assistant";
	content: string;
}

export interface TruckSession {
	sessionId: string;
	createdAt: number;
	lastSeen: number;
	history: ChatTurn[];
	creditsUsed: number;
	creditsIncluded: number;
	lead: Record<string, unknown> | null;
	spec: Record<string, unknown> | null;
	/** Evolving project understanding (brain-dump → structured). */
	brain: ProjectBrain | null;
	/** Visual rounds consumed (manual + auto). Gates auto-generation. */
	visualRounds: number;
	/**
	 * The most recent photo the buyer uploaded, kept so every later round keeps
	 * the same styling direction instead of only the turn it arrived on.
	 */
	inspirationImage: string | null;
}

const sessions = new Map<string, TruckSession>();

export function getOrCreateSession(sessionId?: string): TruckSession {
	const id =
		sessionId?.trim() ||
		`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
	let s = sessions.get(id);
	if (!s) {
		s = {
			sessionId: id,
			createdAt: Date.now(),
			lastSeen: Date.now(),
			history: [],
			creditsUsed: 0,
			creditsIncluded: FREE_VISUAL_CREDITS,
			lead: null,
			spec: null,
			brain: null,
			visualRounds: 0,
			inspirationImage: null,
		};
		sessions.set(id, s);
	}
	s.lastSeen = Date.now();
	return s;
}

export function creditsLeft(s: TruckSession) {
	return Math.max(0, s.creditsIncluded - s.creditsUsed);
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

/** Factory pipeline: every session that produced a lead or spec handoff. */
export function listLeads(): PipelineLead[] {
	const out: PipelineLead[] = [];
	for (const s of sessions.values()) {
		if (!s.lead && !s.spec) continue;
		const lead = (s.lead ?? {}) as Record<string, unknown>;
		const spec = (s.spec ?? {}) as Record<string, unknown>;
		out.push({
			sessionId: s.sessionId,
			createdAt: s.createdAt,
			lastSeen: s.lastSeen,
			lead: s.lead,
			brandName:
				(lead.brandName as string) ?? (spec.brandName as string) ?? null,
			vehicle: (spec.vehicle as string) ?? null,
			stage: (lead.stage as string) ?? "designing",
		});
	}
	return out.sort((a, b) => b.lastSeen - a.lastSeen);
}

// Best-effort cap so a hung dev server doesn't grow forever.
setInterval(
	() => {
		if (sessions.size < 500) return;
		const cutoff = Date.now() - 1000 * 60 * 60 * 6;
		for (const [k, v] of sessions) {
			if (v.lastSeen < cutoff) sessions.delete(k);
		}
	},
	1000 * 60 * 10,
).unref?.();
