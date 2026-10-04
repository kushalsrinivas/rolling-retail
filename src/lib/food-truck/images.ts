import {
	type DesignBrief,
	featurePhrases,
	finishPhraseFor,
	hasFeature,
	sceneFor,
} from "./brief";
import {
	CONCEPT_VIEWS,
	type ConceptView,
	geometryFor,
	geometryItemsFor,
	getBusiness,
	MENU_VIEW,
	toFt,
} from "./constants";
import {
	buildReferences,
	conceptStages,
	continuityLock,
	menuBoardReferences,
	type RenderReference,
} from "./continuity";
import { lineProfileFor } from "./line-profile";
import { liverySteLines } from "./livery";
import { type MenuDesign, menuBoardPrompt } from "./menu";
import { defaultOpenings, type Opening, openingsSteLines } from "./openings";
import { paletteFor } from "./palette";
import { factoryReference } from "./references";
import {
	row,
	type SteSection,
	steDocument,
	termsSection,
	warning,
} from "./ste";
import { resolveWrap } from "./wrap-color";

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
	const text = lock ? `${args.prompt}\n\n${lock}` : args.prompt;
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
	openings?: readonly Opening[] | null;
	/**
	 * How and where the truck trades, and the features it carries. Sets the
	 * hero's scene, the wrap finish and the exterior fittings. Omitted for
	 * older sessions — the prompts then fall back to the pre-quiz defaults.
	 */
	brief?: DesignBrief | null;
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

function bodyName(body: VehicleBody): string {
	return body === "airstream"
		? "rounded riveted polished-aluminium Airstream-style travel trailer"
		: "square-profile food trailer with flat vertical side walls";
}

function serviceName(mode: ServeMode): string {
	if (mode === "walk-in")
		return "walk-in; customers step inside to order at an interior counter";
	if (mode === "hybrid") return "hybrid; a walk-in aisle and a service hatch";
	return "hatch-serve; customers order outside at the service hatch; no public entry";
}

/**
 * Medium lock, written into every photographic view.
 *
 * Run-to-run drift was a change of *medium*, not content: the same brief
 * came back as a photograph, a blueprint, or an isometric sectional. This
 * names the medium once, positively and negatively, in identical words on
 * every photo view so the medium stops being a per-run decision.
 */
export const PHOTO_LOCK_LINES = [
	"Medium: photoreal photograph from a real full-frame camera; real light on real materials",
	"It is not a 3D render, illustration, blueprint, technical drawing, floor plan, sectional, cutaway, dollhouse, isometric, axonometric or wireframe view.",
] as const;

export const PHOTO_LOCK = PHOTO_LOCK_LINES.join(". ");

function splitColors(colors: string): string[] {
	return colors
		.split(/,|\band\b|;/)
		.map((c) => c.trim())
		.filter(Boolean);
}

/**
 * Palette as data rows with roles and hex targets. "Teal" alone is a range
 * of a hundred greens to an image model; a role and a hex value are one
 * color. Words the wrap catalog does not know keep the buyer's word only,
 * never an invented hex.
 */
function paletteRows(colors: string): string[] {
	const palette = paletteFor(splitColors(colors));
	const rows: string[] = [];
	for (const role of ["primary", "secondary", "accent", "neutral"] as const) {
		const r = palette[role];
		if (!r) continue;
		const known = resolveWrap([r.name]);
		rows.push(
			known
				? `Color, ${role}: ${r.name}, target ${r.hex.toUpperCase()}`
				: `Color, ${role}: ${r.name}`,
		);
	}
	if (rows.length === 0) return [`Colors: ${colors}`];
	return [...rows, "Match each hex target as closely as the film allows."];
}

/**
 * Build a complete concept set from the project brain.
 *
 * Each view is an ASD-STE100 specification: the same Terms, Subject data,
 * Shell geometry and Warnings on every view, word for word, and only the
 * Task, Camera, Light and Scene sections change. Identical shared sections
 * are the text-side half of continuity — the reference images are the
 * other half.
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

	const hasBrand = Boolean(args.hasBrand ?? true);
	const brief = args.brief ?? null;
	const menu =
		menuKeywords.length > 0
			? menuKeywords.slice(0, 5).join(", ")
			: "house menu";
	const equip = equipmentPhrase(equipment);
	const emblem = emblemFor(businessType, menuKeywords);
	const line = lineProfileFor(businessType, menuKeywords);
	const openings = args.openings ?? defaultOpenings(vehicleBody, lengthM);
	const stamp = args.versionStamp ?? "CONCEPT · not for construction";
	const businessLabel = getBusiness(businessType)?.label ?? businessType;
	const roofSign = hasFeature(brief, "roof-sign");
	const features = featurePhrases(brief);
	const scene = sceneFor(brief);
	const doorCount = openings.filter((o) => o.type === "door").length;

	// ── Shared sections: identical on every view ──

	const terms = termsSection([
		"trailer",
		"curbside",
		"roadside",
		"front",
		"hatch",
		"wrap",
		"line",
	]);

	const subject: SteSection = {
		title: "Subject data",
		lines: [
			row("Brand", hasBrand ? `"${brand}"` : "not named yet"),
			row("Business", businessLabel),
			row("Menu", menu),
			row("Trailer model", vehicleLabel),
			row("Body", bodyName(vehicleBody)),
			row(
				"Box size",
				`${lengthM} m long × ${widthM} m wide × ${heightM} m tall (${toFt(lengthM)} × ${toFt(widthM)} × ${toFt(heightM)} ft)`,
			),
			row("Service model", serviceName(serveMode)),
			row("Equipment line", equip),
			row("Style", vibe),
			row("Design notes", brainNote),
			row("Forbidden in this trailer", line.forbid),
			row("Status", stamp),
		],
	};

	const geometry: SteSection = {
		title: "Shell geometry",
		lines: [
			...geometryItemsFor(vehicleBody).map((g) => `Shell: ${g}`),
			...openingsSteLines(openings, vehicleBody),
			"Keep the shell geometry identical in each view. Change only the surface finish and the wrap.",
		],
	};

	const livery: SteSection = {
		title: "Wrap and livery",
		lines: [
			...paletteRows(colors),
			row("Film finish", finishPhraseFor(brief)),
			...liverySteLines(vehicleBody),
			row("Emblem", emblem),
			"Cut the emblem from flat spot-color vinyl with sharp edges.",
			"Do not use gradients, brush texture, airbrush shading or photoreal rendering in the emblem.",
			"Keep the shapes bold and few. A commercial wash must not show wear on them.",
			hasBrand
				? `Put the "${brand}" wordmark on the logo panel zone, next to the emblem.`
				: "Leave the logo panel zone clean and unlettered.",
		],
	};

	const exteriorFeatures: SteSection = {
		title: "Exterior features",
		lines: [
			...features.map((f) => `Feature: ${f}`),
			roofSign && !hasBrand ? "Leave the roof sign face blank." : null,
			features.length === 0
				? "Fit no exterior items other than the shell geometry."
				: "Fit no exterior items other than these features and the shell geometry.",
		],
	};

	const text: SteSection = {
		title: "Text on the trailer",
		lines: hasBrand
			? [
					`The only permitted text is the brand name "${brand}".`,
					"Spell the brand name exactly. Use the same letterforms in each position.",
					"Do not write other words, numbers or random characters.",
				]
			: [
					"The buyer has not named the business yet.",
					"Leave each sign panel clean and unlettered, ready for branding.",
					"Do not write text, placeholder words or random characters on the trailer.",
				],
	};

	const peopleWarning = warning(
		"NO PEOPLE. Do not show a person.",
		"The design is the only subject. This includes customers, staff, chefs, passers-by, silhouettes and hands.",
	);

	const photoMedium: SteSection = {
		title: "Medium",
		lines: [...PHOTO_LOCK_LINES],
	};

	const check = (extra: readonly string[] = []): SteSection => ({
		title: "Output check",
		lines: [
			"Do these checks before you output the image.",
			"Check: the shell matches the shell geometry.",
			...extra,
			"Check: no person is visible.",
			hasBrand
				? `Check: each lettered item reads "${brand}" with correct spelling.`
				: "Check: there is no text on the trailer.",
		],
	});

	const exteriorCheck = check([
		`Check: the curbside shows 1 service hatch and ${doorCount === 2 ? "1 entry door" : `${doorCount} door`}.`,
		"Check: the roadside shows no openings.",
		"Check: the image is a photograph, not a drawing.",
	]);

	const interior: SteSection = {
		title: "Interior line",
		lines: [
			row("Line, left to right along the curbside wall", line.galley),
			line.hot
				? "Put only the named cooking equipment under the stainless extraction canopy."
				: "There is no extraction canopy, hood or cooking equipment in this interior.",
			row(
				"Finishes",
				"brushed stainless counters with upstands; easy-clean wall panels; tiled splashback; non-slip floor with coved skirting",
			),
			row(
				"Aisle",
				"800 mm clear working aisle; each unit is tight against a wall",
			),
			row("Water", "fresh and gray water tanks below the counter"),
			row(
				"Brand colors inside",
				"accent panels, the hatch frame and the counter front only",
			),
		],
	};

	const doc = (title: string, sections: SteSection[]) =>
		steDocument({ kind: "RENDER SPECIFICATION", title, sections });

	const lightFor = (time: "golden" | "afternoon" | "night") =>
		time === "golden"
			? [
					row(
						"Light",
						"golden hour; low sun 15° above the horizon, behind the camera on the left",
					),
					row("Color temperature", "3500 K sun; 6500 K sky fill"),
				]
			: time === "afternoon"
				? [
						row(
							"Light",
							"late afternoon; sun 30° above the horizon, from the front of the trailer",
						),
						row("Color temperature", "4500 K sun; 6500 K sky fill"),
					]
				: [
						row(
							"Light",
							"night; the open service hatch glows warm from inside",
						),
						row(
							"Color temperature",
							"3000 K interior and sign light; 7000 K blue night sky",
						),
					];

	return [
		{
			label: "exterior_hero",
			prompt: doc("EXTERIOR HERO — CURBSIDE", [
				{
					title: "Task",
					lines: [
						"Make one photoreal photograph of the trailer from the CURBSIDE.",
						"Show the open service hatch and the entry door in the same frame.",
						`Through the open hatch, show ${line.heroGlimpse}.`,
					],
				},
				terms,
				subject,
				geometry,
				livery,
				exteriorFeatures,
				{
					title: "Camera",
					lines: [
						row("Camera", "full-frame, 35 mm lens, f/5.6, ISO 100, 1/250 s"),
						row(
							"Position",
							"curbside, three-quarter front view, 35° from the long axis, 7 m from the service hatch",
						),
						row("Height", "1.6 m; level; verticals straight"),
						row(
							"Framing",
							"the full trailer, tongue to rear end, with a 10% margin each side",
						),
						row("Focus", "the trailer is sharp; the background is soft"),
					],
				},
				{ title: "Light", lines: lightFor("golden") },
				{
					title: "Scene",
					lines: [
						row("Setting", scene),
						"Keep the counter and the forecourt clean and empty.",
					],
				},
				text,
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				exteriorCheck,
			]),
		},
		{
			label: "exterior_rear",
			prompt: doc("EXTERIOR REAR — ROADSIDE", [
				{
					title: "Task",
					lines: [
						"Make one photoreal photograph of the trailer from the rear corner of the ROADSIDE.",
						"The curbside service hatch and the entry door are not visible in this view.",
						"The roadside has no hatch and no door.",
						vehicleBody === "airstream"
							? "The rounded rear end cap is a solid curved panel with no door in it."
							: "The rear wall has the single rear door from the shell geometry and nothing else.",
						"Show the shore-power camlock inlet low on the rear.",
						"Show the rooftop HVAC unit.",
						roofSign ? "Show the rear face of the roof blade sign." : null,
						"Deploy the stabilizer jacks.",
					],
				},
				terms,
				subject,
				geometry,
				livery,
				exteriorFeatures,
				{
					title: "Camera",
					lines: [
						row("Camera", "full-frame, 35 mm lens, f/5.6, ISO 100, 1/250 s"),
						row(
							"Position",
							"roadside, three-quarter rear view, 40° from the long axis, 7 m from the rear corner",
						),
						row("Height", "1.6 m; level; verticals straight"),
						row("Framing", "the full trailer with a 10% margin each side"),
					],
				},
				{ title: "Light", lines: lightFor("afternoon") },
				{
					title: "Scene",
					lines: [row("Setting", scene), "Keep the ground clean and empty."],
				},
				text,
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				check([
					"Check: the roadside shows no openings.",
					"Check: the image is a photograph, not a drawing.",
				]),
			]),
		},
		{
			label: "side_elevation",
			prompt: doc("CURBSIDE ELEVATION — PRESENTATION ILLUSTRATION", [
				{
					title: "Task",
					lines: [
						"Make one flat side-on illustration of the CURBSIDE with no perspective.",
						"Show the full side profile of the trailer.",
						"Show the service hatch open, with its accent-color frame, and the entry door behind it.",
						"Show the wheels and the stabilizer jacks at the bottom.",
					],
				},
				terms,
				subject,
				geometry,
				livery,
				exteriorFeatures,
				{
					title: "Medium",
					lines: [
						row(
							"Medium",
							"flat vector-style presentation illustration on a clean white background",
						),
						"Use sharp edges and no shadows.",
						"This is a presentation illustration, not a drawing.",
						"Use no dimension lines, no measurements, no callouts, no labels and no title block.",
						"Do not make a blueprint, a technical drawing, a sectional view or an isometric view.",
						"Do not add a blueprint grid or a background scene.",
					],
				},
				text,
				{ title: "Warnings", lines: [peopleWarning] },
				check([
					`Check: the curbside shows 1 service hatch and ${doorCount === 2 ? "1 entry door" : `${doorCount} door`}.`,
				]),
			]),
		},
		{
			label: "interior_layout",
			prompt: doc("INTERIOR LAYOUT — FULL LINE", [
				{
					title: "Task",
					lines: [
						"Make one photoreal eye-level photograph inside the trailer.",
						"Show the full working aisle and the full line from end to end.",
						"The interior is empty of people and ready to trade, with product prepped.",
					],
				},
				terms,
				subject,
				interior,
				{
					title: "Camera",
					lines: [
						row(
							"Camera",
							"full-frame, 18mm rectilinear wide-angle lens, f/8, ISO 400",
						),
						row(
							"Position",
							"inside, at the rear end of the aisle, looking forward",
						),
						row("Height", "1.5 m eye-level; level; verticals straight"),
						row(
							"Framing",
							`the full line inside the ${lengthM} m × ${widthM} m box; the ceiling and the floor are both visible`,
						),
						"Keep the walls and the roof intact.",
						"Do not show a dollhouse, sectional, cutaway or overhead view.",
					],
				},
				{
					title: "Light",
					lines: [
						row(
							"Light",
							"warm LED strip task lights above the counters; cool daylight through the open service hatch",
						),
						row("Color temperature", "4000 K task light; 6500 K daylight"),
						row("Style", "trade-magazine commercial kitchen photograph"),
					],
				},
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				check([
					"Check: each unit in the line is present, in the stated order.",
					"Check: the image is a photograph, not a drawing.",
				]),
			]),
		},
		{
			label: "front_elevation",
			prompt: doc("FRONT ELEVATION — THROUGH THE HATCH", [
				{
					title: "Task",
					lines: [
						"Make one photoreal photograph from outside the open service hatch, square to the hatch.",
						"Show the full width of the hatch, with its accent-color frame.",
						"A clear glass sneeze guard runs the full hatch width.",
						hasBrand
							? `Mount an illuminated "${brand}" badge on the counter front.`
							: "Mount an illuminated blank badge panel on the counter front.",
					],
				},
				terms,
				subject,
				{
					title: "Interior line",
					lines: [
						row("Visible inside, left to right", line.frontRun),
						line.hot
							? "Put only the named cooking equipment under the extraction canopy."
							: "There is no extraction canopy, hood or cooking equipment in this interior.",
					],
				},
				{
					title: "Camera",
					lines: [
						row("Camera", "full-frame, 35 mm lens, f/8, ISO 200"),
						row(
							"Position",
							"curbside, on the hatch centerline, 3 m from the trailer",
						),
						row("Height", "1.6 m eye-level; level"),
						row(
							"Framing",
							"symmetrical; the hatch frame fills 70% of the width",
						),
					],
				},
				{ title: "Light", lines: lightFor("afternoon") },
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				check(["Check: the image is a photograph, not a drawing."]),
			]),
		},
		{
			label: "assembly_theater",
			prompt: doc("ASSEMBLY THEATER — THE COUNTER", [
				{
					title: "Task",
					lines: [
						"Make one photoreal close photograph of the line through the open service hatch.",
						"No staff and no hands are in frame.",
						"The line looks as if the team stepped away a moment ago.",
					],
				},
				terms,
				subject,
				{
					title: "Action and product",
					lines: [
						row("On the line", line.counterMoment),
						row("On the counter", line.signature),
					],
				},
				{
					title: "Camera",
					lines: [
						row("Camera", "full-frame, 35 mm lens, f/2.8, ISO 400"),
						row(
							"Position",
							"at the counter, looking through the open hatch at the line",
						),
						row("Height", "1.4 m; level"),
						row(
							"Focus",
							"the product on the counter is sharp; the line behind is soft",
						),
					],
				},
				{
					title: "Light",
					lines: [
						row(
							"Light",
							"warm light on the product; golden-hour ambient through the hatch",
						),
						row("Color temperature", "3200 K on the product"),
					],
				},
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				check(["Check: the image is a photograph, not a drawing."]),
			]),
		},
		{
			label: "night_exterior",
			prompt: doc("NIGHT EXTERIOR — CURBSIDE", [
				{
					title: "Task",
					lines: [
						"Make one photoreal night photograph of the trailer from the CURBSIDE.",
						"Show the service hatch open and lit from inside.",
						roofSign ? "Show the roof blade sign lit." : null,
						"The accent-color hatch frame catches the interior light.",
						hasFeature(brief, "night-lighting")
							? "Turn on the hatch LED strip and the wall downlights."
							: null,
						"Keep the forecourt empty.",
					],
				},
				terms,
				subject,
				geometry,
				livery,
				exteriorFeatures,
				{
					title: "Camera",
					lines: [
						row("Camera", "full-frame, 35 mm lens, f/2, ISO 1600, 1/60 s"),
						row(
							"Position",
							"curbside, three-quarter front view, 35° from the long axis, 7 m from the service hatch",
						),
						row("Height", "1.6 m; level; verticals straight"),
						"Expose for the wrap. The wrap colors must stay identifiable.",
					],
				},
				{ title: "Light", lines: lightFor("night") },
				{
					title: "Scene",
					lines: [
						row(
							"Setting",
							`${scene}; at night, the ground is wet and reflects the lights`,
						),
						row("Background", "distant streetlights as soft bokeh"),
					],
				},
				text,
				photoMedium,
				{ title: "Warnings", lines: [peopleWarning] },
				exteriorCheck,
			]),
		},
		{
			label: "brand_mark",
			prompt: hasBrand
				? doc("BRAND IDENTITY MOCKUP", [
						{
							title: "Task",
							lines: [
								`Make one flat brand identity mockup for "${brand}", a ${businessLabel} food trailer.`,
								"This is a flat graphic presentation, not a photograph of a physical sign.",
							],
						},
						{
							title: "Content",
							lines: [
								row("Emblem", emblem),
								row("Wordmark", `"${brand}", below the emblem`),
								...paletteRows(colors),
								row("Background", "a deep neutral color from the palette"),
								"Lock the emblem and the wordmark together as one badge, centered.",
							],
						},
						{
							title: "Craft",
							lines: [
								"Make the badge clear at 30 ft and at 3 ft.",
								"Use bold solid shapes, 2 or 3 spot colors and sharp edges.",
								"Cut each shape from one vinyl roll color.",
								"Do not use gradients, brush strokes, texture or photoreal rendering.",
							],
						},
						{
							title: "Warnings",
							lines: [
								warning(
									"Do not add text other than the brand name.",
									"Each extra word is an error.",
								),
							],
						},
					])
				: doc("BRAND DIRECTION BOARD", [
						{
							title: "Task",
							lines: [
								`Make one brand direction board for an unnamed ${businessLabel} food trailer.`,
								"This is a flat graphic presentation, not a photograph.",
							],
						},
						{
							title: "Content",
							lines: [
								...paletteRows(colors),
								"Show the colors as three large swatches, stacked, at their proportions.",
								row("Emblem", emblem),
								"Center the emblem above the swatches.",
								"Put a blank rectangular panel where a wordmark goes.",
								row("Background", "a deep neutral color from the palette"),
							],
						},
						{
							title: "Craft",
							lines: [
								"Use crisp cut-vinyl shapes, 2 or 3 spot colors and sharp edges.",
								"Do not use gradients or texture.",
							],
						},
						{
							title: "Warnings",
							lines: [
								warning(
									"Do not write text or letters anywhere.",
									"The business has no name yet.",
								),
							],
						},
					]),
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
	/** Operating brief from the quiz — scene, finish and exterior features. */
	brief?: DesignBrief | null;
	/** Openings from the design record, when one exists. */
	openings?: readonly Opening[] | null;
	/** Version stamp of the design record this round renders. */
	versionStamp?: string | null;
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
	/**
	 * Whether this round spends a credit. Default: a round with no `only`
	 * list charges a fresh generation; `only` is a retry until the caller
	 * explicitly says otherwise (the auto first round and the 3-starter
	 * button both pass a view list but must still charge).
	 */
	charge?: boolean;
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
		brief: args.brief ?? null,
		openings: args.openings ?? null,
		versionStamp: args.versionStamp ?? null,
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
	// already paid for (and works with no credits left), and a round where
	// nothing rendered delivered nothing.
	const charged =
		(args.charge ?? !args.only?.length) &&
		images.some((i) => i.status === "ready");
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
