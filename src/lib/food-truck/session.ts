import type { ProjectBrain } from "./brain";
import type { DesignBrief } from "./brief";
import { FREE_VISUAL_CREDITS, RENDER_VIEWS } from "./constants";
import type {
	DesignSpec,
	DesignState,
	DesignVersionRecord,
} from "./design-record";
import type { StarterConcept } from "./images";
import type { MenuDesign } from "./menu";

export interface VideoJob {
	id: string;
	kind: string;
	prompt: string;
	status: "pending" | "ready" | "error";
	/** Provider interaction/operation id for polling. */
	operationId: string | null;
	/** Data-URL (video/mp4) once ready. */
	url: string | null;
	error: string | null;
	createdAt: number;
	updatedAt: number;
	/** Tour chaining: 1-based part within a series (default 1). */
	part: number;
	/** Links chained parts; single clips point at themselves. */
	seriesId: string;
}

export interface ChatTurn {
	role: "user" | "assistant";
	content: string;
}

export interface DesignApproval {
	id: string;
	version: number;
	/** Who approved — buyer name/contact when known. */
	by: string | null;
	state: DesignState;
	createdAt: number;
}

/**
 * One quiz step's answers, logged as the buyer advances — not just at the
 * end. The CMS reads these, so a drop-off after step 2 is still a record
 * of what the buyer liked.
 */
export interface QuizStepEntry {
	step: string;
	at: number;
	data: Record<string, unknown>;
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
	/**
	 * Anchor: the current approved version's hero, falling back to the first
	 * real render. Replaced on approval — never locked to a rejected draft.
	 */
	masterImageUrl: string | null;
	/** Sales-video jobs (Omni Flash interactions), newest first, capped at 10. */
	videos: VideoJob[];
	/**
	 * The current round's renders, keyed by view.
	 *
	 * Renders used to live only in the SSE frames that carried them: if a
	 * frame was dropped, truncated or arrived after the reader closed, that
	 * render was gone with no way to ask for it again. This is the canonical
	 * copy — the panel reconciles against it, and video generation reads its
	 * references from here rather than trusting whatever the client still has.
	 */
	images: Record<string, StarterConcept>;
	/** The buyer's menu, as last sent from the Menu tab. */
	menu: MenuDesign | null;
	/**
	 * Versioned design record — the source of truth renders, video and the
	 * PDF all read. v1 on first commit, immutable thereafter; revisions
	 * append children. Empty until intake or the first visuals commit one.
	 */
	designVersions: DesignVersionRecord[];
	/**
	 * Server-side approvals. "Favorite" is browser state; approval freezes a
	 * version here with who/when, and a regenerate can never overwrite it.
	 */
	approvals: DesignApproval[];
	/** Style-quiz answers per step — the CMS record of every buyer run. */
	quizSteps: QuizStepEntry[];
	/**
	 * Operating brief from the quiz — where and when the truck trades, the
	 * wrap finish and the exterior features. Renders and video read it.
	 */
	brief: DesignBrief | null;
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
			masterImageUrl: null,
			videos: [],
			images: {},
			menu: null,
			designVersions: [],
			approvals: [],
			quizSteps: [],
			brief: null,
		};
		sessions.set(id, s);
		// Best-effort restore from disk — a restart must not lose the design.
		// Sync path can't await; routes call restoreSession() after this.
		void restoreSession(id).catch(() => {});
		// Old snapshots predate designVersions/approvals/quizSteps.
		if (!Array.isArray((s as { designVersions?: unknown }).designVersions)) {
			s.designVersions = [];
		}
		if (!Array.isArray((s as { approvals?: unknown }).approvals)) {
			s.approvals = [];
		}
		if (!Array.isArray((s as { quizSteps?: unknown }).quizSteps)) {
			s.quizSteps = [];
		}
	}
	s.lastSeen = Date.now();
	return s;
}

/** Persist to disk (fire-and-forget from routes — never blocks generation). */
export function persistSession(s: TruckSession): void {
	// Dynamic import avoids pulling node:fs into client bundles.
	void import("./store")
		.then(({ saveSessionSnapshot }) =>
			saveSessionSnapshot(s.sessionId, {
				...s,
				// Cap snapshot size: keep latest 20 history turns; images stay
				// (they are the design). Videos keep metadata with their served
				// file URL (clips live as /api/assets files) — only data URLs are
				// dropped, or every snapshot re-embeds the 24MB payload.
				history: s.history.slice(-20),
				videos: s.videos.map((v) => ({
					...v,
					url: v.url && !v.url.startsWith("data:") ? v.url : null,
				})),
			}),
		)
		.catch(() => {});
}

/**
 * Sessions whose disk snapshot has been adopted this process. A route that
 * calls getOrCreateSession (which creates a blank stub) and then
 * restoreSession must not silently end up with that stub: the stub is
 * virgin, so the snapshot replaces it. Once adopted, memory wins — a second
 * restore must never clobber state the request has already mutated.
 */
const restored = new WeakSet<TruckSession>();

/** In-flight loads, keyed by session id, so two concurrent restore calls
 * share one snapshot object instead of racing two copies into the map. */
const pendingRestores = new Map<string, Promise<TruckSession | null>>();

function normalizeSnapshot(snap: TruckSession): TruckSession {
	// Old snapshots predate these arrays.
	snap.designVersions = Array.isArray(snap.designVersions)
		? snap.designVersions
		: [];
	snap.approvals = Array.isArray(snap.approvals) ? snap.approvals : [];
	snap.quizSteps = Array.isArray(snap.quizSteps) ? snap.quizSteps : [];
	snap.images = snap.images ?? {};
	snap.brief = snap.brief ?? null;
	snap.videos = snap.videos ?? [];
	restored.add(snap);
	return snap;
}

export async function restoreSession(
	sessionId: string,
): Promise<TruckSession | null> {
	const inMemory = sessions.get(sessionId);
	if (inMemory && restored.has(inMemory)) return inMemory;

	let load = pendingRestores.get(sessionId);
	if (!load) {
		load = (async () => {
			try {
				const { loadSessionSnapshot } = await import("./store");
				const snap = await loadSessionSnapshot<TruckSession>(sessionId);
				if (snap) {
					sessions.set(sessionId, normalizeSnapshot(snap));
					return snap;
				}
			} catch {
				/* no snapshot — memory stands */
			}
			return null;
		})().finally(() => pendingRestores.delete(sessionId));
		pendingRestores.set(sessionId, load);
	}
	const snap = await load;
	if (snap) return snap;
	// Nothing on disk (or unreadable): anything already in memory stays.
	if (inMemory) restored.add(inMemory);
	return inMemory ?? null;
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

/**
 * Record a batch of renders against the session.
 *
 * A later round overwrites a view outright — that is the point of paying a
 * credit — but a FAILED render never displaces a good one, so a flaky retry
 * cannot blank a view the buyer already has.
 */
export function putConcepts(s: TruckSession, images: StarterConcept[]) {
	for (const img of images) {
		const held = s.images[img.label];
		if (img.status === "failed" && held?.status === "ready") continue;
		s.images[img.label] = img;
	}
}

/** The round as the panel should see it, in canonical view order. */
export function listConcepts(s: TruckSession): StarterConcept[] {
	return RENDER_VIEWS.map((v) => s.images[v]).filter((c): c is StarterConcept =>
		Boolean(c),
	);
}

/** Ready renders by view — the reference pool for videos and retries. */
export function conceptsByView(s: TruckSession): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [view, c] of Object.entries(s.images)) {
		if (
			c.status === "ready" &&
			typeof c.url === "string" &&
			(c.url.startsWith("data:image/") ||
				c.url.startsWith("/api/assets/") ||
				c.url.startsWith("http"))
		) {
			out[view] = c.url;
		}
	}
	return out;
}

/** First real exterior_hero wins — until an approved version replaces it.
 * The anchor is the current approved version, never a rejected first draft.
 * Placeholders (no-key fallbacks) never count. */
export function adoptMasterFromImages(
	s: TruckSession,
	images: Array<{ label: string; url: string; model: string }>,
) {
	if (s.masterImageUrl) return;
	const hero = images.find(
		(i) =>
			i.label === "exterior_hero" &&
			!i.model.startsWith("placeholder") &&
			i.url.startsWith("data:image/") &&
			!i.url.startsWith("data:image/svg"),
	);
	if (hero) s.masterImageUrl = hero.url;
}

/**
 * Point the anchor at the version the customer actually approved.
 * A rejected first hero must never hold later rounds hostage.
 */
export function replaceMasterImage(s: TruckSession, url: string | null) {
	if (
		typeof url === "string" &&
		url.startsWith("data:image/") &&
		!url.startsWith("data:image/svg")
	) {
		s.masterImageUrl = url;
	}
}

/** Current design version — the source of truth renders read. */
export function currentDesign(s: TruckSession): DesignVersionRecord | null {
	if (s.designVersions.length === 0) return null;
	return s.designVersions[s.designVersions.length - 1];
}

/** Append an immutable version. Never mutates — revisions are children. */
export function commitDesignVersion(
	s: TruckSession,
	spec: DesignSpec,
	opts?: { changeSummary?: string | null; state?: DesignState },
): DesignVersionRecord {
	const parent = currentDesign(s);
	const rec: DesignVersionRecord = {
		version: (parent?.version ?? 0) + 1,
		parentVersion: parent?.version ?? null,
		changeSummary: opts?.changeSummary ?? null,
		spec,
		state: opts?.state ?? "concept",
		createdAt: Date.now(),
	};
	s.designVersions.push(rec);
	persistSession(s);
	return rec;
}

/**
 * Separate "favorite" from "approve". Approval freezes a version
 * server-side with who/when, moves the anchor to it, and can never be
 * overwritten by a regenerate.
 */
export function approveDesignVersion(
	s: TruckSession,
	version: number,
	by?: string | null,
): DesignApproval | null {
	const rec = s.designVersions.find((d) => d.version === version);
	if (!rec) return null;
	rec.state = "approved";
	const approval: DesignApproval = {
		id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
		version,
		by: by?.trim() || null,
		state: "approved",
		createdAt: Date.now(),
	};
	// Keep one approval per version — re-approving updates who/when.
	s.approvals = [...s.approvals.filter((a) => a.version !== version), approval];
	// The anchor follows approval, not the first render.
	const hero = s.images["exterior_hero"];
	if (hero?.status === "ready") replaceMasterImage(s, hero.url);
	persistSession(s);
	return approval;
}

export function approvalsFor(s: TruckSession): DesignApproval[] {
	return [...s.approvals].sort((a, b) => b.createdAt - a.createdAt);
}

/** Append one quiz step's answers. Capped — the CMS needs signal, not spam. */
export function logQuizStep(
	s: TruckSession,
	step: string,
	data: Record<string, unknown>,
): void {
	const steps = Array.isArray(s.quizSteps) ? s.quizSteps : [];
	s.quizSteps = [...steps, { step, at: Date.now(), data }].slice(-50);
	persistSession(s);
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
