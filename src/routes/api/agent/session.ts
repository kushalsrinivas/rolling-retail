import { createFileRoute } from "@tanstack/react-router";

const ADK_URL = process.env.ADK_URL || "http://localhost:8000";
const APP_NAME = process.env.ADK_APP_NAME || "agent";

export const Route = createFileRoute("/api/agent/session")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const { userId, sessionId } = (await request.json()) as {
						userId: string;
						sessionId: string;
					};

					const res = await fetch(
						`${ADK_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({}),
						},
					);

					if (!res.ok) {
						const text = await res.text();
						return Response.json(
							{ error: `ADK session creation failed: ${res.status}`, details: text },
							{ status: res.status },
						);
					}

					const data = await res.json();
					return Response.json(data);
				} catch (error) {
					console.error("Error creating ADK session:", error);
					return Response.json(
						{ error: "Failed to create session with agent" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
