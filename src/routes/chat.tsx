import { createFileRoute } from "@tanstack/react-router";
import ChatLayout from "#/components/chat/ChatLayout";

export const Route = createFileRoute("/chat")({
	component: ChatPage,
	head: () => ({
		meta: [
			{ title: "Designer — Rolling Retail" },
			{
				name: "description",
				content:
					"Answer five quick steps, star the looks you like, and get your food truck concept rendered.",
			},
		],
	}),
});

function ChatPage() {
  return <ChatLayout />;
}
