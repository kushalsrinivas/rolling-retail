import { createFileRoute, Link } from "@tanstack/react-router";
import { CtaBand, Eyebrow, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { breadcrumbLd, organizationLd, pageHead, SITE } from "#/lib/site";

const PRINCIPLES = [
	["Only design what we can build", "The designer works from our catalog: six bodies, their real openings, the equipment we fit and the films we wrap with."],
	["Tell buyers the truth early", "If a smaller trailer is the better business, we say so. If a number is a range, we label it a range."],
	["Compliance is part of the design", "Hand sink placement, water capacity, hood and suppression are decided in the layout — not discovered at inspection."],
	["A person approves every build", "The software proposes. Our factory team confirms dimensions, openings, equipment and artwork before anything is cut."],
] as const;

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () =>
		pageHead({
			title: "About Rolling Retail — food trailer builders with an online designer",
			description:
				"Rolling Retail builds custom Airstream and square food trailers and created an online designer so buyers can see, refine and spec their trailer before the build.",
			path: "/about",
			jsonLd: [organizationLd(), breadcrumbLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])],
		}),
});

function AboutPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]}
				eyebrow="About us"
				title="We build food trailers. Then we built a better way to design them."
				lede="Buying a trailer used to mean weeks of calls, sketches and revisions before anyone agreed what was being built. We put that conversation into a designer that thinks like our factory — so you see your trailer on day one and our team builds exactly that."
			/>
			<section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
				<div className="grid gap-12 lg:grid-cols-2">
					<div className="space-y-5 text-[16.5px] leading-relaxed text-stone-700">
						<p>
							Rolling Retail builds six trailer bodies — square concession trailers at 10, 13 and 16 ft and Airstreams in three lengths — for coffee, food, drinks and retail operators across the United States.
						</p>
						<p>
							A tight range is a choice. It means every body has proven geometry, every layout follows rules we've learned on the shop floor, and every render our designer makes shows a trailer we can actually deliver.
						</p>
						<p>
							The designer encodes that shop-floor knowledge: one hot station per compact body, cooking heat on propane, power that closes before anything is rendered, and the hand sink where an inspector expects it. Read <Link to="/resources/$slug" params={{ slug: "how-we-built-the-designer" }} className="font-medium underline underline-offset-4">how we built it</Link>.
						</p>
						<p className="text-[14px] text-stone-500">{SITE.name} is a product of LA Techspace.</p>
					</div>
					<div>
						<Eyebrow>What we hold ourselves to</Eyebrow>
						<dl className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
							{PRINCIPLES.map(([t, d]) => (
								<div key={t} className="py-5">
									<dt className="text-[16px] font-semibold">{t}</dt>
									<dd className="mt-1.5 text-[14.5px] leading-relaxed text-stone-600">{d}</dd>
								</div>
							))}
						</dl>
					</div>
				</div>
			</section>
			<section className="border-t border-stone-200">
				<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
					<h2 className="text-[24px] font-semibold tracking-tight">Talk to us</h2>
					<p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-stone-600">
						Quotes, plan review questions, partnerships or press — one inbox, answered by the team:{" "}
						<a href={`mailto:${SITE.email}`} className="font-medium text-stone-900 underline underline-offset-4">{SITE.email}</a>.
					</p>
				</div>
			</section>
			<CtaBand />
		</SiteShell>
	);
}
