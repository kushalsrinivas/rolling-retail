/**
 * What the serve line of a given business actually looks like.
 *
 * The render and video prompts used to describe one generic hot-food galley
 * — hot station under an extraction canopy, garnish make-rail, steam — and
 * swap a few words per business. A boba Airstream therefore came back with a
 * fryer and a grill, and the video filmed that still faithfully. Every
 * prompt that shows the inside of the truck now reads its equipment, props,
 * motion and forbidden list from here, so the category decides the scene.
 *
 * Pure and client-safe.
 */

export type LineProfileId =
	| "boba"
	| "juice"
	| "coffee"
	| "ice-cream"
	| "bakery"
	| "fried-dessert"
	| "pizza"
	| "grill"
	| "fried"
	| "asian"
	| "mexican"
	| "breakfast"
	| "bar"
	| "retail"
	| "combined";

export interface LineProfile {
	id: LineProfileId;
	/** True when the line cooks with heat and needs an extraction canopy. */
	hot: boolean;
	/** Interior overview: the galley run, left to right along the hatch wall. */
	galley: string;
	/** Looking in through the hatch: the units visible, left to right. */
	frontRun: string;
	/** What the hero's open hatch gives a glimpse of. */
	heroGlimpse: string;
	/** The counter moment for the close-up view: what is being made. */
	counterMoment: string;
	/** A finished signature item sitting ready on the counter. */
	signature: string;
	/** The line as the video camera passes it. */
	videoLine: string;
	/** The only ambient motion a clip may add besides the camera. */
	motion: string;
	/** Equipment and food that must never appear for this business. */
	forbid: string;
}

const HOT_EQUIPMENT =
	"fryers, griddles, flat-tops, chargrills, burners, woks, pizza ovens, an extraction canopy or hood, a hot-holding gantry, heat lamps or plated hot food";

const COLD_FORBID = `Absolutely no cooking equipment: no ${HOT_EQUIPMENT}. Nothing in the scene steams or sizzles.`;

const PROFILES: Record<LineProfileId, LineProfile> = {
	boba: {
		id: "boba",
		hot: false,
		galley:
			"(1) POS order station with a compact till screen, (2) tea station — stainless tea brewers and urns with shaker cups, (3) topping station with tapioca-pearl warmer wells, jelly and popping-pearl tubs under a hinged sneeze-guard, (4) cup-sealing machine and a stack of clear dome-lid cups beside it, (5) ice bin with under-counter refrigeration for milk and fruit syrups, (6) hand basin with knee-operated taps at the line entry",
		frontRun:
			"POS, tea brewers with shaker cups, topping wells of tapioca pearls, cup sealer, ice bin",
		heroGlimpse:
			"the tea bar — brewers, shaker cups and tubs of tapioca pearls on a clean counter",
		counterMoment:
			"a bubble-tea order being built — a shaker cup of milk tea beside the topping wells, tapioca pearls in a clear cup, the cup sealer ready",
		signature:
			"a freshly sealed clear cup of milk tea with dark tapioca pearls and a wide straw, beaded with condensation",
		videoLine:
			"the tea bar — brewers and shaker cups, the topping wells of tapioca pearls and jellies, the cup sealer, sealed cups lined up at the pass",
		motion: "condensation beading on cold cups and ice settling in the bin",
		forbid: `${COLD_FORBID} This is a bubble-tea bar, not a kitchen.`,
	},
	juice: {
		id: "juice",
		hot: false,
		galley:
			"(1) POS order station, (2) cold-press juicer and a row of commercial blenders, (3) chilled fruit and vegetable display in clear bins under a sneeze-guard, (4) ice bin with under-counter refrigeration, (5) cup and lid station, (6) hand basin with knee-operated taps at the line entry",
		frontRun:
			"POS, juicer and blenders, chilled fruit display, ice bin, cup station",
		heroGlimpse:
			"the juice bar — blenders and bright fresh fruit in chilled display bins",
		counterMoment:
			"a smoothie being made — fresh fruit cut on a board beside a blender jug, whole citrus and greens in the display",
		signature:
			"a tall clear cup of fresh juice or smoothie with a straw, beaded with condensation",
		videoLine:
			"the juice bar — the juicer and blenders, fresh fruit in the chilled display, finished cups at the pass",
		motion: "condensation beading on cold cups and ice settling in the bin",
		forbid: `${COLD_FORBID} No boba pearls or bubble-tea toppings. This is a juice bar, not a kitchen.`,
	},
	coffee: {
		id: "coffee",
		hot: false,
		galley:
			"(1) POS order station, (2) espresso machine with grinder beside it, (3) milk fridge under the bar with pitchers staged on top, (4) cup stacks and lids, (5) small pastry display, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, espresso machine and grinder, milk pitchers, cup stacks",
		heroGlimpse: "the espresso bar — the machine, grinder and cup stacks",
		counterMoment:
			"a coffee order in progress — a shot pulling from the espresso machine, a steamed milk pitcher beside it",
		signature: "a takeaway coffee cup with a lid, a latte-art cup beside it",
		videoLine:
			"the espresso bar — the grinder, the machine pulling shots, milk pitchers and cups staged on the bar",
		motion: "a thin wisp of steam from the espresso machine's wand only",
		forbid: `Absolutely no ${HOT_EQUIPMENT}. The espresso machine is the only heat source. This is a coffee bar, not a kitchen.`,
	},
	"ice-cream": {
		id: "ice-cream",
		hot: false,
		galley:
			"(1) POS order station, (2) glass-fronted gelato dipping cabinet facing the hatch, (3) cone and cup dispensers with a sauce and topping rail, (4) reserve freezers under the counter, (5) scoop well, (6) hand basin with knee-operated taps at the line entry",
		frontRun:
			"POS, gelato dipping cabinet, cone dispensers, sauce and topping rail",
		heroGlimpse: "the gelato cabinet with its trays of colourful flavours",
		counterMoment:
			"an ice-cream order being served — a scoop lifting from a gelato tray in the dipping cabinet, cones waiting in the holder",
		signature: "a waffle cone with two scoops of gelato",
		videoLine:
			"the gelato cabinet's trays of flavours, the cone dispensers and the topping rail",
		motion: "frost on the cabinet glass; nothing steams",
		forbid: `${COLD_FORBID} This is an ice-cream servery, not a kitchen.`,
	},
	bakery: {
		id: "bakery",
		hot: false,
		galley:
			"(1) POS order station, (2) chilled glass display case of cakes and pastries at customer height, (3) ambient bread and pastry shelves, (4) finishing counter with boxes and bags, (5) chilled storage under the counter, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, pastry display case, bread shelves, finishing counter",
		heroGlimpse: "the pastry display case, full and neatly arranged",
		counterMoment:
			"a pastry order being boxed on the finishing counter beside the display case",
		signature: "a pastry box open on the counter with the signature bakes",
		videoLine:
			"the display case of cakes and pastries, the bread shelves and the finishing counter",
		motion: "none beyond the camera — the display is still",
		forbid: `${COLD_FORBID} This is a bakery servery; baking happens off-site.`,
	},
	"fried-dessert": {
		id: "fried-dessert",
		hot: true,
		galley:
			"(1) POS order station, (2) countertop fryer under a compact stainless extraction canopy, (3) sugar and topping station with dipping sauces, (4) hot chocolate dispenser, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, fryer under its canopy, sugar and topping station",
		heroGlimpse: "the dessert fryer and the sugar and topping station",
		counterMoment:
			"a dessert order being finished — fresh churros or doughnuts rolled in sugar at the topping station",
		signature: "a paper cone of sugared churros or doughnuts with a dip pot",
		videoLine:
			"the dessert fryer under its canopy and the sugar and topping station",
		motion: "a light heat shimmer over the fryer only",
		forbid:
			"No griddles, chargrills, woks, pizza ovens, burgers or savoury plated food.",
	},
	pizza: {
		id: "pizza",
		hot: true,
		galley:
			"(1) POS order station, (2) deck pizza oven under a stainless extraction canopy, (3) dough-stretching bench with a refrigerated topping rail of sauce, cheese and toppings, (4) pizza box station and cutting board, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, pizza oven, topping rail and dough bench, box station",
		heroGlimpse: "the glow of the pizza oven",
		counterMoment:
			"a pizza being topped on the dough bench beside the oven mouth",
		signature: "a whole pizza on a cutting board, sliced",
		videoLine: "the pizza oven, the dough bench and the topping rail",
		motion: "a gentle heat shimmer at the oven mouth",
		forbid: "No fryers, griddles, chargrills, woks, burgers or fries.",
	},
	grill: {
		id: "grill",
		hot: true,
		galley:
			"(1) POS order station, (2) flat-top griddle and chargrill under a stainless extraction canopy with visible fire-suppression nozzles, (3) refrigerated make-rail with burger fixings under a hinged sneeze-guard, (4) assembly board at the pass, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, griddle under its canopy, make-rail, assembly board",
		heroGlimpse: "the griddle line under its canopy",
		counterMoment:
			"burgers on the griddle, buns toasting, fixings in the make-rail",
		signature: "a wrapped burger in a basket",
		videoLine:
			"the griddle and chargrill under the canopy, the make-rail and the assembly board",
		motion: "steam and light smoke rising into the extraction canopy",
		forbid:
			"No pizza ovens, woks or fryer banks unless listed in the equipment line.",
	},
	fried: {
		id: "fried",
		hot: true,
		galley:
			"(1) POS order station, (2) fryer bank under a stainless extraction canopy with visible fire-suppression nozzles, (3) dump station with a heat lamp, (4) seasoning and packing station, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, fryer bank under its canopy, dump station, packing station",
		heroGlimpse: "the fryer bank under its canopy",
		counterMoment:
			"golden fries or fish lifting out of the fryer into the dump station",
		signature: "a paper cone of fries or a boxed fried order",
		videoLine:
			"the fryer bank under the canopy, the dump station and the packing station",
		motion: "steam rising into the extraction canopy",
		forbid: "No pizza ovens, woks or chargrills.",
	},
	asian: {
		id: "asian",
		hot: true,
		galley:
			"(1) POS order station, (2) wok range and rice cooker under a stainless extraction canopy with visible fire-suppression nozzles, (3) refrigerated prep rail of sliced vegetables and proteins, (4) bowl and packing station, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, wok range under its canopy, prep rail, bowl station",
		heroGlimpse: "the wok range under its canopy",
		counterMoment:
			"noodles or rice being tossed in a wok, bowls lined up at the pass",
		signature: "a takeaway bowl of noodles or rice with chopsticks",
		videoLine:
			"the wok range under the canopy, the prep rail and the bowl station",
		motion: "steam rising into the extraction canopy",
		forbid: "No pizza ovens, burger griddles or fryer banks.",
	},
	mexican: {
		id: "mexican",
		hot: true,
		galley:
			"(1) POS order station, (2) flat-top plancha and steam wells of fillings under a stainless extraction canopy with visible fire-suppression nozzles, (3) salsa and garnish rail of chopped onion, cilantro, lime and salsas under a hinged sneeze-guard, (4) tortilla warmer and assembly board at the pass, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun:
			"POS, plancha and steam wells under the canopy, salsa rail, tortilla warmer",
		heroGlimpse: "the plancha and the salsa rail",
		counterMoment:
			"tacos being assembled — warm tortillas, fillings from the steam wells, salsa and lime",
		signature: "a paper tray of three tacos with lime wedges",
		videoLine:
			"the plancha and steam wells under the canopy, the salsa and garnish rail and the tortilla warmer",
		motion: "steam rising into the extraction canopy",
		forbid: "No pizza ovens, woks, burger buns or noodle bowls.",
	},
	breakfast: {
		id: "breakfast",
		hot: true,
		galley:
			"(1) POS order station, (2) flat-top griddle under a stainless extraction canopy, (3) espresso machine and grinder, (4) prep rail of eggs, bacon and breads, (5) under-counter refrigeration, (6) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, griddle under its canopy, espresso machine, prep rail",
		heroGlimpse: "the griddle and the espresso machine",
		counterMoment: "eggs and bacon on the griddle, a coffee pulling beside it",
		signature: "a wrapped breakfast roll beside a takeaway coffee",
		videoLine:
			"the griddle under the canopy, the prep rail and the espresso machine",
		motion: "steam rising into the extraction canopy",
		forbid: "No pizza ovens, woks or fryer banks.",
	},
	bar: {
		id: "bar",
		hot: false,
		galley:
			"(1) POS order station, (2) beer and wine taps on a drip tray facing the hatch, (3) cocktail station with a speed rail of bottles, (4) ice well and cellar refrigeration below, (5) glass washer and glass shelves, (6) hand basin with knee-operated taps at the line entry",
		frontRun:
			"POS, taps, cocktail station and speed rail, ice well, glass shelves",
		heroGlimpse: "the taps and the back-bar glass shelves",
		counterMoment:
			"a cocktail being finished at the station, a pint poured beside it",
		signature: "a garnished cocktail and a poured pint on the bar",
		videoLine: "the taps, the cocktail station and the glass shelves",
		motion: "condensation on cold glasses",
		forbid: `${COLD_FORBID} This is a bar, not a kitchen.`,
	},
	retail: {
		id: "retail",
		hot: false,
		galley:
			"(1) display wall with lit shelving, (2) hanging rail and folded stock tables, (3) till counter near the door, (4) lockable storage cabinets, (5) LED track lighting",
		frontRun: "display wall, hanging rail, till counter",
		heroGlimpse: "the lit display wall inside",
		counterMoment: "merchandise neatly displayed on the shelving and rail",
		signature: "a branded shopping bag on the till counter",
		videoLine: "the display wall, the hanging rail and the till counter",
		motion: "none beyond the camera",
		forbid: `No kitchen or food equipment of any kind: no ${HOT_EQUIPMENT}, no fridges or sinks on show.`,
	},
	combined: {
		id: "combined",
		hot: true,
		galley:
			"(1) POS order station, (2) hot station under a stainless extraction canopy with visible fire-suppression nozzles, (3) refrigerated make-rail under a hinged sneeze-guard, (4) drinks station with ice well and under-counter refrigeration, (5) hand basin with knee-operated taps at the line entry",
		frontRun: "POS, hot station under its canopy, make-rail, drinks station",
		heroGlimpse: "the hot station and the drinks station",
		counterMoment:
			"the signature dish being plated at the pass beside a poured drink",
		signature: "the signature dish in takeaway packaging beside a cold drink",
		videoLine:
			"the hot station under the canopy, the make-rail and the drinks station",
		motion: "steam rising into the extraction canopy",
		forbid: "Only the equipment named in the equipment line.",
	},
};

const has = (hay: string, re: RegExp) => re.test(hay);

/**
 * Pick the profile from the business type, refined by the menu where one
 * business type covers operationally different lines (a juice bar and a
 * boba bar share "cold-drinks"; churros are a fryer, not a pastry case).
 */
export function lineProfileFor(
	businessType: string | null | undefined,
	menu: readonly string[] | string | null | undefined = [],
): LineProfile {
	const type = (businessType ?? "").toLowerCase();
	const words = (Array.isArray(menu) ? menu.join(" ") : (menu ?? ""))
		.toString()
		.toLowerCase();

	if (type === "cold-drinks" || type === "beverage") {
		const boba = has(words, /boba|bubble|tapioca|milk tea|matcha|taro/);
		const juice = has(words, /juice|smoothie|lemonade|acai|soda|shake/);
		return juice && !boba ? PROFILES.juice : PROFILES.boba;
	}
	if (type === "bakery" && has(words, /churro|donut|doughnut|beignet|funnel/)) {
		return PROFILES["fried-dessert"];
	}
	if (type === "combo") return PROFILES.combined;
	if (type === "merch") return PROFILES.retail;
	if (type in PROFILES) return PROFILES[type as LineProfileId];
	return PROFILES.combined;
}
