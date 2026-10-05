/**
 * The public page inventory — one list feeds sitemap.xml and llms.txt, so a
 * new article or truck is discoverable the moment its content lands.
 * Server-side only by convention (it imports every content body).
 */
import { ARTICLES } from "#/content/articles";
import { ALL_FAQS } from "#/content/faqs";
import { STORIES } from "#/content/stories";
import { rangeLabel, TRUCKS, truckSpecs } from "#/content/trucks";
import type { Block } from "#/content/types";
import { EQUIPMENT_LABELS, USE_CASES } from "#/content/use-cases";
import { absoluteUrl, SITE, stripMarkup } from "./site";

export interface IndexedPage {
	path: string;
	title: string;
	summary: string;
	lastmod: string;
	priority: number;
	section: "Core" | "Trucks" | "Use cases" | "Guides" | "Stories";
}

const SITE_UPDATED = "2026-10-05";

export function publicPages(): IndexedPage[] {
	const core: IndexedPage[] = [
		{
			path: "/",
			title: SITE.name,
			summary: SITE.description,
			priority: 1,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/chat",
			title: "Online food trailer designer",
			summary:
				"Answer a short brief and get photoreal concepts, a layout, a wrap plan, a planning estimate and a spec sheet. Free.",
			priority: 0.9,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/trucks",
			title: "Food trailers we build",
			summary: "Six bodies: square 10/13/16 ft and Airstream Small/Mid/Large.",
			priority: 0.9,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/use-cases",
			title: "Use cases",
			summary:
				"How we lay out trailers for coffee, tacos, burgers, boba, ice cream, pizza, bars and retail.",
			priority: 0.8,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/how-it-works",
			title: "How it works",
			summary:
				"Brief → concepts → revisions → spec → quote → build in 6–10 weeks.",
			priority: 0.8,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/pricing",
			title: "Pricing",
			summary: "Planning ranges by body, wrap pricing, what is included.",
			priority: 0.8,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/resources",
			title: "Guides",
			summary: "Costs, sizing, permits, power, layout and wrap guides.",
			priority: 0.8,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/stories",
			title: "Customer stories (illustrative)",
			summary: "Illustrative examples of operators using the designer.",
			priority: 0.5,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/faq",
			title: "FAQ",
			summary: "Design, builds, costs and permits.",
			priority: 0.7,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
		{
			path: "/about",
			title: "About",
			summary: "Who we are and the principles we build by.",
			priority: 0.6,
			section: "Core",
			lastmod: SITE_UPDATED,
		},
	];
	return [
		...core,
		...TRUCKS.map((t) => ({
			path: `/trucks/${t.slug}`,
			title: t.name,
			summary: `${t.summary} Planning range ${rangeLabel(t.planningRange)}.`,
			priority: 0.8,
			section: "Trucks" as const,
			lastmod: SITE_UPDATED,
		})),
		...USE_CASES.map((u) => ({
			path: `/use-cases/${u.slug}`,
			title: u.title,
			summary: u.description,
			priority: 0.7,
			section: "Use cases" as const,
			lastmod: SITE_UPDATED,
		})),
		...ARTICLES.map((a) => ({
			path: `/resources/${a.slug}`,
			title: a.title,
			summary: a.description,
			priority: 0.7,
			section: "Guides" as const,
			lastmod: a.updated ?? a.published,
		})),
		...STORIES.map((s) => ({
			path: `/stories/${s.slug}`,
			title: `${s.title} (illustrative)`,
			summary: s.description,
			priority: 0.4,
			section: "Stories" as const,
			lastmod: SITE_UPDATED,
		})),
	];
}

export function sitemapXml(): string {
	const urls = publicPages()
		.map(
			(p) =>
				`  <url>\n    <loc>${absoluteUrl(p.path)}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
	return [
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"Disallow: /admin",
		"Disallow: /studio",
		"Disallow: /report",
		"",
		`Sitemap: ${absoluteUrl("/sitemap.xml")}`,
		"",
	].join("\n");
}

/** llms.txt — the llmstxt.org format: title, summary, then linked sections. */
export function llmsTxt(): string {
	const pages = publicPages();
	const section = (name: IndexedPage["section"]) =>
		pages
			.filter((p) => p.section === name)
			.map((p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.summary}`)
			.join("\n");
	return [
		`# ${SITE.name}`,
		"",
		`> ${SITE.description}`,
		"",
		"Key facts:",
		"- Builds six food trailer bodies: square concession trailers at 10, 13 and 16 ft; Airstream Small, Mid and Large.",
		"- Sells across the United States; prices in USD; planning lead time 6–10 weeks after design sign-off.",
		"- Free online designer: five concept render rounds, no account. Outputs renders, layout, wrap plan, power table, planning estimate and spec sheet.",
		"- Builder doctrine: one hot station per compact body; cooking heat on propane; the Large Airstream is walk-in retail only, never a hot kitchen.",
		"- Prices published are planning ranges, not quotes. Customer stories on the site are illustrative examples, not real customers.",
		`- Contact: ${SITE.email}`,
		"",
		"## Core pages",
		section("Core"),
		"",
		"## Trucks",
		section("Trucks"),
		"",
		"## Use cases",
		section("Use cases"),
		"",
		"## Guides",
		section("Guides"),
		"",
		"## Optional",
		section("Stories"),
		`- [Full text of all guides](${absoluteUrl("/llms-full.txt")}): every guide and spec page as plain markdown.`,
		"",
	].join("\n");
}

function blocksToMarkdown(blocks: Block[]): string {
	return blocks
		.map((b) => {
			switch (b.type) {
				case "p":
					return stripMarkup(b.text);
				case "h2":
					return `## ${b.text}`;
				case "h3":
					return `### ${b.text}`;
				case "ul":
					return b.items.map((i) => `- ${stripMarkup(i)}`).join("\n");
				case "ol":
					return b.items
						.map((i, n) => `${n + 1}. ${stripMarkup(i)}`)
						.join("\n");
				case "table":
					return [
						b.caption ? `*${b.caption}*` : "",
						`| ${b.head.join(" | ")} |`,
						`| ${b.head.map(() => "---").join(" | ")} |`,
						...b.rows.map((r) => `| ${r.map(stripMarkup).join(" | ")} |`),
					]
						.filter(Boolean)
						.join("\n");
				case "callout":
					return `> ${b.title ? `**${b.title}** ` : ""}${stripMarkup(b.text)}`;
				case "quote":
					return `> ${b.text}${b.cite ? ` — ${b.cite}` : ""}`;
				case "cta":
					return `${b.title}: ${b.text} (${absoluteUrl(b.href)})`;
				default:
					return "";
			}
		})
		.filter(Boolean)
		.join("\n\n");
}

export function llmsFullTxt(): string {
	const parts: string[] = [llmsTxt(), "\n---\n", "# Trucks\n"];
	for (const t of TRUCKS) {
		const s = truckSpecs(t);
		parts.push(
			`## ${t.name}\nURL: ${absoluteUrl(`/trucks/${t.slug}`)}\n\n${t.summary}\n\n- Size: ${s?.lengthFt} × ${s?.widthFt} × ${s?.heightFt} ft\n- Crew: ${t.crew}\n- Peak: ${t.peak}\n- Best for: ${t.bestFor.join(", ")}\n- Not for: ${t.notFor.join(", ")}\n- Planning range: ${rangeLabel(t.planningRange)} (not a quote)\n`,
		);
	}
	parts.push("# Use cases\n");
	for (const u of USE_CASES) {
		parts.push(
			`## ${u.title}\nURL: ${absoluteUrl(`/use-cases/${u.slug}`)}\n\n${u.intro}\n\nLayout:\n${u.zones.map((z) => `- ${z}`).join("\n")}\n\nEquipment: ${u.equipment.map((e) => EQUIPMENT_LABELS[e] ?? e).join(", ")}\n\nPower: ${u.power}\n\nPermits: ${u.permits}\n`,
		);
	}
	parts.push("# Guides\n");
	for (const a of ARTICLES) {
		parts.push(
			`## ${a.title}\nURL: ${absoluteUrl(`/resources/${a.slug}`)}\nUpdated: ${a.updated ?? a.published}\n\nKey takeaways:\n${a.keyTakeaways.map((k) => `- ${k}`).join("\n")}\n\n${blocksToMarkdown(a.body)}\n${a.faqs?.length ? `\nFAQ:\n${a.faqs.map((f) => `Q: ${f.q}\nA: ${stripMarkup(f.a)}`).join("\n\n")}\n` : ""}`,
		);
	}
	parts.push("# FAQ\n");
	parts.push(
		ALL_FAQS.map((f) => `Q: ${f.q}\nA: ${stripMarkup(f.a)}`).join("\n\n"),
	);
	return parts.join("\n");
}
