/**
 * Site header, footer and page shell — the frame every marketing page shares.
 *
 * One component owns the navigation so a page can never ship without the
 * way back, and one owns the footer so every page carries the full internal
 * link graph (trucks, use cases, guides) for visitors and crawlers alike.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { FOOTER_GUIDES } from "#/content/nav";
import { TRUCKS } from "#/content/trucks";
import { USE_CASES } from "#/content/use-cases";
import { SITE } from "#/lib/site";
import { cn } from "#/lib/utils";

const NAV = [
	{ to: "/trucks", label: "Trucks" },
	{ to: "/use-cases", label: "Use cases" },
	{ to: "/how-it-works", label: "How it works" },
	{ to: "/pricing", label: "Pricing" },
	{ to: "/resources", label: "Resources" },
] as const;

export function Logo({ className }: { className?: string }) {
	return (
		<span className={cn("flex items-center gap-2", className)}>
			<svg viewBox="0 0 32 32" className="h-9 w-9 -rotate-6" aria-hidden="true">
				<title>Rolling Retail</title>
				<rect width="32" height="32" rx="8" fill="#ff5a1f" />
				<rect x="6" y="9" width="20" height="11" rx="5.5" fill="#17130f" />
				<rect x="10" y="12" width="8" height="4" fill="#ffc83d" />
				<circle cx="17" cy="22.5" r="2.6" fill="#17130f" />
				<path
					d="M6 17 L2.5 19.5"
					stroke="#17130f"
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
			</svg>
			<span className="sf-display text-[22px] text-[var(--sf-ink)]">
				Rolling Retail
			</span>
		</span>
	);
}

export function SiteHeader() {
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 transition-colors duration-300",
				scrolled || open
					? "border-b-2 border-[var(--sf-ink)] bg-[var(--sf-paper)]/95 backdrop-blur-md"
					: "border-b-2 border-transparent bg-[var(--sf-paper)]",
			)}
		>
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-stone-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
			>
				Skip to content
			</a>
			<div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
				<Link
					to="/"
					aria-label={`${SITE.name} home`}
					onClick={() => setOpen(false)}
				>
					<Logo />
				</Link>
				<nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
					{NAV.map((n) => (
						<Link
							key={n.to}
							to={n.to}
							className="rounded-full px-3.5 py-1.5 text-[14px] font-semibold text-[var(--sf-ink)] transition-colors hover:bg-[var(--sf-yellow)]"
							activeProps={{
								className:
									"bg-[var(--sf-ink)] !text-[var(--sf-paper)] hover:!bg-[var(--sf-ink)]",
							}}
						>
							{n.label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<Link
						to="/chat"
						className="group hidden items-center gap-1.5 sf-btn px-4 py-2.5 text-[13px] sm:flex"
					>
						Design your trailer
						<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
					</Link>
					<button
						type="button"
						className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--sf-ink)] bg-white text-[var(--sf-ink)] lg:hidden"
						aria-expanded={open}
						aria-controls="mobile-nav"
						aria-label={open ? "Close menu" : "Open menu"}
						onClick={() => setOpen((o) => !o)}
					>
						{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>
			{open && (
				<nav
					id="mobile-nav"
					aria-label="Mobile"
					className="h-[calc(100dvh-72px)] overflow-y-auto border-t-2 border-[var(--sf-ink)] bg-[var(--sf-paper)] px-4 pb-10 pt-4 lg:hidden"
				>
					<ul className="divide-y-2 divide-[var(--sf-ink)]/10">
						{[
							...NAV,
							{ to: "/stories", label: "Customer stories" },
							{ to: "/about", label: "About" },
							{ to: "/faq", label: "FAQ" },
						].map((n) => (
							<li key={n.to}>
								<Link
									to={n.to}
									onClick={() => setOpen(false)}
									className="sf-display flex items-center justify-between py-4 text-[30px] text-[var(--sf-ink)]"
								>
									{n.label}
									<ArrowRight className="h-4 w-4 text-stone-400" />
								</Link>
							</li>
						))}
					</ul>
					<Link
						to="/chat"
						onClick={() => setOpen(false)}
						className="sf-btn mt-6 w-full justify-center px-4 py-4 text-[16px]"
					>
						Design your trailer — free
						<ArrowRight className="h-4 w-4" />
					</Link>
				</nav>
			)}
		</header>
	);
}

export function SiteFooter() {
	const year = new Date().getFullYear();
	const col = (
		title: string,
		links: Array<{
			to: string;
			label: string;
			params?: Record<string, string>;
		}>,
	) => (
		<div>
			<p className="sf-display text-[20px] text-[var(--sf-yellow)]">{title}</p>
			<ul className="mt-4 space-y-2.5">
				{links.map((l) => (
					<li key={l.label}>
						<Link
							to={l.to as "/"}
							params={l.params as never}
							className="text-[13.5px] text-stone-400 transition-colors hover:text-stone-50"
						>
							{l.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
	return (
		<footer className="bg-[var(--sf-ink)] text-stone-300">
			<div className="sf-checker" aria-hidden />
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
				<p
					aria-hidden
					className="sf-display mb-14 select-none text-[56px] leading-[0.85] text-[var(--sf-orange)] sm:text-[120px] lg:text-[150px]"
				>
					Rolling Retail
				</p>
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
					<div>
						<p className="text-[15px] font-bold text-stone-50">
							Design it before you buy it.
						</p>
						<p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-stone-400">
							Design software for custom Airstream and square food trailers.
							Buyers design online and take a spec sheet to their builder.
						</p>
						<a
							href={`mailto:${SITE.email}?subject=Food%20trailer%20quote`}
							className="sf-btn mt-6 px-4 py-2 text-[13px]"
						>
							{SITE.email}
						</a>
					</div>
					{col(
						"Trucks",
						TRUCKS.map((t) => ({
							to: "/trucks/$slug",
							params: { slug: t.slug },
							label: t.name,
						})),
					)}
					{col(
						"Use cases",
						USE_CASES.map((u) => ({
							to: "/use-cases/$slug",
							params: { slug: u.slug },
							label: u.name,
						})),
					)}
					{col(
						"Guides",
						FOOTER_GUIDES.map((g) => ({
							to: "/resources/$slug",
							params: { slug: g.slug },
							label: g.label,
						})),
					)}
					{col("Company", [
						{ to: "/how-it-works", label: "How it works" },
						{ to: "/pricing", label: "Pricing" },
						{ to: "/stories", label: "Customer stories" },
						{ to: "/about", label: "About us" },
						{ to: "/faq", label: "FAQ" },
						{ to: "/chat", label: "Open the designer" },
					])}
				</div>
				<div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[12.5px] text-stone-400 sm:flex-row sm:items-center sm:justify-between">
					<p>
						© {year} {SITE.legalName}. Renders are concept visualizations;
						builds are quoted and confirmed by your builder.
					</p>
					<p>Food trailer design software</p>
				</div>
			</div>
		</footer>
	);
}

export function SiteShell({ children }: { children: ReactNode }) {
	return (
		<div className="rr-landing flex min-h-dvh flex-col bg-[var(--sf-paper)] text-[var(--sf-ink)] antialiased">
			<SiteHeader />
			<main id="main" className="flex-1">
				{children}
			</main>
			<SiteFooter />
		</div>
	);
}

export function Eyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"inline-block -rotate-1 rounded-full border-2 border-[var(--sf-ink)] bg-[var(--sf-yellow)] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--sf-ink)]",
				className,
			)}
		>
			{children}
		</p>
	);
}

export function Breadcrumbs({
	items,
}: {
	items: Array<{ name: string; path: string }>;
}) {
	return (
		<nav aria-label="Breadcrumb" className="text-[12.5px] text-stone-500">
			<ol className="flex flex-wrap items-center gap-1.5">
				{items.map((it, i) => (
					<li key={it.path} className="flex items-center gap-1.5">
						{i > 0 && <span aria-hidden>/</span>}
						{i === items.length - 1 ? (
							<span aria-current="page" className="text-stone-700">
								{it.name}
							</span>
						) : (
							<a href={it.path} className="hover:text-stone-900">
								{it.name}
							</a>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}

export function PageHero({
	eyebrow,
	title,
	lede,
	children,
	crumbs,
}: {
	eyebrow?: string;
	title: string;
	lede?: string;
	children?: ReactNode;
	crumbs?: Array<{ name: string; path: string }>;
}) {
	return (
		<section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
			{crumbs && <Breadcrumbs items={crumbs} />}
			{eyebrow && (
				<Eyebrow className={crumbs ? "mt-8" : undefined}>{eyebrow}</Eyebrow>
			)}
			<h1 className="mt-5 max-w-4xl text-[52px] sf-display text-[var(--sf-ink)] sm:text-[84px]">
				{title}
			</h1>
			{lede && (
				<p className="mt-6 max-w-2xl text-[18px] font-medium leading-relaxed text-stone-700">
					{lede}
				</p>
			)}
			{children}
		</section>
	);
}

export function CtaBand({
	title = "See your trailer before you buy it.",
	text = "Answer a three-minute brief. Get photoreal concepts, an equipment layout, a wrap plan and a planning estimate — free, no account.",
}: {
	title?: string;
	text?: string;
}) {
	return (
		<section className="border-t-2 border-[var(--sf-ink)] bg-[var(--sf-orange)]">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
				<div className="max-w-xl">
					<h2 className="text-[48px] sf-display text-[var(--sf-ink)] sm:text-[72px]">
						{title}
					</h2>
					<p className="mt-4 text-[17px] font-medium leading-relaxed text-[var(--sf-ink)]">
						{text}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					<Link
						to="/chat"
						className="group sf-btn sf-btn-ink px-6 py-4 text-[15px]"
					>
						Design your trailer
						<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
					</Link>
					<a
						href={`mailto:${SITE.email}?subject=Food%20trailer%20quote`}
						className="rr-underline text-[15px] font-semibold text-[var(--sf-ink)]"
					>
						Talk to us
					</a>
				</div>
			</div>
		</section>
	);
}

export function IllustrativeNotice() {
	return (
		<p className="mt-6 max-w-2xl rounded-xl border-2 border-[var(--sf-ink)] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-stone-700">
			<strong className="font-semibold text-stone-900">
				Illustrative example.
			</strong>{" "}
			The businesses, people and figures in these stories are composites based
			on typical builds — not real customers. We will replace them with real
			case studies as customers give permission.
		</p>
	);
}
