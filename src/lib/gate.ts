/**
 * Demo gate — keeps a customer's build off the open web.
 *
 * Each prospect gets their own subdomain (foodtruckfactory.rollingretail.co),
 * and until they go live with us that subdomain is not for anyone else to find
 * or read. This runs in front of every request, pages and API alike, so the
 * agent endpoints are covered too, not just the HTML.
 *
 * Set SITE_PASSWORD to arm it. With the variable unset the site is open, so
 * local development and the public marketing site are unaffected.
 */
import { createMiddleware } from "@tanstack/react-start";

const COOKIE = "rr_gate";
const MAX_AGE = 60 * 60 * 24 * 14;

/** Hex digest of the password, so the cookie never carries the password itself. */
async function tokenFor(password: string) {
	const data = new TextEncoder().encode(`rr-gate:${password}`);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function timingSafeEqual(a: string, b: string) {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

function readCookie(request: Request, name: string) {
	const header = request.headers.get("cookie");
	if (!header) return null;
	for (const part of header.split(";")) {
		const [k, ...rest] = part.trim().split("=");
		if (k === name) return decodeURIComponent(rest.join("="));
	}
	return null;
}

function loginPage(message?: string) {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Rolling Retail</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#09090b;color:#fafafa;
font:400 15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
form{width:100%;max-width:320px}
h1{font-size:19px;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 20px;color:#a1a1aa;font-size:13px}
input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;
border:1px solid rgba(163,130,255,.22);background:#141417;color:#fafafa;font-size:15px}
input:focus{outline:none;border-color:rgba(168,85,247,.6)}
button{width:100%;margin-top:10px;padding:11px;border:0;border-radius:10px;
background:#a855f7;color:#0b0b10;font-weight:600;font-size:14px;cursor:pointer}
button:hover{background:#9333ea}
.err{color:#f87171;font-size:13px;margin:0 0 14px}
</style></head><body>
<form method="POST">
<h1>Rolling Retail</h1>
<p>This preview is private. Enter the access password to continue.</p>
${message ? `<p class="err">${message}</p>` : ""}
<input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" required>
<button type="submit">View preview</button>
</form></body></html>`;
}

const HTML = {
	"Content-Type": "text/html; charset=utf-8",
	"Cache-Control": "no-store",
	"X-Robots-Tag": "noindex, nofollow",
};

export const gateMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next, request }) => {
		const password = process.env.SITE_PASSWORD;
		if (!password) return next();

		const expected = await tokenFor(password);
		const supplied = readCookie(request, COOKIE);
		if (supplied && timingSafeEqual(supplied, expected)) {
			const result = await next();
			// A gated preview must never be indexed, even once someone is in.
			result.response?.headers.set("X-Robots-Tag", "noindex, nofollow");
			return result;
		}

		if (request.method === "POST") {
			const form = await request.formData().catch(() => null);
			const entered = String(form?.get("password") ?? "");
			if (entered && timingSafeEqual(entered, password)) {
				return new Response(null, {
					status: 303,
					headers: {
						Location: new URL(request.url).pathname,
						"Set-Cookie": `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax; Secure`,
						...HTML,
					},
				});
			}
			return new Response(loginPage("That password is not right."), {
				status: 401,
				headers: HTML,
			});
		}

		return new Response(loginPage(), { status: 401, headers: HTML });
	},
);

/** Exported for tests — the decisions that let someone through. */
export const __testing = { tokenFor, timingSafeEqual, readCookie };
