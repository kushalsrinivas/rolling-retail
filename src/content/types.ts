/**
 * Content model for the marketing site.
 *
 * Articles, guides and stories are typed data, not MDX: every block renders
 * through one component (ContentBody), so typography, internal links and
 * structured data stay consistent, and a test can check every internal link
 * resolves. Inline text supports **bold** and [label](/path) only.
 */

export type Block =
	| { type: "p"; text: string }
	| { type: "h2"; text: string; id?: string }
	| { type: "h3"; text: string }
	| { type: "ul"; items: string[] }
	| { type: "ol"; items: string[] }
	| {
			type: "table";
			caption?: string;
			head: string[];
			rows: string[][];
	  }
	| { type: "callout"; title?: string; text: string; tone?: "note" | "warn" }
	| { type: "quote"; text: string; cite?: string }
	| { type: "cta"; title: string; text: string; href: string; label: string };

export interface Faq {
	q: string;
	a: string;
}

export type ArticleCategory =
	| "Costs & planning"
	| "Design & build"
	| "Permits & compliance"
	| "Operations"
	| "Comparisons"
	| "Behind the build";

export interface Article {
	slug: string;
	title: string;
	/** ≤ 160 characters — the meta description and the card blurb. */
	description: string;
	category: ArticleCategory;
	published: string;
	updated?: string;
	readingMinutes: number;
	/** Answer-first summary, rendered at the top. AI engines quote these. */
	keyTakeaways: string[];
	body: Block[];
	faqs?: Faq[];
	/** Slugs of related articles. */
	related?: string[];
	/** Primary search phrase this page targets — for editors, not rendered. */
	targetQuery: string;
}

export interface Story {
	slug: string;
	/** Fictional business name — every story is labelled illustrative. */
	business: string;
	title: string;
	description: string;
	location: string;
	truckSlug: string;
	useCaseSlug: string;
	stats: Array<{ label: string; value: string }>;
	body: Block[];
	quote: { text: string; who: string };
}
