import {
	AlertTriangle,
	Download,
	Loader2,
	Plus,
	Trash2,
	UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GeneratedImage } from "#/hooks/use-chat";
import {
	accentFromColors,
	emptyMenu,
	MENU_FORMATS,
	MENU_LIMITS,
	type MenuDesign,
	type MenuFormat,
	type MenuPlacement,
	type MenuStyle,
	menuArtworkSvg,
	menuItemCount,
	PLACEMENTS,
	sanitizeMenu,
} from "#/lib/food-truck/menu";
import { cn } from "#/lib/utils";
import { downloadDataUrl } from "#/lib/watermark";

const CARD = "rounded border border-[var(--ftf-line)] bg-white";
const FIELD =
	"w-full rounded border border-[var(--ftf-line)] bg-white px-2.5 py-2 text-xs text-[var(--ftf-ink)] placeholder:text-[var(--ftf-ink-4)] outline-none transition-colors hover:border-[var(--ftf-line-strong)] focus:border-[var(--ftf-blue-600)]";
const GHOST_BTN =
	"inline-flex items-center gap-1.5 rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ftf-blue-800)] transition-colors hover:bg-[var(--ftf-blue-50)] disabled:opacity-40 disabled:hover:bg-white";

function svgUrl(svg: string) {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Rasterise the artwork exactly as previewed — this is what the render sees. */
function svgToPng(svg: string, width: number, height: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onerror = () => reject(new Error("Could not draw the menu artwork."));
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not draw the menu artwork."));
				return;
			}
			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/png"));
		};
		img.src = svgUrl(svg);
	});
}

function Toggle<T extends string>({
	value,
	options,
	onChange,
}: {
	value: T;
	options: Array<{ id: T; label: string }>;
	onChange: (v: T) => void;
}) {
	return (
		<div className="inline-flex rounded border border-[var(--ftf-line-strong)] bg-white p-0.5">
			{options.map((o) => (
				<button
					key={o.id}
					type="button"
					onClick={() => onChange(o.id)}
					aria-pressed={value === o.id}
					className={cn(
						"rounded-sm px-2.5 py-1 text-[11px] font-semibold transition-colors",
						value === o.id
							? "bg-[var(--ftf-blue-800)] text-white"
							: "text-[var(--ftf-ink-2)] hover:text-[var(--ftf-ink)]",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export interface MenuBuilderProps {
	menu: MenuDesign | null;
	onChange: (menu: MenuDesign) => void;
	brand: string;
	colors: readonly string[];
	menuKeywords: readonly string[];
	/** The current `menu_board` render, if one exists. */
	board: GeneratedImage | undefined;
	hasHero: boolean;
	isRendering: boolean;
	creditsLeft: number | null;
	onRender: (menu: MenuDesign, artwork: string) => void;
}

/**
 * Build the menu on its own, then place it beside the truck.
 *
 * The artwork on the left is exact — it is drawn from what was typed, not
 * generated — and is the file that goes to print or onto a screen. The
 * render places that artwork on a stand next to the approved truck.
 */
export default function MenuBuilder({
	menu: held,
	onChange,
	brand,
	colors,
	menuKeywords,
	board,
	hasHero,
	isRendering,
	creditsLeft,
	onRender,
}: MenuBuilderProps) {
	const menu = held ?? emptyMenu(menuKeywords);
	// Adopt the seeded draft once, so the first edit has something to edit.
	useEffect(() => {
		if (!held) onChange(emptyMenu(menuKeywords));
	}, [held, menuKeywords, onChange]);

	const [busy, setBusy] = useState<MenuFormat | "render" | null>(null);
	const [failure, setFailure] = useState<string | null>(null);

	const accent = accentFromColors(colors);
	const clean = useMemo(() => sanitizeMenu(menu), [menu]);
	const svg = useMemo(
		() =>
			clean
				? menuArtworkSvg(clean, { brand, accent, format: "portrait" })
				: null,
		[clean, brand, accent],
	);
	const total = menuItemCount(menu);

	const set = (patch: Partial<MenuDesign>) => onChange({ ...menu, ...patch });
	const setSection = (si: number, patch: Partial<MenuDesign["sections"][0]>) =>
		set({
			sections: menu.sections.map((s, i) =>
				i === si ? { ...s, ...patch } : s,
			),
		});
	const setItem = (
		si: number,
		ii: number,
		patch: Partial<MenuDesign["sections"][0]["items"][0]>,
	) =>
		setSection(si, {
			items: menu.sections[si].items.map((it, i) =>
				i === ii ? { ...it, ...patch } : it,
			),
		});

	const download = async (format: MenuFormat) => {
		if (!clean) return;
		setBusy(format);
		setFailure(null);
		try {
			const { width, height } = MENU_FORMATS[format];
			const png = await svgToPng(
				menuArtworkSvg(clean, { brand, accent, format }),
				width,
				height,
			);
			const slug = brand.trim().replace(/\s+/g, "-").toLowerCase() || "menu";
			downloadDataUrl(png, `${slug}-menu-${format}.png`);
		} catch (err) {
			setFailure(err instanceof Error ? err.message : "Download failed.");
		} finally {
			setBusy(null);
		}
	};

	const render = async () => {
		if (!clean || !svg) return;
		setBusy("render");
		setFailure(null);
		try {
			const { width, height } = MENU_FORMATS.portrait;
			onRender(clean, await svgToPng(svg, width, height));
		} catch (err) {
			setFailure(err instanceof Error ? err.message : "Render failed.");
		} finally {
			setBusy(null);
		}
	};

	const noCredits = typeof creditsLeft === "number" && creditsLeft <= 0;
	const blocked = !clean
		? "Add at least one item to place the menu."
		: !hasHero
			? "Render the truck concepts first — the board is placed beside the approved exterior."
			: noCredits
				? "No visual credits left."
				: null;

	return (
		<div className="space-y-4">
			<p className="-mt-1 text-xs leading-relaxed text-[var(--ftf-ink-2)]">
				Build the menu here, then add it to your renders. The artwork is drawn
				from exactly what you type — download it for print or a screen. The
				render stands it beside your truck on the board style you pick.
			</p>

			<div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,280px)]">
				{/* ── Editor ── */}
				<div className={cn(CARD, "space-y-4 p-4")}>
					<label className="block">
						<span className="ftf-label">Tagline (optional)</span>
						<input
							className={cn(FIELD, "mt-1.5")}
							value={menu.tagline}
							maxLength={MENU_LIMITS.tagline}
							placeholder="Smash burgers · made to order"
							onChange={(e) => set({ tagline: e.target.value })}
						/>
					</label>

					{menu.sections.map((section, si) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id
							key={si}
							className="space-y-2 border-t border-[var(--ftf-line)] pt-3"
						>
							<div className="flex items-center gap-2">
								<input
									className={cn(FIELD, "font-semibold")}
									value={section.title}
									maxLength={MENU_LIMITS.title}
									placeholder="Section, e.g. Burgers"
									aria-label="Section title"
									onChange={(e) => setSection(si, { title: e.target.value })}
								/>
								{menu.sections.length > 1 && (
									<button
										type="button"
										title="Remove section"
										onClick={() =>
											set({
												sections: menu.sections.filter((_, i) => i !== si),
											})
										}
										className="shrink-0 p-1.5 text-[var(--ftf-ink-4)] hover:text-[var(--ftf-red-600)]"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
							{section.items.map((item, ii) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id
									key={ii}
									className="grid grid-cols-[1fr_76px_auto] gap-1.5"
								>
									<input
										className={FIELD}
										value={item.name}
										maxLength={MENU_LIMITS.name}
										placeholder="Item"
										aria-label="Item name"
										onChange={(e) => setItem(si, ii, { name: e.target.value })}
									/>
									<input
										className={cn(FIELD, "tabular-nums")}
										value={item.price}
										maxLength={MENU_LIMITS.price}
										placeholder="$0"
										aria-label="Price"
										onChange={(e) => setItem(si, ii, { price: e.target.value })}
									/>
									<button
										type="button"
										title="Remove item"
										onClick={() =>
											setSection(si, {
												items: section.items.filter((_, i) => i !== ii),
											})
										}
										className="p-1.5 text-[var(--ftf-ink-4)] hover:text-[var(--ftf-red-600)]"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
									<input
										className={cn(FIELD, "col-span-2 py-1.5 text-[11px]")}
										value={item.note ?? ""}
										maxLength={MENU_LIMITS.note}
										placeholder="Description (optional)"
										aria-label="Item description"
										onChange={(e) => setItem(si, ii, { note: e.target.value })}
									/>
								</div>
							))}
							<button
								type="button"
								disabled={total >= MENU_LIMITS.items}
								onClick={() =>
									setSection(si, {
										items: [...section.items, { name: "", price: "" }],
									})
								}
								className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ftf-blue-800)] hover:underline disabled:opacity-40"
							>
								<Plus className="h-3 w-3" /> Add item
							</button>
						</div>
					))}

					{menu.sections.length < MENU_LIMITS.sections && (
						<button
							type="button"
							onClick={() =>
								set({
									sections: [
										...menu.sections,
										{ title: "", items: [{ name: "", price: "" }] },
									],
								})
							}
							className={GHOST_BTN}
						>
							<Plus className="h-3 w-3" /> Add section
						</button>
					)}

					<div className="space-y-3 border-t border-[var(--ftf-line)] pt-3">
						<div>
							<span className="ftf-label">Board style</span>
							<div className="mt-1.5">
								<Toggle<MenuStyle>
									value={menu.style}
									onChange={(style) => set({ style })}
									options={[
										{ id: "chalkboard", label: "Chalkboard" },
										{ id: "printed", label: "Printed" },
									]}
								/>
							</div>
						</div>
						<div>
							<span className="ftf-label">Where it goes</span>
							<div className="mt-1.5">
								<Toggle<MenuPlacement>
									value={menu.placement}
									onChange={(placement) => set({ placement })}
									options={(Object.keys(PLACEMENTS) as MenuPlacement[]).map(
										(id) => ({ id, label: PLACEMENTS[id].label }),
									)}
								/>
							</div>
							<p className="mt-1.5 text-[11px] text-[var(--ftf-ink-3)]">
								{PLACEMENTS[menu.placement].hint}
							</p>
						</div>
					</div>
				</div>

				{/* ── Artwork preview ── */}
				<div className="space-y-2">
					<div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded bg-[var(--ftf-well)] p-3">
						{svg ? (
							<img
								src={svgUrl(svg)}
								alt="Menu artwork preview"
								className="h-full w-full object-contain"
							/>
						) : (
							<span className="ftf-label !text-white/40">
								Add an item to preview
							</span>
						)}
					</div>
					<div className="flex flex-wrap gap-1.5">
						{(Object.keys(MENU_FORMATS) as MenuFormat[]).map((f) => (
							<button
								key={f}
								type="button"
								disabled={!clean || busy !== null}
								onClick={() => download(f)}
								className={GHOST_BTN}
								title={`Download ${MENU_FORMATS[f].label}`}
							>
								{busy === f ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<Download className="h-3 w-3" />
								)}
								{MENU_FORMATS[f].label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* ── Place it in the render ── */}
			<div className={cn(CARD, "p-4")}>
				<div className="flex flex-wrap items-center gap-3">
					<UtensilsCrossed className="h-4 w-4 text-[var(--ftf-blue-800)]" />
					<span className="ftf-label !text-[var(--ftf-ink)]">
						Add this menu to your renders
					</span>
					<button
						type="button"
						onClick={render}
						disabled={Boolean(blocked) || isRendering || busy !== null}
						className="ftf-cta ml-auto inline-flex items-center gap-1.5 rounded px-4 py-2 text-xs disabled:opacity-40"
					>
						{isRendering || busy === "render" ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : null}
						{board?.status === "ready"
							? "Re-render board"
							: "Render menu board"}{" "}
						· 1 credit
					</button>
				</div>
				{blocked && (
					<p className="mt-2 text-[11px] text-[var(--ftf-ink-3)]">{blocked}</p>
				)}
				{failure && (
					<p className="mt-2 text-[11px] text-[var(--ftf-red-600)]">
						{failure}
					</p>
				)}

				{isRendering ? (
					<div className="ftf-working mt-3 flex aspect-video flex-col items-center justify-center gap-2 rounded bg-[var(--ftf-well)]">
						<Loader2 className="h-5 w-5 animate-spin text-white/40" />
						<span className="ftf-label !text-white/40">
							Placing the menu beside your truck
						</span>
					</div>
				) : board?.status === "ready" ? (
					<div className="mt-3 space-y-1.5">
						<div className="overflow-hidden rounded bg-[var(--ftf-well)]">
							<img
								src={board.url}
								alt="Menu board render"
								className="aspect-video w-full object-cover"
							/>
						</div>
						<p className="text-[11px] text-[var(--ftf-ink-3)]">
							Lettering in the render is AI-drawn and can drift. Use the
							downloaded artwork for anything that gets printed.
						</p>
					</div>
				) : board?.status === "failed" ? (
					<div className="mt-3 flex items-center gap-2 rounded border-l-2 border-[var(--ftf-amber-500)] bg-[var(--ftf-amber-100)] px-3 py-2.5 text-[11px] text-[var(--ftf-amber-600)]">
						<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
						{board.error ?? "The menu board did not render."}
					</div>
				) : null}
			</div>
		</div>
	);
}
