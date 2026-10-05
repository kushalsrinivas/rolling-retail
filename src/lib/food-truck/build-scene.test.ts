import { describe, expect, it } from "vitest";
import {
	type BriefDraft,
	describeChange,
	sceneFromDraft,
	sceneFromSpec,
} from "./build-scene";
import { allEquipment } from "./equipment";

const EMPTY: BriefDraft = {
	brandName: "",
	businessType: "",
	menu: "",
	tradingContexts: [],
	servicePeriod: "",
	peakVolume: "",
	crew: "",
	vehicleId: "",
	service: "",
	styles: [],
	palettes: [],
	customColors: [],
	wrapFinish: "",
	logo: "",
	features: [],
	notes: "",
	budget: "",
	timeline: "",
};

describe("the brief builds the trailer in factory order", () => {
	it("starts as a bare chassis", () => {
		const s = sceneFromDraft(EMPTY, null, 0);
		expect(s.reveal).toBe(0);
		expect(s.equipmentIds).toEqual([]);
		expect(s.done).toMatchObject({
			chassis: true,
			line: false,
			body: false,
			wrap: false,
		});
		expect(describeChange(null, s)).toMatch(/Chassis/);
	});

	it("drops the line onto the deck once the business is known", () => {
		const prev = sceneFromDraft(EMPTY, null, 0);
		const s = sceneFromDraft(
			{ ...EMPTY, businessType: "mexican" },
			"square-4m",
			0,
		);
		expect(s.equipmentIds).toContain("griddle");
		expect(s.reveal).toBe(0);
		expect(s.done.line).toBe(true);
		expect(describeChange(prev, s)).toMatch(/^Line placed:/);
	});

	it("raises the recommended body at the truck step, and the chosen one replaces it", () => {
		const atTruck = sceneFromDraft(
			{ ...EMPTY, businessType: "coffee" },
			"square-3m",
			2,
		);
		expect(atTruck.reveal).toBe(1);
		expect(atTruck.bodyId).toBe("square-3m");
		expect(atTruck.bodyLocked).toBe(false);
		const chosen = sceneFromDraft(
			{ ...EMPTY, businessType: "coffee", vehicleId: "airstream-s" },
			"square-3m",
			2,
		);
		expect(chosen.bodyId).toBe("airstream-s");
		expect(chosen.bodyLocked).toBe(true);
		expect(describeChange(atTruck, chosen)).toMatch(/Body: Airstream/);
	});

	it("wraps it, fits features and frames it as finished", () => {
		const base = { ...EMPTY, businessType: "grill", vehicleId: "square-4m" };
		const wrapped = sceneFromDraft(
			{ ...base, customColors: ["teal"], palettes: ["p-harbor"] },
			null,
			4,
		);
		expect(wrapped.wrapColors[0]).toBe("teal");
		expect(wrapped.done.wrap).toBe(true);
		const fitted = sceneFromDraft(
			{
				...base,
				features: ["awning", "bogus"],
				tradingContexts: ["events"],
				servicePeriod: "night",
			},
			null,
			5,
		);
		expect(fitted.features).toEqual(["awning"]);
		expect(fitted.ground).toBe("grass");
		expect(fitted.night).toBe(true);
		const done = sceneFromDraft(base, null, 6);
		expect(done.finished).toBe(true);
		expect(describeChange(sceneFromDraft(base, null, 5), done)).toBe(
			"This is your trailer",
		);
	});

	it("rebuilds the finished trailer from a saved design", () => {
		const s = sceneFromSpec(
			{
				brand: "Bean There",
				hasBrand: true,
				vehicleId: "airstream-s",
				equipment: ["espresso-machine"],
				colors: ["teal"],
			},
			{
				features: ["roof-sign"],
				tradingContexts: ["brewery"],
				wrapFinish: "matte",
			},
		);
		expect(s).toMatchObject({
			bodyId: "airstream-s",
			reveal: 1,
			brandName: "Bean There",
			ground: "gravel",
			finish: "matte",
			finished: true,
		});
		expect(s.features).toEqual(["roof-sign"]);
	});
});

describe("every catalog unit has a 3D part", () => {
	it("is in the parts registry", async () => {
		const { PARTS } = await import("#/components/truck/parts");
		const missing = allEquipment()
			.filter((e) => !(e.id in PARTS))
			.map((e) => e.id);
		expect(missing).toEqual([]);
	});
});
