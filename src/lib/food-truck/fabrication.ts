/**
 * Fabrication review — the shop marks each open item validated, changed or
 * needing a customer decision. When every item is validated the design moves
 * to "fabrication-ready". Only a person moves a design past approval.
 *
 * Server-only state lives on the session for now (Postgres Approval +
 * DesignVersion.state mirror it when DATABASE_URL is set).
 */

export type FabricationStatus =
	| "open"
	| "validated"
	| "changed"
	| "needs-decision";

export interface FabricationItem {
	id: string;
	label: string;
	status: FabricationStatus;
	note?: string;
	updatedAt: number;
}

const DEFAULT_ITEMS: Array<{ id: string; label: string }> = [
	{
		id: "openings",
		label: "Hatch/door positions, widths, sill heights, hinges",
	},
	{ id: "equipment", label: "Final equipment make + model, cut-outs, power" },
	{ id: "wrap", label: "Wrapped vs painted vs bare aluminum surfaces" },
	{ id: "artwork", label: "Logo artwork as vector, size + position per panel" },
	{ id: "palette", label: "Palette confirmed against physical film swatches" },
	{ id: "keepouts", label: "No graphics across door gaps, rivets, curves" },
	{ id: "roof", label: "Roof equipment positions (HVAC, vents, signs) + load" },
	{ id: "service", label: "Service model, queue side, ADA" },
];

export function defaultFabricationItems(): FabricationItem[] {
	const now = Date.now();
	return DEFAULT_ITEMS.map((d) => ({
		...d,
		status: "open" as const,
		updatedAt: now,
	}));
}

export function allValidated(items: readonly FabricationItem[]): boolean {
	return items.length > 0 && items.every((i) => i.status === "validated");
}
