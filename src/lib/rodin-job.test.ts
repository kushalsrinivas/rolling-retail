import { afterEach, describe, expect, it, vi } from "vitest";
import { generateModelFromConcept, RodinError } from "./rodin-job";

const PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const args = { imageDataUrl: PNG, prompt: "a food trailer", pollMs: 5 };

/** Routes each endpoint to a canned response. */
function mockApi(handlers: Record<string, () => unknown>, okFor = () => true) {
	return vi.fn(async (url: string) => {
		const key = Object.keys(handlers).find((k) => String(url).includes(k));
		if (!key) throw new Error(`unexpected fetch: ${url}`);
		return { ok: okFor(), json: async () => handlers[key]() };
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("generateModelFromConcept", () => {
	it("submits, polls until done, and returns a proxied viewer url", async () => {
		let polls = 0;
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({
					uuid: "task-1",
					jobs: { subscription_key: "sub-1" },
				}),
				"/status": () => ({
					jobs: [{ status: ++polls < 3 ? "Generating" : "Done" }],
				}),
				"/download": () => ({
					error: "OK",
					list: [{ name: "model.glb", url: "https://cdn.hyper3d.com/a.glb" }],
				}),
			}),
		);

		const result = await generateModelFromConcept(args);
		expect(polls).toBeGreaterThanOrEqual(3);
		expect(result.downloadUrl).toBe("https://cdn.hyper3d.com/a.glb");
		// Rodin's signed URL is cross-origin — it must go through the proxy.
		expect(result.viewerUrl).toContain("/api/rodin/proxy-download?url=");
		expect(result.viewerUrl).toContain(encodeURIComponent(result.downloadUrl));
	});

	it("reports progress as jobs complete", async () => {
		let polls = 0;
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({ uuid: "t", jobs: { subscription_key: "s" } }),
				"/status": () => ({
					jobs: [
						{ status: "Done" },
						{ status: ++polls < 2 ? "Generating" : "Done" },
					],
				}),
				"/download": () => ({
					list: [{ name: "m.glb", url: "https://x.hyper3d.com/m.glb" }],
				}),
			}),
		);

		const seen: string[] = [];
		await generateModelFromConcept({
			...args,
			onProgress: (p) => seen.push(p.phase),
		});
		expect(seen[0]).toBe("submitting");
		expect(seen).toContain("generating");
		expect(seen.at(-1)).toBe("done");
	});

	it("gives a plain answer when the key is missing rather than a status code", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi(
				{ "/submit": () => ({ error: "RODIN_API_KEY not configured" }) },
				() => false,
			),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/not configured on this deployment/,
		);
	});

	it("stops on a failed job instead of polling on", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({ uuid: "t", jobs: { subscription_key: "s" } }),
				"/status": () => ({ jobs: [{ status: "Failed" }] }),
			}),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/could not build this concept/,
		);
	});

	it("explains an out-of-credits refusal, which arrives as HTTP 200", async () => {
		// Rodin reports this in the body with a green status code.
		vi.stubGlobal(
			"fetch",
			mockApi({ "/submit": () => ({ error: "API_INSUFFICIENT_FUNDS" }) }),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/out of credits/,
		);
	});

	it("explains an account with no plan", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({
					error: "API_NO_ACTIVE_SUBSCRIPTION",
					message: "No active subscription on your account.",
				}),
			}),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/no active plan/,
		);
	});

	it("prefers Rodin's own message for a code we do not know", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({
					error: "API_SOMETHING_NEW",
					message: "Region unavailable.",
				}),
			}),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/Region unavailable/,
		);
	});

	it("explains a rejected key", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({ "/submit": () => ({ error: "API_UNAUTHORIZED" }) }),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/key was rejected/,
		);
	});

	it("stops when the modeller never returns a job to follow", async () => {
		vi.stubGlobal("fetch", mockApi({ "/submit": () => ({ uuid: "t" }) }));
		await expect(generateModelFromConcept(args)).rejects.toThrow(
			/did not return a job/,
		);
	});

	it("aborts promptly when the caller cancels", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({ uuid: "t", jobs: { subscription_key: "s" } }),
				"/status": () => ({ jobs: [{ status: "Generating" }] }),
			}),
		);
		const controller = new AbortController();
		const promise = generateModelFromConcept({
			...args,
			signal: controller.signal,
		});
		setTimeout(() => controller.abort(), 50);
		await expect(promise).rejects.toThrow(RodinError);
	});

	it("rejects an image it cannot read", async () => {
		vi.stubGlobal("fetch", mockApi({ "/submit": () => ({}) }));
		await expect(
			generateModelFromConcept({ ...args, imageDataUrl: "nonsense" }),
		).rejects.toThrow(/not a readable image/);
	});

	it("errors when the finished job has no glb", async () => {
		vi.stubGlobal(
			"fetch",
			mockApi({
				"/submit": () => ({ uuid: "t", jobs: { subscription_key: "s" } }),
				"/status": () => ({ jobs: [{ status: "Done" }] }),
				"/download": () => ({
					list: [{ name: "model.obj", url: "https://x/m.obj" }],
				}),
			}),
		);
		await expect(generateModelFromConcept(args)).rejects.toThrow(/no \.glb/);
	});
});
