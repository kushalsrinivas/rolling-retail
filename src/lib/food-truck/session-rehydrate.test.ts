import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = (p: string) =>
	readFileSync(path.join(__dirname, "..", "..", p), "utf8");

/**
 * Regression locks for the "I have to start again" UX audit. Each case
 * below is work a customer lost through a basic reload/pane/tab interaction;
 * these are cross-cutting client/server contracts with no single unit seam,
 * so the tests assert on the source directly — each fails if the loss path
 * is reintroduced.
 */
describe("session rehydration", () => {
	it("the hook rehydrates from a persisted session id", () => {
		const hook = src("hooks/use-chat.ts");
		expect(hook).toContain('localStorage.getItem(SESSION_KEY)');
		expect(hook).toContain("/api/agent/state?");
		expect(hook).toContain("hydrated");
	});

	it("the state route restores BEFORE get-or-create", () => {
		const route = src("routes/api/agent/state.ts");
		const restorePos = route.indexOf("await restoreSession(sessionId)");
		const createPos = route.indexOf("getOrCreateSession(sessionId)");
		expect(restorePos).toBeGreaterThan(-1);
		expect(createPos).toBeGreaterThan(restorePos);
	});

	it("restoreSession adopts a virgin stub instead of keeping it", () => {
		const session = src("lib/food-truck/session.ts");
		// The early same-key return used to hand back the blank session the
		// route just created, which the route then saved over the snapshot.
		expect(session).not.toMatch(
			/if \(sessions\.has\(sessionId\)\) return sessions\.get\(sessionId\)[^;]*;/,
		);
		expect(session).toContain("restored.has(inMemory)");
	});

	it("ready clips keep their served file URL across snapshots", () => {
		const session = src("lib/food-truck/session.ts");
		expect(session).toMatch(/startsWith\("\/api\/assets\/"\)/);
		expect(session.match(/url: v\.url && !v\.url\.startsWith\("data:"\)/))
			.toBeTruthy();
	});

	it("the intake gate waits for rehydration", () => {
		const layout = src("components/chat/ChatLayout.tsx");
		expect(layout).toMatch(/chat\.hydrated && !intakeDone/);
	});

	it("mobile panes stay mounted (CSS hidden, not unmounted)", () => {
		const layout = src("components/chat/ChatLayout.tsx");
		expect(layout).toMatch(/pane === "design" \? null : "hidden"/);
		expect(layout).not.toMatch(/\{pane === "design" \? <ChatPanel/);
	});

	it("render progress is visible from non-visuals tabs", () => {
		const panel = src("components/chat/BrandReportPanel.tsx");
		expect(panel).toMatch(
			/\(isGenerating \|\| isGeneratingVideo\) && tab !== "visuals"/,
		);
	});

	it("the 3-starter button generates 3 charged views, not 8", () => {
		const panel = src("components/chat/BrandReportPanel.tsx");
		expect(panel).toContain("STARTER_AUTO_VIEWS");
		const hook = src("hooks/use-chat.ts");
		expect(hook).toContain("charge: opts?.charge");
		const chat = src("routes/api/agent/chat.ts");
		// The auto first round is a fresh round with a view list: charged.
		expect(chat).toContain("charge: true,");
	});
});
