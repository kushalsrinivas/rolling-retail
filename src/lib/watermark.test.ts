import { describe, expect, it, vi } from "vitest";
import { watermarkImage } from "./watermark";

const TINY_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * jsdom has no canvas, so these exercise the path that matters most: a buyer
 * must still get their download when watermarking cannot run. Losing the file
 * would be worse than losing the mark.
 */
describe("watermarkImage fallback", () => {
	it("returns the original render rather than throwing", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			watermarkImage(TINY_PNG, { text: "Food Truck Factory" }),
		).resolves.toBe(TINY_PNG);
		warn.mockRestore();
	});

	it("survives a url that is not an image", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			watermarkImage("not-a-data-url", { text: "x" }),
		).resolves.toBe("not-a-data-url");
		warn.mockRestore();
	});
});
