import {
	CONCEPT_VIEWS,
	type ConceptView,
	geometryFor,
	MENU_VIEW,
} from "./constants";
import {
	buildReferences,
	conceptStages,
	continuityLock,
	menuBoardReferences,
	type RenderReference,
} from "./continuity";
import { lineProfileFor } from "./line-profile";
import { liveryPhrase } from "./livery";
import { type MenuDesign, menuBoardPrompt } from "./menu";
import { defaultOpenings, openingsPhrase } from "./openings";
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
	/** Fields the customer asked to change — named in the lock, rest frozen. */
	allowedChanges?: readonly string[] | null;
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

	const lock = continuityLock(attached, args.geometry, args.allowedChanges);
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
	/** Version stamp, e.g. "CONCEPT · v4 · not for construction". */
	versionStamp?: string | null;
	/** Explicit openings — defaults to the body template when omitted. */
	openingsPhrase?: string | null;
	/** Livery template brief — defaults to the body template when omitted. */
	liveryPhrase?: string | null;
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
		"boba-tea-brewers": "tea brewers and shaker station",
		"sealing-machine": "cup sealing machine",
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

/**
 * The badge at the centre of the brand, or rather: the badge a wrap shop can
 * actually produce. Every entry names one recognizable object, then the last
 * mile is always the same craft spec — flat vector shapes, 2-3 spot colors,
 *
 * Why flat: this livery gets printed, cut and weeded by a vinyl shop. A
 * detailed painterly emblem can't be cut from	real vinyl (it becomes a
 * huge multi-layer print job), it fades/holds dirt in its crevices under
 * commercial vehicle wash cycles, and photos of weathered intricate decals
 * read badly in the sales deck. Flat = cheap to produce, durable, and the
 * deck stays honest about what a vinyl printer can deliver.
 */
export function emblemFor(
	businessType: string,
	menu: readonly string[] = [],
): string {
	const t = businessType.toLowerCase();
	// One business type can cover two different products; the menu decides.
	const line = lineProfileFor(t, menu).id;
	if (line === "juice")
		return "a tall juice cup with a straw beside a simple halved orange and a leaf, in flat vector shapes — two or three spot colors, sharp edges, no gradients, no photorealism";
	if (line === "fried-dessert" && !menu.some((m) => /churro/i.test(m)))
		return "a ring doughnut with a simple icing drip and a few sprinkle dashes, in flat vector shapes — two or three spot colors, sharp edges, no gradients";
	if (line === "fried-dessert")
		return "three ridged churros in a paper cone with a small dip pot, in flat vector shapes — two or three spot colors, sharp edges, no gradients";
	if (/coffee|espresso/.test(t))
		return "a takeaway coffee cup seen from a 3/4 angle with a clean silhouette, sleeve band, lid and a simple curl of steam, in flat vector shapes — two or three spot colors, sharp edges, no gradients";
	if (/tea|matcha|boba|bubble/.test(t))
		return "a dome-lid boba cup with a wide straw and bold silhouettes of tapioca pearls visible through the cup wall, plus two simple flying tea leaves, in flat vector shapes — two or three spot colors, sharp edges, no gradients, no photorealism";
	if (/ice/.test(t))
		return "a flat vector ice cream cone — crisp triangular waffle lattice reduced to clean line work, two scoops as smooth solid silhouettes, one small melting drip — in two or three spot colors, sharp edges, no gradients";
	if (/bakery|dessert|patisserie/.test(t))
		return "a croissant in flat vector shapes — clean crescent silhouette with three simple laminated-layer lines and a scatter of dot crumbs — in two or three spot colors, sharp edges, no gradients";
	if (/pizza|italian|pasta/.test(t))
		return "a triangular pizza slice in flat vector shapes — clean crust edge with three small char marks, two pepperoni circles, three short cheese-pull lines — in two or three spot colors, sharp edges, no gradients";
	if (/asian|noodle|ramen|sushi/.test(t))
		return "a noodle bowl seen 3/4 in flat vector shapes — steam as two simple curls, chopsticks resting at an angle, one egg and fresh onion lines — in two or three spot colors, sharp edges, no gradients";
	if (/taco|mexican/.test(t))
		return "a taco in flat vector shapes — simple folded-tortilla silhouette, three dots of salsa, one lime wedge, a simple coriander sprig — in two or three spot colors, sharp edges, no gradients";
	if (/bar|cocktail/.test(t))
		return "a coupe cocktail glass in flat vector shapes — clean silhouette, one citrus wedge on the rim, three tiny bubbles — in two or three spot colors, sharp edges, no gradients";
	if (/retail/.test(t))
		return "a paper shopping bag in flat vector shapes — clean silhouette, folded top edge, twisted rope handles, a swing tag — in two or three spot colors, sharp edges, no gradients";
	if (/fried|fries|chips|fish/.test(t))
		return "a paper fry cone in flat vector shapes — crisp geometric fry shapes standing tall, one salt flake — in two or three spot colors, sharp edges, no gradients";
	if (/breakfast|brunch/.test(t))
		return "a pancake stack in flat vector shapes — three simple discs + butter square + two syrup lines — in two or three spot colors, sharp edges, no gradients";
	if (/cold|drink|juice|smoothie|soda/.test(t))
		return "a domed-lid drink cup with a fat straw in flat vector shapes — boba silhouettes and bubbles visible through the cup wall — in two or three spot colors, sharp edges, no gradients";
	if (/combined/.test(t))
		return "a cast-iron skillet in flat vector shapes holding a simple sizzling medley — protein chunk, corn dots, pepper wedges, a folded tortilla — in two or three flat spot colors, sharp edges, no gradients";
	if (/grill|bbq|barbecue|smash|hot dog|sandwich/.test(t))
		return "a stacked burger in flat vector shapes — sesame bun dots as clean circles, one cheese fold, three lettuce zigzags — in two or three spot colors, sharp edges, no gradients";
	// Last resort, but nothing anonymous: echo what the buyer actually
	// typed, or fall back to a clean universal motif — emoji-clean, poster
	// clean, sticker-clean — anything but a detailed emblem printed by a
	// special vinyl printer.
	return businessType.trim()
		? `a bold flat vector badge inspired by the signature ${businessType.trim()}, reduced to one recognizable silhouette in two or three flat spot colors, sharp edges, no gradients, no photorealism`
		: "a stylized chef's hat with clean lines and a folded silhouette, in two or three flat spot colors, sharp edges, no gradients";
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
	const emblem = emblemFor(businessType, menuKeywords);
	const line = lineProfileFor(businessType, menuKeywords);
	const openings =
		args.openingsPhrase ??
		openingsPhrase(defaultOpenings(vehicleBody, lengthM));
	const livery = args.liveryPhrase ?? liveryPhrase(vehicleBody);
	const stamp = args.versionStamp ?? "CONCEPT · not for construction";

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

	const ctx = `Photorealistic concept render for ${hasBrand ? `"${brand}"` : "an as-yet-unnamed business"} — a ${businessType} food truck built on a ${lengthM}m ${body} (${vehicleLabel}, ${lengthM} × ${widthM}m × ${heightM}h). Menu: ${menu}. Equipment line: ${equip}. Service model: ${serve}. Brand palette: ${colors}. Vibe: ${vibe}.${brainNote ? ` Design notes: ${brainNote}.` : ""} Keep the body shape consistent across all views. EXACT GEOMETRY — style it, don't change it: ${openings}. LIVERY TEMPLATE: ${livery}. Status: ${stamp}. THE LINE: ${line.forbid} SIDES: the curbside is the side with the service hatch and the entry door; the roadside wall has no hatch and no door. The livery carries the brand's illustrated emblem — ${emblem} — executed entirely in flat spot-color vinyl shapes, the kind of crisp geometry a commercial wrap shop cuts from a 54-inch printer roll: solid fills, sharp cut edges, no gradients, no photorealistic rendering, no paint-stroke or brush texture, no airbrushed shading. Weather-proof by design: minimal layers, bold shapes, nothing intricate that shows wear or traps dirt. NO PEOPLE: the scene is completely unoccupied — no customers, staff, chefs, passers-by, silhouettes or hands; the design is the only subject. Photorealistic, architectural visualization quality, high detail, 35mm lens. ${
		hasBrand
			? `The only text allowed is the brand name "${brand}" — no other words, no gibberish.`
			: "The buyer has not named the business yet: leave the signage panels clean and unlettered, ready for branding. No text anywhere on the vehicle, no placeholder words, no gibberish."
	}`;

	return [
		{
			label: "exterior_hero",
			prompt: `${ctx} EXTERIOR HERO SHOT: three-quarter front angle of the CURBSIDE at golden hour, so the service hatch and the entry door are both in view. Full wrap livery visible, service hatch open showing a glimpse of ${line.heroGlimpse}, ${roofSign}, the counter and forecourt clean and empty. Urban street-food setting, shallow depth of field.`,
		},
		{
			label: "exterior_rear",
			prompt: `${ctx} EXTERIOR REAR: three-quarter rear angle from the ROADSIDE, so the curbside hatch and entry door are hidden — this wall has no hatch and no door. ${
				vehicleBody === "airstream"
					? "The rounded rear end cap is a solid curved panel with no door in it."
					: "The rear wall carries the single rear door described in the body lock, and nothing else."
			} Show the heavy-duty shore power camlock inlet mounted low on the back, the roof-mounted commercial HVAC unit, and the back of the illuminated roof blade sign. Stabilizer jacks deployed, clean pavement, late afternoon light.`,
		},
		{
			label: "side_elevation",
			prompt: `${ctx} CURBSIDE VIEW: flat side-on concept illustration of the curbside, no perspective. Full side profile of the trailer, ${wordmark}, the service hatch shown open with its accent-colored frame and the entry door behind it, roof blade sign on top, wheels and stabilizer jacks at the bottom. Clean white background, clean illustration style, sharp edges, no shadows, no people. This is a presentation illustration, not a drawing: no dimension lines, no measurements, no callouts, no labels, no title block.`,
		},
		{
			label: "interior_layout",
			prompt: `${ctx} INTERIOR LAYOUT — PHOTOREALISTIC OVERVIEW: high-angle three-quarter overhead view from the rear corner of the complete fitted interior, showing the FULL linear run end to end inside the ${lengthM}m × ${widthM}m box. Left to right along the hatch wall: ${line.galley}. ${
				line.hot
					? "Only the cooking equipment named here sits under a stainless extraction canopy; nothing else is under it."
					: "There is no extraction canopy, hood or cooking equipment anywhere in this interior."
			} Back wall: easy-clean panels, tiled splashback, non-slip commercial flooring with coved skirting. Brushed stainless counters with upstands, warm 4000K LED strip task lighting, cool daylight through the open hatch. Every unit hard up against the walls with a clear 800mm working aisle, fresh/grey water tanks below counter. Nobody inside — an empty, ready-to-trade interior with product prepped.`,
		},
		{
			label: "front_elevation",
			prompt: `${ctx} FRONT ELEVATION: dead-on straight view from outside the open service hatch at eye level. Full width of the hatch visible, framed in accent color, clear glass sneeze-guard running its length. Inside, left to right: ${line.frontRun}. ${counterBadge} Symmetrical, dead-on composition.`,
		},
		{
			label: "assembly_theater",
			prompt: `${ctx} ASSEMBLY THEATER: eye-level POV from the counter looking through the open service hatch at the working line — ${line.counterMoment}, and ${line.signature} sitting ready on the counter. No staff and no hands in frame; the line reads as if the team just stepped away. Warm appetizing lighting on the product, shallow depth of field, golden-hour ambiance.`,
		},
		{
			label: "night_exterior",
			prompt: `${ctx} NIGHT EXTERIOR: nighttime urban setting, wet pavement reflecting lights. Service hatch open and glowing warmly from inside, illuminated roof blade sign glowing, accent-colored hatch frame catching the interior light, the forecourt empty. Moody, cinematic, premium street-food-at-night vibe, bokeh from distant streetlights.`,
		},
		{
			label: "brand_mark",
			prompt: hasBrand
				? `Clean brand identity mockup for "${brand}", a ${businessType} food truck. Centered logo: a flat vector emblem of ${emblem}, rendered as a modern vinyl-ready logo — bold solid shapes cut from a single roll, two or three spot colors, sharp edges, no gradients, no brush strokes, no texture, no photorealistic rendering. Sitting above a bold wordmark "${brand}" in ${colors} on a deep neutral background drawn from the palette (${colors}), the emblem and wordmark locked up as one badge. Memorable at 30 feet and at 3 feet: high contrast, minimal layers, nothing intricate. Premium, crafted, street-food-meets-design-studio aesthetic. Crisp edges, high contrast. No extra text.`
				: `Brand direction board for an unnamed ${businessType} food truck. Three large colour swatches in ${colors} stacked with their proportions, a flat vector emblem of ${emblem} centred above them — crisp cut-vinyl shapes, two or three spot colors, no gradients, no texture — and a blank rectangular panel where a wordmark would sit. Deep neutral background drawn from the palette (${colors}). Premium, crafted, street-food-meets-design-studio aesthetic. Crisp edges. Absolutely no text or lettering anywhere.`,
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
	const brainNote = args.brainNote || `${serveMode} food truck for ${brand}`;

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
	if (!bodyPhoto) {
		// Without the factory's photo the hero is drawn from text alone, and
		// every later view inherits whatever shell it invented.
		console.warn(
			`[food-truck] no factory reference photo for ${args.vehicleId ?? vehicleBody} — add one under references/${vehicleBody}/ or set REFERENCES_DIR`,
		);
	}
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

	// A credit buys a round. Retrying views that failed re-delivers what was
	// already paid for, and a round where nothing rendered delivered nothing.
	const charged =
		!args.only?.length && images.some((i) => i.status === "ready");
	return {
		images,
		creditsUsed: creditsUsed + (charged ? 1 : 0),
		brainNoteUsed: brainNote,
	};
}

export interface MenuBoardArgs {
	brand: string;
	hasBrand: boolean;
	vehicleLabel: string;
	vehicleBody: VehicleBody;
	menu: MenuDesign;
	/** PNG of the menu artwork, rasterised client-side from `menuArtworkSvg`. */
	artwork: string;
	/** This session's ready renders by view — the hero is the anchor. */
	completed: Partial<Record<string, string>>;
	masterReference?: string | null;
}

/**
 * The menu board view: the approved truck, plus the stand carrying the
 * buyer's menu artwork. Refuses to run without a real exterior to anchor to —
 * a board beside an invented truck is a render of somebody else's product.
 */
export async function runMenuBoard(
	args: MenuBoardArgs,
): Promise<StarterConcept> {
	const references = menuBoardReferences({
		completed: args.completed,
		masterPhoto: args.masterReference,
		artwork: args.artwork,
	});
	const base = {
		label: MENU_VIEW,
		filename: `${MENU_VIEW}.png`,
		references: references.map((r) => r.from),
	};
	if (!references.some((r) => r.role === "anchor")) {
		return {
			...base,
			url: placeholderImage(MENU_VIEW, args.brand),
			model: "placeholder (no anchor)",
			status: "failed",
			error: "Render the truck first — the menu board is placed beside it.",
		};
	}
	if (!references.some((r) => r.role === "menu")) {
		return {
			...base,
			url: placeholderImage(MENU_VIEW, args.brand),
			model: "placeholder (no artwork)",
			status: "failed",
			error: "The menu artwork did not arrive.",
		};
	}
	const r = await generateTruckImage({
		brand: args.brand,
		vehicleLabel: args.vehicleLabel,
		label: MENU_VIEW,
		prompt: menuBoardPrompt({
			brand: args.brand,
			hasBrand: args.hasBrand,
			vehicleLabel: args.vehicleLabel,
			menu: args.menu,
		}),
		references,
		geometry: geometryFor(args.vehicleBody),
	});
	const failed = r.model.startsWith("placeholder");
	return {
		...base,
		url: r.url,
		model: r.model,
		status: failed ? "failed" : "ready",
		error: failed ? "The image model did not return a render." : undefined,
	};
}
