import { createFileRoute } from "@tanstack/react-router";
import {
	type IntakeDirect,
	specFromIntake,
	versionStamp,
} from "#/lib/food-truck/design-record";
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
					changeSummary: "Structured intake — customer answers, confirmed.",
					state: "concept",
				});
				// Seed the brain so chat/tools agree with the record.
				if (s.brain) {
					s.brain.businessType = spec.businessType as never;
					s.brain.menuKeywords = [...spec.menu];
					s.brain.colors = [...spec.colors];
					s.brain.vehicleId = spec.vehicleId;
					s.brain.walkIn = spec.serveMode === "walk-in";
					if (spec.hasBrand) s.brain.brandName = spec.brand;
				}
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
