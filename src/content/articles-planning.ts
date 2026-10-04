import type { Article } from "./types";

/** Costs, sizing, comparisons — the questions buyers ask first. */
export const PLANNING_ARTICLES: Article[] = [
	{
		slug: "how-much-does-a-food-trailer-cost",
		title: "How much does a custom food trailer cost in 2026?",
		description:
			"A line-by-line breakdown of what a custom food trailer costs in the US: the body, the equipment line, the wrap, power and the costs buyers forget.",
		category: "Costs & planning",
		published: "2026-09-08",
		updated: "2026-10-01",
		readingMinutes: 8,
		targetQuery: "how much does a food trailer cost",
		keyTakeaways: [
			"Most new custom food trailers cost between about $45,000 and $200,000 fully equipped.",
			"The equipment line, not the trailer, is the biggest variable: a cold coffee line costs far less than a hot line with hood and fire suppression.",
			"A vinyl wrap typically adds about $2,800–$14,500 depending on body size and film grade.",
			"Budget 10–15% beyond the build for permits, commissary, first stock and contingency.",
		],
		body: [
			{
				type: "p",
				text: "The honest answer is a range, because two buyers asking for “a food trailer” are rarely asking for the same thing. A 10 ft espresso trailer and an Airstream with a griddle line share a hitch and little else. This guide breaks the cost into the parts that actually move it, using the planning numbers our own estimator uses.",
			},
			{ type: "h2", text: "Typical all-in ranges by body" },
			{
				type: "table",
				caption: "Planning ranges for an equipped build with a standard wrap. Not a quote.",
				head: ["Body", "Typical use", "Planning range"],
				rows: [
					["Square 10 ft", "Coffee, boba, ice cream", "$45k–$70k"],
					["Square 13 ft", "One hot line (tacos, burgers)", "$60k–$95k"],
					["Square 16 ft", "Hot line + drinks station", "$75k–$120k"],
					["Airstream Small", "Premium coffee, bars", "$85k–$125k"],
					["Airstream Mid", "Hot line or full bar", "$110k–$160k"],
					["Airstream Large", "Walk-in retail", "$140k–$200k"],
				],
			},
			{
				type: "p",
				text: "Airstreams cost more for three reasons: the riveted aluminum shell itself, the labor of fitting square equipment against curved walls, and a wrap that has to follow compound curves. Buyers choose them for brand presence, not efficiency — see our [Airstream vs square comparison](/resources/airstream-vs-square-concession-trailer).",
			},
			{ type: "h2", text: "1. The equipment line" },
			{
				type: "p",
				text: "This is where budgets go wrong. A cold line — espresso, boba, gelato — needs refrigeration, water and a hand sink. A **hot line** adds an extraction hood, a UL 300 wet-chemical fire-suppression system, propane plumbing and usually HVAC. The hood and suppression alone are a significant line item before the first griddle is bought.",
			},
			{
				type: "p",
				text: "Our rule for compact trailers is one hot station: one griddle **or** one fryer **or** one oven. A second heat source doubles the hood length, adds weight and often pushes the electrics past a 50A feed.",
			},
			{ type: "h2", text: "2. The wrap" },
			{
				type: "p",
				text: "Wraps are priced by area. Our planning numbers are roughly **$12–$18 per square foot** installed for standard cast film and **$18–$28** for premium 3M cast film with overlaminate — which is what an Airstream's curves need. A 10 ft square trailer has about 237 sq ft of wrap area; a Large Airstream about 517.",
			},
			{
				type: "table",
				head: ["Body", "Wrap area", "Standard", "Premium"],
				rows: [
					["Square 10 ft", "~237 sq ft", "$2.8k–$4.3k", "$4.3k–$6.6k"],
					["Square 13 ft", "~301 sq ft", "$3.6k–$5.4k", "$5.4k–$8.4k"],
					["Airstream Mid", "~409 sq ft", "$4.9k–$7.4k", "$7.4k–$11.5k"],
					["Airstream Large", "~517 sq ft", "$6.2k–$9.3k", "$9.3k–$14.5k"],
				],
			},
			{ type: "h2", text: "3. Power" },
			{
				type: "p",
				text: "Cooking heat runs on propane in our builds, so the electrical system only carries refrigeration, water pumps, lights, the extraction fan and the till. That keeps most trailers on a 30A or 50A shore inlet. A generator is a separate purchase — read the [power guide](/resources/food-trailer-power-guide) before buying one.",
			},
			{ type: "h2", text: "4. The costs buyers forget" },
			{
				type: "ul",
				items: [
					"**Plan review and permits** — health department plan review, fire inspection and business licenses vary by county.",
					"**Commissary** — many counties require a licensed commissary for water, waste and storage; it is a monthly cost.",
					"**Tow vehicle** — check its towing capacity against the loaded trailer weight, not the empty weight.",
					"**Insurance** — commercial auto (or trailer) and general liability.",
					"**First stock and smallwares** — pans, utensils, cups, packaging.",
					"**Contingency** — we recommend 10–15% of the build.",
				],
			},
			{
				type: "cta",
				title: "Get your own number",
				text: "Answer a three-minute brief and the designer gives you a planning estimate for your exact build — body, equipment, wrap and power.",
				href: "/chat",
				label: "Design my trailer",
			},
			{ type: "h2", text: "How to spend less without regretting it" },
			{
				type: "ol",
				items: [
					"Choose the smallest body that carries your peak volume. Compact beats big.",
					"Focus the menu so it needs one hot station.",
					"Pick a standard wrap on a square body; save premium film for Airstreams.",
					"Decide equipment before the trailer — it sets the length.",
				],
			},
		],
		faqs: [
			{
				q: "Is a food trailer cheaper than a food truck?",
				a: "Usually, yes. A trailer has no engine or drivetrain to buy or maintain, so a comparable kitchen costs less on a trailer. You need a capable tow vehicle. See [food trailer vs food truck](/resources/food-trailer-vs-food-truck).",
			},
			{
				q: "What is the cheapest food trailer to start with?",
				a: "A compact square trailer with a cold line — coffee, boba or ice cream — is the lowest-cost build, because it needs no hood or fire suppression.",
			},
		],
		related: [
			"what-size-food-trailer-do-i-need",
			"food-trailer-vs-food-truck",
			"food-truck-wrap-design-guide",
		],
	},
	{
		slug: "food-trailer-vs-food-truck",
		title: "Food trailer vs food truck: which should you buy?",
		description:
			"Trailer or truck? Compare cost, maintenance, mobility, permits and resale to choose the right mobile kitchen for how you will actually trade.",
		category: "Comparisons",
		published: "2026-09-12",
		readingMinutes: 6,
		targetQuery: "food trailer vs food truck",
		keyTakeaways: [
			"A trailer costs less for the same kitchen because there is no engine to buy or maintain.",
			"A truck is better if you move several times a day; a trailer is better if you park for hours or days.",
			"An engine failure takes a food truck's kitchen off the road with it; a trailer just needs a different tow.",
			"Trailers give more usable kitchen length per dollar.",
		],
		body: [
			{
				type: "p",
				text: "We build trailers, so read this knowing where we stand. We also tell buyers when a truck is the better choice — it sometimes is.",
			},
			{ type: "h2", text: "Side by side" },
			{
				type: "table",
				head: ["", "Food trailer", "Food truck"],
				rows: [
					["Upfront cost", "Lower for the same kitchen", "Higher — includes chassis and engine"],
					["Maintenance", "Axle, brakes, tires", "Full vehicle service plus kitchen"],
					["Breakdowns", "Swap the tow vehicle", "Kitchen is off the road too"],
					["Moving often", "Hitch and unhitch each time", "Drive and serve"],
					["Parking", "Leave it on site; use the tow vehicle", "One vehicle does everything"],
					["Kitchen length", "Full box length", "Shorter — the cab takes space"],
				],
			},
			{ type: "h2", text: "Choose a trailer if…" },
			{
				type: "ul",
				items: [
					"You trade at events, breweries, markets or fixed pitches for hours at a time.",
					"You want the most kitchen for your budget.",
					"You already own, or plan to buy, a truck that can tow it.",
				],
			},
			{ type: "h2", text: "Choose a truck if…" },
			{
				type: "ul",
				items: [
					"You run lunch routes with three or four stops a day.",
					"Your city's parking rules favor a single self-propelled vehicle.",
					"You will never have a tow vehicle available.",
				],
			},
			{
				type: "callout",
				title: "Check the tow rating",
				text: "Compare your tow vehicle's rating with the trailer's loaded weight — water, propane, equipment and stock — not the brochure's empty weight.",
				tone: "warn",
			},
			{
				type: "p",
				text: "If a trailer fits, the next question is the body. Start with [what size trailer you need](/resources/what-size-food-trailer-do-i-need).",
			},
		],
		faqs: [
			{
				q: "Do I need a special license to tow a food trailer?",
				a: "In most states a standard license covers a single trailer under the commercial weight thresholds, but rules vary by state and combined weight. Check with your state's DMV.",
			},
		],
		related: ["how-much-does-a-food-trailer-cost", "what-size-food-trailer-do-i-need"],
	},
	{
		slug: "airstream-vs-square-concession-trailer",
		title: "Airstream vs square concession trailer: an honest comparison",
		description:
			"Airstreams turn heads; square trailers fit more kitchen per dollar. How the two bodies compare on cost, layout, wrap, weight and brand value.",
		category: "Comparisons",
		published: "2026-09-15",
		readingMinutes: 6,
		targetQuery: "airstream food trailer vs concession trailer",
		keyTakeaways: [
			"Square trailers give more usable counter per foot and cost less to build and wrap.",
			"Airstreams cost more but deliver unmatched curb appeal and photo value.",
			"Curved walls reduce usable counter length inside an Airstream.",
			"Hot food is fine in a Small or Mid Airstream; the Large is for walk-in retail.",
		],
		body: [
			{
				type: "p",
				text: "We build both, so we have no reason to push one. Here is how they actually differ once equipment goes in.",
			},
			{
				type: "table",
				head: ["", "Square trailer", "Airstream"],
				rows: [
					["Shell", "Flat walls, welded frame", "Riveted aluminum monocoque"],
					["Usable counter", "Full wall length", "Reduced by curved end caps"],
					["Wrap", "Simple, cheaper", "Compound curves; premium film"],
					["Brand presence", "Strong with a good wrap", "Iconic on its own"],
					["Lengths we build", "10, 13, 16 ft", "Small, Mid, Large"],
					["Best for", "Throughput and budget", "Premium brands, events, photos"],
				],
			},
			{ type: "h2", text: "When the Airstream is worth it" },
			{
				type: "p",
				text: "If your business is photographed — weddings, private events, brand activations, specialty coffee — the Airstream earns its premium every weekend. Guests post it. Planners book it.",
			},
			{ type: "h2", text: "When the square trailer wins" },
			{
				type: "p",
				text: "If you sell on speed — festival main stages, lunch crowds — the square trailer's full-length counter and lower build cost matter more than the silhouette. A strong wrap closes most of the gap.",
			},
			{
				type: "callout",
				text: "Our designer recommends a body from your brief — menu, peak volume and where you trade — and explains why. You can always overrule it.",
			},
		],
		related: ["how-much-does-a-food-trailer-cost", "food-truck-wrap-design-guide"],
	},
	{
		slug: "what-size-food-trailer-do-i-need",
		title: "What size food trailer do I need?",
		description:
			"Size your food trailer from your menu, peak orders per hour and crew — not from the biggest box you can afford. A practical sizing guide.",
		category: "Costs & planning",
		published: "2026-09-18",
		readingMinutes: 5,
		targetQuery: "what size food trailer do i need",
		keyTakeaways: [
			"Size from peak orders per hour and the number of stations, not floor area.",
			"A single cold line fits 10 ft; one hot line fits 13 ft; hot plus drinks fits 16 ft.",
			"Oversizing is the most common first-time mistake: more weight, more power, more cost.",
			"Each extra person on the line needs their own station, not just more floor.",
		],
		body: [
			{
				type: "p",
				text: "“Too big” is the classic first-timer mistake. A bigger trailer is heavier to tow, needs a bigger power system and costs more to wrap — and a focused menu on a tight line outsells a sprawling one.",
			},
			{ type: "h2", text: "A quick sizing table" },
			{
				type: "table",
				head: ["Your operation", "Peak orders/hour", "Recommended body"],
				rows: [
					["Coffee, boba or ice cream, 1–2 people", "Under 60", "Square 10 ft or Airstream Small"],
					["Cold line at volume, 2 people", "60–120", "Square 13 ft or Airstream Mid"],
					["One hot station", "Up to 120", "Square 13 ft or Airstream Mid"],
					["Hot line plus drinks station", "120+", "Square 16 ft"],
					["Walk-in retail", "Dwell, not queue", "Airstream Large"],
				],
			},
			{ type: "h2", text: "Count stations, not square feet" },
			{
				type: "p",
				text: "Every person on the line needs a station they can work without crossing another person: cook, assemble, take orders, run drinks. Draw your line left to right in the order an order is built. If it needs four stations, you need the length for four — and no more.",
			},
			{ type: "h2", text: "Then check weight and power" },
			{
				type: "p",
				text: "A loaded trailer carries water, propane, equipment and stock. Confirm your tow vehicle's rating, then total the electrical loads — see the [power guide](/resources/food-trailer-power-guide).",
			},
			{
				type: "cta",
				title: "Let the designer size it",
				text: "Tell it your menu, your peak and your crew. It recommends a body and shows you the line.",
				href: "/chat",
				label: "Get a recommendation",
			},
		],
		related: ["food-truck-kitchen-layout", "food-trailer-power-guide", "how-much-does-a-food-trailer-cost"],
	},
	{
		slug: "food-trailer-power-guide",
		title: "Food trailer power: 30A vs 50A shore power and generators",
		description:
			"How to size the electrical system for a food trailer: what runs on propane, what runs on power, 30A vs 50A shore inlets and choosing a generator.",
		category: "Design & build",
		published: "2026-09-22",
		readingMinutes: 6,
		targetQuery: "food trailer 30 amp vs 50 amp",
		keyTakeaways: [
			"Put cooking heat on propane; keep electrics for refrigeration, water, lights, fans and the till.",
			"A 30A/120V inlet supplies about 3.6 kW; a 50A/240V inlet supplies about 12 kW.",
			"Espresso machines and electric ovens are the loads that push builds to 50A.",
			"Size generators for start-up surges from compressors, not just running watts.",
		],
		body: [
			{
				type: "p",
				text: "Power is the system buyers think about last and regret first. Our rule: the power plan must close on paper before anyone renders the trailer.",
			},
			{ type: "h2", text: "What runs on what" },
			{
				type: "table",
				head: ["Load", "Source", "Notes"],
				rows: [
					["Griddle, fryer, plancha, deck oven", "Propane", "Under the extraction hood"],
					["Refrigeration and freezers", "Electric", "Runs continuously; surge on start"],
					["Espresso machine", "Electric", "Often the largest single load"],
					["Extraction fan, lights, pumps", "Electric", "Small but always on"],
					["HVAC", "Electric", "Large; needed for walk-in and hot climates"],
					["POS and menu screens", "Electric", "Small"],
				],
			},
			{ type: "h2", text: "30A or 50A?" },
			{
				type: "p",
				text: "A **30A, 120V** inlet supplies roughly 3.6 kW — enough for a cold line with modest refrigeration. A **50A, 240V** inlet supplies roughly 12 kW and covers most single-hot-line builds with HVAC. We fit a generator inlet alongside the shore inlet so you can trade where the site has no power.",
			},
			{
				type: "callout",
				title: "If the total exceeds 50A",
				text: "Drop equipment — don't add power. A build that needs more than a 50A feed is almost always carrying a second hot station or electric cooking it does not need.",
				tone: "warn",
			},
			{ type: "h2", text: "Choosing a generator" },
			{
				type: "ul",
				items: [
					"Add the running watts of everything that can run at once.",
					"Add the largest start-up surge (compressors can briefly draw several times their running load).",
					"Add 20–25% headroom.",
					"Choose an inverter generator for quiet operation at events — many organizers set noise limits.",
				],
			},
			{
				type: "p",
				text: "The designer totals your equipment on a power table automatically. [Try it with your menu](/chat).",
			},
		],
		related: ["what-size-food-trailer-do-i-need", "food-truck-kitchen-layout"],
	},
];
