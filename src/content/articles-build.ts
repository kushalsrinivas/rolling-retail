import type { Article } from "./types";

/** Layout, wrap, permits and the behind-the-build stories. */
export const BUILD_ARTICLES: Article[] = [
	{
		slug: "food-truck-kitchen-layout",
		title: "How to design a food truck kitchen layout for speed",
		description:
			"Design a mobile kitchen line that moves at peak: order of stations, hand sink placement, the pass, drinks and why one hot station is usually enough.",
		category: "Design & build",
		published: "2026-09-25",
		readingMinutes: 7,
		targetQuery: "food truck kitchen layout",
		keyTakeaways: [
			"Lay the line out in the order an order is built, left to right along the hatch wall.",
			"Put the hand sink at the entry of the line — it is the first thing an inspector checks.",
			"Separate the order point from the pickup point above ~60 orders per hour.",
			"A drinks station is a margin decision, not an afterthought.",
		],
		body: [
			{
				type: "p",
				text: "A food trailer is a corridor with a window. The layout question is simply: in what order does food move along that corridor, and who stands where?",
			},
			{ type: "h2", text: "The five rules we design by" },
			{
				type: "ol",
				items: [
					"**Flow in one direction.** Cold storage → cook → assemble → pass. Nothing travels backwards.",
					"**Hand sink first.** At the line entry, reachable without crossing anyone.",
					"**One hot station per compact unit.** Under the hood, at one end.",
					"**Till at the hatch corner.** Ordering and collecting happen at different points.",
					"**Drinks at the far end.** The highest-margin station should never wait on the grill.",
				],
			},
			{ type: "h2", text: "A worked example: a 13 ft taco line" },
			{
				type: "table",
				head: ["Position", "Station", "Why there"],
				rows: [
					["1", "Hand sink", "Inspector's first look; staff wash in on entry"],
					["2", "Plancha and steam wells under the hood", "All heat in one place, one hood"],
					["3", "Salsa and garnish rail", "Assembly right beside the heat"],
					["4", "Tortilla warmer and pass", "Plates finish at the window"],
					["5", "Drinks with ice", "Served by the order-taker, never the cook"],
				],
			},
			{
				type: "p",
				text: "Every use case on our site shows the line the designer builds for it — see [tacos](/use-cases/taco-trailer), [coffee](/use-cases/coffee-trailer) or [burgers](/use-cases/burger-trailer).",
			},
			{ type: "h2", text: "Mistakes we see most" },
			{
				type: "ul",
				items: [
					"Two hot stations on a compact body — double hood, double power, no extra sales.",
					"A menu board that cannot be read from the back of the queue.",
					"Under-counter space wasted on storage that belongs in a commissary.",
					"No plan for where the trash goes at peak.",
				],
			},
			{
				type: "cta",
				title: "See your line before you build it",
				text: "The designer lays out your line and renders it from inside the trailer.",
				href: "/chat",
				label: "Design my layout",
			},
		],
		related: ["what-size-food-trailer-do-i-need", "food-truck-health-permit-plan-review"],
	},
	{
		slug: "food-truck-wrap-design-guide",
		title: "Food truck wrap design: a guide to wraps that last",
		description:
			"Design a food truck wrap that reads from a block away and survives commercial washes: color limits, finishes, zones, keep-outs and vinyl that suits curves.",
		category: "Design & build",
		published: "2026-09-29",
		readingMinutes: 6,
		targetQuery: "food truck wrap design",
		keyTakeaways: [
			"Limit the wrap to three colors plus one neutral; it reads better and costs less to produce.",
			"Use flat spot-color shapes, not gradients or photos — they print, cut and age better.",
			"Keep graphics off door gaps, hatch cut lines, rivet lines and vents.",
			"Use premium cast film on Airstreams; their compound curves need it.",
		],
		body: [
			{
				type: "p",
				text: "Your wrap is the billboard you take to every pitch. It also gets rained on, pressure-washed and scraped in festival parking lots. Design for both.",
			},
			{ type: "h2", text: "Color: fewer is stronger" },
			{
				type: "p",
				text: "We cap every livery at **three colors plus a neutral**. Each color gets a role — primary, secondary, accent — and a target matched to a real film swatch. Screen color is approximate; approve against the physical film.",
			},
			{ type: "h2", text: "Finish" },
			{
				type: "table",
				head: ["Finish", "Looks", "Watch out for"],
				rows: [
					["Gloss", "Bright, classic, easy to clean", "Shows scratches and swirl marks"],
					["Matte", "Modern, no glare in photos", "Holds dirt; needs gentle washing"],
					["Satin", "Soft sheen, premium", "Slightly higher cost"],
				],
			},
			{ type: "h2", text: "Zones and keep-outs" },
			{
				type: "p",
				text: "We design wraps to a template for each body. On an Airstream that means a belt-line band, a logo panel ahead of the hatch and a hatch surround, with polished aluminum left visible. On a square trailer it is a color-blocked lower third, a side logo panel and a rear panel.",
			},
			{
				type: "ul",
				items: [
					"No graphic crosses a door gap, hinge or handle.",
					"No graphic crosses the hatch cut line or its gas struts.",
					"No graphic over rivet lines, vents, the HVAC unit or wheel arches.",
				],
			},
			{ type: "h2", text: "Your emblem" },
			{
				type: "p",
				text: "Keep the emblem to one recognizable silhouette in flat spot colors — a cup, a taco, a cone. Intricate, painterly artwork turns into an expensive multi-layer print that fades and traps dirt.",
			},
			{
				type: "p",
				text: "Not sure where to start? The designer proposes a palette and emblem from the looks you star — [try it](/chat).",
			},
		],
		related: ["airstream-vs-square-concession-trailer", "how-much-does-a-food-trailer-cost"],
	},
	{
		slug: "food-truck-health-permit-plan-review",
		title: "Food trailer health permits and plan review: a checklist",
		description:
			"What US health departments and fire marshals usually check on a new food trailer, the documents plan review asks for, and how to avoid a re-inspection.",
		category: "Permits & compliance",
		published: "2026-10-01",
		readingMinutes: 7,
		targetQuery: "food truck plan review checklist",
		keyTakeaways: [
			"Most counties require plan review before the trailer is built — submit early.",
			"Inspectors look first at the hand sink, water capacity, NSF-listed equipment and surfaces.",
			"Hot lines need an extraction hood and a fire-suppression system reviewed by the fire marshal.",
			"Requirements vary by county; always work from your own county's checklist.",
		],
		body: [
			{
				type: "callout",
				title: "This is general guidance",
				text: "Every county and state sets its own rules. Use this list to prepare, then confirm each item with your local health department and fire marshal.",
				tone: "warn",
			},
			{ type: "h2", text: "What plan review usually asks for" },
			{
				type: "ul",
				items: [
					"A scaled floor plan showing every piece of equipment.",
					"An equipment schedule with make, model and NSF/ANSI listing.",
					"Plumbing details: fresh and gray water tank sizes, water heater, sinks.",
					"Your menu and how each item is prepared and held.",
					"Your commissary agreement, where required.",
					"For hot lines: hood and fire-suppression documentation.",
				],
			},
			{ type: "h2", text: "What the inspector checks on the trailer" },
			{
				type: "table",
				head: ["Item", "What they look for"],
				rows: [
					["Hand sink", "Dedicated, accessible, hot and cold water, soap and towels"],
					["Ware washing", "Many counties require a three-compartment sink; some accept commissary washing"],
					["Water", "Fresh tank sized for your service; gray tank larger than fresh"],
					["Surfaces", "Smooth, durable, easy to clean; sealed seams"],
					["Equipment", "Commercial, NSF/ANSI-listed where required"],
					["Refrigeration", "Thermometers in each unit, holding at safe temperatures"],
					["Hood and suppression", "Hot lines: listed system, inspection tag, K-class extinguisher"],
					["Propane", "Secured cylinders, approved lines, leak-tested"],
				],
			},
			{ type: "h2", text: "How we help" },
			{
				type: "p",
				text: "Our specification sheet lists the equipment schedule, the water system and the layout plan, and our hot-line builds include extraction and fire suppression from the factory. Before the build, we go through your county's checklist with you so the design matches it.",
			},
			{
				type: "p",
				text: "Cold lines — [coffee](/use-cases/coffee-trailer), [boba](/use-cases/boba-tea-trailer), [ice cream](/use-cases/ice-cream-trailer) — skip the hood and suppression entirely, which usually makes them the fastest path through review.",
			},
		],
		faqs: [
			{
				q: "Do I need plan approval before buying a food trailer?",
				a: "In many counties, yes — plan review happens before construction, and a trailer built without approval may need changes. Contact your health department early and share your builder's plans.",
			},
			{
				q: "What is a commissary and do I need one?",
				a: "A commissary is a licensed kitchen where mobile vendors fill fresh water, dump waste water, store food and clean equipment. Many US counties require one for food trucks and trailers.",
			},
		],
		related: ["food-truck-kitchen-layout", "how-much-does-a-food-trailer-cost"],
	},
	{
		slug: "how-we-built-the-designer",
		title: "How we built a food trailer designer that only draws what we can build",
		description:
			"Behind the build: why our AI designer is constrained to six bodies, how renders stay consistent across views, and why our image prompts read like technical manuals.",
		category: "Behind the build",
		published: "2026-10-03",
		readingMinutes: 7,
		targetQuery: "ai food truck design tool",
		keyTakeaways: [
			"The designer can only use bodies, openings and equipment our factory builds.",
			"Every render inherits from an approved master render, so all views show the same trailer.",
			"Image prompts are written in ASD-STE100 Simplified Technical English for precision.",
			"Renders are concept visualizations; the specification sheet is the source of truth.",
		],
		body: [
			{
				type: "p",
				text: "Most “design your truck” tools are wish lists. You pick anything, and a salesperson walks it back later. We wanted the opposite: a designer that only lets you design what our factory can build, so the render you fall for is the trailer you get.",
			},
			{ type: "h2", text: "Constraint is the feature" },
			{
				type: "p",
				text: "The designer knows six bodies, each with fixed geometry: where the hatch is, how it hinges, which side the door is on. It knows our builder doctrine — one hot station per compact body, cooking heat on propane, no hot line in the Large Airstream — and applies it when it recommends a layout.",
			},
			{ type: "h2", text: "One trailer, many views" },
			{
				type: "p",
				text: "Early versions rendered each view independently, and the trailer drifted: the hatch moved, the counter changed color, a window appeared. Now views are generated in stages. The exterior hero is the anchor; every later view receives the finished earlier renders as references and may change only the camera.",
			},
			{ type: "h2", text: "Prompts that read like a maintenance manual" },
			{
				type: "p",
				text: "Image models weight a mood word as heavily as a dimension. So our prompts are written in **ASD-STE100 Simplified Technical English** — the controlled language aerospace uses for maintenance manuals. Each prompt is a numbered specification: defined terms, a data table, one instruction per sentence, explicit camera and light values, and warnings last.",
			},
			{
				type: "quote",
				text: "3.4 Opening count: 2 total = 1 service hatch, 1 door, 0 windows. 3.6 Do not draw an opening that is not in this list. It does not exist.",
				cite: "Extract from a render specification",
			},
			{
				type: "p",
				text: "A test checks every prompt against STE's sentence-length rules, so the format cannot drift back into prose.",
			},
			{ type: "h2", text: "What stays human" },
			{
				type: "p",
				text: "Renders are concept visualizations. Dimensions, openings, equipment and the final wrap artwork are confirmed by our factory team in your specification, and only a person can approve a design for build.",
			},
			{
				type: "cta",
				title: "Try it",
				text: "Three minutes, five free render rounds, no account.",
				href: "/chat",
				label: "Open the designer",
			},
		],
		related: ["food-truck-kitchen-layout", "food-truck-wrap-design-guide"],
	},
	{
		slug: "starting-a-food-trailer-business-checklist",
		title: "Starting a food trailer business: a 12-step checklist",
		description:
			"From concept to first service: the order to do things in when starting a food trailer business — menu, permits, the build, commissary, insurance and launch.",
		category: "Operations",
		published: "2026-10-04",
		readingMinutes: 6,
		targetQuery: "how to start a food trailer business",
		keyTakeaways: [
			"Fix the menu first; it decides the equipment, the trailer size and the permits.",
			"Talk to your county health department before you order a trailer.",
			"Line up a commissary and insurance while the trailer is being built.",
			"Book your first events before delivery so the trailer earns from week one.",
		],
		body: [
			{
				type: "p",
				text: "The order matters more than the speed. Most expensive mistakes come from doing step 6 before step 2.",
			},
			{
				type: "ol",
				items: [
					"**Define the menu.** Five to eight items, one signature. It sets the equipment line.",
					"**Call your county health department.** Ask for the mobile food plan review packet.",
					"**Pick where you will trade.** Events, curbs, breweries — each has its own permits and power.",
					"**Size the trailer.** From peak orders per hour, not ambition. [Sizing guide](/resources/what-size-food-trailer-do-i-need).",
					"**Design it.** Layout, wrap and power plan. [Use the designer](/chat).",
					"**Get a quote and submit plan review.** Use your builder's specification sheet.",
					"**Arrange financing.** Lenders want the spec and the quote.",
					"**Sign a commissary agreement** if your county requires one.",
					"**Insure it.** Commercial auto or trailer coverage and general liability.",
					"**Register the business** and get local vending licenses.",
					"**Take delivery and pass inspection.**",
					"**Launch** at an event you booked months ago.",
				],
			},
			{
				type: "p",
				text: "Budget for all of it with our [cost breakdown](/resources/how-much-does-a-food-trailer-cost).",
			},
		],
		related: [
			"how-much-does-a-food-trailer-cost",
			"food-truck-health-permit-plan-review",
			"food-trailer-vs-food-truck",
		],
	},
];
