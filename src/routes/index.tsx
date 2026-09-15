/**
 * Rolling Retail — the homepage.
 *
 * Narrative order, per the review: show what is possible, state the problem in
 * enough detail that a sales lead recognises their own week in it, then the
 * solution (visibly shorter than the problem), what it plugs into, proof, and
 * one clear way to get in touch.
 *
 * The vehicle leads. Everything else is typographic and paced by scroll — the
 * motion is there to make the argument land, not to decorate it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, lazy, Suspense } from "react";
import { ProcessList, type Step } from "#/components/landing/ProcessList";
import { Reveal } from "#/components/landing/Reveal";
import { useReveal } from "#/hooks/use-reveal";
import { GALLERY, hasGallery } from "#/lib/landing-gallery";

export const Route = createFileRoute("/")({ component: Home });

const HeroShowcase = lazy(() => import("#/components/landing/HeroShowcase"));

const HEADLINE = [
	"White-label design software",
	"that cuts the time it takes",
	"to build with your partners.",
];

const WE_BUILD = [
	"Food trucks",
	"Coffee carts",
	"Mobile bars",
	"Merch trailers",
	"Airstream conversions",
	"Pop-up kiosks",
	"Bookshops",
	"Demo units",
	"Activation vehicles",
	"Ice cream vans",
	"Barber trailers",
	"Anything on wheels",
];

/** One inquiry as it runs today. Five entries are the same word on purpose. */
const TODAY: Step[] = [
	{ id: "inquiry", label: "Inquiry arrives" },
	{ id: "brief-call", label: "Call to understand the brief" },
	{ id: "draft", label: "Designer drafts a layout" },
	{ id: "rev-1", label: "Revision" },
	{ id: "rev-2", label: "Revision" },
	{ id: "clarify", label: "Call to resolve what the drawing did not say" },
	{ id: "rev-3", label: "Revision" },
	{ id: "rev-4", label: "Revision" },
	{ id: "rev-5", label: "Revision" },
	{ id: "quote", label: "Quote" },
	{ id: "deposit", label: "Deposit" },
];

const AFTER: Step[] = [
	{ id: "inquiry", label: "Inquiry arrives" },
	{ id: "design", label: "Customer designs it themselves" },
	{ id: "quote", label: "Quote" },
	{ id: "deposit", label: "Deposit" },
];

const FRICTIONS = [
	{
		t: "Two-dimensional ambiguity",
		d: "A side elevation and an isometric can disagree and both look correct. The customer signs off on one reading, the factory builds the other.",
	},
	{
		t: "The conversation lives in WhatsApp",
		d: "Photos, voice notes and a PDF from three weeks ago. Nobody can tell which version is current, so someone asks again.",
	},
	{
		t: "Designer capacity is the ceiling",
		d: "Every inquiry costs the same scarce person the same hours, whether it closes or not. Growth makes this worse, not better.",
	},
	{
		t: "The quote waits on all of it",
		d: "No specification, no bill of materials, no number. The deposit sits behind the drawing.",
	},
];

const CAPABILITIES = [
	"Walk around the vehicle, inside and out",
	"Choose equipment and move the layout",
	"Share inspiration images and see them reflected",
	"Watch every angle update together",
	"Save it, change it, send it back to you",
];

/** Our own vehicle, our own numbers — see the disclaimer under the table. */
const EXAMPLE_BOM = [
	{
		item: "Airstream shell, 20 ft",
		spec: "riveted aluminium monocoque",
		qty: "1",
	},
	{ item: "Wrap film", spec: "3M cast, overlaminated", qty: "409 sq ft" },
	{ item: "Griddle + chargrill", spec: "single line, 10.8 kW", qty: "1" },
	{ item: "Extraction canopy", spec: "stainless, Ansul suppression", qty: "1" },
	{ item: "Refrigerated make-rail", spec: "6-pan, under-counter", qty: "1" },
	{ item: "Hand sink + tanks", spec: "fresh 30 gal / grey 40 gal", qty: "1" },
	{ item: "Shore inlet", spec: "50A / 240V, generator inlet", qty: "1" },
];

const SALES_VIEW = [
	{
		t: "Where each customer is",
		d: "Who is still choosing a body, who has a layout, who is one question from a deposit.",
	},
	{
		t: "What they keep coming back to",
		d: "The build they have opened four times, and the question they have not asked you yet.",
	},
	{
		t: "What the market wants",
		d: "Which categories are being configured this month, and which components come up often enough to negotiate on.",
	},
];

function Rule() {
	return <hr className="border-0 border-t border-stone-200" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
			{children}
		</p>
	);
}

/** The headline, lifting line by line from behind its own baseline. */
function Headline() {
	const { ref, shown } = useReveal<HTMLHeadingElement>({ threshold: 0.4 });
	return (
		<h1
			ref={ref}
			className="max-w-4xl text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[48px] lg:text-[58px]"
		>
			{HEADLINE.map((line, i) => (
				<span key={line} className="rr-line-mask">
					<span
						className="rr-line"
						data-shown={shown}
						style={{ "--rr-delay": `${i * 110}ms` } as CSSProperties}
					>
						{line}
					</span>
				</span>
			))}
		</h1>
	);
}

function Home() {
	return (
		<div className="rr-landing min-h-dvh bg-[#f7f6f3] text-stone-900 antialiased">
			{/* ── Nav: two links, as agreed. Nothing else earns a slot. ── */}
			<header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
				<span className="font-mono text-[13px] font-medium tracking-tight">
					Rolling&nbsp;Retail
				</span>
				<nav className="flex items-center gap-6 text-[13px]">
					<a href="#story" className="rr-underline text-stone-600">
						Our story
					</a>
					<a
						href="#partner"
						className="rr-underline font-medium text-stone-900"
						style={{ backgroundSize: "100% 1px" }}
					>
						Partner with us
					</a>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section className="mx-auto max-w-6xl px-6 pb-12 pt-8 sm:pt-14">
				<Headline />
				<Reveal delay={420}>
					<p className="mt-6 max-w-xl text-[17px] leading-relaxed text-stone-600">
						Your customers configure their own vehicle — inside and out — before
						anyone opens a drawing. You get a specification you can quote from,
						and the revisions stop.
					</p>
				</Reveal>
				<Reveal delay={540}>
					<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
						<a
							href="#problem"
							className="group rounded-sm bg-stone-900 px-5 py-3 text-[14px] font-medium text-stone-50 transition-colors hover:bg-stone-700"
						>
							See why this is needed
							<span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
								→
							</span>
						</a>
						<Link
							to="/chat"
							className="rr-underline text-[14px] text-stone-600"
						>
							Open the designer
						</Link>
					</div>
				</Reveal>
			</section>

			{/* ── The vehicle, immediately. ── */}
			<Suspense
				fallback={
					<div className="h-[58vh] min-h-[380px] w-full animate-pulse bg-stone-200 sm:h-[66vh]" />
				}
			>
				<HeroShowcase />
			</Suspense>

			{/* ── Ticker: the breadth, without a paragraph about it. ── */}
			<div className="rr-marquee-viewport overflow-hidden border-b border-stone-200 py-4">
				<div className="rr-marquee">
					{[0, 1].map((copy) => (
						<div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
							{WE_BUILD.map((x) => (
								<span
									key={x}
									className="flex items-center whitespace-nowrap px-6 text-[14px] text-stone-500"
								>
									{x}
									<span className="ml-6 h-1 w-1 rounded-full bg-stone-300" />
								</span>
							))}
						</div>
					))}
				</div>
			</div>

			{/* ── Problem. The long section, on purpose. ── */}
			<section
				id="problem"
				className="mx-auto max-w-6xl scroll-mt-6 px-6 py-24"
			>
				<Reveal>
					<SectionLabel>The problem</SectionLabel>
					<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">
						The problem is not demand. It is everything that happens after the
						inquiry.
					</h2>
					<p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-stone-600">
						A vehicle is the most configurable thing you sell. Two customers
						asking for &ldquo;a coffee truck&rdquo; want different bodies,
						different equipment and different power. Until somebody draws it, no
						one in the conversation is sure what was agreed — so it gets drawn
						again.
					</p>
				</Reveal>

				<div className="mt-14 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<div>
						<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
							One inquiry, today
						</p>
						<ProcessList steps={TODAY} tone="today" />
						<Reveal delay={200}>
							<p className="mt-4 text-[13.5px] leading-relaxed text-stone-500">
								Five of those eleven steps are the same step. That is where the
								designer&rsquo;s week goes.
							</p>
						</Reveal>
					</div>

					<dl className="space-y-8 md:pt-8">
						{FRICTIONS.map((x, i) => (
							<Reveal key={x.t} delay={i * 90}>
								<dt className="text-[16px] font-medium">{x.t}</dt>
								<dd className="mt-1.5 text-[15px] leading-relaxed text-stone-600">
									{x.d}
								</dd>
							</Reveal>
						))}
					</dl>
				</div>
			</section>

			{/* ── Solution. Short, and it arrives fast. ── */}
			<section className="border-y border-stone-200 bg-[#111110] text-stone-100">
				<div className="mx-auto max-w-6xl px-6 py-24">
					<Reveal>
						<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
							The solution
						</p>
						<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-stone-50 sm:text-[38px]">
							Send a link. Get back a specification.
						</h2>
					</Reveal>

					<div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
						<div>
							<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
								The same inquiry
							</p>
							<ol className="mt-4 space-y-px">
								{AFTER.map((step, i) => (
									<Reveal key={step.id} delay={i * 110}>
										<li className="flex items-baseline gap-3 border-l-2 border-stone-100 py-2 pl-3 text-[15px] text-stone-100">
											<span className="font-mono text-[11px] text-stone-500">
												{String(i + 1).padStart(2, "0")}
											</span>
											{step.label}
										</li>
									</Reveal>
								))}
							</ol>
							<Reveal delay={520}>
								<p className="mt-4 text-[13.5px] leading-relaxed text-stone-500">
									The designer is not in this list until there is a deposit
									behind it.
								</p>
							</Reveal>
						</div>

						<ul className="space-y-3 text-[15px] leading-relaxed text-stone-300 md:pt-8">
							{CAPABILITIES.map((x, i) => (
								<Reveal key={x} delay={i * 80}>
									<li className="flex gap-3">
										<span className="mt-[9px] h-px w-4 shrink-0 bg-stone-600" />
										{x}
									</li>
								</Reveal>
							))}
						</ul>
					</div>
				</div>
			</section>

			{/* ── Configured to what the partner actually builds ── */}
			<section className="mx-auto max-w-6xl px-6 py-24">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
					<Reveal>
						<SectionLabel>Configured to your shop</SectionLabel>
						<h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
							Customers can only design what you can build.
						</h2>
						<p className="mt-5 text-[16px] leading-relaxed text-stone-600">
							The catalogue is yours. Bodies you stock, materials you work in,
							wrap films and colours from the suppliers you already buy from,
							equipment you are willing to fit. If you do not build in timber,
							timber is not on the menu.
						</p>
						<p className="mt-4 text-[16px] leading-relaxed text-stone-600">
							That is the difference between a configurator and a wish list. A
							customer never designs something you have to walk back — which
							would cost you the revision cycle this was meant to remove.
						</p>
					</Reveal>

					<Reveal delay={120}>
						<div className="flex items-baseline justify-between">
							<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
								Example bill of materials
							</p>
							<p className="hidden font-mono text-[11px] text-stone-400 sm:block">
								Grill line · 20 ft Airstream
							</p>
						</div>
						<div className="-mx-6 mt-3 overflow-x-auto px-6 sm:mx-0 sm:px-0">
							<table className="w-full min-w-[420px] border-collapse text-left">
								<thead>
									<tr className="border-b border-stone-300">
										<th className="py-2 font-mono text-[10px] font-normal uppercase tracking-wider text-stone-500">
											Item
										</th>
										<th className="py-2 font-mono text-[10px] font-normal uppercase tracking-wider text-stone-500">
											Specification
										</th>
										<th className="py-2 text-right font-mono text-[10px] font-normal uppercase tracking-wider text-stone-500">
											Qty
										</th>
									</tr>
								</thead>
								<tbody>
									{EXAMPLE_BOM.map((row) => (
										<tr
											key={row.item}
											className="border-b border-stone-200 transition-colors hover:bg-stone-100/70"
										>
											<td className="py-2.5 text-[14px]">{row.item}</td>
											<td className="py-2.5 text-[13.5px] text-stone-600">
												{row.spec}
											</td>
											<td className="py-2.5 text-right font-mono text-[13px] text-stone-700">
												{row.qty}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{/* Legible on purpose: an engineer reading invented numbers is
						    the fastest way to lose the room. */}
						<p className="mt-4 border-l-2 border-stone-400 bg-stone-100 py-3 pl-3 pr-3 text-[13.5px] leading-relaxed text-stone-700">
							<strong className="font-medium text-stone-900">
								This is one of our own vehicles.
							</strong>{" "}
							These are our components and our numbers, shown to illustrate the
							output. Your report is generated against your bodies, your
							suppliers and your engineering specifications — not ours.
						</p>
					</Reveal>
				</div>
			</section>

			<Rule />

			{/* ── What sales sees ── */}
			<section className="mx-auto max-w-6xl px-6 py-24">
				<Reveal>
					<SectionLabel>What your sales team sees</SectionLabel>
					<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
						You know what they are designing before you pick up the phone.
					</h2>
				</Reveal>
				<div className="mt-12 grid gap-8 sm:grid-cols-3">
					{SALES_VIEW.map((x, i) => (
						<Reveal key={x.t} delay={i * 110}>
							<div className="border-t border-stone-300 pt-4">
								<h3 className="text-[16px] font-medium">{x.t}</h3>
								<p className="mt-2 text-[15px] leading-relaxed text-stone-600">
									{x.d}
								</p>
							</div>
						</Reveal>
					))}
				</div>
			</section>

			<Rule />

			{/* ── Proof ── */}
			<section id="story" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-24">
				<Reveal>
					<SectionLabel>Where we have been</SectionLabel>
					<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">
						Retail should be able to roll into any location.
					</h2>
					<p className="mt-5 max-w-xl text-[16px] leading-relaxed text-stone-600">
						We build these, which is why we know where the hours go. Every unit
						below is one we designed and put on the road.
					</p>
				</Reveal>

				{hasGallery ? (
					<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{GALLERY.map((shot, i) => (
							<Reveal key={shot.src} delay={i * 80}>
								<figure className="group">
									<div className="aspect-[4/3] overflow-hidden rounded-sm bg-stone-200">
										<img
											src={shot.src}
											alt={shot.alt}
											loading="lazy"
											className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
										/>
									</div>
									<figcaption className="mt-2 flex items-baseline justify-between gap-3">
										<span className="text-[14px] text-stone-800">
											{shot.title}
										</span>
										<span className="font-mono text-[11px] text-stone-500">
											{shot.place}
										</span>
									</figcaption>
								</figure>
							</Reveal>
						))}
					</div>
				) : (
					<Reveal delay={120}>
						<div className="mt-12 rounded-sm border border-dashed border-stone-300 bg-stone-100/60 px-6 py-14 text-center">
							<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
								Photography pending
							</p>
							<p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-stone-600">
								Real builds, in real locations, go here. Drop them in{" "}
								<code className="rounded-sm bg-stone-200 px-1 py-0.5 font-mono text-[12.5px]">
									public/gallery/
								</code>{" "}
								and list them in{" "}
								<code className="rounded-sm bg-stone-200 px-1 py-0.5 font-mono text-[12.5px]">
									src/lib/landing-gallery.ts
								</code>
								.
							</p>
						</div>
					</Reveal>
				)}
			</section>

			{/* ── Call to action ── */}
			<section
				id="partner"
				className="scroll-mt-6 border-t border-stone-200 bg-[#111110] text-stone-100"
			>
				<div className="mx-auto max-w-6xl px-6 py-28">
					<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
						<Reveal>
							<h2 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-stone-50 sm:text-[64px]">
								Got wheels?
							</h2>
							<p className="mt-5 max-w-md text-[17px] leading-relaxed text-stone-400">
								If you build anything your customers can park somewhere and sell
								out of, we can put a configurator in front of it.
							</p>
							<a
								href="mailto:team@latechspace.com?subject=Rolling%20Retail%20—%20partnership"
								className="group mt-9 inline-flex items-center gap-2 rounded-sm bg-stone-50 px-5 py-3 text-[14px] font-medium text-stone-900 transition-colors hover:bg-white"
							>
								Partner with us
								<span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
									→
								</span>
							</a>
						</Reveal>

						<Reveal delay={140}>
							<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
								What we put on wheels
							</p>
							<ul className="mt-4 flex flex-wrap gap-2">
								{WE_BUILD.map((x) => (
									<li
										key={x}
										className="rounded-full border border-white/15 px-3 py-1.5 text-[13.5px] text-stone-400 transition-colors hover:border-white/40 hover:text-stone-100"
									>
										{x}
									</li>
								))}
							</ul>
						</Reveal>
					</div>
				</div>

				<div className="border-t border-white/10">
					<div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-[13px] text-stone-500 sm:flex-row sm:items-center sm:justify-between">
						<p>
							Rolling Retail is a product of LA Techspace. All email reaches us
							at{" "}
							<a
								href="mailto:team@latechspace.com"
								className="rr-underline text-stone-300"
							>
								team@latechspace.com
							</a>
							.
						</p>
						<Link
							to="/chat"
							className="rr-underline font-mono text-[11px] uppercase tracking-wider text-stone-500"
						>
							Open the designer
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
