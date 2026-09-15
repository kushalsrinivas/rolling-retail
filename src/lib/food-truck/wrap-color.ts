/**
 * The Project Brain stores brand colours as the words the buyer typed —
 * "matte black", "cream", "stainless steel". Those are not CSS colours, and
 * feeding them straight to a three.js material gives a silent fallback to
 * white (or a console warning), so the wrap never shows.
 *
 * This maps the vocabulary the brain actually extracts onto hex, along with a
 * finish hint, since "chrome" and "cream" want very different materials.
 */
export interface WrapFinish {
	hex: string;
	metalness: number;
	roughness: number;
}

const WRAP: Record<string, WrapFinish> = {
	"matte black": { hex: "#1c1c1f", metalness: 0.05, roughness: 0.92 },
	"stainless steel": { hex: "#c8ccd0", metalness: 0.9, roughness: 0.28 },
	chrome: { hex: "#e6e9ec", metalness: 1, roughness: 0.08 },
	silver: { hex: "#c0c4c8", metalness: 0.85, roughness: 0.25 },
	gold: { hex: "#c9a227", metalness: 0.9, roughness: 0.25 },
	brass: { hex: "#b5952f", metalness: 0.85, roughness: 0.32 },
	copper: { hex: "#b4633a", metalness: 0.88, roughness: 0.3 },
	neon: { hex: "#39ff6a", metalness: 0.1, roughness: 0.4 },

	black: { hex: "#141416", metalness: 0.2, roughness: 0.6 },
	white: { hex: "#f5f5f5", metalness: 0.15, roughness: 0.55 },
	cream: { hex: "#efe4cf", metalness: 0.1, roughness: 0.62 },
	beige: { hex: "#ddccb0", metalness: 0.1, roughness: 0.65 },
	red: { hex: "#c8322b", metalness: 0.2, roughness: 0.45 },
	blue: { hex: "#2a5ec2", metalness: 0.2, roughness: 0.45 },
	navy: { hex: "#1b2a52", metalness: 0.2, roughness: 0.48 },
	green: { hex: "#2f8a4d", metalness: 0.2, roughness: 0.45 },
	teal: { hex: "#1f8a8a", metalness: 0.2, roughness: 0.45 },
	yellow: { hex: "#e8c018", metalness: 0.2, roughness: 0.42 },
	orange: { hex: "#e2761f", metalness: 0.2, roughness: 0.42 },
	purple: { hex: "#7c4bc4", metalness: 0.2, roughness: 0.45 },
	pink: { hex: "#dd5d94", metalness: 0.2, roughness: 0.45 },
	maroon: { hex: "#6d2029", metalness: 0.2, roughness: 0.5 },
	brown: { hex: "#6b4a2f", metalness: 0.15, roughness: 0.65 },
	wood: { hex: "#9c6b3f", metalness: 0.05, roughness: 0.85 },
	walnut: { hex: "#5a3a24", metalness: 0.05, roughness: 0.82 },
	gray: { hex: "#8a8d91", metalness: 0.3, roughness: 0.5 },
	grey: { hex: "#8a8d91", metalness: 0.3, roughness: 0.5 },
};

/**
 * Resolve the buyer's colour words to a wrap finish. Takes the whole list and
 * picks the first one recognised, so "black, cream, orange" wraps in black
 * rather than falling over on an unknown word.
 */
export function resolveWrap(
	colors: string[] | null | undefined,
): WrapFinish | null {
	for (const raw of colors ?? []) {
		const key = raw.trim().toLowerCase();
		if (WRAP[key]) return WRAP[key];
	}
	// A hex the buyer typed directly is honoured as-is.
	for (const raw of colors ?? []) {
		const hex = raw.trim();
		if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
			return { hex, metalness: 0.2, roughness: 0.5 };
		}
	}
	return null;
}
