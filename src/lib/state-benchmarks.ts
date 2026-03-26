/**
 * Parsed state-level benchmarks from the ACS S0701 Geographic Mobility CSV.
 * Used for narrative copy in reports and contextual comparisons.
 *
 * Source: data/ACSST1Y2024.S0701-2026-03-18T143609.csv
 */

export const CA_MOBILITY = {
	totalPopulation: 39_039_388,
	movedWithinCounty: 6.2,
	movedDifferentCountySameState: 2.4,
	movedDifferentState: 1.0,
	movedFromAbroad: 0.8,
	medianAge: 38.7,
	medianIncomeMover: 44_349,
} as const;

export const CA_MOBILITY_BY_AGE: Record<
	string,
	{ population: number; movedWithinCounty: number }
> = {
	"1-4": { population: 1_691_279, movedWithinCounty: 7.9 },
	"5-17": { population: 6_328_184, movedWithinCounty: 5.4 },
	"18-24": { population: 3_644_130, movedWithinCounty: 9.3 },
	"25-34": { population: 5_708_737, movedWithinCounty: 11.3 },
	"35-44": { population: 5_601_979, movedWithinCounty: 7.0 },
	"45-54": { population: 4_861_460, movedWithinCounty: 4.3 },
	"55-64": { population: 4_678_758, movedWithinCounty: 3.4 },
	"65-74": { population: 3_752_042, movedWithinCounty: 2.9 },
	"75+": { population: 2_772_819, movedWithinCounty: 3.2 },
};

export const CA_MOBILITY_BY_INCOME: Record<
	string,
	{ population: number; movedWithinCounty: number }
> = {
	"$1-$9,999": { population: 3_296_715, movedWithinCounty: 6.7 },
	"$10,000-$14,999": { population: 2_098_465, movedWithinCounty: 5.8 },
	"$15,000-$24,999": { population: 3_055_269, movedWithinCounty: 5.9 },
	"$25,000-$34,999": { population: 2_790_337, movedWithinCounty: 6.3 },
	"$35,000-$49,999": { population: 3_542_218, movedWithinCounty: 6.4 },
	"$50,000-$64,999": { population: 2_784_130, movedWithinCounty: 6.4 },
	"$65,000-$74,999": { population: 1_411_718, movedWithinCounty: 7.1 },
	"$75,000+": { population: 8_431_934, movedWithinCounty: 6.2 },
};

export const CA_MOBILITY_BY_EDUCATION: Record<
	string,
	{ population: number; movedWithinCounty: number }
> = {
	"Less than HS": { population: 4_147_954, movedWithinCounty: 4.8 },
	"High school": { population: 5_602_709, movedWithinCounty: 5.6 },
	"Some college": { population: 7_188_480, movedWithinCounty: 5.8 },
	"Bachelor's": { population: 6_355_683, movedWithinCounty: 6.4 },
	"Graduate+": { population: 4_080_969, movedWithinCounty: 6.5 },
};

export const CA_HOUSING_TENURE = {
	ownerOccupied: { population: 22_293_368, movedWithinCounty: 2.9 },
	renterOccupied: { population: 15_853_004, movedWithinCounty: 10.1 },
};

export const CA_POVERTY = {
	below100Pct: { population: 4_507_764, movedWithinCounty: 8.6 },
	"100to149Pct": { population: 2_738_507, movedWithinCounty: 6.6 },
	atOrAbove150Pct: { population: 31_078_688, movedWithinCounty: 5.6 },
};

export function generateNarrativeCopy(): string[] {
	return [
		`In California, ${CA_MOBILITY.movedWithinCounty}% of the population moved within their county in 2024, with the highest mobility among 25-34 year olds (${CA_MOBILITY_BY_AGE["25-34"].movedWithinCounty}%).`,
		`Renters are ${(CA_HOUSING_TENURE.renterOccupied.movedWithinCounty / CA_HOUSING_TENURE.ownerOccupied.movedWithinCounty).toFixed(1)}x more likely to move within their county than homeowners, making high-renter neighborhoods dynamic deployment targets.`,
		`Higher-educated Californians show greater mobility: ${CA_MOBILITY_BY_EDUCATION["Graduate+"].movedWithinCounty}% of graduate degree holders moved within their county vs ${CA_MOBILITY_BY_EDUCATION["Less than HS"].movedWithinCounty}% of those without a high school diploma.`,
		`California's median income for movers ($${CA_MOBILITY.medianIncomeMover.toLocaleString()}) exceeds the national median ($41,765), signaling higher spending power among the mobile population.`,
		`Those below the poverty line moved at ${CA_POVERTY.below100Pct.movedWithinCounty}% vs ${CA_POVERTY.atOrAbove150Pct.movedWithinCounty}% for those at 150%+ of poverty level — mobility correlates with economic vulnerability.`,
	];
}
