import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentBody } from "#/components/site/ContentBody";
import {
	CtaBand,
	IllustrativeNotice,
	PageHero,
	SiteShell,
} from "#/components/site/SiteChrome";
import { TrailerArt } from "#/components/site/TrailerArt";
import { getStory } from "#/content/stories";
import { getTruck } from "#/content/trucks";
import { getUseCase } from "#/content/use-cases";
import { articleLd, breadcrumbLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/stories/$slug")({
	loader: ({ params }) => {
		const s = getStory(params.slug);
		if (!s) throw notFound();
		return s;
	},
	head: ({ loaderData: s }) => {
		if (!s) return {};
		const path = `/stories/${s.slug}`;
		return pageHead({
			title: `${s.title} (illustrative example)`,
			description: s.description,
			path,
			type: "article",
			jsonLd: [
				articleLd({
					title: s.title,
					description: s.description,
					path,
					published: "2026-10-04",
					section: "Stories",
				}),
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Stories", path: "/stories" },
					{ name: s.business, path },
				]),
			],
		});
	},
	component: StoryPage,
});

function StoryPage() {
	const s = Route.useLoaderData();
	const truck = getTruck(s.truckSlug);
	const useCase = getUseCase(s.useCaseSlug);
	return (
		<SiteShell>
			<PageHero
				crumbs={[
					{ name: "Home", path: "/" },
					{ name: "Stories", path: "/stories" },
					{ name: s.business, path: `/stories/${s.slug}` },
				]}
				eyebrow={`${s.business} · ${s.location}`}
				title={s.title}
			>
				<IllustrativeNotice />
			</PageHero>
			<section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
				<div className="max-w-[720px]">
					<ContentBody blocks={s.body} />
					<figure className="mt-12 border-l-2 border-stone-900 pl-6">
						<blockquote className="text-[22px] font-medium leading-snug tracking-tight text-stone-900">
							&ldquo;{s.quote.text}&rdquo;
						</blockquote>
						<figcaption className="mt-3 text-[13.5px] text-stone-500">
							{s.quote.who}
						</figcaption>
					</figure>
				</div>
				<aside className="space-y-4">
					{truck && (
						<div className="sf-card p-5">
							<TrailerArt
								vehicleId={truck.vehicleId}
								className="w-full text-stone-900"
							/>
							<dl className="mt-5 space-y-2 text-[13.5px]">
								{s.stats.map((st) => (
									<div key={st.label} className="flex justify-between gap-4">
										<dt className="text-stone-500">{st.label}</dt>
										<dd className="text-right font-medium">{st.value}</dd>
									</div>
								))}
							</dl>
						</div>
					)}
					<div className="sf-card p-5 text-[14px]">
						<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
							Related
						</p>
						<ul className="mt-3 space-y-2">
							{truck && (
								<li>
									<Link
										to="/trucks/$slug"
										params={{ slug: truck.slug }}
										className="underline underline-offset-4"
									>
										{truck.name} specs
									</Link>
								</li>
							)}
							{useCase && (
								<li>
									<Link
										to="/use-cases/$slug"
										params={{ slug: useCase.slug }}
										className="underline underline-offset-4"
									>
										{useCase.name} builds
									</Link>
								</li>
							)}
						</ul>
					</div>
				</aside>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
