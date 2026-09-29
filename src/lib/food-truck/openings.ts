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
