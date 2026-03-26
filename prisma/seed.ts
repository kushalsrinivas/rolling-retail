import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function rand(min: number, max: number) {
	return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}
function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LA_NEIGHBORHOODS: { name: string; lat: number; lng: number; affluent: boolean }[] = [
	{ name: "Venice", lat: 33.985, lng: -118.472, affluent: true },
	{ name: "Santa Monica", lat: 34.019, lng: -118.491, affluent: true },
	{ name: "Silver Lake", lat: 34.087, lng: -118.271, affluent: true },
	{ name: "Echo Park", lat: 34.077, lng: -118.261, affluent: false },
	{ name: "Downtown LA", lat: 34.040, lng: -118.246, affluent: false },
	{ name: "Arts District", lat: 34.036, lng: -118.232, affluent: true },
	{ name: "Hollywood", lat: 34.098, lng: -118.326, affluent: false },
	{ name: "West Hollywood", lat: 34.090, lng: -118.362, affluent: true },
	{ name: "Beverly Hills", lat: 34.073, lng: -118.400, affluent: true },
	{ name: "Culver City", lat: 34.021, lng: -118.397, affluent: true },
	{ name: "Koreatown", lat: 34.058, lng: -118.301, affluent: false },
	{ name: "Los Feliz", lat: 34.106, lng: -118.289, affluent: true },
	{ name: "Highland Park", lat: 34.112, lng: -118.195, affluent: false },
	{ name: "Eagle Rock", lat: 34.139, lng: -118.214, affluent: false },
	{ name: "Pasadena South", lat: 34.135, lng: -118.152, affluent: true },
	{ name: "Burbank", lat: 34.181, lng: -118.309, affluent: false },
	{ name: "Glendale", lat: 34.142, lng: -118.255, affluent: false },
	{ name: "Atwater Village", lat: 34.117, lng: -118.264, affluent: false },
	{ name: "Mar Vista", lat: 34.002, lng: -118.432, affluent: false },
	{ name: "Westchester", lat: 33.958, lng: -118.401, affluent: false },
	{ name: "Playa Vista", lat: 33.972, lng: -118.428, affluent: true },
	{ name: "Brentwood", lat: 34.059, lng: -118.478, affluent: true },
	{ name: "Westwood", lat: 34.058, lng: -118.444, affluent: true },
	{ name: "Sawtelle", lat: 34.033, lng: -118.449, affluent: true },
	{ name: "Manhattan Beach", lat: 33.884, lng: -118.411, affluent: true },
	{ name: "Hermosa Beach", lat: 33.862, lng: -118.400, affluent: true },
	{ name: "Redondo Beach", lat: 33.849, lng: -118.389, affluent: false },
	{ name: "El Segundo", lat: 33.917, lng: -118.416, affluent: false },
	{ name: "Torrance", lat: 33.836, lng: -118.341, affluent: false },
	{ name: "Long Beach North", lat: 33.787, lng: -118.189, affluent: false },
	{ name: "Long Beach Downtown", lat: 33.770, lng: -118.193, affluent: false },
	{ name: "Whittier", lat: 33.979, lng: -118.033, affluent: false },
	{ name: "Arcadia", lat: 34.130, lng: -118.036, affluent: true },
	{ name: "Alhambra", lat: 34.095, lng: -118.127, affluent: false },
	{ name: "Monterey Park", lat: 34.063, lng: -118.123, affluent: false },
	{ name: "San Gabriel", lat: 34.096, lng: -118.105, affluent: false },
	{ name: "Claremont", lat: 34.097, lng: -117.719, affluent: true },
	{ name: "Pomona", lat: 34.055, lng: -117.749, affluent: false },
	{ name: "West Covina", lat: 34.069, lng: -117.938, affluent: false },
	{ name: "Monrovia", lat: 34.148, lng: -117.999, affluent: false },
];

function generateBlockGroups() {
	const rows = [];
	for (let i = 0; i < 100; i++) {
		const hood = LA_NEIGHBORHOODS[i % LA_NEIGHBORHOODS.length];
		const jitter = () => rand(-0.008, 0.008);
		const lat = hood.lat + jitter();
		const lng = hood.lng + jitter();
		const tract = String(100000 + randInt(0, 899999)).padStart(6, "0");
		const bgNum = String(randInt(1, 5));
		const geoid = `06037${tract}${bgNum}`;

		const isGood = hood.affluent || Math.random() > 0.5;
		const baseIncome = hood.affluent ? randInt(75000, 165000) : randInt(35000, 85000);
		const totalPop = randInt(800, 4500);
		const inflow = isGood ? randInt(200, 2500) : randInt(50, 600);
		const daytimePop = totalPop + inflow;

		const daytimePopScore = isGood ? rand(55, 95) : rand(15, 55);
		const affluenceIndex = hood.affluent ? rand(60, 98) : rand(20, 60);
		const pedestrianScore = isGood ? rand(50, 95) : rand(10, 50);
		const commercialScore = isGood ? rand(45, 92) : rand(12, 48);
		const compositeScore = Math.round(
			(daytimePopScore * 0.25 + affluenceIndex * 0.2 + pedestrianScore * 0.25 + commercialScore * 0.2 + rand(5, 20) * 0.1) * 100
		) / 100;

		rows.push({
			geoid,
			countyFips: "037",
			countyName: "Los Angeles",
			tractCode: tract,
			centroidLat: Math.round(lat * 1e6) / 1e6,
			centroidLng: Math.round(lng * 1e6) / 1e6,
			landAreaSqmi: rand(0.1, 3.5),
			totalPop: totalPop,
			medianHhIncome: baseIncome,
			pctIncome75kPlus: hood.affluent ? rand(40, 72) : rand(12, 38),
			pctBachelorsPlus: hood.affluent ? rand(45, 78) : rand(15, 42),
			pctUnder35: rand(28, 62),
			avgHhSize: rand(1.8, 3.8),
			pctCarFree: hood.affluent && lng < -118.3 ? rand(8, 28) : rand(2, 14),
			pctEnglishOnly: rand(40, 88),
			pctWhiteNh: rand(15, 65),
			pctBlack: rand(2, 18),
			pctAsian: rand(5, 40),
			pctHispanic: rand(10, 55),
			wacTotalJobs: randInt(200, 8000),
			racTotalWorkers: randInt(300, 3000),
			netEmployInflow: inflow,
			daytimePopEst: daytimePop,
			pctRetailFoodJobs: rand(5, 28),
			pctHighEarnJobs: hood.affluent ? rand(18, 45) : rand(5, 20),
			maxAadt: isGood ? randInt(15000, 85000) : randInt(3000, 25000),
			roadTypeDominant: isGood ? "Arterial" : "Collector",
			epaWalkability: isGood ? rand(12, 20) : rand(4, 12),
			intersectDensEpa: rand(40, 180),
			transitAccess: isGood ? rand(5, 10) : rand(1, 5),
			employEntropy: rand(0.3, 0.95),
			jobsPerHousehold: rand(0.3, 3.5),
			resDensity: rand(2000, 18000),
			empDensity: rand(500, 12000),
			osmIntersectDens: rand(30, 200),
			osmPoiCount: isGood ? randInt(40, 320) : randInt(5, 60),
			osmStreetDensity: rand(8, 35),
			pctCommercial: isGood ? rand(25, 65) : rand(5, 25),
			pctResidential: isGood ? rand(30, 60) : rand(55, 90),
			nearestParkAttend: randInt(10000, 2000000),
			parksWithin1mi: randInt(0, 6),
			daytimePopScore,
			affluenceIndex,
			pedestrianScore,
			commercialScore,
			compositeScore,
			dataYear: 2022,
		});
	}
	return rows;
}

async function main() {
	console.log("Seeding database...");

	await prisma.blockGroup.deleteMany();
	console.log("Cleared BlockGroup table");

	const blockGroups = generateBlockGroups();
	for (const bg of blockGroups) {
		await prisma.blockGroup.create({ data: bg });
	}
	console.log(`Inserted ${blockGroups.length} block groups for LA County`);
}

main()
	.catch((e) => {
		console.error("Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
