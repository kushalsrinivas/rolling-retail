import { createFileRoute } from "@tanstack/react-router";
import ChatLayout from "#/components/chat/ChatLayout";
import { designerAppLd, pageHead } from "#/lib/site";

export const Route = createFileRoute("/chat")({
	component: ChatPage,
	head: () =>
		pageHead({
			title: "Design your food trailer online — free",
			description:
				"Answer a three-minute brief and get photoreal concepts of your food trailer, an equipment layout, a wrap plan, a power table, a planning estimate and a spec sheet. Free, no account.",
			path: "/chat",
			jsonLd: [designerAppLd()],
		}),
});

function ChatPage() {
	return <ChatLayout />;
}
