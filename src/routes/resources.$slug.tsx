import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentBody, FaqList, slugify } from "#/components/site/ContentBody";
import { Breadcrumbs, CtaBand, SiteShell } from "#/components/site/SiteChrome";
import { ARTICLES, getArticle } from "#/content/articles";
import { articleLd, breadcrumbLd, faqLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/resources/$slug")({
	loader: ({ params }) => {
		const a = getArticle(params.slug);
		if (!a) throw notFound();
		return a;
	},
	head: ({ loaderData: a }) => {
		if (!a) return {};
		const path = `/resources/${a.slug}`;
		return pageHead({
			title: a.title,
			description: a.description,
			path,
			type: "article",
			article: { publishedTime: a.published, modifiedTime: a.updated, section: a.category },
			jsonLd: [
				articleLd({ title: a.title, description: a.description, path, published: a.published, updated: a.updated, section: a.category }),
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Resources", path: "/resources" },
					{ name: a.title, path },
				]),
				...(a.faqs?.length ? [faqLd(a.faqs)] : []),
			],
		});
	},
	component: ArticlePage,
});

function formatDate(iso: string) {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ArticlePage() {
	const a = Route.useLoaderData();
	const toc = a.body.filter((b) => b.type === "h2") as Array<{ type: "h2"; text: string; id?: string }>;
	const related = ARTICLES.filter((x) => a.related?.includes(x.slug));
	return (
		<SiteShell>
			<article className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
				<Breadcrumbs
					items={[
						{ name: "Home", path: "/" },
						{ name: "Resources", path: "/resources" },
						{ name: a.category, path: "/resources" },
					]}
				/>
				<header className="mt-8 max-w-3xl">
					<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">{a.category}</p>
					<h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[46px]">{a.title}</h1>
					<p className="mt-5 text-[18px] leading-relaxed text-stone-600">{a.description}</p>
					<p className="mt-6 text-[13px] text-stone-500">
						By the Rolling Retail build team ·{" "}
						<time dateTime={a.updated ?? a.published}>
							{a.updated ? `Updated ${formatDate(a.updated)}` : formatDate(a.published)}
						</time>{" "}
						· {a.readingMinutes} min read
					</p>
				</header>

				<div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px]">
					<div className="max-w-[720px]">
						<section aria-labelledby="takeaways" className="rounded-sm border border-stone-200 bg-white p-6">
							<h2 id="takeaways" className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">Key takeaways</h2>
							<ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed text-stone-800">
								{a.keyTakeaways.map((k) => (
									<li key={k} className="flex gap-3"><span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8641b]" />{k}</li>
								))}
							</ul>
						</section>
						<ContentBody blocks={a.body} />
						{a.faqs && a.faqs.length > 0 && (
							<section className="mt-14">
								<h2 className="text-[24px] font-semibold tracking-tight">Frequently asked questions</h2>
								<div className="mt-5"><FaqList faqs={a.faqs} /></div>
							</section>
						)}
					</div>
					{toc.length > 2 && (
						<aside className="hidden lg:block">
							<nav aria-label="On this page" className="sticky top-24">
								<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">On this page</p>
								<ul className="mt-4 space-y-2 border-l border-stone-200 text-[13.5px]">
									{toc.map((h) => (
										<li key={h.text}>
											<a href={`#${h.id ?? slugify(h.text)}`} className="-ml-px block border-l border-transparent pl-4 text-stone-600 hover:border-stone-900 hover:text-stone-900">{h.text}</a>
										</li>
									))}
								</ul>
							</nav>
						</aside>
					)}
				</div>
			</article>

			{related.length > 0 && (
				<section className="border-t border-stone-200">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
						<h2 className="text-[22px] font-semibold tracking-tight">Keep reading</h2>
						<div className="mt-6 grid gap-8 md:grid-cols-3">
							{related.map((r) => (
								<Link key={r.slug} to="/resources/$slug" params={{ slug: r.slug }} className="group border-t border-stone-300 pt-4">
									<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">{r.category}</p>
									<p className="mt-1.5 text-[16px] font-medium leading-snug group-hover:underline group-hover:underline-offset-4">{r.title}</p>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}
			<CtaBand />
		</SiteShell>
	);
}
