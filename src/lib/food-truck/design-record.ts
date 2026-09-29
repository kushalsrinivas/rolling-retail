/**
 * Design record — the one versioned source of truth.
 *
 * Today the truth about the truck is split across six places that never
 * reconcile (regex brain words, browser-only layout, BUSINESS_TYPES.needs,
 * geometry prose, master-image pixels, parametric 3D). The renderer uses
 * prose and pixels; the deterministic 3D model never reaches it.
 *
 * The record fixes that: intake writes it directly, revisions patch it,
 * renders/3D/video/PDF all read it, and every output carries its version
 * stamp ("CONCEPT · v4 · not for construction"). Versions are immutable —
 * a change appends a child, never mutates.
 *
 * Pure and client-safe (no fs, no Prisma import).
 */
import { getVehicle } from "./constants";
import { lineProfileFor } from "./line-profile";
import { liveryFor, type VehicleBody } from "./livery";
import { defaultOpenings, type Opening } from "./openings";
import { type DesignPalette, paletteFor } from "./palette";
import { layoutFor } from "./tools";

export type DesignState =
	| "concept"
	| "revision"
	| "approved"
	| "fabrication-review"
	| "fabrication-ready";

export interface DesignSpec {
	brand: string;
	hasBrand: boolean;
	/** Business type id, e.g. "mexican", "cold-drinks". */
	businessType: string;
	menu: string[];
	vehicleId: string;
	vehicleBody: VehicleBody;
	lengthM: number;
	widthM: number;
	heightM: number;
	serveMode: "hatch-serve" | "walk-in" | "hybrid";
	colors: string[];
	palette: DesignPalette;
	equipment: string[];
	openings: Opening[];
	liveryTemplateId: string;
	vibe: string[];
}

export interface DesignVersionRecord {
	version: number;
	parentVersion: number | null;
	/** e.g. { "palette.primary": "#EFE4CF" } in plain words. */
	changeSummary: string | null;
	spec: DesignSpec;
	state: DesignState;
	createdAt: number;
}

export function blankSpec(): DesignSpec {
	return {
		brand: "",
		hasBrand: false,
		businessType: "combined",
		menu: [],
		vehicleId: "square-4m",
		vehicleBody: "square",
		lengthM: 4,
		widthM: 2.1,
		heightM: 2.6,
		serveMode: "hatch-serve",
		colors: [],
		palette: paletteFor([]),
		equipment: [],
		openings: defaultOpenings("square", 4),
		liveryTemplateId: "square-color-block",
		vibe: [],
	};
}

export interface IntakeDirect {
	brandName?: string;
	businessType?: string;
	menu?: string;
	colors?: string;
	vibe?: string;
	vehicleId?: string;
	service?: string;
	notes?: string;
}

/**
 * Intake writes the record directly — no compose-then-regex round trip.
 * Anything outside the keyword lists ("sage", "birria", "wings") survives
 * here as menu/notes and still reaches the renderer.
 */
export function specFromIntake(answers: IntakeDirect): DesignSpec {
	const spec = blankSpec();
	if (answers.brandName?.trim()) {
		spec.brand = answers.brandName.trim();
		spec.hasBrand = true;
	}
	if (answers.businessType) spec.businessType = answers.businessType;
	if (answers.menu) {
		spec.menu = answers.menu
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.slice(0, 8);
	}
	if (answers.colors) {
		spec.colors = answers.colors
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.slice(0, 4);
		spec.palette = paletteFor(spec.colors);
	}
	if (answers.vibe) {
		spec.vibe = answers.vibe
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.slice(0, 3);
	}
	const vehicle = getVehicle(answers.vehicleId ?? "");
	if (vehicle) {
		spec.vehicleId = vehicle.id;
		spec.vehicleBody = vehicle.body;
		spec.lengthM = vehicle.lengthM;
		spec.widthM = vehicle.widthM;
		spec.heightM = vehicle.heightM;
	}
	spec.serveMode = answers.service === "walk-in" ? "walk-in" : "hatch-serve";
	spec.openings = defaultOpenings(spec.vehicleBody, spec.lengthM);
	spec.liveryTemplateId = liveryFor(spec.vehicleBody).id;
	// One equipment list for renders, spec, video and 3D.
	spec.equipment = layoutFor(
		spec.businessType,
		spec.vehicleId,
		spec.serveMode === "walk-in",
		spec.menu,
	).equipment;
	return spec;
}

/** Structured change request — "make it cream" becomes a patch, not prose. */
export type SpecPatch = Partial<
	Pick<
		DesignSpec,
		| "brand"
		| "businessType"
		| "vehicleId"
		| "serveMode"
		| "colors"
		| "vibe"
		| "menu"
		| "equipment"
	>
> & { openings?: Opening[] };

export function applyPatch(
	spec: DesignSpec,
	patch: SpecPatch,
): { spec: DesignSpec; changed: string[] } {
	const next: DesignSpec = {
		...spec,
		menu: [...spec.menu],
		colors: [...spec.colors],
		vibe: [...spec.vibe],
		equipment: [...spec.equipment],
	};
	const changed: string[] = [];
	if (patch.brand !== undefined && patch.brand !== spec.brand) {
		next.brand = patch.brand;
		next.hasBrand = Boolean(patch.brand.trim());
		changed.push("brand");
	}
	if (
		patch.businessType !== undefined &&
		patch.businessType !== spec.businessType
	) {
		next.businessType = patch.businessType;
		changed.push("businessType");
	}
	if (patch.vehicleId !== undefined && patch.vehicleId !== spec.vehicleId) {
		const v = getVehicle(patch.vehicleId);
		if (v) {
			next.vehicleId = v.id;
			next.vehicleBody = v.body;
			next.lengthM = v.lengthM;
			next.widthM = v.widthM;
			next.heightM = v.heightM;
			next.openings = defaultOpenings(v.body, v.lengthM);
			next.liveryTemplateId = liveryFor(v.body).id;
			changed.push("vehicleId");
		}
	}
	if (patch.serveMode !== undefined && patch.serveMode !== spec.serveMode) {
		next.serveMode = patch.serveMode;
		changed.push("serveMode");
	}
	if (patch.colors !== undefined) {
		next.colors = patch.colors.slice(0, 4);
		next.palette = paletteFor(next.colors);
		changed.push("palette");
	}
	if (patch.vibe !== undefined) {
		next.vibe = patch.vibe.slice(0, 3);
		changed.push("vibe");
	}
	if (patch.menu !== undefined) {
		next.menu = patch.menu.slice(0, 8);
		changed.push("menu");
	}
	if (patch.openings !== undefined) {
		next.openings = patch.openings;
		changed.push("openings");
	}
	// Equipment follows the business/vehicle/menu unless explicitly pinned.
	if (patch.equipment !== undefined) {
		next.equipment = [...patch.equipment];
		changed.push("equipment");
	} else if (
		changed.some(
			(c) =>
				c === "businessType" ||
				c === "vehicleId" ||
				c === "menu" ||
				c === "serveMode",
		)
	) {
		next.equipment = layoutFor(
			next.businessType,
			next.vehicleId,
			next.serveMode === "walk-in",
			next.menu,
		).equipment;
	}
	return { spec: next, changed };
}

/** Line profile id for prompts — boba vs juice, churros vs pastry case. */
export function profileIdFor(spec: DesignSpec): string {
	return lineProfileFor(spec.businessType, spec.menu).id;
}

/** Visible stamp on every render, PDF and video. */
export function versionStamp(version: number, state: DesignState): string {
	const s =
		state === "approved"
			? "APPROVED CONCEPT"
			: state === "fabrication-ready"
				? "FABRICATION READY"
				: state === "fabrication-review"
					? "FABRICATION REVIEW"
					: "CONCEPT";
	return `${s} · v${version} · not for construction`;
}
