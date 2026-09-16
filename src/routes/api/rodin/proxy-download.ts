import { createFileRoute } from "@tanstack/react-router";

/**
 * Rodin hands back signed GLB URLs the browser cannot fetch cross-origin, so
 * we stream them through here. That makes this an outbound fetcher on behalf
 * of anyone who can reach the route, so the target host is allowlisted —
 * otherwise it is an SSRF gadget pointed at our own network.
 *
 * Add the CDN host Rodin actually serves from via RODIN_DOWNLOAD_HOSTS
 * (comma-separated) if a download 403s with "Host not allowed".
 */
const DEFAULT_HOSTS = ["hyper3d.com", "deemos.com", "rodin.ai"];

/** Hosts the operator added explicitly, which may also be served over http. */
function operatorHosts() {
	return (process.env.RODIN_DOWNLOAD_HOSTS ?? "")
		.split(",")
		.map((h) => h.trim().toLowerCase())
		.filter(Boolean);
}

function allowedHosts() {
	return [...DEFAULT_HOSTS, ...operatorHosts()];
}

function isAllowed(raw: string) {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return false;
	}
	const host = parsed.hostname.toLowerCase();
	const matches = (list: string[]) =>
		// Exact match or a subdomain of an allowed apex — never a suffix match,
		// which "evil-hyper3d.com" would pass.
		list.some((h) => host === h || host.endsWith(`.${h}`));

	if (parsed.protocol === "https:") return matches(allowedHosts());

	// Plain http is only ever allowed to a host the operator named themselves in
	// RODIN_DOWNLOAD_HOSTS — for a local stub, or a self-hosted generator on the
	// internal network. The default allowlist stays https-only, so nothing can
	// be talked into fetching http://169.254.169.254 or a neighbouring service.
	if (parsed.protocol === "http:") return matches(operatorHosts());

	return false;
}

export const Route = createFileRoute("/api/rodin/proxy-download")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const fileUrl = new URL(request.url).searchParams.get("url");
					if (!fileUrl) {
						return Response.json(
							{ error: "Missing url parameter" },
							{ status: 400 },
						);
					}
					if (!isAllowed(fileUrl)) {
						return Response.json(
							{ error: "Host not allowed" },
							{ status: 403 },
						);
					}

					const upstream = await fetch(fileUrl, { redirect: "follow" });

					// A redirect could have landed somewhere else entirely, so the
					// host is checked again rather than trusted from before the hop.
					if (upstream.url && !isAllowed(upstream.url)) {
						return Response.json(
							{ error: "Host not allowed" },
							{ status: 403 },
						);
					}

					if (!upstream.ok || !upstream.body) {
						return Response.json(
							{ error: `Failed to fetch file: ${upstream.status}` },
							{ status: upstream.status },
						);
					}

					const filename =
						new URL(fileUrl).pathname.split("/").pop()?.replace(/"/g, "") ||
						"model.glb";

					const headers = new Headers({
						"Content-Type":
							upstream.headers.get("content-type") ||
							"application/octet-stream",
						// inline, not attachment: the viewer loads this, it is not a save.
						"Content-Disposition": `inline; filename="${filename}"`,
						// Never cached. A stream cut short — the viewer unmounting
						// mid-download, a navigation — can leave a partial body in the
						// HTTP cache, and every later load then replays that truncated
						// copy as if it were the whole model. That is what made this work
						// once and fail every time after, while the raw CDN link, which
						// does not go through here, stayed fine.
						"Cache-Control": "no-store",
					});
					// Range support is deliberately not advertised: a cached 206 read
					// back as a complete response is the same truncation by another
					// route, and the loader does not need it.
					const len = upstream.headers.get("content-length");
					if (len) headers.set("content-length", len);

					// Streamed rather than buffered: holding a 14MB model in memory to
					// hand it on is what made this fall over in a serverless function.
					return new Response(upstream.body, {
						status: upstream.status,
						headers,
					});
				} catch (error) {
					console.error("Error in proxy download route:", error);
					return Response.json(
						{ error: "Failed to proxy download" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
