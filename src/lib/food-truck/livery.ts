/**
 * Livery system — wraps are a template, not whatever the model paints.
 *
 * A riveted polished-aluminum Airstream is the hardest wrap to install, and
 * the prompts used to ask for a "complete wrap livery" with no zones,
 * keep-outs or size caps. Each body now gets zones (logo panel, belt band,
 * hatch surround), door/hatch keep-outs, an emblem size cap, and durability
 * rules the prompt and the QA both enforce.
 *
 * Pure and client-safe.
 */

export type VehicleBody = "airstream" | "square";

export interface LiveryZone {
	id: string;
	label: string;
	/** What goes here, in plain words for the prompt. */
	brief: string;
}

export interface LiveryTemplate {
	body: VehicleBody;
	id: string;
	label: string;
	zones: LiveryZone[];
	keepOuts: string[];
	/** Max emblem height in metres — wraps are cut, not painted. */
	emblemMaxM: number;
}

export const LIVERY_TEMPLATES: Record<VehicleBody, LiveryTemplate> = {
	airstream: {
		body: "airstream",
		id: "airstream-belt-band",
		label: "Airstream · polished aluminum with belt-line band",
		zones: [
			{
				id: "belt-band",
				label: "Belt-line band",
				brief:
					"a horizontal belt-line band in the primary color running the full curbside and roadside at counter height",
			},
			{
				id: "logo-panel",
				label: "Logo panel",
				brief:
					"a flat logo panel on the curbside ahead of the hatch carrying the brand emblem and wordmark",
			},
			{
				id: "hatch-surround",
				label: "Hatch surround",
				brief:
					"an accent-colored frame around the service hatch opening only, never crossing the door gap",
			},
		],
		keepOuts: [
			"no graphic crosses the entry-door gap, hinges or handle",
			"no graphic crosses the hatch cut line or its gas struts",
			"no graphic over rivet lines, wheel arches, vents or the HVAC unit",
			"bare polished aluminum stays visible above and below the band",
		],
		emblemMaxM: 0.9,
	},
	square: {
		body: "square",
		id: "square-color-block",
		label: "Square trailer · color-blocked lower third",
		zones: [
			{
				id: "lower-third",
				label: "Lower third",
				brief:
					"a color-blocked lower third in the primary color running the full curbside, roadside and rear",
			},
			{
				id: "side-logo",
				label: "Side logo panel",
				brief:
					"a side logo panel on the curbside upper wall carrying the brand emblem and wordmark",
			},
			{
				id: "rear-panel",
				label: "Rear panel",
				brief: "a rear panel carrying the wordmark and a small emblem repeat",
			},
		],
		keepOuts: [
			"no graphic crosses any door gap, hinge or handle",
			"no graphic crosses the hatch cut line or its gas struts",
			"no graphic over seams, vents, the HVAC unit or stabilizer jacks",
		],
		emblemMaxM: 1.1,
	},
};

export function liveryFor(body: VehicleBody): LiveryTemplate {
	return LIVERY_TEMPLATES[body];
}

/** Durability rules — quoted in every exterior prompt and checked in QA. */
export const LIVERY_RULES =
	"At most 3 colors plus neutral, no gradients, no photographic wrap, no graphic crossing a door gap, hinge, hatch cut line, rivet line, vent or compound curve. Emblems are flat spot-color vinyl shapes under 1.1m tall.";

export function liveryPhrase(body: VehicleBody): string {
	const t = liveryFor(body);
	const zones = t.zones.map((z) => `${z.label}: ${z.brief}`).join("; ");
	return `Livery template "${t.label}" — zones: ${zones}. Keep-outs: ${t.keepOuts.join("; ")}. ${LIVERY_RULES}`;
}
