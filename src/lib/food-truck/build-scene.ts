/**
 * The brief's live 3D build — what the companion shows at each moment.
 *
 * The trailer is "built" in the order a factory builds one: a bare chassis,
 * then the equipment line on the deck once we know what is served, then the
 * shell rising around it once there is a body (chosen, or recommended and
 * the buyer has reached the truck step), then the wrap, then the fittings.
 * Every input is a brief answer, and every output reuses the same engines
 * the renders and the spec use — layoutFor, recommendVehicle, quizToDirect —
 * so the model the buyer watches being built is the trailer they get.
 *
 * Pure and client-safe.
 */
import type { FeatureId, TradingContextId } from "./brief";
import { FEATURES } from "./brief";
import { getBusiness, getVehicle } from "./constants";
import { getEquipment } from "./equipment";
import { layoutFor } from "./layout";
import { quizToDirect } from "./quiz";

/** The quiz's draft answers — the shape StyleQuizFlow keeps. */
export interface BriefDraft {
	brandName: string;
	businessType: string;
	menu: string;
	tradingContexts: string[];
	servicePeriod: string;
	peakVolume: string;
	crew: string;
	vehicleId: string;
	service: string;
	styles: string[];
	palettes: string[];
	customColors: string[];
	wrapFinish: string;
	logo: string;
	features: string[];
	notes: string;
	budget: string;
	timeline: string;
}

export type BuildStep = "chassis" | "line" | "body" | "wrap" | "features";

export type GroundKind =
	| "concrete"
	| "grass"
	| "pavers"
	| "gravel"
	| "lawn"
	| "studio";

export interface BuildScene {
	/** Body the model is drawn on: chosen, else recommended, else the default. */
	bodyId: string;
	/** True once the buyer picked the body themselves. */
	bodyLocked: boolean;
	/** 0 = chassis + line only, 1 = full shell. */
	reveal: number;
	equipmentIds: string[];
	/** Empty = unwrapped shell (primer white / bare aluminium). */
	wrapColors: string[];
	finish: string | null;
	features: FeatureId[];
	brandName: string;
	ground: GroundKind;
	night: boolean;
	/** What has been built so far, for the companion's checklist. */
	done: Record<BuildStep, boolean>;
	/** True on the review step: frame it as the finished trailer. */
	finished: boolean;
}

const GROUND: Record<TradingContextId, GroundKind> = {
	street: "concrete",
	events: "grass",
	office: "pavers",
	brewery: "gravel",
	campus: "pavers",
	private: "lawn",
};

/** Step ids in StyleQuizFlow order; the shell rises from the truck step on. */
const TRUCK_STEP = 2;
const REVIEW_STEP = 6;

function menuItems(menu: string): string[] {
	return menu
		.split(/[,;\n]+/)
		.map((m) => m.trim())
		.filter(Boolean);
}

export function sceneFromDraft(
	d: BriefDraft,
	recommendedVehicleId: string | null,
	stepIndex: number,
): BuildScene {
	const bodyLocked = Boolean(getVehicle(d.vehicleId));
	const bodyId = bodyLocked
		? d.vehicleId
		: (recommendedVehicleId ?? "square-4m");
	const business = getBusiness(d.businessType);
	const equipmentIds = business
		? layoutFor(business.id, bodyId, d.service === "walk-in", menuItems(d.menu))
				.equipment
		: [];
	const { colors } = quizToDirect({
		styles: d.styles,
		palettes: d.palettes,
		extras: [],
	});
	const wrapColors = [...d.customColors, ...colors.split(", ").filter(Boolean)]
		.filter((c, i, a) => a.indexOf(c) === i)
		.slice(0, 4);
	const features = d.features.filter((f): f is FeatureId =>
		FEATURES.some((x) => x.id === f),
	);
	const shellUp = bodyLocked || stepIndex >= TRUCK_STEP;
	const first = d.tradingContexts[0] as TradingContextId | undefined;
	return {
		bodyId,
		bodyLocked,
		reveal: shellUp ? 1 : 0,
		equipmentIds,
		wrapColors,
		finish: d.wrapFinish || null,
		features,
		brandName: d.brandName.trim(),
		ground: first ? (GROUND[first] ?? "studio") : "studio",
		night: d.servicePeriod === "night",
		done: {
			chassis: true,
			line: equipmentIds.length > 0,
			body: shellUp,
			wrap: wrapColors.length > 0,
			features: features.length > 0 || stepIndex >= REVIEW_STEP,
		},
		finished: stepIndex >= REVIEW_STEP,
	};
}

const label = (id: string) => getEquipment(id)?.label ?? id.replace(/-/g, " ");

/**
 * One caption for what just changed between two scenes — the companion's
 * "the factory just did this" line. Null when nothing visible changed.
 */
export function describeChange(
	prev: BuildScene | null,
	next: BuildScene,
): string | null {
	if (!prev)
		return next.equipmentIds.length
			? null
			: "Chassis on the line — let's build your trailer";
	if (next.finished && !prev.finished) return "This is your trailer";
	const added = next.equipmentIds.filter((e) => !prev.equipmentIds.includes(e));
	const removed = prev.equipmentIds.filter(
		(e) => !next.equipmentIds.includes(e),
	);
	if (prev.equipmentIds.length === 0 && added.length > 0) {
		const biz = added.map(label).slice(0, 2).join(", ");
		return `Line placed: ${biz}${added.length > 2 ? ` + ${added.length - 2} more` : ""}`;
	}
	if (next.bodyId !== prev.bodyId)
		return `Body: ${getVehicle(next.bodyId)?.label ?? next.bodyId}`;
	if (next.reveal > prev.reveal)
		return `Shell up: ${getVehicle(next.bodyId)?.label ?? next.bodyId}`;
	if (added.length) return `Added: ${added.map(label).slice(0, 2).join(", ")}`;
	if (removed.length)
		return `Removed: ${removed.map(label).slice(0, 2).join(", ")}`;
	if (next.wrapColors.join() !== prev.wrapColors.join())
		return next.wrapColors.length
			? `Wrap: ${next.wrapColors.slice(0, 2).join(" and ")}`
			: "Wrap cleared";
	if (next.finish !== prev.finish && next.finish)
		return `Finish: ${next.finish}`;
	const newFeature = next.features.find((f) => !prev.features.includes(f));
	if (newFeature)
		return `Fitted: ${FEATURES.find((f) => f.id === newFeature)?.label ?? newFeature}`;
	if (next.brandName && next.brandName !== prev.brandName)
		return `Lettering: “${next.brandName}”`;
	if (next.ground !== prev.ground) return "Parked at your pitch";
	if (next.night !== prev.night)
		return next.night ? "Lights on for night service" : "Back to daylight";
	return null;
}

/**
 * The finished scene, rebuilt from a saved design version — what the
 * workspace shows while the first photoreal renders are being made.
 */
export function sceneFromSpec(
	spec: {
		brand?: string;
		hasBrand?: boolean;
		vehicleId?: string;
		equipment?: string[];
		colors?: string[];
	},
	brief?: {
		features?: string[];
		wrapFinish?: string | null;
		tradingContexts?: string[];
		servicePeriod?: string | null;
	} | null,
): BuildScene {
	const first = brief?.tradingContexts?.[0] as TradingContextId | undefined;
	const features = (brief?.features ?? []).filter((f): f is FeatureId =>
		FEATURES.some((x) => x.id === f),
	);
	return {
		bodyId: getVehicle(spec.vehicleId ?? "")
			? (spec.vehicleId as string)
			: "square-4m",
		bodyLocked: true,
		reveal: 1,
		equipmentIds: spec.equipment ?? [],
		wrapColors: spec.colors ?? [],
		finish: brief?.wrapFinish ?? null,
		features,
		brandName: spec.hasBrand ? (spec.brand ?? "") : "",
		ground: first ? (GROUND[first] ?? "studio") : "studio",
		night: brief?.servicePeriod === "night",
		done: {
			chassis: true,
			line: true,
			body: true,
			wrap: (spec.colors ?? []).length > 0,
			features: true,
		},
		finished: true,
	};
}
