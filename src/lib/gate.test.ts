import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The gate itself is a TanStack request middleware, so these cover the pieces
 * that decide whether someone gets in — the parts where a mistake would
 * silently open a customer's private build to the web.
 */
import { __testing } from "./gate";

const { tokenFor, timingSafeEqual, readCookie } = __testing;

describe("gate token", () => {
	it("never stores the password itself in the cookie", async () => {
		const token = await tokenFor("ftf-demo-2026");
		expect(token).not.toContain("ftf-demo-2026");
		expect(token).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is stable for one password and different for another", async () => {
		expect(await tokenFor("a")).toBe(await tokenFor("a"));
		expect(await tokenFor("a")).not.toBe(await tokenFor("b"));
	});
});

describe("timingSafeEqual", () => {
	it("accepts only an exact match", () => {
		expect(timingSafeEqual("abc", "abc")).toBe(true);
		expect(timingSafeEqual("abc", "abd")).toBe(false);
		expect(timingSafeEqual("abc", "ab")).toBe(false);
		expect(timingSafeEqual("", "")).toBe(true);
	});
});

describe("readCookie", () => {
	const req = (cookie?: string) =>
		new Request("https://x.test/", cookie ? { headers: { cookie } } : {});

	it("reads the named cookie out of a crowded header", () => {
		expect(readCookie(req("a=1; rr_gate=tok; b=2"), "rr_gate")).toBe("tok");
	});

	it("does not confuse a cookie whose name merely ends the same", () => {
		expect(readCookie(req("not_rr_gate=wrong"), "rr_gate")).toBeNull();
	});

	it("returns null when absent or header missing", () => {
		expect(readCookie(req("a=1"), "rr_gate")).toBeNull();
		expect(readCookie(req(), "rr_gate")).toBeNull();
	});

	it("handles values containing an equals sign", () => {
		expect(readCookie(req("rr_gate=a=b"), "rr_gate")).toBe("a=b");
	});
});
