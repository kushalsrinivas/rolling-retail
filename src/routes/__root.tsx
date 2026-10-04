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
import { pageHead, SITE } from "#/lib/site";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => {
		// Site-wide defaults; every page overrides title, description,
		// canonical, OG and JSON-LD through pageHead().
		const base = pageHead({
			title: `${SITE.name} — ${SITE.tagline}`,
			description: SITE.description,
			path: "/",
		});
		return {
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
				{ name: "theme-color", content: SITE.themeColor },
				{ name: "format-detection", content: "telephone=no" },
				...base.meta,
			],
			links: [
				{ rel: "preconnect", href: "https://fonts.googleapis.com" },
				{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap",
				},
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
				{ rel: "manifest", href: "/manifest.json" },
				{ rel: "alternate", type: "text/plain", href: "/llms.txt", title: "LLM-readable site summary" },
				{ rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
			],
		};
	},
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

function NotFound() {
	return (
		<div className="grid min-h-dvh place-items-center bg-[#f7f6f3] px-6 text-stone-900">
			<div className="text-center">
				<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
					404 · Nothing parked here
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
					<Link to="/trucks" className="underline underline-offset-4">
						See the trucks
					</Link>
					<Link to="/resources" className="underline underline-offset-4">
						Read the guides
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
