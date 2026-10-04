import type { Faq } from "./types";

/**
 * Site-wide FAQ. Answers are written to be quoted whole — a search snippet
 * or an AI answer engine should be able to lift one without the page around
 * it and still be accurate.
 */
export const FAQ_GROUPS: Array<{ title: string; faqs: Faq[] }> = [
	{
		title: "Designing your trailer",
		faqs: [
			{
				q: "How does the online designer work?",
				a: "You answer a short brief — what you serve, where you trade, your peak volume and the looks you like. The designer recommends a body and an equipment layout, then renders photoreal concepts of your trailer inside and out. You refine it in plain language, and it produces a specification sheet and a planning estimate. [Start designing](/chat).",
			},
			{
				q: "Is the designer free?",
				a: "Yes. Every buyer gets five free concept render rounds with no account. You only talk money with us when you want a quote.",
			},
			{
				q: "Are the renders what I will actually get?",
				a: "They are concept visualizations of a build we can make: the body, openings, equipment line and wrap all come from our own catalog. Dimensions, openings, equipment and the final wrap artwork are confirmed by our factory team in your specification before anything is built.",
			},
			{
				q: "Can I upload a photo of a truck I like?",
				a: "Yes. We borrow its palette, lettering style and finish — never its bodywork — and apply them to one of our buildable bodies.",
			},
		],
	},
	{
		title: "Trailers and builds",
		faqs: [
			{
				q: "What trailers do you build?",
				a: "Six bodies: square concession trailers at 10, 13 and 16 ft, and Airstream trailers in Small, Mid and Large. Keeping the range tight is what lets us build fast and keep every design buildable. See [all trucks](/trucks).",
			},
			{
				q: "How long does a build take?",
				a: "Our planning lead time is 6–10 weeks after you sign off the design, depending on equipment availability and the wrap schedule. Your quote gives a confirmed date.",
			},
			{
				q: "Can I put a hot kitchen in an Airstream?",
				a: "Yes, on the Small and Mid Airstream with one hot station under extraction. The Large Airstream is a walk-in retail body and is never fitted with a hot line.",
			},
			{
				q: "Do you deliver outside your state?",
				a: "We sell across the United States. Delivery or pickup is arranged in your quote.",
			},
		],
	},
	{
		title: "Costs and permits",
		faqs: [
			{
				q: "How much does a custom food trailer cost?",
				a: "Most of our builds fall between about $45,000 and $200,000 depending on the body, the equipment line and the wrap. A 10 ft coffee trailer sits at the low end; an Airstream with a full hot line sits at the high end. See our [cost breakdown](/resources/how-much-does-a-food-trailer-cost).",
			},
			{
				q: "Are your estimates quotes?",
				a: "No. The designer gives planning ranges so you can budget. A quote comes from our sales team against your final specification.",
			},
			{
				q: "Will my trailer pass the health inspection?",
				a: "We design to the requirements most US counties apply — hand sink placement, NSF-listed equipment, water capacity, hood and fire suppression for hot lines — and supply the documents plan review asks for. Your county makes the final decision, so we review its checklist with you before the build. Read our [plan review guide](/resources/food-truck-health-permit-plan-review).",
			},
			{
				q: "Do you offer financing?",
				a: "Ask our sales team when you request a quote. Many buyers finance through equipment lenders using our specification sheet.",
			},
		],
	},
];

export const ALL_FAQS: Faq[] = FAQ_GROUPS.flatMap((g) => g.faqs);

/** The handful shown on the homepage. */
export const HOME_FAQS: Faq[] = [
	ALL_FAQS[0],
	ALL_FAQS[2],
	ALL_FAQS[5],
	ALL_FAQS[8],
	ALL_FAQS[10],
];
