import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SALES_VIDEO_PRESETS } from "./sales";

const src = (p: string) =>
	readFileSync(path.join(__dirname, "..", "..", p), "utf8");

/**
 * Regression locks for the "tour of three disconnected parts" rebuild:
 * one clip = one 10s generation, the walkthrough filmed from inside off the
 * interior render, the 360 a full circle. These are cross-cutting
 * client/server concerns with no single unit seam, so the tests assert on
 * the source contracts directly — each fails if a retired path returns.
 */
describe("single-clip video pipeline", () => {
	it("three presets, no tour", () => {
		expect(SALES_VIDEO_PRESETS.length).toBe(3);
		for (const p of SALES_VIDEO_PRESETS) expect(p.kind).not.toBe("tour");
	});

	it("the tour plumbing is gone from sales, route and hook", () => {
		expect(src("lib/food-truck/sales.ts")).not.toMatch(
			/tourShotPrompt|tourContinuationPrompt|TOUR_PARTS/,
		);
		const route = src("routes/api/agent/video.ts");
		expect(route).not.toMatch(/extendJobId|previousOperationId|tourShot/);
		expect(route).not.toMatch(/extendSalesVideo/);
		expect(src("hooks/use-chat.ts")).not.toMatch(/TOUR_PARTS|partsTotal/);
	});

	it("the walkthrough leads with the interior render", () => {
		const continuity = src("lib/food-truck/continuity.ts");
		const m = continuity.match(
			/walkthrough"\s*\)\s*return\s*\[([^\]]+)\]/,
		)?.[1];
		expect(m).toBeTruthy();
		expect(m).toContain("interior_layout");
	});

	it("the panel no longer groups tour parts", () => {
		const panel = src("components/chat/DesignCanvas.tsx");
		expect(panel).not.toContain("TourSeries");
		expect(panel).not.toMatch(/tour\.mp4/);
	});
});
