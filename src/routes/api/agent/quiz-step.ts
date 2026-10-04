import { createFileRoute } from "@tanstack/react-router";
import {
	getOrCreateSession,
	logQuizStep,
	persistSession,
	restoreSession,
} from "#/lib/food-truck/session";

/**
 * Per-step quiz log — fired on every Next, so the CMS holds each buyer's
 * picks per round even if they never reach "Generate my truck".
 */
export const Route = createFileRoute("/api/agent/quiz-step")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: {
					sessionId?: string;
					step?: string;
					data?: Record<string, unknown>;
				} = {};
				try {
					body = (await request.json()) as typeof body;
				} catch {
					return Response.json({ error: "Invalid JSON body" }, { status: 400 });
				}
				if (!body.sessionId || !body.step) {
					return Response.json(
						{ error: "sessionId and step are required" },
						{ status: 400 },
					);
				}
				await restoreSession(body.sessionId);
				const s = getOrCreateSession(body.sessionId);
				logQuizStep(s, body.step, body.data ?? {});
				persistSession(s);
				return Response.json({ ok: true, steps: s.quizSteps.length });
			},
		},
	},
});
