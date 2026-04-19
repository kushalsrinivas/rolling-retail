import { createFileRoute } from "@tanstack/react-router";

const ADK_URL = process.env.ADK_URL || "http://localhost:8000";
const APP_NAME = process.env.ADK_APP_NAME || "agent";

export const Route = createFileRoute("/api/agent/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const { userId, sessionId, message } = (await request.json()) as {
						userId: string;
						sessionId: string;
						message: string;
					};

					const adkPayload = {
						appName: APP_NAME,
						userId,
						sessionId,
						newMessage: {
							role: "user",
							parts: [{ text: message }],
						},
						streaming: true,
					};

					const res = await fetch(`${ADK_URL}/run_sse`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(adkPayload),
					});

					if (!res.ok) {
						const text = await res.text();
						return Response.json(
							{ error: `ADK run failed: ${res.status}`, details: text },
							{ status: res.status },
						);
					}

					return new Response(res.body, {
						status: 200,
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							Connection: "keep-alive",
						},
					});
				} catch (error) {
					console.error("Error calling ADK agent:", error);
					return Response.json(
						{ error: "Failed to communicate with agent" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
