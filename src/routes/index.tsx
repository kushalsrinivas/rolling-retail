/**
 * Rolling Retail — the homepage.
 *
 * Narrative, buyer-first: what we do in one sentence, the product working
 * (a trailer you can turn around), what one brief gets you, the six bodies,
 * why us, proof, guides, answers, and one clear way to start.
 *
 * Every claim on this page is one the product or the factory backs: the
 * deliverables are the designer's real outputs, the trucks are the six
 * bodies in the catalog, the numbers are labelled planning ranges, and the
 * stories are labelled illustrative until real ones replace them.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { type CSSProperties, lazy, Suspense } from "react";
import { Reveal } from "#/components/landing/Reveal";
import { FaqList } from "#/components/site/ContentBody";
import { CtaBand, Eyebrow, SiteShell } from "#/components/site/SiteChrome";
import { TrailerArt } from "#/components/site/TrailerArt";
import { ARTICLES } from "#/content/articles";
import { HOME_FAQS } from "#/content/faqs";
import { STORIES } from "#/content/stories";
import { rangeLabel, TRUCKS, truckSpecs } from "#/content/trucks";
import { USE_CASES } from "#/content/use-cases";
import { useReveal } from "#/hooks/use-reveal";
import {
	designerAppLd,
	faqLd,
	organizationLd,
	pageHead,
	SITE,
	websiteLd,
} from "#/lib/site";

export const Route = createFileRoute("/")({
	component: Home,
	head: () =>
		pageHead({
			title: "Rolling Retail — Custom food trailers, designed online and built in the USA",
			description:
				"Design a custom food trailer online in minutes — Airstream or square concession trailer — and see photoreal renders, an equipment layout, a wrap plan and a planning estimate. Then we build it.",
			path: "/",
			jsonLd: [organizationLd(), websiteLd(), designerAppLd(), faqLd(HOME_FAQS)],
		}),
});

const HeroShowcase = lazy(() => import("#/components/landing/HeroShowcase"));

const HEADLINE = ["Design your food trailer online.", "We build exactly that."];

const PROOF = [
	"5 free render rounds",
	"No account needed",
	"6–10 week builds",
	"Delivered nationwide",
];

const STEPS = [
	{
		n: "01",
		t: "Answer a three-minute brief",
		d: "What you serve, where you trade, your busiest hour and the looks you love. Skip anything you haven't decided.",
	},
	{
		n: "02",
		t: "See your trailer, inside and out",
		d: "Photoreal concepts of your build — exterior, curbside, interior line — on a body our factory actually makes. Change anything in plain English.",
	},
	{
		n: "03",
		t: "Get a spec, a quote and a build date",
		d: "A specification sheet with layout, equipment, wrap and power. Our team turns it into a quote, and the factory builds it.",
	},
];

const DIFFERENTIATORS = [
	{
		t: "You can only design what we can build",
		d: "Six bodies with fixed, factory-proven geometry. No render you fall for will be walked back by a salesperson later.",
	},
	{
		t: "Compliance is designed in, not bolted on",
		d: "Hand sink at the line entry, NSF-listed equipment, hood and UL 300 suppression on hot lines, water sized for service — the things plan review checks.",
	},
	{
		t: "Builder doctrine, applied to your brief",
		d: "One hot station per compact body. Cooking on propane. Power that closes on paper before anyone renders. We'll tell you when smaller is better.",
	},
	{
		t: "Honest numbers",
		d: "Planning ranges you can budget against from the first session — always labelled as ranges until our team quotes your final spec.",
	},
];

const DOCTRINE = [
	["Compact beats big", "Less weight and a smaller power system beat floor space. Oversizing is the most common first-time mistake."],
	["One hot station", "One griddle, fryer or oven per compact body — under one hood, on propane."],
	["Power closes first", "If the electrics exceed a 50A feed, we drop equipment. We never add power to fix a layout."],
	["Drinks are margin", "A drinks station is a merchandising decision, placed so it never waits on the grill."],
] as const;

function Headline() {
	const { ref, shown } = useReveal<HTMLHeadingElement>({ threshold: 0.3 });
	return (
		<h1
			ref={ref}
			className="max-w-4xl text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[56px] lg:text-[68px]"
		>
			{HEADLINE.map((line, i) => (
				<span key={line} className="rr-line-mask">
					<span
						className={i === 1 ? "rr-line text-stone-500" : "rr-line"}
						data-shown={shown}
						style={{ "--rr-delay": `${i * 120}ms` } as CSSProperties}
					>
						{line}
					</span>
				</span>
			))}
		</h1>
	);
}

/** A sample of the designer's real outputs for one build, laid out as a sheet. */
function DeliverablesPreview() {
	return (
		<div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
			<div className="overflow-hidden rounded-sm border border-stone-200 bg-white">
				<div className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
					<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">
						Concept · exterior hero
					</p>
					<p className="font-mono text-[10.5px] text-stone-400">v1 · not for construction</p>
				</div>
				<div className="bg-gradient-to-b from-[#f3e6d3] to-[#efe9df] px-6 pb-4 pt-8">
					<TrailerArt
						vehicleId="square-4m"
						primary="#e8641b"
						accent="#1c1c1e"
						className="w-full text-stone-900"
						title="Concept drawing of a 13 ft square taco trailer with an orange wrap band and the service hatch open"
					/>
				</div>
				<div className="grid grid-cols-3 divide-x divide-stone-200 border-t border-stone-200 text-center">
					{["Exterior", "Curbside", "Interior line"].map((v) => (
						<p key={v} className="py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-500">
							{v}
						</p>
					))}
				</div>
			</div>
			<div className="grid gap-3">
				<div className="rounded-sm border border-stone-200 bg-white p-4">
					<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">Equipment line · left to right</p>
					<ol className="mt-3 space-y-1.5 text-[13.5px] text-stone-700">
						{[
							"Hand sink at the line entry",
							"Plancha + steam wells under hood",
							"Salsa and garnish rail",
							"Tortilla warmer at the pass",
							"Drinks station with ice",
						].map((x, i) => (
							<li key={x} className="flex gap-2.5">
								<span className="font-mono text-[11px] text-stone-400">{String(i + 1).padStart(2, "0")}</span>
								{x}
							</li>
						))}
					</ol>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-sm border border-stone-200 bg-white p-4">
						<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">Wrap plan</p>
						<div className="mt-3 space-y-1.5">
							{[
								["#E8641B", "Orange · primary"],
								["#1C1C1F", "Matte black"],
								["#EFE4CF", "Cream · neutral"],
							].map(([hex, name]) => (
								<div key={hex} className="flex items-center gap-2">
									<span className="h-4 w-4 rounded-[2px] border border-stone-200" style={{ background: hex }} />
									<span className="text-[12px] text-stone-600">{name}</span>
								</div>
							))}
						</div>
					</div>
					<div className="rounded-sm border border-stone-200 bg-white p-4">
						<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">Planning estimate</p>
						<p className="mt-3 text-[22px] font-semibold tracking-tight text-stone-900">$60k–$95k</p>
						<p className="mt-1 text-[11.5px] leading-snug text-stone-500">Range, not a quote · 6–10 weeks after sign-off</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function Home() {
	const guides = ARTICLES.filter((a) => a.category !== "Behind the build").slice(0, 3);
	return (
		<SiteShell>
			{/* ── Hero ── */}
			<section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
				<Reveal>
					<Eyebrow>Custom food trailers · Built in the USA</Eyebrow>
				</Reveal>
				<div className="mt-4">
					<Headline />
				</div>
				<Reveal delay={360}>
					<p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-stone-600 sm:text-[19px]">
						Answer a short brief and see photoreal renders of your trailer — inside and out — with an equipment layout, a wrap plan and a planning estimate. When it&rsquo;s right, our factory builds it.
					</p>
				</Reveal>
				<Reveal delay={480}>
					<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
						<Link
							to="/chat"
							className="group inline-flex items-center gap-2 rounded-sm bg-stone-900 px-6 py-3.5 text-[15px] font-medium text-stone-50 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-stone-700"
						>
							Design your trailer — free
							<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
						</Link>
						<Link to="/trucks" className="rr-underline text-[15px] text-stone-700">
							Explore the six trucks
						</Link>
					</div>
				</Reveal>
				<Reveal delay={600}>
					<ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-stone-500">
						{PROOF.map((p) => (
							<li key={p} className="flex items-center gap-1.5">
								<Check className="h-3.5 w-3.5 text-[#e8641b]" aria-hidden />
								{p}
							</li>
						))}
					</ul>
				</Reveal>
			</section>

			{/* ── The product, immediately: a trailer you can turn around. ── */}
			<section aria-label="Interactive 3D trailer showcase">
				<Suspense
					fallback={<div className="h-[58vh] min-h-[380px] w-full animate-pulse bg-[#111110] sm:h-[66vh]" />}
				>
					<HeroShowcase />
				</Suspense>
			</section>

			{/* ── How it works ── */}
			<section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
				<Reveal>
					<Eyebrow>How it works</Eyebrow>
					<h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">
						From idea to build sheet in one sitting.
					</h2>
				</Reveal>
				<ol className="mt-12 grid gap-8 md:grid-cols-3">
					{STEPS.map((s, i) => (
						<Reveal key={s.n} delay={i * 110}>
							<li className="border-t-2 border-stone-900 pt-5">
								<span className="font-mono text-[12px] text-stone-400">{s.n}</span>
								<h3 className="mt-2 text-[18px] font-semibold tracking-tight">{s.t}</h3>
								<p className="mt-2 text-[15px] leading-relaxed text-stone-600">{s.d}</p>
							</li>
						</Reveal>
					))}
				</ol>
				<Reveal delay={200}>
					<Link to="/how-it-works" className="rr-underline mt-10 inline-block text-[14px] text-stone-700">
						The full process, from brief to delivery →
					</Link>
				</Reveal>
			</section>

			{/* ── What one brief gets you ── */}
			<section className="border-y border-stone-200 bg-[#efece6]">
				<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
					<div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
						<Reveal>
							<Eyebrow>What one brief gets you</Eyebrow>
							<h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">
								Not a mood board. A trailer you can quote.
							</h2>
							<p className="mt-5 text-[16px] leading-relaxed text-stone-600">
								Every session produces the same set of deliverables our build team works from — so the conversation with sales starts at the specification, not at &ldquo;so, what were you thinking?&rdquo;
							</p>
							<ul className="mt-6 space-y-2.5 text-[15px] text-stone-700">
								{[
									"Photoreal concepts that stay consistent view to view",
									"Equipment layout in the order your line works",
									"Wrap plan with colors matched to real vinyl film",
									"Power table that closes before anything is rendered",
									"Planning estimate and a downloadable spec sheet",
								].map((x) => (
									<li key={x} className="flex gap-2.5">
										<Check className="mt-1 h-4 w-4 shrink-0 text-[#e8641b]" aria-hidden />
										{x}
									</li>
								))}
							</ul>
						</Reveal>
						<Reveal delay={150}>
							<DeliverablesPreview />
							<p className="mt-3 text-[12px] text-stone-500">
								Example output for a 13 ft taco trailer. Drawings on this site are illustrations; the designer renders photoreal concepts.
							</p>
						</Reveal>
					</div>
				</div>
			</section>

			{/* ── The six trucks ── */}
			<section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<Reveal>
						<Eyebrow>The lineup</Eyebrow>
						<h2 className="mt-3 max-w-xl text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">
							Six bodies. Every one built in our factory.
						</h2>
					</Reveal>
					<Link to="/trucks" className="rr-underline text-[14px] text-stone-700">
						Compare all trucks →
					</Link>
				</div>
				<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{TRUCKS.map((t, i) => {
						const s = truckSpecs(t);
						return (
							<Reveal key={t.slug} delay={(i % 3) * 90}>
								<Link
									to="/trucks/$slug"
									params={{ slug: t.slug }}
									className="group flex h-full flex-col rounded-sm border border-stone-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]"
								>
									<div className="flex h-28 items-end justify-center">
										<TrailerArt
											vehicleId={t.vehicleId}
											primary={i % 2 ? "#1f7a8c" : "#e8641b"}
											className="max-h-28 w-full text-stone-900"
										/>
									</div>
									<h3 className="mt-5 text-[17px] font-semibold tracking-tight">{t.name}</h3>
									<p className="mt-1 text-[14px] leading-snug text-stone-600">{t.headline}</p>
									<dl className="mt-4 grid grid-cols-2 gap-y-1 border-t border-stone-100 pt-3 text-[12.5px]">
										<dt className="text-stone-500">Length</dt>
										<dd className="text-right font-mono text-stone-800">{s?.lengthFt} ft</dd>
										<dt className="text-stone-500">Best for</dt>
										<dd className="text-right text-stone-800">{t.bestFor[0]}</dd>
										<dt className="text-stone-500">Planning range</dt>
										<dd className="text-right font-mono text-stone-800">{rangeLabel(t.planningRange)}</dd>
									</dl>
									<span className="mt-auto pt-4 text-[13px] font-medium text-stone-900">
										View specs <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
									</span>
								</Link>
							</Reveal>
						);
					})}
				</div>
			</section>

			{/* ── Use cases ── */}
			<section className="border-t border-stone-200">
				<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
					<Reveal>
						<Eyebrow>Built for what you sell</Eyebrow>
						<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
							The line is designed around your menu — not the other way round.
						</h2>
					</Reveal>
					<div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
						{USE_CASES.map((u) => (
							<Link
								key={u.slug}
								to="/use-cases/$slug"
								params={{ slug: u.slug }}
								className="group bg-[#f7f6f3] p-5 transition-colors hover:bg-white"
							>
								<p className="text-[15.5px] font-semibold">{u.name}</p>
								<p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-stone-500">{u.zones[1] ?? u.intro}</p>
								<span className="mt-3 inline-block text-[12.5px] text-stone-700 transition-transform group-hover:translate-x-0.5">
									See the build →
								</span>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* ── Why us ── */}
			<section className="bg-[#111110] text-stone-100">
				<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
					<Reveal>
						<Eyebrow className="text-stone-500">Why Rolling Retail</Eyebrow>
						<h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-tight tracking-[-0.02em] text-stone-50 sm:text-[40px]">
							A designer that thinks like a builder — because a builder made it.
						</h2>
					</Reveal>
					<div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
						{DIFFERENTIATORS.map((x, i) => (
							<Reveal key={x.t} delay={i * 90}>
								<div className="border-t border-white/15 pt-5">
									<h3 className="text-[18px] font-semibold text-stone-50">{x.t}</h3>
									<p className="mt-2 text-[15px] leading-relaxed text-stone-400">{x.d}</p>
								</div>
							</Reveal>
						))}
					</div>
					<Reveal delay={120}>
						<div className="mt-16 rounded-sm border border-white/10 p-6 sm:p-8">
							<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">Our builder doctrine</p>
							<dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
								{DOCTRINE.map(([t, d]) => (
									<div key={t}>
										<dt className="text-[15px] font-semibold text-stone-50">{t}</dt>
										<dd className="mt-1.5 text-[13.5px] leading-relaxed text-stone-400">{d}</dd>
									</div>
								))}
							</dl>
						</div>
					</Reveal>
				</div>
			</section>

			{/* ── Stories ── */}
			<section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<Reveal>
						<Eyebrow>Stories</Eyebrow>
						<h2 className="mt-3 max-w-xl text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
							How operators use the designer.
						</h2>
						<p className="mt-3 max-w-xl text-[14px] text-stone-500">
							Illustrative examples based on typical builds — not real customers.
						</p>
					</Reveal>
					<Link to="/stories" className="rr-underline text-[14px] text-stone-700">
						All stories →
					</Link>
				</div>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					{STORIES.map((s, i) => (
						<Reveal key={s.slug} delay={i * 90}>
							<Link
								to="/stories/$slug"
								params={{ slug: s.slug }}
								className="group flex h-full flex-col rounded-sm border border-stone-200 bg-white p-6 transition-colors hover:border-stone-300"
							>
								<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-400">Illustrative · {s.location.replace(" (example)", "")}</p>
								<blockquote className="mt-4 text-[16px] leading-snug text-stone-800">&ldquo;{s.quote.text}&rdquo;</blockquote>
								<p className="mt-4 text-[13px] text-stone-500">{s.business}</p>
								<span className="mt-auto pt-5 text-[13px] font-medium">
									Read the story <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
								</span>
							</Link>
						</Reveal>
					))}
				</div>
			</section>

			{/* ── Guides ── */}
			<section className="border-t border-stone-200">
				<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
					<div className="flex flex-wrap items-end justify-between gap-6">
						<Reveal>
							<Eyebrow>Guides from the build team</Eyebrow>
							<h2 className="mt-3 max-w-xl text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
								Know what you&rsquo;re buying before you buy it.
							</h2>
						</Reveal>
						<Link to="/resources" className="rr-underline text-[14px] text-stone-700">
							All guides →
						</Link>
					</div>
					<div className="mt-10 grid gap-8 md:grid-cols-3">
						{guides.map((a) => (
							<Link key={a.slug} to="/resources/$slug" params={{ slug: a.slug }} className="group border-t border-stone-300 pt-5">
								<p className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">
									{a.category} · {a.readingMinutes} min
								</p>
								<h3 className="mt-2 text-[18px] font-semibold leading-snug tracking-tight group-hover:underline group-hover:decoration-stone-400 group-hover:underline-offset-4">
									{a.title}
								</h3>
								<p className="mt-2 text-[14px] leading-relaxed text-stone-600">{a.description}</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* ── FAQ ── */}
			<section className="border-t border-stone-200">
				<div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
					<div>
						<Eyebrow>Questions</Eyebrow>
						<h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
							What buyers ask us first.
						</h2>
						<p className="mt-4 text-[15px] text-stone-600">
							More in the <Link to="/faq" className="underline underline-offset-4">full FAQ</Link>, or email{" "}
							<a href={`mailto:${SITE.email}`} className="underline underline-offset-4">
								{SITE.email}
							</a>
							.
						</p>
					</div>
					<FaqList faqs={HOME_FAQS} />
				</div>
			</section>

			<CtaBand />
		</SiteShell>
	);
}
