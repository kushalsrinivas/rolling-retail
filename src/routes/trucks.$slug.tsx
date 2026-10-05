import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, X } from "lucide-react";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { TrailerArt } from "#/components/site/TrailerArt";
import { getTruck, rangeLabel, TRUCKS, truckSpecs } from "#/content/trucks";
import { USE_CASES } from "#/content/use-cases";
import { absoluteUrl, breadcrumbLd, ORG_ID, pageHead } from "#/lib/site";

export const Route = createFileRoute("/trucks/$slug")({
	loader: ({ params }) => {
		const truck = getTruck(params.slug);
		if (!truck) throw notFound();
		return truck;
	},
	head: ({ loaderData: t }) => {
		if (!t) return {};
		const s = truckSpecs(t);
		const path = `/trucks/${t.slug}`;
		return pageHead({
			title: `${t.name} food trailer — specs, layouts and pricing`,
			description:
				`${t.summary} ${s?.lengthFt} ft long. Planning range ${rangeLabel(t.planningRange)}.`.slice(
					0,
					300,
				),
			path,
			type: "product",
			jsonLd: [
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Trucks", path: "/trucks" },
					{ name: t.name, path },
				]),
				{
					"@context": "https://schema.org",
					"@type": "Product",
					name: `${t.name} custom food trailer`,
					description: t.summary,
					brand: { "@type": "Brand", name: "Rolling Retail" },
					manufacturer: { "@id": ORG_ID },
					category: "Food trailer",
					url: absoluteUrl(path),
					additionalProperty: s
						? [
								{
									"@type": "PropertyValue",
									name: "Length",
									value: s.lengthFt,
									unitCode: "FOT",
								},
								{
									"@type": "PropertyValue",
									name: "Width",
									value: s.widthFt,
									unitCode: "FOT",
								},
								{
									"@type": "PropertyValue",
									name: "Height",
									value: s.heightFt,
									unitCode: "FOT",
								},
								{ "@type": "PropertyValue", name: "Body", value: s.body },
							]
						: undefined,
					offers: {
						"@type": "AggregateOffer",
						priceCurrency: "USD",
						lowPrice: t.planningRange[0],
						highPrice: t.planningRange[1],
						availability: "https://schema.org/MadeToOrder",
						seller: { "@id": ORG_ID },
					},
				},
			],
		});
	},
	component: TruckPage,
});

function TruckPage() {
	const t = Route.useLoaderData();
	const s = truckSpecs(t);
	const useCases = USE_CASES.filter((u) => t.useCases.includes(u.slug));
	const others = TRUCKS.filter((x) => x.slug !== t.slug).slice(0, 3);
	return (
		<SiteShell>
			<PageHero
				crumbs={[
					{ name: "Home", path: "/" },
					{ name: "Trucks", path: "/trucks" },
					{ name: t.name, path: `/trucks/${t.slug}` },
				]}
				eyebrow={s?.body}
				title={`${t.name} food trailer`}
				lede={`${t.headline} ${t.summary}`}
			>
				<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
					<Link
						to="/chat"
						className="group inline-flex items-center gap-2 sf-btn px-5 py-3 text-[14px]"
					>
						Design on the {t.name}
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
					</Link>
					<p className="text-[14px] text-stone-600">
						Planning range{" "}
						<span className="font-mono text-stone-900">
							{rangeLabel(t.planningRange)}
						</span>
					</p>
				</div>
			</PageHero>

			<section className="mx-auto max-w-6xl px-4 sm:px-6">
				<div className="rounded-[18px] border-2 border-[var(--sf-ink)] bg-[var(--sf-yellow)] shadow-[6px_6px_0_var(--sf-ink)] px-6 pb-6 pt-12 sm:px-16">
					<TrailerArt
						vehicleId={t.vehicleId}
						className="mx-auto w-full max-w-3xl text-stone-900"
						title={`Side elevation drawing of the ${t.name}, curbside, with the service hatch open`}
					/>
				</div>
			</section>

			<section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr]">
				<div>
					<h2 className="sf-display text-[30px]">Specifications</h2>
					<dl className="mt-6 divide-y divide-stone-200 border-y border-stone-200 text-[14.5px]">
						{[
							["Body", s?.body],
							["Outside length", `${s?.lengthFt} ft (${s?.lengthM} m box)`],
							["Outside width", `${s?.widthFt} ft`],
							["Outside height", `${s?.heightFt} ft`],
							["Wrap area", `~${s?.wrapSqft} sq ft`],
							[
								"Serving",
								"One curbside service hatch, top-hinged, with fold-down counter",
							],
							["Crew", t.crew],
							["Peak throughput", t.peak],
							["Lead time", "6–10 weeks after design sign-off"],
						].map(([k, v]) => (
							<div key={k} className="flex justify-between gap-6 py-3">
								<dt className="text-stone-500">{k}</dt>
								<dd className="text-right text-stone-900">{v}</dd>
							</div>
						))}
					</dl>
				</div>
				<div>
					<h2 className="sf-display text-[30px]">Is it right for you?</h2>
					<ul className="mt-6 space-y-2.5 text-[15px]">
						{t.bestFor.map((b) => (
							<li key={b} className="flex gap-2.5">
								<Check
									className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sf-orange)]"
									aria-hidden
								/>
								{b}
							</li>
						))}
						{t.notFor.map((b) => (
							<li key={b} className="flex gap-2.5 text-stone-500">
								<X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
								Not for: {b.toLowerCase()}
							</li>
						))}
					</ul>
					<h3 className="mt-10 text-[17px] font-semibold">Highlights</h3>
					<ul className="mt-3 space-y-2 text-[15px] text-stone-700">
						{t.highlights.map((h) => (
							<li key={h} className="flex gap-3">
								<span
									aria-hidden
									className="mt-[11px] h-px w-3 shrink-0 bg-stone-400"
								/>
								{h}
							</li>
						))}
					</ul>
				</div>
			</section>

			{useCases.length > 0 && (
				<section className="border-t border-stone-200">
					<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
						<h2 className="sf-display text-[30px]">
							Popular builds on the {t.name}
						</h2>
						<div className="mt-6 grid gap-4 md:grid-cols-3">
							{useCases.map((u) => (
								<Link
									key={u.slug}
									to="/use-cases/$slug"
									params={{ slug: u.slug }}
									className="group sf-card p-5"
								>
									<p className="text-[16px] font-semibold">{u.name}</p>
									<p className="mt-1.5 text-[13.5px] leading-snug text-stone-600">
										{u.description}
									</p>
									<span className="mt-3 inline-block text-[13px] font-medium">
										See the layout →
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			<section className="border-t border-stone-200">
				<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
					<h2 className="sf-display text-[30px]">Compare with</h2>
					<div className="mt-5 flex flex-wrap gap-2">
						{others.map((o) => (
							<Link
								key={o.slug}
								to="/trucks/$slug"
								params={{ slug: o.slug }}
								className="rounded-full border-2 border-[var(--sf-ink)] bg-white font-semibold px-4 py-2 text-[13.5px] text-stone-700 hover:border-stone-900 hover:text-stone-900"
							>
								{o.name}
							</Link>
						))}
						<Link
							to="/resources/$slug"
							params={{ slug: "airstream-vs-square-concession-trailer" }}
							className="rounded-full border-2 border-[var(--sf-ink)] bg-white font-semibold px-4 py-2 text-[13.5px] text-stone-700 hover:border-stone-900"
						>
							Airstream vs square guide
						</Link>
					</div>
				</div>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
