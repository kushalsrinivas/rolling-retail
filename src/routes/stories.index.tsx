import { createFileRoute, Link } from "@tanstack/react-router";
import { CtaBand, IllustrativeNotice, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { TrailerArt } from "#/components/site/TrailerArt";
import { STORIES } from "#/content/stories";
import { getTruck } from "#/content/trucks";
import { breadcrumbLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/stories/")({
	component: StoriesPage,
	head: () =>
		pageHead({
			title: "Customer stories — how operators design their trailers",
			description:
				"Illustrative examples of how coffee, taco and retail operators use the Rolling Retail designer to choose a body, plan a layout and get to a buildable spec.",
			path: "/stories",
			jsonLd: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "Stories", path: "/stories" }])],
		}),
});

function StoriesPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[{ name: "Home", path: "/" }, { name: "Stories", path: "/stories" }]}
				eyebrow="Stories"
				title="From a brief to a buildable trailer."
				lede="How different operators move through the designer — what they asked for, what the designer recommended, and what changed along the way."
			>
				<IllustrativeNotice />
			</PageHero>
			<section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
				<div className="grid gap-4 md:grid-cols-3">
					{STORIES.map((s, i) => {
						const t = getTruck(s.truckSlug);
						return (
							<Link key={s.slug} to="/stories/$slug" params={{ slug: s.slug }} className="group flex h-full flex-col rounded-sm border border-stone-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-stone-300">
								{t && <div className="flex h-24 items-end"><TrailerArt vehicleId={t.vehicleId} primary={["#c2603a", "#e8641b", "#1f7a8c"][i % 3]} className="max-h-24 w-full text-stone-900" /></div>}
								<p className="mt-5 font-mono text-[10.5px] uppercase tracking-wider text-stone-400">{s.business} · illustrative</p>
								<h2 className="mt-2 text-[18px] font-semibold leading-snug tracking-tight">{s.title}</h2>
								<p className="mt-2 text-[14px] leading-relaxed text-stone-600">{s.description.replace(/^An illustrative example: /, "")}</p>
								<span className="mt-auto pt-5 text-[13px] font-medium">Read the story →</span>
							</Link>
						);
					})}
				</div>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
