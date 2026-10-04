import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "#/components/landing/Reveal";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { EQUIPMENT_LABELS, USE_CASES } from "#/content/use-cases";
import { breadcrumbLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/use-cases/")({
	component: UseCasesPage,
	head: () =>
		pageHead({
			title: "Food trailer use cases — coffee, tacos, burgers, boba, bars and retail",
			description:
				"See how we lay out food trailers for coffee, tacos, burgers, boba, ice cream, pizza, mobile bars and retail pop-ups — equipment, power and permit notes for each.",
			path: "/use-cases",
			jsonLd: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "Use cases", path: "/use-cases" }])],
		}),
});

function UseCasesPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[{ name: "Home", path: "/" }, { name: "Use cases", path: "/use-cases" }]}
				eyebrow="Use cases"
				title="Every line starts with the menu."
				lede="A coffee bar, a taco line and a walk-in boutique need different bodies, different equipment and different power. Here is how we build each one."
			/>
			<section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
				<div className="grid gap-4 md:grid-cols-2">
					{USE_CASES.map((u, i) => (
						<Reveal key={u.slug} delay={(i % 2) * 80}>
							<Link to="/use-cases/$slug" params={{ slug: u.slug }} className="group flex h-full flex-col rounded-sm border border-stone-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-stone-300">
								<h2 className="text-[20px] font-semibold tracking-tight">{u.name}</h2>
								<p className="mt-2 text-[14.5px] leading-relaxed text-stone-600">{u.description}</p>
								<ul className="mt-4 flex flex-wrap gap-1.5">
									{u.equipment.slice(0, 4).map((e) => (
										<li key={e} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11.5px] text-stone-600">{EQUIPMENT_LABELS[e] ?? e}</li>
									))}
								</ul>
								<span className="mt-auto pt-5 text-[13.5px] font-medium">See the build →</span>
							</Link>
						</Reveal>
					))}
				</div>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
