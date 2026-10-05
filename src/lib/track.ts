/**
 * The only capture call-site. PostHog is initialized in __root; without a
 * key this is a silent no-op. Analytics must never break the buyer flow,
 * so every call is guarded.
 */
import posthog from "posthog-js";

export type TrackEvent =
	| "quiz_started"
	| "quiz_step"
	| "quiz_completed"
	| "quiz_resumed"
	| "quiz_photo_added"
	| "revision_applied"
	| "quote_requested"
	| "design_approved";

export function track(event: TrackEvent, props?: Record<string, unknown>) {
	try {
		posthog.capture(event, props);
	} catch {
		/* analytics is best-effort */
	}
}
