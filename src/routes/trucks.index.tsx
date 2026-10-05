import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "#/components/landing/Reveal";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { TrailerArt } from "#/components/site/TrailerArt";
import { rangeLabel, TRUCKS, truckSpecs } from "#/content/trucks";
import { absoluteUrl, breadcrumbLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/trucks/")({
	component: TrucksPage,
	head: () =>
		pageHead({
			title:
				"Food trailers we build — Airstream and square concession trailers",
			description:
				"Compare our six custom food trailer bodies: square concession trailers at 10, 13 and 16 ft and Airstream Small, Mid and Large. Dimensions, best uses and planning ranges.",
			path: "/trucks",
			jsonLd: [
				breadcrumbLd([
					{ name: "Home", path: "/" },
					{ name: "Trucks", path: "/trucks" },
				]),
				{
					"@context": "https://schema.org",
					"@type": "ItemList",
					name: "Rolling Retail food trailer bodies",
					itemListElement: TRUCKS.map((t, i) => ({
						"@type": "ListItem",
						position: i + 1,
						url: absoluteUrl(`/trucks/${t.slug}`),
						name: t.name,
					})),
				},
			],
		}),
});

function TrucksPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[
					{ name: "Home", path: "/" },
					{ name: "Trucks", path: "/trucks" },
				]}
				eyebrow="The lineup"
				title="Six bodies, built in our factory."
				lede="We keep the range tight on purpose. Every body has fixed, proven geometry — which is what lets the designer show you a trailer we can actually build, and lets us build it in weeks, not months."
			/>

			<section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
				<div className="grid gap-4 md:grid-cols-2">
					{TRUCKS.map((t, i) => {
						const s = truckSpecs(t);
						return (
							<Reveal key={t.slug} delay={(i % 2) * 80}>
								<Link
									to="/trucks/$slug"
									params={{ slug: t.slug }}
									className="group grid h-full gap-6 sf-card p-6 sm:grid-cols-[1fr_1.1fr]"
								>
									<div className="flex items-end">
										<TrailerArt
											vehicleId={t.vehicleId}
											primary={i % 2 ? "#1f7a8c" : "#e8641b"}
											className="w-full text-stone-900"
										/>
									</div>
									<div>
										<h2 className="sf-display text-[30px]">{t.name}</h2>
										<p className="mt-1 text-[14px] text-stone-600">
											{t.headline}
										</p>
										<dl className="mt-4 space-y-1 text-[13px]">
											<div className="flex justify-between">
												<dt className="text-stone-500">Size</dt>
												<dd className="font-mono">
													{s?.lengthFt} × {s?.widthFt} × {s?.heightFt} ft
												</dd>
											</div>
											<div className="flex justify-between">
												<dt className="text-stone-500">Crew</dt>
												<dd>{t.crew}</dd>
											</div>
											<div className="flex justify-between">
												<dt className="text-stone-500">Planning range</dt>
												<dd className="font-mono">
													{rangeLabel(t.planningRange)}
												</dd>
											</div>
										</dl>
										<p className="mt-4 text-[12.5px] text-stone-500">
											Best for: {t.bestFor.join(", ")}
										</p>
									</div>
								</Link>
							</Reveal>
						);
					})}
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
				<h2 className="sf-display text-[30px]">Side-by-side</h2>
				<div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
					<table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
						<caption className="sr-only">
							Comparison of the six food trailer bodies
						</caption>
						<thead>
							<tr className="border-b border-stone-300">
								{[
									"Body",
									"Outside size (L × W × H)",
									"Wrap area",
									"Crew",
									"Peak",
									"Planning range",
								].map((h) => (
									<th
										key={h}
										scope="col"
										className="py-2.5 pr-4 font-mono text-[10.5px] font-normal uppercase tracking-wider text-stone-500"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{TRUCKS.map((t) => {
								const s = truckSpecs(t);
								return (
									<tr key={t.slug} className="border-b border-stone-200">
										<th scope="row" className="py-3 pr-4 font-medium">
											<Link
												to="/trucks/$slug"
												params={{ slug: t.slug }}
												className="hover:underline"
											>
												{t.name}
											</Link>
										</th>
										<td className="py-3 pr-4 font-mono text-stone-700">
											{s?.lengthFt} × {s?.widthFt} × {s?.heightFt} ft
										</td>
										<td className="py-3 pr-4 font-mono text-stone-700">
											~{s?.wrapSqft} sq ft
										</td>
										<td className="py-3 pr-4 text-stone-700">{t.crew}</td>
										<td className="py-3 pr-4 text-stone-700">{t.peak}</td>
										<td className="py-3 pr-4 font-mono text-stone-700">
											{rangeLabel(t.planningRange)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<p className="mt-4 text-[12.5px] text-stone-500">
					Planning ranges are typical equipped builds with a standard wrap, for
					budgeting. Your quote is confirmed against your final specification.
				</p>
			</section>
			<CtaBand
				title="Not sure which body fits?"
				text="Tell the designer your menu, your busiest hour and where you trade. It recommends a body — and tells you why."
			/>
		</SiteShell>
	);
}
