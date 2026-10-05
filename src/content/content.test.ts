import { describe, expect, it } from "vitest";
import { layoutFor } from "#/lib/food-truck/tools";
import { publicPages, sitemapXml } from "#/lib/site-index";
import { ARTICLES } from "./articles";
import { ALL_FAQS } from "./faqs";
import { FOOTER_GUIDES } from "./nav";
import { STORIES } from "./stories";
import { TRUCKS } from "./trucks";
import type { Block } from "./types";
import { USE_CASES } from "./use-cases";

const known = new Set(publicPages().map((p) => p.path));

function linksIn(text: string): string[] {
	return [...text.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
}
function blockText(b: Block): string[] {
	switch (b.type) {
		case "ul":
		case "ol":
			return b.items;
		case "table":
			return b.rows.flat();
		case "cta":
			return [`[x](${b.href})`];
		case "quote":
			return [b.text];
		default:
			return [b.text];
	}
}

describe("content integrity", () => {
	it("every internal link resolves to a public page", () => {
		const texts = [
			...ARTICLES.flatMap((a) => [
				...a.body.flatMap(blockText),
				...(a.faqs ?? []).map((f) => f.a),
			]),
			...STORIES.flatMap((s) => s.body.flatMap(blockText)),
			...ALL_FAQS.map((f) => f.a),
		];
		for (const link of texts.flatMap(linksIn)) {
			expect(known.has(link.split("#")[0]), link).toBe(true);
		}
	});

	it("related, footer and cross-references point at real content", () => {
		const articleSlugs = new Set(ARTICLES.map((a) => a.slug));
		for (const a of ARTICLES)
			for (const r of a.related ?? [])
				expect(articleSlugs.has(r), `${a.slug} → ${r}`).toBe(true);
		for (const g of FOOTER_GUIDES)
			expect(articleSlugs.has(g.slug), g.slug).toBe(true);
		const truckSlugs = new Set(TRUCKS.map((t) => t.slug));
		for (const u of USE_CASES) {
			for (const t of u.trucks)
				expect(truckSlugs.has(t), `${u.slug} → ${t}`).toBe(true);
			for (const a of u.articles)
				expect(articleSlugs.has(a), `${u.slug} → ${a}`).toBe(true);
		}
		for (const t of TRUCKS)
			for (const u of t.useCases)
				expect(
					USE_CASES.some((x) => x.slug === u),
					u,
				).toBe(true);
		for (const s of STORIES) expect(truckSlugs.has(s.truckSlug)).toBe(true);
	});

	it("use-case layouts match what the designer's layout engine builds", () => {
		for (const u of USE_CASES) {
			const l = layoutFor(
				u.businessType,
				u.vehicleId,
				u.businessType === "retail",
				[],
			);
			expect(u.equipment, u.slug).toEqual(l.equipment);
			expect(u.zones, u.slug).toEqual(l.zones);
		}
	});

	it("meta descriptions fit a search snippet", () => {
		for (const a of ARTICLES)
			expect(a.description.length, a.slug).toBeLessThanOrEqual(170);
		for (const u of USE_CASES)
			expect(u.description.length, u.slug).toBeLessThanOrEqual(170);
	});

	it("slugs are unique and the sitemap lists every page once", () => {
		const paths = publicPages().map((p) => p.path);
		expect(new Set(paths).size).toBe(paths.length);
		expect(sitemapXml().match(/<url>/g)?.length).toBe(paths.length);
	});

	it("every story is labelled illustrative", () => {
		for (const s of STORIES) {
			expect(s.description).toMatch(/illustrative/i);
			expect(s.quote.who).toMatch(/illustrative/i);
		}
	});
});
