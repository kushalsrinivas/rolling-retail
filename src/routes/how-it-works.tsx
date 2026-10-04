import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "#/components/landing/Reveal";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { absoluteUrl, breadcrumbLd, pageHead } from "#/lib/site";

const STEPS = [
	{
		t: "Answer the brief",
		time: "~3 minutes",
		d: "Seven short steps: your business and menu, how and where you trade, your truck, the looks and colors you like, features and must-haves. Everything is skippable, and you review it all before anything renders.",
		out: ["Recommended body, with the reason", "A structured brief our build team can read"],
	},
	{
		t: "See your concepts",
		time: "~1–2 minutes",
		d: "The designer renders your trailer — exterior hero, curbside and interior line — on the exact body you chose. Every view inherits from the first, so the trailer doesn't change between angles.",
		out: ["Photoreal concept renders", "Equipment layout in line order"],
	},
	{
		t: "Refine it in plain English",
		time: "As long as you like",
		d: "“Make the band teal.” “Put the grinder on the hatch side.” Each change becomes a precise revision you confirm before it renders — everything you didn't mention stays locked.",
		out: ["Versioned design: v1, v2, v3…", "Night, rear and brand views on request"],
	},
	{
		t: "Get your specification",
		time: "Instant",
		d: "A spec sheet with the body, layout, equipment schedule, power table and wrap plan with film references, plus a planning estimate. It doubles as the one-pager lenders and partners ask for.",
		out: ["Downloadable spec sheet", "Planning estimate (range)"],
	},
	{
		t: "Quote and plan review",
		time: "After sign-off",
		d: "Our team turns your approved spec into a quote and helps you prepare the documents your county's plan review asks for.",
		out: ["Formal quote", "Plan review documents"],
	},
	{
		t: "Build and delivery",
		time: "6–10 weeks",
		d: "Our factory builds the trailer you approved — the same body, openings, equipment and wrap — and arranges delivery or pickup.",
		out: ["Your trailer", "Equipment manuals and inspection paperwork"],
	},
];

export const Route = createFileRoute("/how-it-works")({
	component: HowPage,
	head: () =>
		pageHead({
			title: "How it works — from brief to built food trailer",
			description:
				"How Rolling Retail works: a three-minute brief, photoreal concepts, plain-English revisions, a specification sheet, a quote, and a factory build in 6–10 weeks.",
			path: "/how-it-works",
			jsonLd: [
				breadcrumbLd([{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }]),
				{
					"@context": "https://schema.org",
					"@type": "HowTo",
					name: "How to design and order a custom food trailer with Rolling Retail",
					url: absoluteUrl("/how-it-works"),
					step: STEPS.map((s, i) => ({
						"@type": "HowToStep",
						position: i + 1,
						name: s.t,
						text: s.d,
					})),
				},
			],
		}),
});

function HowPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }]}
				eyebrow="How it works"
				title="From a three-minute brief to a trailer on the road."
				lede="The designer does the part that used to take weeks of calls and revisions. The factory does the part that should never be rushed."
			/>
			<section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
				<ol className="relative space-y-4">
					{STEPS.map((s, i) => (
						<Reveal key={s.t} delay={60}>
							<li className="grid gap-6 rounded-sm border border-stone-200 bg-white p-6 md:grid-cols-[80px_1fr_260px] md:p-8">
								<span className="font-mono text-[28px] font-medium text-stone-300">{String(i + 1).padStart(2, "0")}</span>
								<div>
									<div className="flex flex-wrap items-baseline gap-3">
										<h2 className="text-[21px] font-semibold tracking-tight">{s.t}</h2>
										<span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">{s.time}</span>
									</div>
									<p className="mt-2 text-[15.5px] leading-relaxed text-stone-600">{s.d}</p>
								</div>
								<ul className="space-y-1.5 border-stone-200 text-[13.5px] text-stone-700 md:border-l md:pl-6">
									<li className="font-mono text-[10.5px] uppercase tracking-wider text-stone-400">You get</li>
									{s.out.map((o) => <li key={o}>{o}</li>)}
								</ul>
							</li>
						</Reveal>
					))}
				</ol>
				<p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-stone-500">
					Renders are concept visualizations. Dimensions, openings, equipment and final wrap artwork are confirmed by our factory team in your specification, and only a person can approve a design for build. Curious how the renders stay consistent? Read <Link to="/resources/$slug" params={{ slug: "how-we-built-the-designer" }} className="underline underline-offset-4">how we built the designer</Link>.
				</p>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
