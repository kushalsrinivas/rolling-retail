/**
 * One place that decides what a render round is briefed with.
 *
 * Three routes used to assemble render arguments by hand (the chat's auto
 * round, the manual images route, the menu board), each from the regex
 * brain, each with its own defaults — so a confirmed change to the design
 * record never reached the pixels, and the panel drifted from what the chat
 * said. Every round now reads the versioned design record first and only
 * falls back to the brain before a record exists.
 *
 * Server-only (imports the layout engine).
 */
import { getVehicle } from "./constants";
import { currentDesign, type TruckSession } from "./session";
import type { StarterConceptArgs } from "./images";
import { layoutFor } from "./tools";
import { versionStamp } from "./design-record";

export function renderArgsFor(
	session: TruckSession,
): Omit<StarterConceptArgs, "only" | "completed" | "charge"> {
	const record = currentDesign(session);
	const brain = session.brain;
	const notes = session.brief?.notes
		? `buyer must-haves: ${session.brief.notes}`
		: undefined;

	if (record) {
		const s = record.spec;
		return {
			brand: s.hasBrand ? s.brand : "",
			vehicleId: s.vehicleId,
			vehicleLabel: getVehicle(s.vehicleId)?.label ?? s.vehicleId,
			vehicleBody: s.vehicleBody,
			lengthM: s.lengthM,
			widthM: s.widthM,
			heightM: s.heightM,
			colors: s.colors.join(", ") || "brand colors",
			vibe: s.vibe.join(", ") || "bold street-food",
			businessType: s.businessType,
			menuKeywords: s.menu,
			equipment: s.equipment,
			serveMode: s.serveMode,
			openings: s.openings,
			brief: session.brief,
			brainNote: notes,
			versionStamp: versionStamp(record.version, record.state),
			inspirationImage: session.inspirationImage,
			masterReference: session.masterImageUrl,
		};
	}

	const vehicle =
		getVehicle(brain?.vehicleId ?? "") ?? getVehicle("airstream-m");
	const businessType = brain?.businessType ?? "combined";
	const walkIn = brain?.walkIn === true;
	return {
		brand: brain?.brandName ?? "",
		vehicleId: vehicle?.id ?? null,
		vehicleLabel: vehicle?.label ?? "Square Trailer · 13 ft",
		vehicleBody: vehicle?.body ?? "square",
		lengthM: vehicle?.lengthM ?? 4,
		widthM: vehicle?.widthM ?? 2.1,
		heightM: vehicle?.heightM ?? 2.6,
		colors: brain?.colors.slice(0, 3).join(", ") || "brand colors",
		vibe: brain?.vibeWords.slice(0, 2).join(", ") || "bold street-food",
		businessType,
		menuKeywords: brain?.menuKeywords ?? [],
		equipment: layoutFor(
			businessType,
			vehicle?.id ?? "square-4m",
			walkIn,
			brain?.menuKeywords ?? [],
		).equipment,
		serveMode: walkIn ? "walk-in" : "hatch-serve",
		brief: session.brief,
		brainNote: notes,
		inspirationImage: session.inspirationImage,
		masterReference: session.masterImageUrl,
	};
}

/**
 * One line the agent sees every turn, so it knows what is actually on the
 * buyer's screen. The model used to talk about renders it had never been
 * told existed — or describe a palette the last revision had replaced.
 */
export function canvasDigest(session: TruckSession): string {
	const record = currentDesign(session);
	const ready = Object.values(session.images)
		.filter((i) => i.status === "ready")
		.map((i) => i.label.replace(/_/g, " "));
	const parts = [
		record
			? `design v${record.version} (${record.state})`
			: "no design record yet",
		ready.length ? `renders on screen: ${ready.join(", ")}` : "no renders yet",
	];
	if (record) {
		const s = record.spec;
		parts.push(
			`body ${getVehicle(s.vehicleId)?.label ?? s.vehicleId}`,
			`palette ${s.colors.join(", ") || "not set"}`,
			`serve ${s.serveMode}`,
		);
	}
	return `Canvas — ${parts.join(" | ")}.`;
}
