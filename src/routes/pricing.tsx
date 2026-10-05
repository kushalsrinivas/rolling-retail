import { createFileRoute, Link } from "@tanstack/react-router";
import { FaqList } from "#/components/site/ContentBody";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { rangeLabel, TRUCKS, truckSpecs } from "#/content/trucks";
import { breadcrumbLd, faqLd, pageHead } from "#/lib/site";

const PRICING_FAQS = [
	{
		q: "Why do you show ranges instead of prices?",
		a: "Because the equipment line moves the price more than the trailer does. A range lets you budget honestly from day one; your quote is fixed against your final specification.",
	},
	{
		q: "What is included in a planning range?",
		a: "The body, our factory base build (electrics, plumbing, hand sink and tanks, surfaces), one equipment line for your business and a standard wrap. Hot lines include the extraction hood and fire suppression.",
	},
	{
		q: "What costs extra?",
		a: "Premium wrap film, HVAC, a second equipment station, generators, delivery outside our standard zone, and anything beyond the catalog. Permits, commissary and insurance are separate from the build — see the [full cost guide](/resources/how-much-does-a-food-trailer-cost).",
	},
	{
		q: "Is the designer really free?",
		a: "Yes. Five render rounds, a layout, a planning estimate and a spec sheet — no account and no card.",
	},
];

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () =>
		pageHead({
			title: "Food trailer pricing — planning ranges by body",
			description:
				"Planning price ranges for our custom food trailers, from a 10 ft coffee trailer to a walk-in Airstream, plus what is included, what costs extra, and wrap pricing.",
			path: "/pricing",
			jsonLd: [
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Pricing", path: "/pricing" },
				]),
				faqLd(PRICING_FAQS),
			],
		}),
});

function PricingPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[
					{ name: "Home", path: "/" },
					{ name: "Pricing", path: "/pricing" },
				]}
				eyebrow="Pricing"
				title="Honest numbers, from the first session."
				lede="Every build is custom, so we publish planning ranges — what equipped builds on each body typically cost — and the designer narrows it to your exact trailer. A quote fixes the number."
			/>
			<section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
				<div className="grid gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
					{TRUCKS.map((t) => {
						const s = truckSpecs(t);
						return (
							<div key={t.slug} className="flex flex-col bg-white p-6">
								<h2 className="text-[18px] font-semibold tracking-tight">
									{t.name}
								</h2>
								<p className="mt-1 text-[13px] text-stone-500">
									{s?.lengthFt} ft · {t.bestFor.slice(0, 2).join(", ")}
								</p>
								<p className="mt-5 font-mono text-[26px] font-medium tracking-tight">
									{rangeLabel(t.planningRange)}
								</p>
								<p className="text-[12px] text-stone-500">
									planning range, equipped
								</p>
								<Link
									to="/trucks/$slug"
									params={{ slug: t.slug }}
									className="mt-auto pt-5 text-[13.5px] font-medium underline-offset-4 hover:underline"
								>
									View {t.name} →
								</Link>
							</div>
						);
					})}
				</div>
				<p className="mt-4 text-[12.5px] text-stone-500">
					Planning ranges cover a typical equipped build with a standard wrap,
					in USD, before tax and delivery. They are not quotes.
				</p>
			</section>
			<section className="border-t border-stone-200">
				<div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
					<div>
						<h2 className="sf-display text-[30px]">Wrap pricing</h2>
						<p className="mt-3 text-[15px] leading-relaxed text-stone-600">
							Priced by area, installed. Premium is 3M cast film with
							overlaminate — what an Airstream's compound curves need.
						</p>
						<table className="mt-6 w-full border-collapse text-left text-[14px]">
							<thead>
								<tr className="border-b border-stone-300">
									{["Film", "Per sq ft, installed"].map((h) => (
										<th
											key={h}
											scope="col"
											className="py-2 font-mono text-[10.5px] font-normal uppercase tracking-wider text-stone-500"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-stone-200">
									<td className="py-3 font-medium">Standard cast film</td>
									<td className="py-3 font-mono">$12–$18</td>
								</tr>
								<tr className="border-b border-stone-200">
									<td className="py-3 font-medium">
										Premium 3M cast + overlaminate
									</td>
									<td className="py-3 font-mono">$18–$28</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div>
						<h2 className="sf-display text-[30px]">Questions about price</h2>
						<div className="mt-6">
							<FaqList faqs={PRICING_FAQS} />
						</div>
					</div>
				</div>
			</section>
			<CtaBand
				title="Get the number for your trailer."
				text="The designer narrows the range to your exact build — body, equipment, wrap and power — in about three minutes."
			/>
		</SiteShell>
	);
}
