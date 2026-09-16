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

					const response = await fetch(fileUrl, { redirect: "error" });
					if (!response.ok) {
						return Response.json(
							{ error: `Failed to fetch file: ${response.status}` },
							{ status: response.status },
						);
					}

					const fileContent = await response.arrayBuffer();
					const contentType =
						response.headers.get("content-type") || "application/octet-stream";
					const filename =
						new URL(fileUrl).pathname.split("/").pop()?.replace(/"/g, "") ||
						"model.glb";

					return new Response(fileContent, {
						headers: {
							"Content-Type": contentType,
							"Content-Disposition": `attachment; filename="${filename}"`,
							"Cache-Control": "no-cache",
						},
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
