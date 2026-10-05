import { createFileRoute } from "@tanstack/react-router";
import {
	type IntakeDirect,
	specFromIntake,
	versionStamp,
} from "#/lib/food-truck/design-record";
import { emptyBrain } from "#/lib/food-truck/brain";
import { parseBrief } from "#/lib/food-truck/brief";
import { getBusiness, getVehicle } from "#/lib/food-truck/constants";
import {
	commitDesignVersion,
	currentDesign,
	getOrCreateSession,
	logQuizStep,
	persistSession,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Structured intake — writes the design record directly.
 * The old path flattened answers to prose then regex-parsed them, losing
 * anything outside the keyword lists ("sage", "birria", "wings"). This
 * commits a v1 spec from the answers as given; the brain remains a
 * suggestion layer the customer confirms, not the record.
 */
export const Route = createFileRoute("/api/agent/intake")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: {
					sessionId?: string;
					answers?: IntakeDirect;
					quiz?: { styles?: string[]; palettes?: string[]; extras?: string[] };
					/** Operating brief — closed vocabulary, parsed server-side. */
					brief?: unknown;
					/** Optional mood photo from the quiz, as a data URL. */
					inspirationImage?: string;
				} = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId) {
					return Response.json(
						{ error: "sessionId is required" },
						{ status: 400 },
					);
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				// Raw star-picks ride along for the CMS; the spec still comes
				// from the derived answers so the record path is unchanged.
				if (body.quiz) logQuizStep(s, "final", body.quiz);
				const spec = specFromIntake(body.answers ?? {});
				const rec = commitDesignVersion(s, spec, {
					changeSummary: "Your brief — design v1.",
					state: "concept",
				});
				s.brief = parseBrief({
					...(body.brief && typeof body.brief === "object" ? body.brief : {}),
					notes: body.answers?.notes,
				});
				const photo = body.inspirationImage;
				if (
					typeof photo === "string" &&
					/^data:image\/(png|jpe?g|webp);base64,/.test(photo) &&
					photo.length < 12_000_000
				) {
					s.inspirationImage = photo;
				}
				// Seed the brain so chat/tools agree with the record. The brain
				// is null on a fresh session — the quiz runs before any chat
				// turn — so it is created here. Seeding only an existing brain
				// meant the structured answers never reached the first renders.
				const brain = s.brain ?? emptyBrain();
				const answers = body.answers ?? {};
				if (answers.businessType && getBusiness(answers.businessType)) {
					brain.businessType = getBusiness(answers.businessType)?.id ?? null;
				}
				if (spec.menu.length) brain.menuKeywords = [...spec.menu];
				if (spec.colors.length) brain.colors = [...spec.colors];
				if (spec.vibe.length) brain.vibeWords = [...spec.vibe];
				if (answers.vehicleId && getVehicle(answers.vehicleId)) {
					brain.vehicleId = spec.vehicleId;
					brain.vehicleSource = "picker";
				}
				if (answers.service) brain.walkIn = spec.serveMode === "walk-in";
				if (spec.hasBrand) brain.brandName = spec.brand;
				s.brain = brain;
				persistSession(s);
				return Response.json({
					current: rec,
					stamp: versionStamp(rec.version, rec.state),
					previousVersions: currentDesign(s) ? s.designVersions.length : 0,
				});
			},
		},
	},
});
