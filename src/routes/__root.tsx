import { Link } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { TRPCRouter } from "#/integrations/trpc/router";
import PostHogProvider from "../integrations/posthog/provider";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	trpc: TRPCOptionsProxy<TRPCRouter>;
}

const SITE_TITLE = "Rolling Retail — design your food truck online";
const SITE_DESCRIPTION =
	"Star the looks you love and get a factory-buildable food truck concept — layout, wrap, estimate and spec — in minutes.";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: SITE_TITLE },
			{ name: "description", content: SITE_DESCRIPTION },
			{ name: "theme-color", content: "#111110" },
			{ property: "og:title", content: SITE_TITLE },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SITE_TITLE },
			{ name: "twitter:description", content: SITE_DESCRIPTION },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "apple-touch-icon", href: "/logo192.png" },
			{ rel: "manifest", href: "/manifest.json" },
		],
	}),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

function NotFound() {
	return (
		<div className="grid min-h-dvh place-items-center bg-[#f7f6f3] px-6 text-stone-900">
			<div className="text-center">
				<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
					Nothing parked here
				</p>
				<h1 className="mt-3 text-4xl font-semibold tracking-tight">
					This page drove off.
				</h1>
				<div className="mt-8 flex items-center justify-center gap-6 text-sm">
					<Link
						to="/"
						className="rounded-sm bg-stone-900 px-5 py-3 font-medium text-stone-50"
					>
						Back home
					</Link>
					<Link to="/chat" className="underline underline-offset-4">
						Open the designer
					</Link>
				</div>
			</div>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				<PostHogProvider>
					<TanStackQueryProvider>{children}</TanStackQueryProvider>
				</PostHogProvider>
				<Scripts />
			</body>
		</html>
	);
}
