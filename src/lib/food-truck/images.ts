import { CONCEPT_VIEWS, type ConceptView, geometryFor } from "./constants";
import {
	buildReferences,
	conceptStages,
	continuityLock,
	type RenderReference,
} from "./continuity";
import { factoryReference } from "./references";

/**
 * Truck concept image generation.
 * Primary: Gemini image model ("nano banana" family) via REST.
 * Fallback: branded SVG placeholder data-URL so the proposal demo never breaks.
 */

function geminiKey() {
	return (
		process.env.GOOGLE_API_KEY ||
		process.env.GEMINI_API_KEY ||
		process.env.GOOGLE_GENAI_API_KEY ||
		""
	);
}

export function placeholderImage(label: string, title: string): string {
	const pretty = label.replace(/_/g, " ");
	// Industrial palette, matching the /chat design system — the old
	// placeholder was still painting the retired purple theme.
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg' width='960' height='540'>` +
		`<rect width='960' height='540' fill='#0c1424'/>` +
		`<rect x='0' y='0' width='960' height='6' fill='#0a3dad'/>` +
		`<rect x='120' y='200' width='720' height='150' rx='6' fill='none' stroke='#2071ba' stroke-opacity='0.5' stroke-width='3'/>` +
		`<rect x='150' y='225' width='220' height='100' rx='4' fill='#2071ba' fill-opacity='0.16'/>` +
		`<circle cx='300' cy='370' r='34' fill='#121c30' stroke='#39476b'/><circle cx='660' cy='370' r='34' fill='#121c30' stroke='#39476b'/>` +
		`<text x='480' y='120' text-anchor='middle' fill='#e8edf6' font-family='Montserrat,sans-serif' font-size='34' font-weight='800'>${escapeXml(title)}</text>` +
		`<text x='480' y='158' text-anchor='middle' fill='#7b89a3' font-family='sans-serif' font-size='17' letter-spacing='2'>${escapeXml(pretty.toUpperCase())}</text>` +
		`<text x='480' y='288' text-anchor='middle' fill='#ff9900' font-family='Montserrat,sans-serif' font-size='20' font-weight='700'>RENDER UNAVAILABLE</text>` +
		`</svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
	return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface TruckImageArgs {
	brand: string;
	vehicleLabel: string;
	label: string;
	prompt: string;
	/**
	 * The reference set for this view, already ordered by `buildReferences` —
	 * closest viewpoint first, identity anchor next, shell photo last. The
	 * three loose `*Reference` slots this replaced could only ever express
	 * "shell + livery + mood", which is why interior views never saw each
	 * other.
	 */
	references?: readonly RenderReference[];
	/** Fixed geometry of this body, from VEHICLE_GEOMETRY. */
	geometry?: string | null;
}

export async function generateTruckImage(
	args: TruckImageArgs,
): Promise<{ url: string; model: string }> {
	const key = geminiKey();
	const model = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";
	if (!key) {
		return {
			url: placeholderImage(args.label, args.brand || args.vehicleLabel),
			model: "placeholder (no key)",
		};
	}
	/*
	 * The reference set arrives already prioritised by `buildReferences`, so
	 * this only has to decode it. Anything that fails to decode is dropped
	 * from BOTH the parts array and the lock text — a lock that numbers an
	 * image the model never received is worse than no lock at all, and that
	 * desync is exactly how the old three-slot version mislabelled its
	 * references whenever one slot was empty.
	 */
	const refParts: Array<{ inlineData: { mimeType: string; data: string } }> =
		[];
	const attached: RenderReference[] = [];
	for (const ref of args.references ?? []) {
		const m = ref.url.match(
			/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s,
		);
		if (!m?.[2] || m[1] === "image/svg+xml") continue;
		refParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
		attached.push(ref);
	}

	const lock = continuityLock(attached, args.geometry);
	const text = lock ? `${args.prompt} ${lock}` : args.prompt;
	try {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text }, ...refParts] }],
					generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
				}),
			},
		);
		if (!res.ok) throw new Error(`image model ${res.status}`);
		const data = (await res.json()) as {
			candidates?: Array<{
				content?: {
					parts?: Array<{
						inlineData?: { mimeType?: string; data?: string };
						text?: string;
					}>;
				};
			}>;
		};
		const parts = data.candidates?.[0]?.content?.parts ?? [];
		const img = parts.find((p) => p.inlineData?.data);
		if (img?.inlineData?.data) {
			const mime = img.inlineData.mimeType || "image/png";
			return { url: `data:${mime};base64,${img.inlineData.data}`, model };
		}
		throw new Error("no image part");
	} catch (err) {
		console.warn("[food-truck] image fallback:", err);
		return {
			url: placeholderImage(args.label, args.brand || args.vehicleLabel),
			model: "placeholder (fallback)",
		};
	}
}

export type VehicleBody = "airstream" | "square";
export type ServeMode = "hatch-serve" | "walk-in" | "hybrid";

export interface ConceptPromptArgs {
	brand: string;
	vehicleLabel: string;
	vehicleBody: VehicleBody;
	lengthM: number;
	widthM: number;
	heightM: number;
	colors: string;
	vibe: string;
	businessType: string;
	menuKeywords: string[];
	equipment: readonly string[];
	serveMode: ServeMode;
	brainNote?: string;
	/** False when the buyer has not named the business, so nothing is lettered. */
	hasBrand?: boolean;
}

/** Turn raw equipment ids (e.g. "griddle-chargrill") into readable phrases. */
export function equipmentPhrase(equipment: readonly string[]): string {
	const map: Record<string, string> = {
		fryer: "electric fryer bank",
		"griddle-chargrill": "flat-top griddle and chargrill",
		griddle: "flat-top griddle",
		"pizza-oven": "deck pizza oven",
		"wok-rice-station": "wok and rice station",
		"coffee-machine": "espresso machine",
		"espresso-machine": "espresso machine",
		grinder: "grinder",
		"extraction-hood": "extraction hood with fire suppression",
		"fire-suppression": "Ansul fire suppression",
		"hand-basin": "hand basin",
		refrigeration: "under-counter refrigeration",
		"under-counter-refrigeration": "under-counter refrigeration",
		"chilled-storage": "chilled storage",
		"chilled-milk-storage": "chilled milk storage",
		"display-case": "chilled display case",
		"dipping-cabinet": "gelato dipping cabinet",
		"reserve-freezers": "reserve freezers",
		freezers: "freezers",
		ice: "ice maker",
		"pour-stations": "pour stations",
		"glass-wash": "glass wash",
		"cellar-refrigeration": "cellar refrigeration",
		"prep-counter": "prep counter",
		"finishing-counter": "finishing counter",
		"fresh-grey-water-tanks": "fresh and grey water tanks",
		till: "POS till",
		"digital-menu-board": "digital menu board",
		"display-wall": "display wall",
		"secure-storage": "lockable storage",
		"led-track-lights": "LED track lights",
		hvac: "rooftop HVAC",
		"hvac-optional": "rooftop HVAC",
		"hot-station": "hot station",
		"drinks-station": "drinks station",
		"rear-walk-in-door": "rear walk-in door",
		"water-filtration": "water filtration",
	};
	const seen = new Set<string>();
	const out: string[] = [];
	for (const id of equipment) {
		const key = id.toLowerCase();
		const phrase = map[key] ?? id.replace(/[-_]/g, " ");
		if (seen.has(phrase)) continue;
		seen.add(phrase);
		out.push(phrase);
	}
	return out.slice(0, 6).join(", ") || "commercial kitchen equipment";
}

function iconFor(businessType: string): string {
	const t = businessType.toLowerCase();
	if (t.includes("coffee")) return "coffee cup";
	if (t.includes("ice")) return "ice cream cone";
	if (t.includes("bakery") || t.includes("dessert")) return "croissant";
	if (t.includes("bar")) return "cocktail glass";
	if (t.includes("retail")) return "shopping bag";
	if (t.includes("pizza")) return "pizza slice";
	if (t.includes("asian")) return "bowl";
	if (t.includes("cold") || t.includes("drink")) return "drink cup";
	return "burger";
}

function bodyPhrase(body: VehicleBody): string {
	return body === "airstream"
		? "polished silver aluminum rounded Airstream-style travel trailer"
		: "modern square-profile stainless-steel food trailer";
}

function servePhrase(mode: ServeMode): string {
	if (mode === "walk-in")
		return "walk-in interior service where customers step inside";
	if (mode === "hybrid")
		return "hybrid service with a walk-in aisle and a serve hatch";
	return "hatch-serve with a wide service window and no public entry";
}

/**
 * Build a complete concept set from the project brain. Every view is
 * detailed and consistent so the buyer sees the full truck inside and out.
 */
export function conceptPrompts(args: ConceptPromptArgs): Array<{
	label: string;
	prompt: string;
}> {
	const {
		brand,
		vehicleLabel,
		vehicleBody,
		lengthM,
		widthM,
		heightM,
		colors,
		vibe,
		businessType,
		menuKeywords,
		equipment,
		serveMode,
		brainNote,
	} = args;

	const body = bodyPhrase(vehicleBody);
	const menu =
		menuKeywords.length > 0
			? menuKeywords.slice(0, 5).join(", ")
			: "house menu";
	const equip = equipmentPhrase(equipment);
	const serve = servePhrase(serveMode);
	const icon = iconFor(businessType);

	const hasBrand = Boolean(args.hasBrand ?? true);
	// Signage phrasing, so an unnamed business gets blank panels rather than a
	// placeholder painted down the side of the trailer. Six views letter the
	// truck independently of the instruction in ctx.
	const roofSign = hasBrand
		? `illuminated roof blade sign reading "${brand}"`
		: "illuminated roof blade sign left blank, no lettering";
	const wordmark = hasBrand
		? `complete wrap livery with the "${brand}" wordmark`
		: "complete wrap livery with the signage panel left blank and unlettered";
	const counterBadge = hasBrand
		? `An illuminated "${brand}" badge mounted on the counter front.`
		: "An illuminated blank badge panel on the counter front, awaiting branding.";

	const ctx = `Photorealistic concept render for ${hasBrand ? `"${brand}"` : "an as-yet-unnamed business"} — a ${businessType} food truck built on a ${lengthM}m ${body} (${vehicleLabel}, ${lengthM} × ${widthM}m × ${heightM}h). Menu: ${menu}. Equipment line: ${equip}. Service model: ${serve}. Brand palette: ${colors}. Vibe: ${vibe}.${brainNote ? ` Design notes: ${brainNote}.` : ""} Keep the body shape consistent across all views. Photorealistic, architectural visualization quality, high detail, 35mm lens. ${
		hasBrand
			? `The only text allowed is the brand name "${brand}" — no other words, no gibberish.`
			: "The buyer has not named the business yet: leave the signage panels clean and unlettered, ready for branding. No text anywhere on the vehicle, no placeholder words, no gibberish."
	}`;

	return [
		{
			label: "exterior_hero",
			prompt: `${ctx} EXTERIOR HERO SHOT: three-quarter front angle at golden hour. Full wrap livery visible, service hatch open showing a warm glimpse of the cooking line and stainless counter inside, ${roofSign}, a few stylish customers waiting at the counter. Urban street-food setting, shallow depth of field.`,
		},
		{
			label: "exterior_rear",
			prompt: `${ctx} EXTERIOR REAR: three-quarter rear angle. Show the heavy-duty shore power camlock inlet mounted low on the back, a rear service door, the roof-mounted commercial HVAC unit, and the back of the illuminated roof blade sign. Stabilizer jacks deployed, clean pavement, late afternoon light.`,
		},
		{
			label: "side_elevation",
			prompt: `${ctx} SIDE ELEVATION: flat orthographic side view, no perspective, like an architectural elevation drawing. Full side profile of the trailer, ${wordmark}, the service hatch shown open with its accent-colored frame, roof blade sign on top, wheels and stabilizer jacks at the bottom. Clean white background, technical illustration style, sharp edges, no shadows, no people.`,
		},
		{
			label: "interior_layout",
			prompt: `${ctx} INTERIOR LAYOUT — PHOTOREALISTIC KITCHEN OVERVIEW: high-angle three-quarter overhead view from the rear corner of the complete fitted kitchen, showing the FULL linear galley end to end inside the ${lengthM}m × ${widthM}m box. Left to right along the hatch wall: (1) POS order station with compact till screen and ticket rail, (2) hot station (${equip}) under a stainless extraction canopy with visible Ansul nozzles and duct riser, (3) refrigerated make-rail with 6+ garnish pans of fresh ingredients under a hinged glass sneeze-guard, burger assembly boards and heat gantry, (4) hand basin with knee-operated taps and soap dispenser at the line entry, (5) drinks end-cap with ice well, under-counter refrigeration and shake prep. Back wall: matte black easy-clean panels, warm cream ceramic tile splashback, non-slip commercial flooring with coved skirting. Brushed stainless counters with upstands, warm 4000K LED strip task lighting under the canopy, cool daylight through the open hatch. Every appliance hard up against the walls with 800mm clear chef aisle, power trunking and fresh/grey water tanks visible below counter. No customers inside, one chef in blacks at the griddle for scale.`,
		},
		{
			label: "front_elevation",
			prompt: `${ctx} FRONT ELEVATION: dead-on straight view from outside the open service hatch at eye level. Full width of the hatch visible, framed in accent color, clear glass sneeze-guard running its length. Inside, left to right: POS, hot station, make-rail, drinks station. ${counterBadge} Symmetrical, dead-on composition.`,
		},
		{
			label: "assembly_theater",
			prompt: `${ctx} ASSEMBLY THEATER: first-person customer POV looking through the open service hatch, watching staff cook and assemble food on the hot station and prep rail. Steam rising, fresh ingredients visible in the make-rail, a finished item being handed across the counter. Warm appetizing lighting on the food, shallow depth of field, golden-hour ambiance.`,
		},
		{
			label: "night_exterior",
			prompt: `${ctx} NIGHT EXTERIOR: nighttime urban setting, wet pavement reflecting lights. Service hatch open and glowing warmly from inside, illuminated roof blade sign glowing, accent-colored hatch frame catching the interior light. A few customers silhouetted in the warm glow. Moody, cinematic, premium street-food-at-night vibe, bokeh from distant streetlights.`,
		},
		{
			label: "roof_plan",
			prompt: `${ctx} ROOF PLAN + FLOOR LAYOUT — TECHNICAL TOP-DOWN ARCHITECTURAL DRAWING: perfectly vertical bird's-eye orthographic plan of the whole ${lengthM}m × ${widthM}m unit on a clean white sheet with a thin dimension outline showing overall length and width. Roof layer: commercial rooftop HVAC unit centred over the hot station, ${roofSign} mounted fore-aft, two mushroom vents over the drinks end, shore-power camlock hatch marked at the rear corner, stabilizer jacks at all four corners. Ghosted beneath the roof outline, the interior floor layout in lighter linework: linear galley left to right — POS zone, hot station footprint (${equip}), make-rail rectangle, hand-basin square at line entry, drinks end-cap rectangle — with a hatched 800mm clear aisle, door swing arcs, and tiny zone labels. Flat vector-technical style, subtle drop shadows only, sharp 90-degree geometry, no perspective, no people, no sky.`,
		},
		{
			label: "brand_mark",
			prompt: hasBrand
				? `Clean brand identity mockup for "${brand}", a ${businessType} food truck. Centered logo: bold geometric sans-serif wordmark "${brand}" in ${colors} on a matte black background, with a small minimalist ${icon} icon above the wordmark in an accent color, and a thin accent-colored underline below. Minimal, premium, street-food-meets-design-studio aesthetic. Flat vector style, high contrast, crisp edges. No extra text.`
				: `Brand direction board for an unnamed ${businessType} food truck. Three large colour swatches in ${colors} stacked with their proportions, a minimalist ${icon} icon mark centred above them in an accent colour, and a blank rectangular panel where a wordmark would sit. Matte black background. Minimal, premium, street-food-meets-design-studio aesthetic. Flat vector style, crisp edges. Absolutely no text or lettering anywhere.`,
		},
	];
}

export interface StarterConcept {
	label: string;
	url: string;
	model: string;
	filename: string;
	/**
	 * Explicit per-view outcome. A failed view now travels through the
	 * pipeline as a first-class record instead of vanishing, which is what
	 * left blank slots in the panel with nothing to explain them.
	 */
	status: "ready" | "failed";
	/** Why it failed, for the panel's retry affordance. */
	error?: string;
	/** Which views this render was conditioned on, for debugging drift. */
	references?: string[];
}

export interface StarterConceptArgs {
	brand: string;
	vehicleLabel: string;
	vehicleBody?: VehicleBody;
	lengthM?: number;
	widthM?: number;
	heightM?: number;
	colors?: string;
	vibe?: string;
	businessType?: string;
	menuKeywords?: string[];
	equipment?: readonly string[];
	serveMode?: ServeMode;
	brainNote?: string;
	/** Resolves the factory catalog photo; falls back to the body folder. */
	vehicleId?: string | null;
	/** A photo the buyer uploaded, used for styling direction only. */
	inspirationImage?: string | null;
	/**
	 * Auto-hero master from an earlier round (session.masterImageUrl). The new
	 * hero chains off it so regenerations stay the same product; the rest of
	 * the round falls back to it when the fresh hero is a placeholder.
	 */
	masterReference?: string | null;
	/** Only regenerate these views, reusing `completed` for the rest. */
	only?: readonly ConceptView[];
	/** Renders already in hand (a retry, or an earlier round) by view. */
	completed?: Partial<Record<ConceptView, string>>;
}

export interface StageProgress {
	/** 1-based stage of `conceptStages()`. */
	stage: number;
	stageCount: number;
	/** Views finished so far, across the whole round. */
	completed: number;
	total: number;
	/** Views this stage is generating right now. */
	generating: readonly string[];
}

/**
 * One visual round, generated as a single continuous visual world.
 *
 * The round walks `conceptStages()`: the exterior hero is produced alone and
 * becomes the property's anchor, then each later stage runs in parallel with
 * the finished pixels of its dependencies attached as references. Views in a
 * stage never reference each other, which is what makes the parallelism safe.
 *
 * Consumes exactly 1 credit and bumps visualRounds so the auto path only ever
 * fires once per session. Every view in `CONCEPT_VIEWS` yields a record, ready
 * or failed — the caller is never left guessing why it got eight images.
 */
export async function runStarterConcepts(
	creditsUsed: number,
	args: StarterConceptArgs,
	// Per-stage callback so the server can stream results over SSE as they
	// land — one giant 9-image frame risks truncation/timeout.
	onBatch?: (batch: StarterConcept[], progress: StageProgress) => void,
): Promise<{
	images: StarterConcept[];
	creditsUsed: number;
	brainNoteUsed: string;
}> {
	const hasBrand = Boolean(args.brand?.trim());
	const brand = args.brand?.trim() || "the business";
	const vehicleLabel = args.vehicleLabel || "Square Trailer 4m";
	const vehicleBody: VehicleBody = args.vehicleBody ?? "square";
	const lengthM = args.lengthM ?? 4;
	const widthM = args.widthM ?? 2.1;
	const heightM = args.heightM ?? 2.6;
	const colors = args.colors || "brand colors";
	const vibe = args.vibe || "bold street-food";
	const businessType = args.businessType || "combined";
	const menuKeywords = args.menuKeywords ?? [];
	const equipment = args.equipment ?? [];
	const serveMode: ServeMode = args.serveMode ?? "hatch-serve";
	const brainNote =
		args.brainNote ||
		`${serveMode} food truck for ${brand}, drinks end-cap carries margin`;

	const prompts = conceptPrompts({
		brand,
		vehicleLabel,
		vehicleBody,
		lengthM,
		widthM,
		heightM,
		colors,
		vibe,
		businessType,
		menuKeywords,
		equipment,
		serveMode,
		brainNote,
		hasBrand,
	});
	const promptFor = new Map(prompts.map((p) => [p.label, p.prompt]));

	// The factory's own photo of this body, and the written description of its
	// fixed geometry. Together these anchor the whole round to a trailer that
	// exists, instead of one the model invents afresh for every view.
	const bodyPhoto = await factoryReference(args.vehicleId, vehicleBody);
	const geometry = geometryFor(vehicleBody);

	const photoOrNull = (u: string | null | undefined): string | null =>
		typeof u === "string" &&
		u.startsWith("data:image/") &&
		!u.startsWith("data:image/svg")
			? u
			: null;
	const masterPhoto = photoOrNull(args.masterReference);

	// Renders available as references. Seeded with anything the caller already
	// holds so a targeted retry still inherits the round's visual world.
	const completed: Partial<Record<ConceptView, string>> = {};
	for (const [view, url] of Object.entries(args.completed ?? {})) {
		const ok = photoOrNull(url);
		if (ok) completed[view as ConceptView] = ok;
	}

	const wanted = new Set<ConceptView>(args.only ?? CONCEPT_VIEWS);
	const stages = conceptStages();
	const total = wanted.size;
	const images: StarterConcept[] = [];
	let done = 0;

	for (const [i, stage] of stages.entries()) {
		const todo = stage.filter((v) => wanted.has(v));
		if (todo.length === 0) continue;

		onBatch?.([], {
			stage: i + 1,
			stageCount: stages.length,
			completed: done,
			total,
			generating: todo,
		});

		const results = await Promise.all(
			todo.map(async (view) => {
				const references = buildReferences({
					view,
					completed,
					bodyPhoto,
					masterPhoto,
					inspiration: args.inspirationImage,
				});
				const prompt = promptFor.get(view);
				if (!prompt) {
					return {
						label: view,
						url: placeholderImage(view, brand),
						model: "placeholder (no prompt)",
						filename: `${view}.png`,
						status: "failed" as const,
						error: "No prompt for this view.",
						references: references.map((r) => r.from),
					};
				}
				try {
					const r = await generateTruckImage({
						brand,
						vehicleLabel,
						label: view,
						prompt,
						references,
						geometry,
					});
					const failed = r.model.startsWith("placeholder");
					return {
						label: view,
						url: r.url,
						model: r.model,
						filename: `${view}.png`,
						status: failed ? ("failed" as const) : ("ready" as const),
						error: failed
							? "The image model did not return a render."
							: undefined,
						references: references.map((r2) => r2.from),
					};
				} catch (err) {
					// A throw here used to take the whole Promise.all down and lose
					// every sibling in the stage with it.
					console.warn(`[food-truck] ${view} failed:`, err);
					return {
						label: view,
						url: placeholderImage(view, brand),
						model: "placeholder (error)",
						filename: `${view}.png`,
						status: "failed" as const,
						error: err instanceof Error ? err.message : "Render failed.",
						references: references.map((r2) => r2.from),
					};
				}
			}),
		);

		// Only real renders join the reference pool — a placeholder would
		// poison every view downstream of it.
		for (const r of results) {
			if (r.status === "ready") completed[r.label as ConceptView] = r.url;
		}
		images.push(...results);
		done += results.length;
		onBatch?.(results, {
			stage: i + 1,
			stageCount: stages.length,
			completed: done,
			total,
			generating: [],
		});
	}

	return { images, creditsUsed: creditsUsed + 1, brainNoteUsed: brainNote };
}
