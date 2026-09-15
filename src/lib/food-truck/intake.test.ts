import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, getVehicle, VEHICLES } from "./constants";
import { composeBrief, FOOD_TRUCK_INTAKE } from "./intake";

describe("intake config", () => {
	it("never marks a field required — every buyer can skip", () => {
		for (const step of FOOD_TRUCK_INTAKE.steps) {
			for (const field of step.fields) {
				expect(field.required, `${step.id}.${field.id}`).toBeFalsy();
			}
		}
	});

	it("offers every business type and body the factory builds", () => {
		const all = FOOD_TRUCK_INTAKE.steps.flatMap((s) => s.fields);
		const business = all.find((f) => f.id === "businessType")!;
		const vehicle = all.find((f) => f.id === "vehicleId")!;
		expect(business.options).toHaveLength(BUSINESS_TYPES.length);
		expect(vehicle.options).toHaveLength(VEHICLES.length);
	});

	it("only offers templates the rest of the system understands", () => {
		for (const t of FOOD_TRUCK_INTAKE.templates) {
			expect(getVehicle(t.values.vehicleId), t.id).not.toBeNull();
			expect(
				BUSINESS_TYPES.some((b) => b.id === t.values.businessType),
				t.id,
			).toBe(true);
		}
	});

	it("suggests only colours the 3D wrap can actually render", async () => {
		const { resolveWrap } = await import("./wrap-color");
		const colors = FOOD_TRUCK_INTAKE.steps
			.flatMap((s) => s.fields)
			.find((f) => f.id === "colors")!;
		for (const suggestion of colors.suggestions ?? []) {
			expect(resolveWrap([suggestion]), suggestion).not.toBeNull();
		}
	});
});

describe("composeBrief", () => {
	it("reads as something a buyer would have written", () => {
		const brief = composeBrief({
			brandName: "BIB Burgers",
			businessType: "grill",
			menu: "smash burgers, shakes",
			colors: "matte black, cream, orange",
			vibe: "bold",
			vehicleId: "airstream-m",
			service: "hatch",
			notes: "burger assembly visible from the counter",
		});
		expect(brief).toContain("BIB Burgers");
		expect(brief).toContain("Grill, Burgers & Barbecue");
		expect(brief).toContain("Airstream · Mid");
		expect(brief).toContain("order at the hatch");
		expect(brief).toContain("burger assembly visible from the counter");
	});

	it("picks the right article for the body name", () => {
		expect(composeBrief({ vehicleId: "airstream-m" })).toContain(
			"an Airstream",
		);
		expect(composeBrief({ vehicleId: "square-4m" })).toContain(
			"a Square Trailer",
		);
	});

	it("resolves ids to the labels a person would use", () => {
		const brief = composeBrief({
			businessType: "coffee",
			vehicleId: "square-3m",
		});
		expect(brief).not.toContain("square-3m");
		expect(brief).toContain("Square Trailer · 10 ft");
	});

	it("says something useful when everything was skipped", () => {
		const brief = composeBrief({});
		expect(brief).toContain("haven't settled");
		expect(brief.length).toBeGreaterThan(40);
	});

	it("ignores blank answers rather than emitting empty sentences", () => {
		const brief = composeBrief({ brandName: "  ", menu: "", colors: "teal" });
		expect(brief).not.toMatch(/\s\./);
		expect(brief).toContain("teal");
	});

	it("mentions walk-in service only when that is what was chosen", () => {
		expect(composeBrief({ service: "walk-in" })).toContain("walk inside");
		expect(composeBrief({ service: "hatch" })).not.toContain("walk inside");
	});

	it("produces a brief the brain can extract a vehicle from", async () => {
		const { updateBrain } = await import("./brain");
		const brief = composeBrief({
			businessType: "grill",
			vehicleId: "square-5m",
		});
		expect(updateBrain(null, brief).vehicleId).toBe("square-5m");
	});
});
