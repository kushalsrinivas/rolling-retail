import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { prisma } from "#/db";
import { createTRPCRouter, publicProcedure } from "./init";

type BlockGroupRow = {
	geoid: string;
	countyName: string;
	tractCode: string;
	centroidLat: number;
	centroidLng: number;
	daytimePopScore: number | null;
	pedestrianScore: number | null;
	commercialScore: number | null;
	affluenceIndex: number | null;
	compositeScore: number | null;
	nearestParkAttend: number | null;
	medianHhIncome: number | null;
	totalPop: number | null;
	daytimePopEst: number | null;
	[key: string]: unknown;
};

type ScoredLocation = BlockGroupRow & { weightedScore: number };

const locationsRouter = {
	list: publicProcedure
		.input(
			z.object({
				countyFips: z.string().optional(),
				limit: z.number().min(1).max(500).default(100),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ input }) => {
			const where = input.countyFips ? { countyFips: input.countyFips } : {};
			const [items, total] = await Promise.all([
				prisma.blockGroup.findMany({
					where,
					orderBy: { compositeScore: "desc" },
					take: input.limit,
					skip: input.offset,
				}),
				prisma.blockGroup.count({ where }),
			]);
			return { items, total };
		}),

	byBounds: publicProcedure
		.input(
			z.object({
				swLat: z.number(),
				swLng: z.number(),
				neLat: z.number(),
				neLng: z.number(),
				scoreField: z
					.enum([
						"compositeScore",
						"daytimePopScore",
						"affluenceIndex",
						"pedestrianScore",
						"commercialScore",
					])
					.default("compositeScore"),
			}),
		)
		.query(async ({ input }) => {
			const items = await prisma.blockGroup.findMany({
				where: {
					centroidLat: { gte: input.swLat, lte: input.neLat },
					centroidLng: { gte: input.swLng, lte: input.neLng },
				},
				select: {
					geoid: true,
					centroidLat: true,
					centroidLng: true,
					countyName: true,
					compositeScore: true,
					daytimePopScore: true,
					affluenceIndex: true,
					pedestrianScore: true,
					commercialScore: true,
				},
			});
			return items;
		}),

	topN: publicProcedure
		.input(
			z.object({
				countyFips: z.string(),
				n: z.number().min(1).max(200).default(50),
				weights: z.object({
					daytime: z.number().min(0).max(1).default(0.25),
					pedestrian: z.number().min(0).max(1).default(0.25),
					commercial: z.number().min(0).max(1).default(0.2),
					affluence: z.number().min(0).max(1).default(0.2),
					parks: z.number().min(0).max(1).default(0.1),
				}),
			}),
		)
		.query(async ({ input }) => {
			const { countyFips, n, weights } = input;
			const all = await prisma.blockGroup.findMany({
				where: { countyFips },
			});

			const scored: ScoredLocation[] = (all as BlockGroupRow[]).map((bg) => {
				const weighted =
					(bg.daytimePopScore ?? 0) * weights.daytime +
					(bg.pedestrianScore ?? 0) * weights.pedestrian +
					(bg.commercialScore ?? 0) * weights.commercial +
					(bg.affluenceIndex ?? 0) * weights.affluence +
					((bg.nearestParkAttend ?? 0) > 0 ? 50 : 0) * weights.parks;
				return { ...bg, weightedScore: Math.round(weighted * 100) / 100 };
			});

			scored.sort(
				(a: ScoredLocation, b: ScoredLocation) =>
					b.weightedScore - a.weightedScore,
			);
			return scored.slice(0, n).map((loc: ScoredLocation, i: number) => ({
				...loc,
				rank: i + 1,
			}));
		}),

	detail: publicProcedure
		.input(z.object({ geoid: z.string() }))
		.query(async ({ input }) => {
			return prisma.blockGroup.findUniqueOrThrow({
				where: { geoid: input.geoid },
			});
		}),
} satisfies TRPCRouterRecord;

const brandsRouter = {
	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				targetAgeMin: z.number().int().optional(),
				targetAgeMax: z.number().int().optional(),
				targetIncomeMin: z.number().int().optional(),
				targetIncomeMax: z.number().int().optional(),
				pricePoint: z.enum(["premium", "mid", "value"]).optional(),
				weightDaytime: z.number().min(0).max(1).default(0.25),
				weightPedestrian: z.number().min(0).max(1).default(0.25),
				weightCommercial: z.number().min(0).max(1).default(0.2),
				weightAffluence: z.number().min(0).max(1).default(0.2),
				weightParks: z.number().min(0).max(1).default(0.1),
			}),
		)
		.mutation(async ({ input }) => {
			return prisma.brand.create({ data: input });
		}),

	list: publicProcedure.query(async () => {
		return prisma.brand.findMany({
			include: {
				reports: { select: { id: true, marketName: true, createdAt: true } },
			},
			orderBy: { createdAt: "desc" },
		});
	}),

	byId: publicProcedure
		.input(z.object({ id: z.number().int() }))
		.query(async ({ input }) => {
			return prisma.brand.findUniqueOrThrow({
				where: { id: input.id },
				include: { reports: true },
			});
		}),
} satisfies TRPCRouterRecord;

const reportsRouter = {
	generate: publicProcedure
		.input(
			z.object({
				brandId: z.number().int(),
				countyFips: z.string(),
				topN: z.number().min(1).max(200).default(50),
			}),
		)
		.mutation(async ({ input }) => {
			const brand = await prisma.brand.findUniqueOrThrow({
				where: { id: input.brandId },
			});

			const countyMap: Record<string, string> = {
				"037": "Los Angeles County",
				"073": "San Diego County",
				"059": "Orange County",
				"065": "Riverside County",
				"071": "San Bernardino County",
				"085": "Santa Clara County",
				"001": "Alameda County",
				"075": "San Francisco County",
				"067": "Sacramento County",
				"013": "Contra Costa County",
			};

			const all = await prisma.blockGroup.findMany({
				where: { countyFips: input.countyFips },
			});

			const scored: ScoredLocation[] = (all as BlockGroupRow[]).map((bg) => {
				const weighted =
					(bg.daytimePopScore ?? 0) * brand.weightDaytime +
					(bg.pedestrianScore ?? 0) * brand.weightPedestrian +
					(bg.commercialScore ?? 0) * brand.weightCommercial +
					(bg.affluenceIndex ?? 0) * brand.weightAffluence +
					((bg.nearestParkAttend ?? 0) > 0 ? 50 : 0) * brand.weightParks;
				return { ...bg, weightedScore: Math.round(weighted * 100) / 100 };
			});

			scored.sort(
				(a: ScoredLocation, b: ScoredLocation) =>
					b.weightedScore - a.weightedScore,
			);
			const topLocations = scored
				.slice(0, input.topN)
				.map((loc: ScoredLocation, i: number) => ({
					rank: i + 1,
					geoid: loc.geoid,
					countyName: loc.countyName,
					tractCode: loc.tractCode,
					centroidLat: loc.centroidLat,
					centroidLng: loc.centroidLng,
					weightedScore: loc.weightedScore,
					daytimePopScore: loc.daytimePopScore,
					affluenceIndex: loc.affluenceIndex,
					pedestrianScore: loc.pedestrianScore,
					commercialScore: loc.commercialScore,
					compositeScore: loc.compositeScore,
					medianHhIncome: loc.medianHhIncome,
					totalPop: loc.totalPop,
					daytimePopEst: loc.daytimePopEst,
				}));

			const topSlice = scored.slice(0, input.topN);
			const summary = {
				totalAnalyzed: all.length,
				avgComposite:
					topSlice.reduce(
						(s: number, l: ScoredLocation) => s + (l.compositeScore ?? 0),
						0,
					) / topSlice.length,
				avgIncome:
					topSlice.reduce(
						(s: number, l: ScoredLocation) => s + (l.medianHhIncome ?? 0),
						0,
					) / topSlice.length,
				avgDaytimePop:
					topSlice.reduce(
						(s: number, l: ScoredLocation) => s + (l.daytimePopEst ?? 0),
						0,
					) / topSlice.length,
			};

			return prisma.report.create({
				data: {
					brandId: brand.id,
					marketCounty: input.countyFips,
					marketName:
						countyMap[input.countyFips] ?? `County ${input.countyFips}`,
					topLocationsN: input.topN,
					topLocations: topLocations as unknown as Record<string, unknown>[],
					summary: summary as unknown as Record<string, unknown>,
				},
			});
		}),

	byBrand: publicProcedure
		.input(z.object({ brandId: z.number().int() }))
		.query(async ({ input }) => {
			return prisma.report.findMany({
				where: { brandId: input.brandId },
				orderBy: { createdAt: "desc" },
			});
		}),

	detail: publicProcedure
		.input(z.object({ id: z.number().int() }))
		.query(async ({ input }) => {
			return prisma.report.findUniqueOrThrow({
				where: { id: input.id },
				include: { brand: true },
			});
		}),
} satisfies TRPCRouterRecord;

export const trpcRouter = createTRPCRouter({
	locations: locationsRouter,
	brands: brandsRouter,
	reports: reportsRouter,
});
export type TRPCRouter = typeof trpcRouter;
