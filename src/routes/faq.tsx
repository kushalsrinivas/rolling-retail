import { createFileRoute } from "@tanstack/react-router";
import { FaqList, slugify } from "#/components/site/ContentBody";
import { CtaBand, PageHero, SiteShell } from "#/components/site/SiteChrome";
import { ALL_FAQS, FAQ_GROUPS } from "#/content/faqs";
import { breadcrumbLd, faqLd, pageHead, SITE } from "#/lib/site";

export const Route = createFileRoute("/faq")({
	component: FaqPage,
	head: () =>
		pageHead({
			title: "Food trailer FAQ — design, builds, costs and permits",
			description:
				"Answers about designing and buying a custom food trailer: how the online designer works, our six bodies, lead times, costs, permits and financing.",
			path: "/faq",
			jsonLd: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]), faqLd(ALL_FAQS)],
		}),
});

function FaqPage() {
	return (
		<SiteShell>
			<PageHero
				crumbs={[{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]}
				eyebrow="FAQ"
				title="Questions buyers ask us."
				lede={`Can't find yours? Email ${SITE.email} — a person from the build team answers.`}
			/>
			<div className="mx-auto max-w-4xl space-y-14 px-4 pb-20 sm:px-6">
				{FAQ_GROUPS.map((g) => (
					<section key={g.title} id={slugify(g.title)} className="scroll-mt-24">
						<h2 className="mb-4 text-[22px] font-semibold tracking-tight">{g.title}</h2>
						<FaqList faqs={g.faqs} />
					</section>
				))}
			</div>
			<CtaBand />
		</SiteShell>
	);
}
