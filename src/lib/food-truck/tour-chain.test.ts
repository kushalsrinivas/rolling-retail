import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOUR_PARTS } from "./sales";

const src = (p: string) =>
	readFileSync(path.join(__dirname, "..", "..", p), "utf8");

/**
 * Regression locks for the "tour stuck at part 1 of 1 + 4/9 images + 60s
 * timeout" incident. These are cross-cutting client/server concerns with no
 * single unit seam, so the tests assert on the source contracts directly —
 * each fails if the original bug is reintroduced.
 */
describe("tour chaining + image timeout regressions", () => {
	it("tours are 3 parts", () => {
		expect(TOUR_PARTS).toBe(3);
	});

	it("panel counts tour parts against TOUR_PARTS, not ready count", () => {
		const panel = src("components/chat/BrandReportPanel.tsx");
		expect(panel).toContain("TOUR_PARTS");
		expect(panel).not.toContain("of {ready.length}");
	});

	it("tour extend + poll survive a fresh serverless instance", () => {
		const route = src("routes/api/agent/video.ts");
		expect(route).toContain("previousOperationId");
		expect(route).toContain("operationId");
	});

	it("concept rounds run hero + one parallel wave (fits the 60s wall)", () => {
		const images = src("lib/food-truck/images.ts");
		expect(images).not.toContain("i += 3");
	});
});
