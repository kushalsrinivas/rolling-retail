/**
 * Menu board — the buyer's menu, designed on its own and then placed in the
 * world beside the truck.
 *
 * Image models cannot be trusted to letter a menu: every attempt the team made
 * to paint prices onto a render came back wrong, which is why menus were always
 * Photoshopped in afterwards. So the menu is split in two:
 *
 *   1. The ARTWORK is drawn here, deterministically, as SVG. Every word and
 *      price is exactly what the buyer typed, at the aspect ratio the sign
 *      will actually be printed or displayed at. This is the deliverable.
 *   2. The RENDER (`menu_board`) shows that artwork on a physical stand next to
 *      the truck — an A-frame chalkboard on the pavement or a board fixed to
 *      the side beside the hatch, the two ways operators actually show a menu.
 *      The artwork is attached as a reference so the board carries it, never
 *      painted onto the livery.
 *
 * Pure and client-safe: no fs, no fetch, no DOM.
 */

export type MenuPlacement = "a-frame" | "side-board";
export type MenuStyle = "chalkboard" | "printed";
export type MenuFormat = "portrait" | "landscape";

export interface MenuItem {
	name: string;
	price: string;
	note?: string;
}

export interface MenuSection {
	title: string;
	items: MenuItem[];
}

export interface MenuDesign {
	/** Optional line under the brand name, e.g. "Smash burgers · est. 2026". */
	tagline: string;
	sections: MenuSection[];
	placement: MenuPlacement;
	style: MenuStyle;
}

export const MENU_LIMITS = {
	sections: 4,
	items: 24,
	name: 40,
	note: 80,
	price: 10,
	title: 30,
	tagline: 60,
} as const;

/** Print sizes: a 24×36 in A-frame insert, and a 16:9 digital menu screen. */
export const MENU_FORMATS: Record<
	MenuFormat,
	{ width: number; height: number; label: string }
> = {
	portrait: { width: 1200, height: 1800, label: "A-frame / board · 24×36 in" },
	landscape: { width: 1920, height: 1080, label: "Digital screen · 16:9" },
};

export const PLACEMENTS: Record<
	MenuPlacement,
	{ label: string; hint: string }
> = {
	"a-frame": {
		label: "A-frame stand",
		hint: "Freestanding sandwich board on the pavement beside the hatch.",
	},
	"side-board": {
		label: "Board on the side",
		hint: "Framed board secured to the trailer next to the hatch.",
	},
};

export function emptyMenu(seedItems: readonly string[] = []): MenuDesign {
	const items = seedItems
		.slice(0, 6)
		.map((n) => ({ name: titleCase(n), price: "" }));
	return {
		tagline: "",
		sections: [
			{
				title: "Menu",
				items: items.length > 0 ? items : [{ name: "", price: "" }],
			},
		],
		placement: "a-frame",
		style: "chalkboard",
	};
}

function titleCase(s: string): string {
	return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const clip = (v: unknown, max: number): string =>
	typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * Normalise whatever arrived over the wire into a menu the renderer can trust.
 * Blank rows are dropped, so a half-filled form never prints an empty line.
 */
export function sanitizeMenu(raw: unknown): MenuDesign | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	let budget: number = MENU_LIMITS.items;
	const sections: MenuSection[] = [];
	for (const s of Array.isArray(r.sections) ? r.sections : []) {
		if (sections.length >= MENU_LIMITS.sections || budget <= 0) break;
		const sec = (s ?? {}) as Record<string, unknown>;
		const items: MenuItem[] = [];
		for (const it of Array.isArray(sec.items) ? sec.items : []) {
			if (budget <= 0) break;
			const i = (it ?? {}) as Record<string, unknown>;
			const name = clip(i.name, MENU_LIMITS.name);
			if (!name) continue;
			const note = clip(i.note, MENU_LIMITS.note);
			items.push({
				name,
				price: formatPrice(clip(i.price, MENU_LIMITS.price)),
				...(note ? { note } : {}),
			});
			budget--;
		}
		if (items.length === 0) continue;
		sections.push({ title: clip(sec.title, MENU_LIMITS.title), items });
	}
	if (sections.length === 0) return null;
	return {
		tagline: clip(r.tagline, MENU_LIMITS.tagline),
		sections,
		placement: r.placement === "side-board" ? "side-board" : "a-frame",
		style: r.style === "printed" ? "printed" : "chalkboard",
	};
}

/** "8" → "$8", "8.5" → "$8.50"; anything that is not a bare number is kept. */
export function formatPrice(p: string): string {
	const v = p.trim();
	if (!v) return "";
	const m = v.match(/^\$?\s*(\d{1,4})(?:\.(\d{1,2}))?$/);
	if (!m) return v;
	return m[2] ? `$${m[1]}.${m[2].padEnd(2, "0")}` : `$${m[1]}`;
}

export function menuItemCount(menu: MenuDesign): number {
	return menu.sections.reduce((n, s) => n + s.items.length, 0);
}

/* ── Artwork ─────────────────────────────────────────────────────────── */

const COLOR_HEX: Record<string, string> = {
	red: "#d23b2f",
	maroon: "#8c2a2a",
	orange: "#f08a24",
	yellow: "#f2c230",
	gold: "#d4a93c",
	brass: "#b8923f",
	copper: "#c0703f",
	green: "#3f9a5a",
	teal: "#1f9a93",
	blue: "#2f6fd0",
	navy: "#24407a",
	purple: "#7a4bc2",
	pink: "#e0679a",
	neon: "#39e07a",
	cream: "#efe3c4",
	beige: "#d9c7a3",
	brown: "#8a5a3b",
	walnut: "#6e4a32",
	wood: "#9a6b43",
};

/** First brand colour that reads as an accent; neutrals are skipped. */
export function accentFromColors(colors: readonly string[] = []): string {
	for (const c of colors) {
		const hit = COLOR_HEX[c.toLowerCase().trim()];
		if (hit) return hit;
	}
	return "#f1b32e";
}

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Rough advance width, so long names shrink instead of running off the board. */
function fitSize(text: string, maxWidth: number, size: number, k = 0.56) {
	const w = text.length * size * k;
	return w <= maxWidth
		? size
		: Math.max(12, Math.floor(maxWidth / (text.length * k)));
}

interface Row {
	kind: "section" | "item";
	section?: string;
	item?: MenuItem;
}

function rowsOf(menu: MenuDesign): Row[] {
	const rows: Row[] = [];
	const titled = menu.sections.length > 1 || menu.sections[0]?.title;
	for (const s of menu.sections) {
		if (titled && s.title) rows.push({ kind: "section", section: s.title });
		for (const item of s.items) rows.push({ kind: "item", item });
	}
	return rows;
}

/**
 * The menu artwork as a standalone SVG document at print resolution.
 *
 * System font stacks only: the SVG is rasterised through an <img>, which never
 * sees the page's web fonts, so anything else would silently fall back.
 */
export function menuArtworkSvg(
	menu: MenuDesign,
	opts: { brand: string; accent: string; format: MenuFormat },
): string {
	const { width: W, height: H } = MENU_FORMATS[opts.format];
	const chalk = menu.style === "chalkboard";
	const bg = chalk ? "#1f2523" : "#f6f1e6";
	const ink = chalk ? "#f3f1ea" : "#1c1b19";
	const muted = chalk ? "#b9bdb6" : "#5d5a53";
	const accent = opts.accent;
	const pad = Math.round(W * 0.07);
	const display = "'Arial Black','Helvetica Neue',Arial,sans-serif";
	const body = "Georgia,'Times New Roman',serif";

	const out: string[] = [];
	out.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
		"<defs>",
		`<radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${chalk ? "#2a312e" : "#fbf8f1"}"/><stop offset="1" stop-color="${bg}"/></radialGradient>`,
		"</defs>",
		`<rect width="${W}" height="${H}" fill="url(#v)"/>`,
		`<rect x="${pad / 2}" y="${pad / 2}" width="${W - pad}" height="${H - pad}" fill="none" stroke="${accent}" stroke-width="${Math.round(W * 0.005)}" rx="6"/>`,
	);

	// Header: brand, tagline, rule.
	const brand = opts.brand.trim() || "Menu";
	const headSize = fitSize(
		brand.toUpperCase(),
		W - pad * 3,
		Math.round(H * 0.075),
		0.72,
	);
	let y = pad + headSize * 1.15;
	out.push(
		`<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${ink}" font-family="${display}" font-size="${headSize}" letter-spacing="${Math.round(headSize * 0.04)}">${esc(brand.toUpperCase())}</text>`,
	);
	if (menu.tagline) {
		const ts = Math.round(headSize * 0.32);
		y += ts * 1.9;
		out.push(
			`<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${muted}" font-family="${body}" font-style="italic" font-size="${ts}">${esc(menu.tagline)}</text>`,
		);
	}
	y += headSize * 0.55;
	out.push(
		`<rect x="${W / 2 - W * 0.12}" y="${y}" width="${W * 0.24}" height="${Math.max(3, Math.round(H * 0.004))}" fill="${accent}"/>`,
	);
	const top = y + headSize * 0.7;

	// Body: one column in portrait, two in landscape once the list is long.
	const rows = rowsOf(menu);
	const cols = opts.format === "landscape" && rows.length > 7 ? 2 : 1;
	const perCol = Math.ceil(rows.length / cols);
	const bottom = H - pad * 1.1;
	const avail = bottom - top;
	// Height of each row in multiples of the item size — the exact advances
	// the drawing loop below uses, so the fit and the vertical centring agree.
	const SECTION_ABOVE = 1.9;
	const SECTION_BELOW = 0.45;
	const unit = (r: Row, first: boolean) =>
		r.kind === "section"
			? 0.78 * ((first ? 1.2 : SECTION_ABOVE) + SECTION_BELOW)
			: 1.35 + (r.item?.note ? 0.72 : 0);
	const colRows = Array.from({ length: cols }, (_, c) =>
		rows.slice(c * perCol, (c + 1) * perCol),
	);
	const colUnits = colRows.map((rs) =>
		rs.reduce((n, r, i) => n + unit(r, i === 0), 0),
	);
	const maxUnits = Math.max(...colUnits, 1);
	const itemSize = Math.max(
		16,
		Math.min(
			Math.round(H * (opts.format === "landscape" ? 0.05 : 0.036)),
			Math.floor(avail / maxUnits),
		),
	);
	// A short menu sits a little above centre instead of hugging the header.
	const slack = Math.max(0, avail - maxUnits * itemSize);
	const gutter = pad * 0.8;
	const colW = (W - pad * 2 - gutter * (cols - 1)) / cols;

	for (let c = 0; c < cols; c++) {
		const x0 = pad + c * (colW + gutter);
		const x1 = x0 + colW;
		let cy = top + slack * 0.35;
		for (const [ri, r] of colRows[c].entries()) {
			if (r.kind === "section" && r.section) {
				const ss = Math.round(itemSize * 0.78);
				cy += ss * (ri === 0 ? 1.2 : SECTION_ABOVE);
				out.push(
					`<text x="${x0}" y="${cy}" fill="${accent}" font-family="${display}" font-size="${ss}" letter-spacing="${Math.round(ss * 0.12)}">${esc(r.section.toUpperCase())}</text>`,
				);
				cy += ss * SECTION_BELOW;
				continue;
			}
			const it = r.item;
			if (!it) continue;
			const priceW = it.price
				? it.price.length * itemSize * 0.6 + itemSize * 0.6
				: 0;
			const ns = fitSize(it.name, colW - priceW - itemSize, itemSize);
			cy += itemSize * 1.35;
			out.push(
				`<text x="${x0}" y="${cy}" fill="${ink}" font-family="${body}" font-weight="bold" font-size="${ns}">${esc(it.name)}</text>`,
			);
			if (it.price) {
				// Bold serif runs wider than the fit estimate; err toward a gap.
				const leadStart = x0 + it.name.length * ns * 0.62 + itemSize * 0.5;
				const leadEnd = x1 - priceW + itemSize * 0.2;
				if (leadEnd - leadStart > itemSize) {
					out.push(
						`<line x1="${leadStart}" y1="${cy - itemSize * 0.12}" x2="${leadEnd}" y2="${cy - itemSize * 0.12}" stroke="${muted}" stroke-width="2" stroke-dasharray="2 ${Math.round(itemSize * 0.3)}" stroke-linecap="round"/>`,
					);
				}
				out.push(
					`<text x="${x1}" y="${cy}" text-anchor="end" fill="${ink}" font-family="${display}" font-size="${Math.round(itemSize * 0.92)}">${esc(it.price)}</text>`,
				);
			}
			if (it.note) {
				const ns2 = fitSize(it.note, colW, Math.round(itemSize * 0.58), 0.5);
				cy += itemSize * 0.72;
				out.push(
					`<text x="${x0}" y="${cy}" fill="${muted}" font-family="${body}" font-style="italic" font-size="${ns2}">${esc(it.note)}</text>`,
				);
			}
		}
	}

	out.push("</svg>");
	return out.join("");
}

/* ── Render brief ────────────────────────────────────────────────────── */

export interface MenuBoardPromptArgs {
	brand: string;
	hasBrand: boolean;
	vehicleLabel: string;
	menu: MenuDesign;
}

/**
 * The `menu_board` view. It is the approved exterior with exactly one addition:
 * the stand carrying the buyer's artwork. The camera is placed so the board
 * face is near-frontal and large in frame, which is the only way the lettering
 * has a chance of surviving.
 */
export function menuBoardPrompt(args: MenuBoardPromptArgs): string {
	const { menu } = args;
	const surface =
		menu.style === "chalkboard"
			? "a matte black chalkboard face"
			: "a printed menu poster behind a clear protective sleeve";
	const stand =
		menu.placement === "side-board"
			? `a framed menu board (${surface}) secured flat to the trailer's side wall immediately beside the open service hatch, at eye height, with a slim frame in the brand's accent colour and neat stainless fixings`
			: `a freestanding A-frame sandwich board (${surface}) standing on the pavement a short step in front of and beside the open service hatch, with a sturdy frame in the brand's accent colour or natural hardwood`;
	return [
		`Photorealistic concept render of the ${args.hasBrand ? `"${args.brand}"` : "unnamed"} food truck (${args.vehicleLabel}) at its serving position, open for trade in golden-hour light.`,
		`MENU BOARD SHOT: three-quarter front angle, camera at standing eye level a few metres back, framed so the trailer's open service hatch and ${stand} are both clearly in frame. The board is the foreground subject: its face is turned almost square to the camera, sharp, evenly lit and large enough in the frame to read.`,
		"The board face shows the attached MENU ARTWORK reference exactly — same layout, same words, same prices, same colours — as a flat printed insert. Do not rewrite, reorder, translate, abbreviate or invent any menu text, and put no other menu anywhere in the scene. The trailer livery itself carries no menu.",
		"NO PEOPLE: no customers, staff, passers-by, silhouettes or hands. Clean pavement, shallow depth of field on the background only.",
	].join(" ");
}
