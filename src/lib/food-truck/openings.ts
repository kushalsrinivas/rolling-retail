/**
 * Openings schema — which side the hatch is on, how wide, how it hinges.
 *
 * Views used to never name a side, so the model picked one per view and the
 * "rear" showed a side with a door and no hatch. Every exterior prompt now
 * names curbside vs roadside from here, and the deterministic plan draws
 * these exact openings with real dimensions.
 *
 * Pure and client-safe. Distances in metres from the front of the box.
 */

export type OpeningType = "door" | "hatch" | "window";
export type OpeningSide = "curbside" | "roadside" | "rear";

export interface Opening {
	type: OpeningType;
	side: OpeningSide;
	/** Metres from the front wall to the opening's leading edge. */
	xFromFront: number;
	width: number;
	height: number;
	/** Sill height for hatches/windows, 0 for doors. */
	sillHeight: number;
	hinge: "top" | "forward" | "curbside" | "none";
}

export function defaultOpenings(
	body: "airstream" | "square",
	lengthM: number,
): Opening[] {
	if (body === "airstream") {
		// One curbside door toward the rear, one curbside hatch ahead of it.
		// No rear door — the rounded end cap is solid.
		return [
			{
				type: "hatch",
				side: "curbside",
				xFromFront: Math.round(lengthM * 0.35 * 100) / 100,
				width: Math.min(2.4, Math.round(lengthM * 0.35 * 100) / 100),
				height: 1.1,
				sillHeight: 1.05,
				hinge: "top",
			},
			{
				type: "door",
				side: "curbside",
				xFromFront: Math.round(lengthM * 0.72 * 100) / 100,
				width: 0.75,
				height: 1.9,
				sillHeight: 0,
				hinge: "forward",
			},
		];
	}
	return [
		{
			type: "hatch",
			side: "curbside",
			xFromFront: Math.round(lengthM * 0.3 * 100) / 100,
			width: Math.min(2.4, Math.round(lengthM * 0.4 * 100) / 100),
			height: 1.1,
			sillHeight: 1.05,
			hinge: "top",
		},
		{
			type: "door",
			side: "curbside",
			xFromFront: Math.round(lengthM * 0.75 * 100) / 100,
			width: 0.75,
			height: 1.9,
			sillHeight: 0,
			hinge: "forward",
		},
		{
			type: "door",
			side: "rear",
			xFromFront: 0,
			width: 0.8,
			height: 1.9,
			sillHeight: 0,
			hinge: "curbside",
		},
	];
}

/** One line the prompts quote verbatim, so every view names the same side. */
export function openingsPhrase(openings: readonly Opening[]): string {
	const bits = openings.map((o) => {
		if (o.side === "rear") return `rear ${o.type} (${o.width}m wide)`;
		return `${o.type} on the ${o.side} ${o.xFromFront}m from the front (${o.width}m wide)`;
	});
	return bits.join("; ");
}

/**
 * Closed-world openings brief: every opening positioned by exact distance,
 * then a total count that forbids all others.
 *
 * Video generations invented windows because the brief asserted "the
 * position of every door, hatch, window and vent" without naming a single
 * one. This lists each opening with its measured position and size, then
 * closes the world: the counts that follow are the complete set, and
 * anything beyond them — a second hatch, a roadside window, a rear door
 * that isn't listed — is a wrong render, not a creative choice.
 */
export function openingsBrief(
	openings: readonly Opening[],
	body: "airstream" | "square" | null,
): string {
	const describe = (o: Opening): string => {
		const pos =
			o.side === "rear"
				? "in the rear wall"
				: `on the ${o.side}, leading edge ${o.xFromFront}m back from the front wall`;
		const size = `${o.width}m wide × ${o.height}m tall`;
		const sill =
			o.type === "door"
				? "opens at floor level"
				: `sill ${o.sillHeight}m above the floor`;
		const hinge =
			o.hinge === "top"
				? "top-hinged, propped open upward as an awning"
				: o.hinge === "none"
					? "fixed"
					: `hinged on its ${o.hinge} edge`;
		return `${o.type} ${pos} (${size}, ${sill}, ${hinge})`;
	};
	const n = (t: Opening["type"]) => openings.filter((o) => o.type === t).length;
	const counts = `${openings.length} openings in total: ${n("hatch")} serving hatch${n("hatch") === 1 ? "" : "es"}, ${n("door")} door${n("door") === 1 ? "" : "s"}, ${n("window")} windows`;
	const roof =
		body === "square"
			? "roof vents and one rooftop HVAC unit"
			: "two small roof vents and one rooftop HVAC unit";
	return [
		`EXACT OPENINGS — ${openings.map(describe).join("; ")}.`,
		`COUNT CHECK: ${counts}. There are no other windows, doors, hatches, vents or openings anywhere on this vehicle — none on the roadside, none on the rear beyond those listed, none on the roof beyond ${roof}. If you are about to draw an opening that is not in this list, stop: it does not exist.`,
	].join(" ");
}
