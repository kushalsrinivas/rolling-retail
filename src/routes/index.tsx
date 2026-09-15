/**
 * Rolling Retail — the homepage.
 *
 * Narrative order, per the review: show what is possible, state the problem in
 * enough detail that a sales lead recognises their own week in it, then the
 * solution (visibly shorter than the problem), what it plugs into, proof, and
 * one clear way to get in touch.
 *
 * It is deliberately light and typographic. The audience is sales and
 * marketing people at manufacturers, and the page has to read as though people
 * who build vehicles wrote it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { GALLERY, hasGallery } from "#/lib/landing-gallery";

export const Route = createFileRoute("/")({ component: Home });

const VehicleShowcase = lazy(
	() => import("#/components/landing/VehicleShowcase"),
);

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
	"Anything on wheels",
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

/**
 * One inquiry as it runs today. Five entries are the same word on purpose —
 * the repetition is the argument.
 */
const TODAY_STEPS = [
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

function Home() {
	return (
		<div className="rr-landing min-h-dvh bg-[#f7f6f3] text-stone-900 antialiased">
			{/* ── Nav: two links, as agreed. Nothing else earns a slot. ── */}
			<header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
				<span className="font-mono text-[13px] font-medium tracking-tight text-stone-900">
					Rolling&nbsp;Retail
				</span>
				<nav className="flex items-center gap-6 text-[13px]">
					<a
						href="#story"
						className="text-stone-600 transition-colors hover:text-stone-900"
					>
						Our story
					</a>
					<a
						href="#partner"
						className="border-b border-stone-900 pb-px font-medium text-stone-900"
					>
						Partner with us
					</a>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pt-16">
				<h1 className="max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px] lg:text-[62px]">
					White-label design software that cuts the time it takes to build with
					your partners.
				</h1>
				<p className="mt-6 max-w-xl text-[17px] leading-relaxed text-stone-600">
					Your customers configure their own vehicle — inside and out — before
					anyone opens a drawing. You get a specification you can quote from,
					and the revisions stop.
				</p>
				<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
					<a
						href="#showcase"
						className="rr-cta rounded-sm bg-stone-900 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-stone-700"
					>
						Start designing
					</a>
					<a
						href="#problem"
						className="text-[14px] text-stone-600 underline-offset-4 transition-colors hover:text-stone-900 hover:underline"
					>
						Why this is needed
					</a>
				</div>
			</section>

			{/* ── Showcase ── */}
			<section
				id="showcase"
				className="mx-auto max-w-6xl scroll-mt-6 px-6 pb-20"
			>
				<div className="mb-8 flex flex-wrap items-end justify-between gap-4">
					<div>
						<SectionLabel>See what rolls</SectionLabel>
						<h2 className="mt-2 max-w-lg text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
							Pick a build. Look inside it.
						</h2>
					</div>
					<p className="max-w-sm text-[15px] leading-relaxed text-stone-600">
						Every unit here is drawn from real dimensions and a real equipment
						list, so the power draw and the clearances are the ones the factory
						would quote.
					</p>
				</div>

				<Suspense
					fallback={
						<div className="aspect-[4/3] w-full animate-pulse rounded-sm bg-stone-200 sm:aspect-[16/10] lg:w-[62%]" />
					}
				>
					<VehicleShowcase />
				</Suspense>
			</section>

			<Rule />

			{/* ── Problem. The long section, on purpose. ── */}
			<section
				id="problem"
				className="mx-auto max-w-6xl scroll-mt-6 px-6 py-20"
			>
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

				<div className="mt-12 grid gap-10 md:grid-cols-[1fr_1fr]">
					<div>
						<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
							One inquiry, today
						</p>
						<ol className="mt-4 space-y-px">
							{TODAY_STEPS.map((step, i) => (
								<li
									key={step.id}
									className={
										step.label === "Revision"
											? "flex items-baseline gap-3 border-l-2 border-orange-600 bg-orange-50/60 py-2 pl-3 text-[15px] text-stone-800"
											: "flex items-baseline gap-3 border-l-2 border-stone-200 py-2 pl-3 text-[15px] text-stone-600"
									}
								>
									<span className="font-mono text-[11px] text-stone-400">
										{String(i + 1).padStart(2, "0")}
									</span>
									{step.label}
								</li>
							))}
						</ol>
						<p className="mt-4 text-[13.5px] leading-relaxed text-stone-500">
							Five of those eleven steps are the same step. That is where the
							designer&rsquo;s week goes.
						</p>
					</div>

					<dl className="space-y-8 md:pt-8">
						{[
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
						].map((x) => (
							<div key={x.t}>
								<dt className="text-[16px] font-medium text-stone-900">
									{x.t}
								</dt>
								<dd className="mt-1.5 text-[15px] leading-relaxed text-stone-600">
									{x.d}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<Rule />

			{/* ── Solution. Short, because that is the point. ── */}
			<section className="mx-auto max-w-6xl px-6 py-20">
				<SectionLabel>The solution</SectionLabel>
				<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">
					Send a link. Get back a specification.
				</h2>

				<div className="mt-10 grid gap-10 md:grid-cols-[1fr_1fr]">
					<div>
						<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
							The same inquiry
						</p>
						<ol className="mt-4 space-y-px">
							{[
								"Inquiry arrives",
								"Customer designs it themselves",
								"Quote",
								"Deposit",
							].map((step, i) => (
								<li
									key={step}
									className="flex items-baseline gap-3 border-l-2 border-stone-900 py-2 pl-3 text-[15px] text-stone-800"
								>
									<span className="font-mono text-[11px] text-stone-400">
										{String(i + 1).padStart(2, "0")}
									</span>
									{step}
								</li>
							))}
						</ol>
						<p className="mt-4 text-[13.5px] leading-relaxed text-stone-500">
							The designer is not in this list until there is a deposit behind
							it.
						</p>
					</div>

					<ul className="space-y-3 text-[15px] leading-relaxed text-stone-700 md:pt-8">
						{[
							"Walk around the vehicle, inside and out",
							"Choose equipment and move the layout",
							"Share inspiration images and see them reflected",
							"Watch every angle update together",
							"Save it, change it, send it back to you",
						].map((x) => (
							<li key={x} className="flex gap-3">
								<span className="mt-[9px] h-px w-4 shrink-0 bg-stone-400" />
								{x}
							</li>
						))}
					</ul>
				</div>
			</section>

			<Rule />

			{/* ── Configured to what the partner actually builds ── */}
			<section className="mx-auto max-w-6xl px-6 py-20">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
					<div>
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
					</div>

					<div>
						<div className="flex items-baseline justify-between">
							<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
								Example bill of materials
							</p>
							<p className="font-mono text-[11px] text-stone-400">
								Grill line · 20 ft Airstream
							</p>
						</div>
						<div className="mt-3 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
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
										<tr key={row.item} className="border-b border-stone-200">
											<td className="py-2.5 text-[14px] text-stone-900">
												{row.item}
											</td>
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
					</div>
				</div>
			</section>

			<Rule />

			{/* ── What sales sees ── */}
			<section className="mx-auto max-w-6xl px-6 py-20">
				<SectionLabel>What your sales team sees</SectionLabel>
				<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
					You know what they are designing before you pick up the phone.
				</h2>
				<div className="mt-10 grid gap-8 sm:grid-cols-3">
					{[
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
					].map((x) => (
						<div key={x.t} className="border-t border-stone-300 pt-4">
							<h3 className="text-[16px] font-medium text-stone-900">{x.t}</h3>
							<p className="mt-2 text-[15px] leading-relaxed text-stone-600">
								{x.d}
							</p>
						</div>
					))}
				</div>
			</section>

			<Rule />

			{/* ── Proof ── */}
			<section id="story" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-20">
				<SectionLabel>Where we have been</SectionLabel>
				<h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">
					Retail should be able to roll into any location.
				</h2>
				<p className="mt-5 max-w-xl text-[16px] leading-relaxed text-stone-600">
					We build these, which is why we know where the hours go. Every unit
					below is one we designed and put on the road.
				</p>

				{hasGallery ? (
					<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{GALLERY.map((shot) => (
							<figure key={shot.src} className="group">
								<div className="aspect-[4/3] overflow-hidden rounded-sm bg-stone-200">
									<img
										src={shot.src}
										alt={shot.alt}
										loading="lazy"
										className="h-full w-full object-cover"
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
						))}
					</div>
				) : (
					<div className="mt-10 rounded-sm border border-dashed border-stone-300 bg-stone-100/60 px-6 py-12 text-center">
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
				)}
			</section>

			<Rule />

			{/* ── Call to action ── */}
			<section
				id="partner"
				className="mx-auto max-w-6xl scroll-mt-6 px-6 py-24"
			>
				<div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
					<div>
						<h2 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[54px]">
							Got wheels?
						</h2>
						<p className="mt-5 max-w-md text-[17px] leading-relaxed text-stone-600">
							If you build anything your customers can park somewhere and sell
							out of, we can put a configurator in front of it.
						</p>
						<a
							href="mailto:team@latechspace.com?subject=Rolling%20Retail%20—%20partnership"
							className="rr-cta mt-8 inline-block rounded-sm bg-stone-900 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-stone-700"
						>
							Partner with us
						</a>
					</div>

					<div>
						<p className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
							What we put on wheels
						</p>
						<ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2">
							{WE_BUILD.map((x) => (
								<li
									key={x}
									className="rounded-sm border border-stone-300 px-2.5 py-1.5 text-[13.5px] text-stone-700"
								>
									{x}
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<footer className="border-t border-stone-200">
				<div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-[13px] text-stone-500 sm:flex-row sm:items-center sm:justify-between">
					<p>
						Rolling Retail is a product of LA Techspace. All email reaches us at{" "}
						<a
							href="mailto:team@latechspace.com"
							className="rr-link underline-offset-4 hover:underline"
						>
							team@latechspace.com
						</a>
						.
					</p>
					<Link
						to="/chat"
						className="font-mono text-[11px] uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-800"
					>
						Open the designer
					</Link>
				</div>
			</footer>
		</div>
	);
}
