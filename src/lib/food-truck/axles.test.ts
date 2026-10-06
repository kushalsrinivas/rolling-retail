import { describe, expect, it } from "vitest";
import {
	axleCount,
	geometryFor,
	geometryItemsFor,
	VEHICLES,
} from "./constants";

describe("axles", () => {
	it("follows Airstream's 23 ft split", () => {
		expect(axleCount(6.7)).toBe(1); // 22 ft
		expect(axleCount(7.02)).toBe(2); // 23 ft
	});

	it("puts only the Airstream Large on two axles", () => {
		const tandem = VEHICLES.filter((v) => axleCount(v.lengthM) === 2).map(
			(v) => v.id,
		);
		expect(tandem).toEqual(["airstream-l"]);
	});

	it("tells the render prompts the same", () => {
		expect(geometryFor("airstream", 8)).toMatch(/tandem axle/);
		expect(geometryFor("airstream", 6)).toMatch(/single axle/);
		expect(
			geometryItemsFor("square", 5).some((g) => g.startsWith("single axle")),
		).toBe(true);
		expect(geometryFor("airstream")).toMatch(/single axle/);
	});
});
