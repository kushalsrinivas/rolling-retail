/**
 * Use-case pages — one per business we build for.
 *
 * `equipment` and `zones` are a snapshot of what the designer's layout
 * engine (`layoutFor`) produces for this business on the recommended body.
 * They are copied rather than imported because the layout engine lives
 * beside the AI tool definitions and is too heavy for a marketing page;
 * `use-cases.test.ts` fails the build the moment the two disagree.
 */
import type { Faq } from "./types";

export interface UseCase {
	slug: string;
	businessType: string;
	/** Body the layout snapshot was taken on. */
	vehicleId: string;
	name: string;
	/** H1. */
	title: string;
	description: string;
	intro: string;
	/** Readable equipment line, in order. */
	equipment: string[];
	/** Layout zones from the layout engine. */
	zones: string[];
	power: string;
	permits: string;
	designTips: string[];
	trucks: string[];
	articles: string[];
	faqs: Faq[];
	targetQuery: string;
}

export const USE_CASES: UseCase[] = [
	{
		slug: "coffee-trailer",
		businessType: "coffee",
		vehicleId: "airstream-s",
		name: "Coffee & espresso",
		title: "Custom coffee trailers and espresso bars",
		description:
			"Coffee trailers built around the bar: espresso machine, grinder, filtration and milk storage in a layout that keeps two baristas moving at the morning peak.",
		intro:
			"A coffee trailer lives or dies on the morning rush. The layout puts the grinder and machine where one barista can pull shots without turning around, keeps milk cold under the bar, and gives the menu board the best wall.",
		equipment: [
			"espresso-machine",
			"grinder",
			"water-filtration",
			"under-counter-refrigeration",
			"hand-basin",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
		],
		zones: [
			"Serve hatch with flip-up awning and fold-down counter",
			"Espresso machine and grinder on the bar run, chilled milk below",
			"Water filtration and hand basin at the end of the bar",
			"Menu board above the hatch, fascia sign on the roof edge",
		],
		power:
			"A two-group espresso machine is the biggest electrical load in the build. Plan a 50A shore feed or a generator sized for the machine's heating element; we size it on the power table before any renders.",
		permits:
			"No cooking line means no hood and no fire-suppression approval, which usually makes coffee the fastest path through plan review.",
		designTips: [
			"Put the grinder on the hatch side so the customer sees the craft.",
			"Use filtered water lines from day one — scale kills machines.",
			"A pastry display at customer height adds ticket value without adding staff.",
		],
		trucks: ["airstream-small", "square-trailer-10ft", "square-trailer-13ft"],
		articles: [
			"food-trailer-power-guide",
			"what-size-food-trailer-do-i-need",
			"how-much-does-a-food-trailer-cost",
		],
		faqs: [
			{
				q: "What size trailer does a coffee business need?",
				a: "Most single-bar coffee operations fit a 10 ft square trailer or a Small Airstream. Move up to 13 ft only if you need two baristas on separate stations or a large pastry display.",
			},
			{
				q: "Can a coffee trailer run on a generator?",
				a: "Yes, if the generator is sized for the espresso machine's heating element plus refrigeration. A quiet inverter generator in the 7–9 kW range is common; shore power is better where the site offers it.",
			},
		],
		targetQuery: "coffee trailer for sale custom",
	},
	{
		slug: "taco-trailer",
		businessType: "mexican",
		vehicleId: "square-4m",
		name: "Tacos & Mexican",
		title: "Taco trailers built for a fast line",
		description:
			"Taco trailers with a plancha and steam wells under extraction, a salsa and garnish rail at the pass, and a drinks station that protects your margin.",
		intro:
			"Tacos are an assembly business. The plancha and steam wells sit under the hood, the salsa rail and tortilla warmer sit at the pass, and the person building plates never crosses the person cooking.",
		equipment: [
			"griddle",
			"hot-station",
			"extraction-hood",
			"fire-suppression",
			"hand-basin",
			"ice",
			"under-counter-refrigeration",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
			"hvac-optional",
		],
		zones: [
			"Serve hatch centred on the long wall",
			"Plancha and steam wells under extraction (left), salsa rail and tortilla warmer by the pass (right)",
			"Hand basin at the line entry — the first thing an officer sees",
			"Drinks station with ice and refrigeration (supports margin)",
			"Till at the hatch corner, separated from the food pass",
		],
		power:
			"Cooking heat is propane under the hood, so it never touches the battery bank or shore feed. The electrics carry refrigeration, extraction fan, lights and the till — a 30A or 50A feed covers them.",
		permits:
			"A hot line needs an extraction hood and a UL 300 wet-chemical suppression system. We build both in the factory and document them for your county's plan review.",
		designTips: [
			"Keep the menu to one protein line plus specials — the line is built for speed.",
			"A drinks station with ice is the highest-margin square foot in the trailer.",
			"Separate the order window from the pickup point if your peak exceeds ~60 orders an hour.",
		],
		trucks: ["square-trailer-13ft", "airstream-mid", "square-trailer-16ft"],
		articles: [
			"food-truck-kitchen-layout",
			"food-truck-health-permit-plan-review",
			"how-much-does-a-food-trailer-cost",
		],
		faqs: [
			{
				q: "Do taco trailers need a hood?",
				a: "Yes. Any trailer that cooks with a plancha or griddle needs an extraction hood and a fire-suppression system. Requirements are set by your county and fire marshal; we build to NFPA 96 and document the system for review.",
			},
			{
				q: "What is the best trailer size for tacos?",
				a: "A 13 ft square trailer handles one plancha line and a drinks station for most operators. Go to 16 ft only if you run a large menu or main-stage festival volume.",
			},
		],
		targetQuery: "taco trailer for sale",
	},
	{
		slug: "burger-trailer",
		businessType: "grill",
		vehicleId: "airstream-m",
		name: "Burgers & grill",
		title: "Burger and grill trailers",
		description:
			"Smash-burger and grill trailers with a griddle and chargrill under extraction, a refrigerated make-rail and a pass that keeps tickets moving.",
		intro:
			"Burgers are a timing game. One griddle line, a make-rail within reach, and a pass that shows the customer the assembly — compact beats big every time.",
		equipment: [
			"griddle-chargrill",
			"extraction-hood",
			"fire-suppression",
			"hand-basin",
			"ice",
			"under-counter-refrigeration",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
			"hvac-optional",
		],
		zones: [
			"Serve hatch centred on the long wall",
			"Griddle and chargrill under extraction (left), hot-hold gantry over pass (right)",
			"Hand basin at the line entry — the first thing an officer sees",
			"Drinks station with ice and refrigeration (supports margin)",
			"Till at the hatch corner, separated from the food pass",
		],
		power:
			"Griddle and chargrill run on propane. The electrics — refrigeration, make-rail, extraction fan, lights and till — sit comfortably on a 50A feed with room for an HVAC unit.",
		permits:
			"Hood, suppression, hand sink and NSF-listed equipment are the core plan-review items. We build them in and supply the equipment schedule your county asks for.",
		designTips: [
			"Pick a griddle OR a fryer for a compact unit — not both.",
			"Make the assembly visible from the hatch; it sells the next order.",
			"Fries can come from a countertop fryer only if your power and hood plan allow it.",
		],
		trucks: ["airstream-mid", "square-trailer-13ft", "square-trailer-16ft"],
		articles: [
			"food-truck-kitchen-layout",
			"food-trailer-power-guide",
			"food-trailer-vs-food-truck",
		],
		faqs: [
			{
				q: "Can I have a griddle and a fryer in one trailer?",
				a: "On a 16 ft body with a hood long enough for both, yes. On compact bodies we recommend one hot station — it keeps weight, power and cost down, and most profitable burger menus need only the griddle.",
			},
			{
				q: "Is an Airstream practical for a burger business?",
				a: "Yes, on the Mid body with one griddle line. The Large Airstream is reserved for walk-in retail and is never fitted with a hot line.",
			},
		],
		targetQuery: "burger food trailer",
	},
	{
		slug: "boba-tea-trailer",
		businessType: "cold-drinks",
		vehicleId: "square-3m",
		name: "Boba, juice & cold drinks",
		title: "Boba tea and juice trailers",
		description:
			"Bubble tea and juice trailers with tea brewers, topping wells, a cup sealer and ice — a cold line with no hood, built for fast, photogenic service.",
		intro:
			"A boba line is a sequence: brew, shake, top, seal. The layout keeps those steps in one direction along the hatch, with ice and refrigeration below the counter.",
		equipment: [
			"boba-tea-brewers",
			"sealing-machine",
			"ice",
			"under-counter-refrigeration",
			"prep-counter",
			"hand-basin",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
		],
		zones: [
			"Serve hatch with flip-up awning and fold-down counter",
			"Tea and syrup prep with topping station directly under the hatch",
			"Cup sealer and ice well on the finishing end of the line",
			"Hand basin at the end of the prep run",
			"Menu board above the hatch, fascia sign on the roof edge",
		],
		power:
			"Tea brewers, a pearl cooker, the sealer and refrigeration are all electric. We total them on the power table and size the shore feed or generator before rendering.",
		permits:
			"No hood is needed for a cold line, which keeps plan review simple. Ice handling and water capacity are what inspectors look at closely.",
		designTips: [
			"Order the line brew → shake → top → seal, left to right.",
			"Size the ice machine for your hottest day, not an average one.",
			"Clear cups are your best signage — light the hatch so they glow.",
		],
		trucks: ["square-trailer-10ft", "square-trailer-13ft", "airstream-small"],
		articles: [
			"what-size-food-trailer-do-i-need",
			"food-trailer-power-guide",
			"food-truck-wrap-design-guide",
		],
		faqs: [
			{
				q: "Does a boba trailer need a hood?",
				a: "Usually not. A cold drinks line with no open cooking does not need an extraction hood or fire suppression, though some counties treat pearl cooking differently — we confirm with your plan reviewer.",
			},
		],
		targetQuery: "boba tea trailer",
	},
	{
		slug: "ice-cream-trailer",
		businessType: "ice-cream",
		vehicleId: "square-3m",
		name: "Ice cream & gelato",
		title: "Ice cream and gelato trailers",
		description:
			"Ice cream and gelato trailers with a dipping cabinet at customer height, reserve freezers behind the counter and a cone and topping station by the hatch.",
		intro:
			"Gelato sells itself through glass. The dipping cabinet faces the queue, reserve freezers sit directly behind the server, and the topping station finishes the order at the hatch.",
		equipment: [
			"dipping-cabinet",
			"reserve-freezers",
			"hand-basin",
			"till",
			"digital-menu-board",
		],
		zones: [
			"Serve hatch with dipping cabinet at customer height",
			"Reserve freezers and dry store directly behind the counter",
			"Hand basin at the end of the run, cone and sauce station by the hatch",
			"Menu board above the hatch, fascia sign on the roof edge",
		],
		power:
			"Freezers draw power around the clock, including overnight. Plan shore power at your storage site, and size the generator for compressor start-up surges.",
		permits:
			"Pre-packaged or pre-made product keeps plan review light. Making product on board changes the requirements — tell us early.",
		designTips: [
			"Put the dipping cabinet at child height on the hatch side.",
			"Add HVAC in hot climates — freezers work harder in a hot box.",
			"Use a light, bright wrap; it reads 'cold' from across a park.",
		],
		trucks: ["square-trailer-10ft", "airstream-small"],
		articles: [
			"what-size-food-trailer-do-i-need",
			"food-trailer-power-guide",
			"food-truck-wrap-design-guide",
		],
		faqs: [
			{
				q: "How much power does an ice cream trailer need?",
				a: "It depends on the cabinet and freezer count; compressors also need headroom for start-up surges. We add every unit to a power table and recommend a 30A or 50A feed or a generator before any design is final.",
			},
		],
		targetQuery: "ice cream trailer for sale",
	},
	{
		slug: "mobile-bar-trailer",
		businessType: "bar",
		vehicleId: "airstream-mid",
		name: "Mobile bars",
		title: "Mobile bar trailers for weddings and events",
		description:
			"Mobile bar trailers with pour stations facing the guests, cellar-style chilled storage, ice and glass wash — built for weddings, private hire and brewery residencies.",
		intro:
			"A mobile bar is photographed more than any other trailer we build. The pour stations face the guests, chilled storage sits under the hatch, and glass wash keeps the back bar clean.",
		equipment: [
			"pour-stations",
			"glass-wash",
			"cellar-refrigeration",
			"ice",
			"hand-basin",
			"till",
			"digital-menu-board",
		],
		zones: [
			"Serve hatch with pour stations facing the queue",
			"Cellar-style chilled storage and ice directly under the hatch",
			"Glass wash and hand basin at the end of the bar",
			"Back-bar display and menu board above the hatch",
		],
		power:
			"Keg cooling, ice and glass wash are the main loads. Many venues offer shore power; bring a quiet generator for those that do not.",
		permits:
			"Alcohol service is licensed separately from the trailer — your caterer's license or the venue's usually covers it. The trailer itself is built to food-service standards.",
		designTips: [
			"Tap towers on the hatch side make the bar the photo backdrop.",
			"Choose a satin or matte wrap for wedding work — it photographs without glare.",
			"Add festoon-light mounting points at the build stage.",
		],
		trucks: ["airstream-mid", "airstream-small", "square-trailer-13ft"],
		articles: [
			"airstream-vs-square-concession-trailer",
			"food-truck-wrap-design-guide",
			"how-much-does-a-food-trailer-cost",
		],
		faqs: [
			{
				q: "Do I need a liquor license for a mobile bar trailer?",
				a: "Alcohol licensing depends on your state and the event. Many mobile bars operate under a caterer's license or the venue's license. The trailer build is separate; we build to food-service standards either way.",
			},
		],
		targetQuery: "mobile bar trailer",
	},
	{
		slug: "retail-popup-trailer",
		businessType: "retail",
		vehicleId: "airstream-l",
		name: "Retail & brand pop-ups",
		title: "Retail pop-up and brand activation trailers",
		description:
			"Walk-in retail trailers for brands, boutiques and product tours: display wall, till by the door, lockable stock storage and lighting that sells.",
		intro:
			"A pop-up store is about dwell time, not queue speed. Customers step inside the Large Airstream, browse a lit display wall, and pay at a till placed near the door for flow.",
		equipment: [
			"display-wall",
			"till",
			"secure-storage",
			"led-track-lights",
			"hvac-optional",
		],
		zones: [
			"Entry and queue outside with A-board menu",
			"Display wall with lockable overnight storage",
			"Till counter near the door for throughput",
			"Rear stockroom (around 20% of the unit)",
		],
		power:
			"Lighting, HVAC and the till are the loads. Walk-in units in hot climates need rooftop HVAC; we include it on the power table.",
		permits:
			"No food permits apply. Check local vending and event permits for each location on a tour.",
		designTips: [
			"Light the product, not the ceiling — track lights on the display wall.",
			"Keep 20% of the floor for stock so the shelves stay full all day.",
			"Design the exterior for photos; it is the brand's billboard on every stop.",
		],
		trucks: ["airstream-large"],
		articles: [
			"airstream-vs-square-concession-trailer",
			"food-truck-wrap-design-guide",
		],
		faqs: [
			{
				q: "Can a retail trailer be converted to food later?",
				a: "Not easily. A walk-in retail body has no hood, suppression or food-grade water system. If food may come later, design for it now on a body that can carry a hot line.",
			},
		],
		targetQuery: "retail pop up trailer",
	},
	{
		slug: "pizza-trailer",
		businessType: "pizza",
		vehicleId: "square-5m",
		name: "Pizza",
		title: "Pizza trailers with a deck oven",
		description:
			"Pizza trailers with a deck oven under extraction, dough prep and a refrigerated topping rail, and a drinks station — built for festival and catering volume.",
		intro:
			"The oven sets everything: its footprint, its heat and its hood. We put it at one end under extraction, dough prep beside it, and keep the drinks station well away from the heat.",
		equipment: [
			"pizza-oven",
			"extraction-hood",
			"fire-suppression",
			"hand-basin",
			"ice",
			"under-counter-refrigeration",
			"fresh-grey-water-tanks",
			"till",
			"digital-menu-board",
			"hvac-optional",
		],
		zones: [
			"Serve hatch centred on the long wall",
			"Pizza oven under extraction (left), dough prep and finishing (right)",
			"Hand basin at the line entry — the first thing an officer sees",
			"Drinks station with ice and refrigeration (supports margin)",
			"Till at the hatch corner, separated from the food pass",
		],
		power:
			"Gas deck ovens keep the electrical load light. Refrigeration, the extraction fan and lights fit a 50A feed; electric ovens need a much larger supply, which we flag early.",
		permits:
			"Oven, hood and suppression are reviewed together. Wood-fired ovens add fire-marshal requirements that vary by county.",
		designTips: [
			"Choose the oven before the trailer — it decides the length.",
			"Use a 16 ft body if you also want a drinks station.",
			"Add HVAC; an oven turns a trailer into a sauna by mid-afternoon.",
		],
		trucks: ["square-trailer-16ft", "square-trailer-13ft"],
		articles: [
			"food-truck-kitchen-layout",
			"food-truck-health-permit-plan-review",
			"what-size-food-trailer-do-i-need",
		],
		faqs: [
			{
				q: "What size trailer do I need for a pizza oven?",
				a: "A 16 ft square trailer fits a deck oven, dough prep and a drinks station. A 13 ft body works for an oven-only menu with a smaller prep area.",
			},
		],
		targetQuery: "pizza trailer for sale",
	},
];

export function getUseCase(slug: string): UseCase | undefined {
	return USE_CASES.find((u) => u.slug === slug);
}

/** Readable names for equipment ids — mirrors the render pipeline's phrases. */
export const EQUIPMENT_LABELS: Record<string, string> = {
	fryer: "Fryer",
	"griddle-chargrill": "Griddle and chargrill",
	griddle: "Flat-top griddle / plancha",
	"pizza-oven": "Deck pizza oven",
	"espresso-machine": "Espresso machine",
	grinder: "Grinder",
	"water-filtration": "Water filtration",
	"extraction-hood": "Extraction hood",
	"fire-suppression": "UL 300 fire suppression",
	"hand-basin": "Hand sink (hot and cold)",
	"under-counter-refrigeration": "Under-counter refrigeration",
	"fresh-grey-water-tanks": "Fresh and gray water tanks",
	till: "POS till",
	"digital-menu-board": "Digital menu board",
	"hvac-optional": "Rooftop HVAC (optional)",
	"hot-station": "Steam wells / hot station",
	ice: "Ice machine or ice well",
	"boba-tea-brewers": "Tea brewers and shaker station",
	"sealing-machine": "Cup sealing machine",
	"prep-counter": "Prep counter",
	"dipping-cabinet": "Gelato dipping cabinet",
	"reserve-freezers": "Reserve freezers",
	"pour-stations": "Pour stations",
	"glass-wash": "Glass washer",
	"cellar-refrigeration": "Cellar refrigeration",
	"display-wall": "Lit display wall",
	"secure-storage": "Lockable storage",
	"led-track-lights": "LED track lighting",
};
