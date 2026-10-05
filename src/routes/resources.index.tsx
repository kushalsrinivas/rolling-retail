import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "#/components/landing/Reveal";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { ARTICLE_CATEGORIES, ARTICLES } from "#/content/articles";
import { absoluteUrl, breadcrumbLd, pageHead, SITE } from "#/lib/site";

export const Route = createFileRoute("/resources/")({
	component: ResourcesPage,
	head: () =>
		pageHead({
			title: "Food trailer guides — costs, sizing, permits, layout and wraps",
			description:
				"Practical guides from a food trailer builder: what a trailer costs, what size you need, permits and plan review, kitchen layout, power and wrap design.",
			path: "/resources",
			jsonLd: [
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Resources", path: "/resources" },
				]),
				{
					"@context": "https://schema.org",
					"@type": "Blog",
					name: `${SITE.name} guides`,
					url: absoluteUrl("/resources"),
					blogPost: ARTICLES.map((a) => ({
						"@type": "BlogPosting",
						headline: a.title,
						url: absoluteUrl(`/resources/${a.slug}`),
						datePublished: a.published,
						dateModified: a.updated ?? a.published,
					})),
				},
			],
		}),
});

function ResourcesPage() {
	const [featured, ...rest] = ARTICLES.filter(
		(a) => a.slug === "how-much-does-a-food-trailer-cost",
	).concat(
		ARTICLES.filter((a) => a.slug !== "how-much-does-a-food-trailer-cost"),
	);
	return (
		<SiteShell>
			<PageHero
				crumbs={[
					{ name: "Home", path: "/" },
					{ name: "Resources", path: "/resources" },
				]}
				eyebrow="Resources"
				title="Guides from the people who build the trailers."
				lede="Straight answers on cost, sizing, permits, power, layout and wraps — written by our build team, updated as the rules and prices change."
			>
				<ul className="mt-8 flex flex-wrap gap-2">
					{ARTICLE_CATEGORIES.map((c) => (
						<li key={c}>
							<a
								href={`#${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
								className="rounded-full border-2 border-[var(--sf-ink)] bg-white font-semibold px-3.5 py-1.5 text-[13px] text-stone-700 hover:border-stone-900"
							>
								{c}
							</a>
						</li>
					))}
				</ul>
			</PageHero>

			<section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
				<Link
					to="/resources/$slug"
					params={{ slug: featured.slug }}
					className="group grid gap-6 rounded-sm bg-[var(--sf-ink)] p-8 text-stone-100 md:grid-cols-[1.4fr_1fr] md:p-10"
				>
					<div>
						<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
							Most read · {featured.category}
						</p>
						<h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-stone-50 group-hover:underline group-hover:decoration-stone-600 group-hover:underline-offset-4 sm:text-[34px]">
							{featured.title}
						</h2>
						<p className="mt-3 text-[15px] leading-relaxed text-stone-400">
							{featured.description}
						</p>
					</div>
					<ul className="space-y-2 self-end text-[14px] text-stone-300">
						{featured.keyTakeaways.slice(0, 3).map((k) => (
							<li key={k} className="border-t border-white/10 pt-2">
								{k}
							</li>
						))}
					</ul>
				</Link>
			</section>

			{ARTICLE_CATEGORIES.map((cat) => {
				const list = rest.filter((a) => a.category === cat);
				if (list.length === 0) return null;
				return (
					<section
						key={cat}
						id={cat.toLowerCase().replace(/[^a-z]+/g, "-")}
						className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6"
					>
						<h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
							{cat}
						</h2>
						<div className="mt-5 grid gap-8 md:grid-cols-3">
							{list.map((a, i) => (
								<Reveal key={a.slug} delay={i * 70}>
									<Link
										to="/resources/$slug"
										params={{ slug: a.slug }}
										className="group block border-t border-stone-300 pt-5"
									>
										<h3 className="text-[18px] font-semibold leading-snug tracking-tight group-hover:underline group-hover:decoration-stone-400 group-hover:underline-offset-4">
											{a.title}
										</h3>
										<p className="mt-2 text-[14px] leading-relaxed text-stone-600">
											{a.description}
										</p>
										<p className="mt-3 font-mono text-[11px] text-stone-400">
											{a.readingMinutes} min read
										</p>
									</Link>
								</Reveal>
							))}
						</div>
					</section>
				);
			})}
			<div className="h-10" />
			<CtaBand />
		</SiteShell>
	);
}
