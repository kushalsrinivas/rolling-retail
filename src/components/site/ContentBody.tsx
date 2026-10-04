/**
 * Renders content blocks (articles, stories) with one typographic system.
 * Inline text supports **bold** and [label](href) — internal hrefs become
 * client-side links, external ones open safely.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Block, Faq } from "#/content/types";
import { cn } from "#/lib/utils";

export function slugify(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** **bold** and [label](href) → React nodes. */
export function Inline({ text }: { text: string }) {
	const out: ReactNode[] = [];
	const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
	let last = 0;
	let m: RegExpExecArray | null = re.exec(text);
	while (m) {
		if (m.index > last) out.push(text.slice(last, m.index));
		if (m[1]) {
			out.push(
				<strong key={m.index} className="font-semibold text-stone-900">
					{m[1]}
				</strong>,
			);
		} else if (m[2] && m[3]) {
			const href = m[3];
			out.push(
				href.startsWith("/") ? (
					<Link
						key={m.index}
						to={href as "/"}
						className="font-medium text-stone-900 underline decoration-stone-400 underline-offset-[3px] transition-colors hover:decoration-stone-900"
					>
						{m[2]}
					</Link>
				) : (
					<a
						key={m.index}
						href={href}
						rel="noopener noreferrer"
						target="_blank"
						className="font-medium text-stone-900 underline decoration-stone-400 underline-offset-[3px]"
					>
						{m[2]}
					</a>
				),
			);
		}
		last = m.index + m[0].length;
		m = re.exec(text);
	}
	if (last < text.length) out.push(text.slice(last));
	return <>{out}</>;
}

export function ContentBody({ blocks }: { blocks: Block[] }) {
	return (
		<div className="text-[16.5px] leading-[1.75] text-stone-700">
			{blocks.map((b, i) => {
				const key = `${b.type}-${i}`;
				switch (b.type) {
					case "p":
						return (
							<p key={key} className="mt-5">
								<Inline text={b.text} />
							</p>
						);
					case "h2":
						return (
							<h2
								key={key}
								id={b.id ?? slugify(b.text)}
								className="mt-12 scroll-mt-24 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-stone-900"
							>
								{b.text}
							</h2>
						);
					case "h3":
						return (
							<h3 key={key} className="mt-8 text-[18px] font-semibold text-stone-900">
								{b.text}
							</h3>
						);
					case "ul":
						return (
							<ul key={key} className="mt-5 space-y-2.5">
								{b.items.map((it) => (
									<li key={it} className="flex gap-3">
										<span aria-hidden className="mt-[13px] h-px w-3 shrink-0 bg-stone-400" />
										<span>
											<Inline text={it} />
										</span>
									</li>
								))}
							</ul>
						);
					case "ol":
						return (
							<ol key={key} className="mt-5 space-y-3">
								{b.items.map((it, n) => (
									<li key={it} className="flex gap-3">
										<span className="mt-[3px] font-mono text-[12px] text-stone-400">
											{String(n + 1).padStart(2, "0")}
										</span>
										<span>
											<Inline text={it} />
										</span>
									</li>
								))}
							</ol>
						);
					case "table":
						return (
							<figure key={key} className="mt-7">
								<div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
									<table className="w-full min-w-[480px] border-collapse text-left text-[14.5px]">
										<thead>
											<tr className="border-b border-stone-300">
												{b.head.map((h) => (
													<th
														key={h || "blank"}
														scope="col"
														className="py-2.5 pr-4 font-mono text-[10.5px] font-normal uppercase tracking-wider text-stone-500"
													>
														{h}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{b.rows.map((row) => (
												<tr key={row.join("|")} className="border-b border-stone-200">
													{row.map((cell, ci) => (
														<td
															key={`${ci}-${cell}`}
															className={cn("py-3 pr-4 align-top", ci === 0 ? "font-medium text-stone-900" : "text-stone-600")}
														>
															<Inline text={cell} />
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{b.caption && (
									<figcaption className="mt-2 text-[12.5px] text-stone-500">{b.caption}</figcaption>
								)}
							</figure>
						);
					case "callout":
						return (
							<aside
								key={key}
								className={cn(
									"mt-7 border-l-2 px-5 py-4 text-[15px]",
									b.tone === "warn" ? "border-[#e8641b] bg-[#fbf0e6]" : "border-stone-500 bg-stone-100",
								)}
							>
								{b.title && <p className="font-semibold text-stone-900">{b.title}</p>}
								<p className={b.title ? "mt-1" : undefined}>
									<Inline text={b.text} />
								</p>
							</aside>
						);
					case "quote":
						return (
							<blockquote key={key} className="mt-7 border-l-2 border-stone-900 pl-5">
								<p className="font-mono text-[14px] leading-relaxed text-stone-800">{b.text}</p>
								{b.cite && <cite className="mt-2 block text-[12.5px] not-italic text-stone-500">— {b.cite}</cite>}
							</blockquote>
						);
					case "cta":
						return (
							<div key={key} className="mt-10 rounded-sm bg-[#111110] px-6 py-6 text-stone-100 sm:flex sm:items-center sm:justify-between sm:gap-6">
								<div>
									<p className="text-[17px] font-semibold text-stone-50">{b.title}</p>
									<p className="mt-1 text-[14.5px] leading-relaxed text-stone-400">{b.text}</p>
								</div>
								<Link
									to={b.href as "/"}
									className="group mt-4 inline-flex shrink-0 items-center gap-2 rounded-sm bg-stone-50 px-4 py-2.5 text-[14px] font-medium text-stone-900 sm:mt-0"
								>
									{b.label}
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
								</Link>
							</div>
						);
					default:
						return null;
				}
			})}
		</div>
	);
}

export function FaqList({ faqs, headingLevel = 3 }: { faqs: Faq[]; headingLevel?: 2 | 3 }) {
	const H = headingLevel === 2 ? "h2" : "h3";
	return (
		<div className="divide-y divide-stone-200 border-y border-stone-200">
			{faqs.map((f) => (
				<details key={f.q} className="group py-5">
					<summary className="flex cursor-pointer list-none items-start justify-between gap-6 [&::-webkit-details-marker]:hidden">
						<H className="text-[16.5px] font-medium text-stone-900">{f.q}</H>
						<span
							aria-hidden
							className="mt-1 text-[18px] leading-none text-stone-400 transition-transform duration-300 group-open:rotate-45"
						>
							+
						</span>
					</summary>
					<p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-stone-600">
						<Inline text={f.a} />
					</p>
				</details>
			))}
		</div>
	);
}
