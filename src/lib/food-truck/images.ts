import { geometryFor } from "./constants";
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
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg' width='960' height='540'>` +
		`<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
		`<stop offset='0' stop-color='#1e1b29'/><stop offset='1' stop-color='#0b0b10'/></linearGradient></defs>` +
		`<rect width='960' height='540' fill='url(#g)'/>` +
		`<rect x='120' y='200' width='720' height='150' rx='18' fill='none' stroke='#a855f7' stroke-opacity='0.55' stroke-width='3'/>` +
		`<rect x='150' y='225' width='220' height='100' rx='10' fill='#a855f7' fill-opacity='0.18'/>` +
		`<circle cx='300' cy='370' r='34' fill='#18181b' stroke='#71717a'/><circle cx='660' cy='370' r='34' fill='#18181b' stroke='#71717a'/>` +
		`<text x='480' y='120' text-anchor='middle' fill='#e9d5ff' font-family='sans-serif' font-size='34' font-weight='700'>${escapeXml(title)}</text>` +
		`<text x='480' y='160' text-anchor='middle' fill='#8b8b96' font-family='sans-serif' font-size='18'>${escapeXml(pretty)} · powered by Rolling Retail rendering</text>` +
		`<text x='480' y='285' text-anchor='middle' fill='#c4b5fd' font-family='sans-serif' font-size='22'>concept preview</text>` +
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
	 * A real photo of the factory's trailer. This is geometry truth — the model
	 * may restyle it but may not redesign the shell.
	 */
	bodyReference?: string | null;
	/**
	 * The hero render from this round. Carries the livery so the remaining
	 * views agree on wrap, logo placement and signage.
	 */
	liveryReference?: string | null;
	/**
	 * A photo the buyer uploaded. Styling direction only — never a body to copy,
	 * because it is usually somebody else's truck.
	 */
	inspirationReference?: string | null;
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
	// Only real photographs chain as references — an SVG placeholder would
	// poison the model's sense of the trailer, so they are skipped.
	const isPhoto = (u: string | null | undefined): u is string =>
		typeof u === "string" && u.startsWith("data:image/");

	// Order matters: the model weights earlier images more heavily, and body
	// geometry has to outrank livery, which has to outrank someone else's truck.
	const slots: Array<{ url: string; role: string }> = [];
	if (isPhoto(args.bodyReference))
		slots.push({ url: args.bodyReference, role: "body" });
	if (isPhoto(args.liveryReference))
		slots.push({ url: args.liveryReference, role: "livery" });
	if (isPhoto(args.inspirationReference))
		slots.push({ url: args.inspirationReference, role: "inspiration" });

	const refParts: Array<{ inlineData: { mimeType: string; data: string } }> =
		[];
	const roles: string[] = [];
	for (const slot of slots.slice(0, 3)) {
		const m = slot.url.match(
			/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s,
		);
		if (m?.[2]) {
			refParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
			roles.push(slot.role);
		}
	}

	const locks: string[] = [];
	if (roles.includes("body")) {
		locks.push(
			`BODY LOCK: reference image ${roles.indexOf("body") + 1} is a photograph of the actual trailer this concept is built on. Reproduce its shell exactly — silhouette, proportions, panel lines, door and hatch positions, window and vent placement, wheel and axle position. The shell has: ${args.geometry ?? "the body shown in the photograph"}. You may change ONLY cosmetics: paint, wrap graphics, signage, lighting, counter finishes and the equipment visible inside. Do NOT move, add or remove a door, hatch, window or vent. Do NOT change the body shape or length.`,
		);
	} else if (args.geometry) {
		locks.push(
			`BODY LOCK: the trailer has ${args.geometry}. Keep every one of those features in this view, in the same place. Do not invent additional doors, hatches or windows.`,
		);
	}
	if (roles.includes("livery")) {
		locks.push(
			`LIVERY LOCK: reference image ${roles.indexOf("livery") + 1} is the same trailer already rendered for this brand. Copy its wrap artwork, brand colors, logo placement and signage exactly. Only the camera angle and time of day change between views.`,
		);
	}
	if (roles.includes("inspiration")) {
		locks.push(
			`STYLE REFERENCE ONLY: reference image ${roles.indexOf("inspiration") + 1} is a photo the buyer shared for mood. Borrow its palette, typography feel and finish. Do NOT copy its body shape — the trailer must stay the one described above.`,
		);
	}

	const text =
		locks.length > 0 ? `${args.prompt} ${locks.join(" ")}` : args.prompt;
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
}

/** Turn raw equipment ids (e.g. "griddle-chargrill") into readable phrases. */
function equipmentPhrase(equipment: readonly string[]): string {
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
 * Build a complete 9-view concept set from the project brain. Every view is
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

	const ctx = `Photorealistic concept render for "${brand}" — a ${businessType} food truck built on a ${lengthM}m ${body} (${vehicleLabel}, ${lengthM} × ${widthM}m × ${heightM}h). Menu: ${menu}. Equipment line: ${equip}. Service model: ${serve}. Brand palette: ${colors}. Vibe: ${vibe}.${brainNote ? ` Design notes: ${brainNote}.` : ""} Keep the body shape consistent across all views. Photorealistic, architectural visualization quality, high detail, 35mm lens. The only text allowed is the brand name "${brand}" — no other words, no gibberish.`;

	return [
		{
			label: "exterior_hero",
			prompt: `${ctx} EXTERIOR HERO SHOT: three-quarter front angle at golden hour. Full wrap livery visible, service hatch open showing a warm glimpse of the cooking line and stainless counter inside, illuminated roof blade sign reading "${brand}", a few stylish customers waiting at the counter. Urban street-food setting, shallow depth of field.`,
		},
		{
			label: "exterior_rear",
			prompt: `${ctx} EXTERIOR REAR: three-quarter rear angle. Show the heavy-duty shore power camlock inlet mounted low on the back, a rear service door, the roof-mounted commercial HVAC unit, and the back of the illuminated roof blade sign. Stabilizer jacks deployed, clean pavement, late afternoon light.`,
		},
		{
			label: "side_elevation",
			prompt: `${ctx} SIDE ELEVATION: flat orthographic side view, no perspective, like an architectural elevation drawing. Full side profile of the trailer, complete wrap livery with the "${brand}" wordmark, the service hatch shown open with its accent-colored frame, roof blade sign on top, wheels and stabilizer jacks at the bottom. Clean white background, technical illustration style, sharp edges, no shadows, no people.`,
		},
		{
			label: "interior_layout",
			prompt: `${ctx} INTERIOR LAYOUT — PHOTOREALISTIC KITCHEN OVERVIEW: high-angle three-quarter overhead view from the rear corner of the complete fitted kitchen, showing the FULL linear galley end to end inside the ${lengthM}m × ${widthM}m box. Left to right along the hatch wall: (1) POS order station with compact till screen and ticket rail, (2) hot station (${equip}) under a stainless extraction canopy with visible Ansul nozzles and duct riser, (3) refrigerated make-rail with 6+ garnish pans of fresh ingredients under a hinged glass sneeze-guard, burger assembly boards and heat gantry, (4) hand basin with knee-operated taps and soap dispenser at the line entry, (5) drinks end-cap with ice well, under-counter refrigeration and shake prep. Back wall: matte black easy-clean panels, warm cream ceramic tile splashback, non-slip commercial flooring with coved skirting. Brushed stainless counters with upstands, warm 4000K LED strip task lighting under the canopy, cool daylight through the open hatch. Every appliance hard up against the walls with 800mm clear chef aisle, power trunking and fresh/grey water tanks visible below counter. No customers inside, one chef in blacks at the griddle for scale.`,
		},
		{
			label: "front_elevation",
			prompt: `${ctx} FRONT ELEVATION: dead-on straight view from outside the open service hatch at eye level. Full width of the hatch visible, framed in accent color, clear glass sneeze-guard running its length. Inside, left to right: POS, hot station, make-rail, drinks station. An illuminated "${brand}" badge mounted on the counter front. Symmetrical, dead-on composition.`,
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
			prompt: `${ctx} ROOF PLAN + FLOOR LAYOUT — TECHNICAL TOP-DOWN ARCHITECTURAL DRAWING: perfectly vertical bird's-eye orthographic plan of the whole ${lengthM}m × ${widthM}m unit on a clean white sheet with a thin dimension outline showing overall length and width. Roof layer: commercial rooftop HVAC unit centred over the hot station, illuminated double-sided roof blade sign reading "${brand}" mounted fore-aft, two mushroom vents over the drinks end, shore-power camlock hatch marked at the rear corner, stabilizer jacks at all four corners. Ghosted beneath the roof outline, the interior floor layout in lighter linework: linear galley left to right — POS zone, hot station footprint (${equip}), make-rail rectangle, hand-basin square at line entry, drinks end-cap rectangle — with a hatched 800mm clear aisle, door swing arcs, and tiny zone labels. Flat vector-technical style, subtle drop shadows only, sharp 90-degree geometry, no perspective, no people, no sky.`,
		},
		{
			label: "brand_mark",
			prompt: `Clean brand identity mockup for "${brand}", a ${businessType} food truck. Centered logo: bold geometric sans-serif wordmark "${brand}" in ${colors} on a matte black background, with a small minimalist ${icon} icon above the wordmark in an accent color, and a thin accent-colored underline below. Minimal, premium, street-food-meets-design-studio aesthetic. Flat vector style, high contrast, crisp edges. No extra text.`,
		},
	];
}

export interface StarterConcept {
	label: string;
	url: string;
	model: string;
	filename: string;
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
}

/**
 * One shared visual round used by BOTH the manual button and the automatic
 * threshold path. Consumes exactly 1 credit and bumps visualRounds so the
 * auto path only ever fires once per session. Generates a complete 9-view
 * concept set in parallel batches of 3 (rate-limit safe, ~3x faster than
 * sequential).
 */
export async function runStarterConcepts(
	creditsUsed: number,
	args: StarterConceptArgs,
	// ponytail: per-batch callback so the server can stream each batch of 3
	// over SSE immediately — one giant 9-image frame risks truncation/timeout.
	onBatch?: (batch: StarterConcept[]) => void,
): Promise<{
	images: StarterConcept[];
	creditsUsed: number;
	brainNoteUsed: string;
}> {
	const brand = (args.brand || "BIB Truck").trim() || "BIB Truck";
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
	});

	// The factory's own photo of this body, and the written description of its
	// fixed geometry. Together these anchor the whole round to a trailer that
	// exists, instead of one the model invents afresh for every view.
	const bodyReference = await factoryReference(args.vehicleId, vehicleBody);
	const geometry = geometryFor(vehicleBody);

	const images: StarterConcept[] = [];
	// Hero first, then everything else chains off it as a livery reference —
	// this is what stops the wrap drifting view to view. The hero itself is
	// anchored to the factory photo, so the shell does not drift either.
	const hero = prompts.find((p) => p.label === "exterior_hero");
	const rest = prompts.filter((p) => p.label !== "exterior_hero");
	let heroUrl = "";
	if (hero) {
		const r = await generateTruckImage({
			brand,
			vehicleLabel,
			label: hero.label,
			prompt: hero.prompt,
			bodyReference,
			inspirationReference: args.inspirationImage ?? null,
			geometry,
		});
		images.push({
			label: hero.label,
			url: r.url,
			model: r.model,
			filename: `${hero.label}.png`,
		});
		onBatch?.(images.slice());
		if (!r.model.startsWith("placeholder")) heroUrl = r.url;
	}
	// Batch of 3 concurrent keeps us under rate limits while cutting total time.
	// The inspiration photo is deliberately dropped here: the hero already
	// absorbed it, and re-sending it invites the model to copy that truck's body.
	for (let i = 0; i < rest.length; i += 3) {
		const batch = rest.slice(i, i + 3);
		const results = await Promise.all(
			batch.map((p) =>
				generateTruckImage({
					brand,
					vehicleLabel,
					label: p.label,
					prompt: p.prompt,
					bodyReference,
					liveryReference: heroUrl || null,
					geometry,
				}),
			),
		);
		const done: StarterConcept[] = [];
		for (let j = 0; j < batch.length; j++) {
			done.push({
				label: batch[j].label,
				url: results[j].url,
				model: results[j].model,
				filename: `${batch[j].label}.png`,
			});
		}
		images.push(...done);
		onBatch?.(done);
	}
	return { images, creditsUsed: creditsUsed + 1, brainNoteUsed: brainNote };
}
