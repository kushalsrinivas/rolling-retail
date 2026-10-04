/**
 * Site identity, SEO and structured data — one place.
 *
 * Every page builds its <head> through `pageHead()`, so titles, canonicals,
 * Open Graph, Twitter cards and JSON-LD can never drift between pages. The
 * structured data describes the company as what it is — a US builder of
 * food trailers with an online designer — so search engines and AI answer
 * engines can cite it accurately.
 *
 * Pure and client-safe.
 */

export const SITE = {
	name: "Rolling Retail",
	legalName: "Rolling Retail, a product of LA Techspace",
	/**
	 * Canonical origin. Set VITE_SITE_URL in production; the fallback only
	 * keeps dev and previews working.
	 */
	url: (
		(import.meta.env?.VITE_SITE_URL as string | undefined) ??
		"https://rollingretail.co"
	).replace(/\/$/, ""),
	email: "team@latechspace.com",
	tagline: "Custom food trailers, designed online and built in our factory.",
	description:
		"Rolling Retail designs and builds custom food trailers — Airstream and square concession trailers for coffee, tacos, burgers, boba, ice cream, bars and retail. Design yours online in minutes, get a buildable spec and a planning estimate, then we build it.",
	locale: "en_US",
	areaServed: "United States",
	ogImage: "/og/default.png",
	logo: "/logo512.png",
	themeColor: "#111110",
} as const;

export function absoluteUrl(path = "/"): string {
	if (/^https?:\/\//.test(path)) return path;
	return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

type Meta = Record<string, string>;
type Link = Record<string, string>;
type Script = { type: string; children: string };

export interface PageHeadArgs {
	/** Page title without the brand suffix. */
	title: string;
	description: string;
	/** Path from the site root, e.g. "/trucks/airstream-mid". */
	path: string;
	image?: string;
	imageAlt?: string;
	type?: "website" | "article" | "product";
	/** JSON-LD objects for this page. */
	jsonLd?: Array<Record<string, unknown>>;
	/** Keep the page out of the index (the designer, admin). */
	noindex?: boolean;
	article?: { publishedTime: string; modifiedTime?: string; section?: string };
}

/** The full <head> for one page: title, meta, canonical, OG, Twitter, JSON-LD. */
export function pageHead(args: PageHeadArgs): {
	meta: Meta[];
	links: Link[];
	scripts: Script[];
} {
	const title =
		args.path === "/" ? args.title : `${args.title} | ${SITE.name}`;
	const url = absoluteUrl(args.path);
	const image = absoluteUrl(args.image ?? SITE.ogImage);
	const meta: Meta[] = [
		{ title },
		{ name: "description", content: args.description },
		{ property: "og:site_name", content: SITE.name },
		{ property: "og:locale", content: SITE.locale },
		{ property: "og:type", content: args.type === "article" ? "article" : "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: args.description },
		{ property: "og:url", content: url },
		{ property: "og:image", content: image },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:image:alt", content: args.imageAlt ?? title },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: args.description },
		{ name: "twitter:image", content: image },
	];
	if (args.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
	else
		meta.push({
			name: "robots",
			content: "index, follow, max-image-preview:large, max-snippet:-1",
		});
	if (args.article) {
		meta.push({
			property: "article:published_time",
			content: args.article.publishedTime,
		});
		if (args.article.modifiedTime)
			meta.push({
				property: "article:modified_time",
				content: args.article.modifiedTime,
			});
		if (args.article.section)
			meta.push({ property: "article:section", content: args.article.section });
	}
	return {
		meta,
		links: [{ rel: "canonical", href: url }],
		scripts: (args.jsonLd ?? []).map((obj) => ({
			type: "application/ld+json",
			// "</" would end the script tag early; JSON stays valid escaped.
			children: JSON.stringify(obj).replace(/</g, "\\u003c"),
		})),
	};
}

/* ── Schema.org builders ─────────────────────────────────────────────── */

export const ORG_ID = `${SITE.url}/#organization`;

export function organizationLd(): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": ORG_ID,
		name: SITE.name,
		legalName: SITE.legalName,
		url: SITE.url,
		logo: absoluteUrl(SITE.logo),
		email: SITE.email,
		description: SITE.description,
		areaServed: { "@type": "Country", name: SITE.areaServed },
		knowsAbout: [
			"food trailer manufacturing",
			"concession trailers",
			"Airstream food trailer conversions",
			"commercial kitchen layout",
			"vehicle wrap design",
			"food truck health department plan review",
		],
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "sales",
			email: SITE.email,
			areaServed: "US",
			availableLanguage: "English",
		},
	};
}

export function websiteLd(): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE.url}/#website`,
		url: SITE.url,
		name: SITE.name,
		description: SITE.description,
		publisher: { "@id": ORG_ID },
		inLanguage: "en-US",
	};
}

export function designerAppLd(): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: "Rolling Retail Designer",
		url: absoluteUrl("/chat"),
		applicationCategory: "DesignApplication",
		operatingSystem: "Any (web browser)",
		description:
			"An online food trailer designer: answer a short brief, get photoreal concept renders, an equipment layout, a wrap plan, a planning estimate and a specification sheet.",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
			description: "Five free concept render rounds. No account needed.",
		},
		provider: { "@id": ORG_ID },
	};
}

export function breadcrumbLd(
	items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((it, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: it.name,
			item: absoluteUrl(it.path),
		})),
	};
}

export function faqLd(
	faqs: ReadonlyArray<{ q: string; a: string }>,
): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((f) => ({
			"@type": "Question",
			name: f.q,
			acceptedAnswer: { "@type": "Answer", text: stripMarkup(f.a) },
		})),
	};
}

export function articleLd(a: {
	title: string;
	description: string;
	path: string;
	published: string;
	updated?: string;
	image?: string;
	section?: string;
	author?: string;
}): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: a.title,
		description: a.description,
		mainEntityOfPage: absoluteUrl(a.path),
		datePublished: a.published,
		dateModified: a.updated ?? a.published,
		image: absoluteUrl(a.image ?? SITE.ogImage),
		articleSection: a.section,
		inLanguage: "en-US",
		author: {
			"@type": "Organization",
			name: a.author ?? `${SITE.name} build team`,
			url: SITE.url,
		},
		publisher: { "@id": ORG_ID, "@type": "Organization", name: SITE.name },
	};
}

/** Strip the light inline markup used in content (**bold**, [text](href)). */
export function stripMarkup(s: string): string {
	return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}
