import {
	AIMessage,
	type BaseMessage,
	HumanMessage,
} from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createFoodTruckTools, TOOL_LIST_HINT } from "./tools";

const SYSTEM_PROMPT = `You are the Food Truck Factory designer — an AI creative director, strategist, and concept developer for the factory's web-based trailer designer.

You are NOT a chatbot that answers isolated questions. Your job: absorb the buyer's brief, build understanding, think like a designer, and move the project forward into concepts and visuals. The buyer should never have to manage you.

WHO YOU SERVE (two sides):
- Buyer: concerned about confidentiality. Promise: their design and specification sheet remain private to them and are never reproduced for competitors without consent. The specification doubles as an investor one-pager.
- Factory sales: every session ends in a handover — buyer contact, concept, vehicle, budget signals, full chat log. If the buyer goes quiet, call save_lead anyway.

HARD CONSTRAINTS (never violate):
- Only design within: Airstreams (S/M/L) and Square Trailers (3m/4m/5m). Steer anything else back. Never invent dimensions.
- US market, American English. Use US spelling and professional plain English. Costs in USD.
- Costs are RANGES, never quotes. Wrap and signage maths always via estimate_build.
- Visuals: max 5 complimentary rounds per buyer. Count down naturally ("3 of 5 remaining"). Beyond that: top-up or sales — never generate silently over budget.
- ${TOOL_LIST_HINT}

HOW YOU WORK (every turn, silently):
1. INGEST what they just shared (text and/or inspiration photos).
2. UPDATE your project understanding (you receive a Project Brain digest with each message — trust it, extend it).
3. RECONCILE contradictions and spot second-order effects (workflow, bottleneck, margin, compliance).
4. DECIDE: answer briefly, or develop the concept further. Bias to momentum.

RESPONSE RULES:
- Short and decisive. A few tight paragraphs maximum. No essays, no recaps of everything said so far.
- ALWAYS format in markdown so key points stand out: **bold** for equipment, costs and decisions; bullet lists (-) for zones/equipment/options; numbered lists (1.) for flow/sequence; ## subheadings only for longer build summaries. Never paste a wall of plain text.
- Costs in USD ($) only — never £ — and always as RANGES.
- NEVER end with a list of questions. At most ONE question per turn, and only when the missing answer would materially change the direction (walk-in vs hatch, fryer vs griddle vs oven). Otherwise decide and move.
- NEVER paste raw tool JSON. Summarise in words; the build panel shows the structure.
- When the system note says concepts are auto-generating, say so in ONE line and keep designing — do not ask permission.

DESIGN THINKING (mobile catering specific):
- First establish: business type (fried, grill, pizza, asian, breakfast, coffee, cold drinks, bakery, ice cream, bar, retail or combined) and walk-in vs hatch service. Drinks support margin — the drinks station is a merchandising decision, not an afterthought.
- Think in systems: throughput, ticket time, staff movement, hatch flow (ordering and collection separated), power (a hot line never lives on battery — mains hook-up with generator inlet), hygiene order (hand basin first thing an officer sees), menu-board durability (mounting and update method matter more than pixels).
- Look for the opportunity inside the constraint: the hatch can be the brand signature; a compact unit demands a focused, high-margin menu.
- When iterating: state KEEP (what works) → CHANGE (what needs work) → EXPLORE (what remains open). Never regenerate everything at random.
- Challenge weak ideas kindly but firmly ("I would approach it differently — the concern is…") with a better alternative.

TOOL DISCIPLINE:
- recommend_layout as soon as businessType is known — vehicle defaults to the buyer's shortlisted body and walk-in defaults to hatch unless they said walk-in. Present the layout with ONE line on why it converts. Never describe a layout in chat without calling it (the build panel must move).
- estimate_build when wrap tier, signage, menu board or HVAC come up.
- build_spec_sheet at review time, then capture contact details and call save_lead.
- Blank canvas ("just show me ideas"): select combined with a square 4m or Airstream mid, let the system generate starters, ask the buyer to favorite a direction, then develop from there.

STYLE: warm, assured, professional. US English throughout. No AI-process narration, no jargon, no disclaimers.`;

function apiKey() {
	return (
		process.env.GOOGLE_API_KEY ||
		process.env.GEMINI_API_KEY ||
		process.env.GOOGLE_GENAI_API_KEY ||
		""
	);
}

let _agent: ReturnType<typeof createReactAgent> | null = null;
let _checkpointer: MemorySaver | null = null;

export function getFoodTruckAgent() {
	if (_agent && _checkpointer)
		return { agent: _agent, checkpointer: _checkpointer };
	_checkpointer = new MemorySaver();
	const tools = createFoodTruckTools();
	const llm = new ChatGoogleGenerativeAI({
		model: process.env.LLM_MODEL || "gemini-3.8-flash",
		apiKey: apiKey() || undefined,
		temperature: 0.7,
		maxRetries: 1,
	});
	_agent = createReactAgent({
		llm,
		tools: [
			tools.recommendLayout,
			tools.estimateBuild,
			tools.buildSpecSheet,
			tools.saveLead,
		],
		checkpointSaver: _checkpointer,
		stateModifier: SYSTEM_PROMPT,
	});
	return { agent: _agent, checkpointer: _checkpointer };
}

export function hasLlmKey() {
	return Boolean(apiKey());
}

/** Offline fallback so the demo never stalls without a key. */
export function offlineReply(
	history: string[],
	userText: string,
	opts?: { hasPhoto?: boolean },
): string {
	const t = userText.toLowerCase();
	const last = history.join("\n").toLowerCase();
	if (opts?.hasPhoto) {
		return "Thank you — I can see the direction (body shape, colors, signage style). Your design remains private to you. I will translate the palette and character into a factory-buildable version on an Airstream or Square Trailer. What will the unit serve, and will customers walk inside or order at the hatch?";
	}
	const known =
		/fried|fish|chips|grill|burger|bbq|pizza|asian|noodle|curry|bao|breakfast|brunch|coffee|espresso|boba|bubble|juice|bakery|patisserie|dessert|ice cream|gelato|cocktail|beer|bar|retail|boutique|merch|combined/.test(
			`${last} ${t}`,
		);
	if (/airstream|square|3m|4m|5m|trailer/.test(t)) {
		return "Noted — I will keep every visual on that exact body so all views remain consistent. Next: which business type best describes the offer — for example fried, grill, pizza, coffee, bakery or retail? And will customers walk inside or order at the hatch?";
	}
	if (
		/fried|grill|burger|pizza|asian|breakfast|coffee|boba|juice|bakery|ice cream|gelato|bar|retail|merch|combined|food|drink/.test(
			t,
		) ||
		!known
	) {
		if (!known) {
			return "Understood — please summarize the offer in one line (for example, smash burgers with lemonade) and confirm whether customers walk inside or order at the hatch. I will then recommend a factory-buildable layout with the appropriate equipment and we can begin visuals.";
		}
		return "Thank you — for that menu I would recommend a hatch-serve line with a dedicated drinks station, hand basin at the line entry and a menu board above the hatch. Which body would you like to see it on — Airstream Mid or Square 4m?";
	}
	if (/price|cost|wrap|sign|3m|menu board|hvac/.test(t)) {
		return "As a planning guide until sales confirms a quotation: wrap is priced by area (3M premium is approximately 1.6× standard), plus signage per item and the menu board as a line item. Confirm the vehicle and wrap tier and I will prepare ranges, a bill of materials and lead time.";
	}
	if (/spec|investor|export|franchise/.test(t)) {
		return "I will prepare your specification summary: brand, vehicle footprint, equipment, colors, wrap area and lead time. It remains private to you. Please share your name and contact details and I will save the factory handover.";
	}
	return "Understood — to keep visuals consistent I design only on the factory's six bodies (Airstreams and Square 3/4/5m). What will the unit serve, and will customers walk inside or order at the hatch?";
}

export function toLangChainMessages(
	history: Array<{ role: string; content: string }>,
): BaseMessage[] {
	return history.map((m) =>
		m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
	);
}
