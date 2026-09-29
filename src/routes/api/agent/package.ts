import { createFileRoute } from "@tanstack/react-router";
import { getBusiness, getVehicle } from "#/lib/food-truck/constants";
import { versionStamp } from "#/lib/food-truck/design-record";
import { powerBudget } from "#/lib/food-truck/equipment";
import { liveryFor } from "#/lib/food-truck/livery";
import { palettePhrase } from "#/lib/food-truck/palette";
import { elevationSvg, planSvg } from "#/lib/food-truck/plan-svg";
import {
	approvalsFor,
	currentDesign,
	getOrCreateSession,
	restoreSession,
} from "#/lib/food-truck/session";

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * Concept package — the fabricator handoff.
 *
 * The spec export was a JSON file labelled "Investor spec" no customer or
 * shop could use. This is a printable HTML package (browser → PDF): hero,
 * elevations, interior, deterministic plan with real dimensions, palette
 * sheet with film references, livery zone map, equipment + power budget,
 * revision history, and fabrication notes — stamped CONCEPT throughout.
 */
export const Route = createFileRoute("/api/agent/package")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId");
				if (!sessionId) {
					return Response.json(
						{ error: "sessionId is required" },
						{ status: 400 },
					);
				}
				await restoreSession(sessionId);
				const s = getOrCreateSession(sessionId);
				const current = currentDesign(s);
				if (!current) {
					return Response.json(
						{ error: "No design version yet." },
						{ status: 409 },
					);
				}
				const spec = current.spec;
				const vehicle = getVehicle(spec.vehicleId);
				const business = getBusiness(spec.businessType);
				const budget = powerBudget(spec.equipment);
				const livery = liveryFor(spec.vehicleBody);
				const stamp = versionStamp(current.version, current.state);
				const approvals = approvalsFor(s);
				const format = url.searchParams.get("format") ?? "html";
				if (format === "json") {
					return Response.json({
						version: current.version,
						state: current.state,
						stamp,
						spec,
						power: budget,
						approvals,
						versions: s.designVersions.map((d) => ({
							version: d.version,
							parentVersion: d.parentVersion,
							changeSummary: d.changeSummary,
							state: d.state,
							createdAt: d.createdAt,
						})),
					});
				}

				const swatch = (
					label: string,
					name: string | null,
					hex: string | null,
					film: string | null,
				) =>
					name && hex
						? `<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="display:inline-block;width:28px;height:28px;border:1px solid #333;background:${esc(hex)}"></span><span><b>${esc(label)}</b> ${esc(name)} · ${esc(hex)} · ${esc(film ?? "")}</span></div>`
						: "";
				const openQuestions = [
					"Final equipment make + model for cut-outs and power (no on-site cutting).",
					"Logo artwork as vector + exact size/position per panel.",
					"Palette confirmed against physical film swatches (screen color is approximate).",
					`Graphics crossing door gaps, rivet lines or compound curves? Keep-outs: ${livery.keepOuts.join("; ")}.`,
					"Roof equipment positions (HVAC, vents, sign mounts) and load.",
					`Service model: ${spec.serveMode} — queue side, ADA considerations.`,
					`Approved version: v${current.version} — ${approvals.length > 0 ? `approved ${new Date(approvals[0].createdAt).toISOString()} by ${esc(approvals[0].by ?? "customer")}` : "NOT YET APPROVED"}.`,
				];

				const html =
					`<!doctype html><html><head><meta charset="utf-8"><title>Concept package — ${esc(spec.brand || "Unnamed")} v${current.version}</title></head><body style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#111">` +
					`<div style="background:#0c1424;color:#fff;padding:8px 12px;font-weight:800">${esc(stamp)}</div>` +
					`<h1>${esc(spec.brand || "Unnamed concept")} — ${esc(business?.label ?? spec.businessType)}</h1>` +
					`<p>${esc(vehicle?.label ?? spec.vehicleId)} · ${spec.lengthM} × ${spec.widthM} × ${spec.heightM}m · ${esc(spec.serveMode)} · Livery: ${esc(livery.label)}</p>` +
					`<h2>Palette (screen approximate — approve against physical swatch)</h2><p>${esc(palettePhrase(spec.palette))}</p>` +
					swatch(
						"Primary",
						spec.palette.primary?.name ?? null,
						spec.palette.primary?.hex ?? null,
						spec.palette.primary?.film ?? null,
					) +
					swatch(
						"Secondary",
						spec.palette.secondary?.name ?? null,
						spec.palette.secondary?.hex ?? null,
						spec.palette.secondary?.film ?? null,
					) +
					swatch(
						"Accent",
						spec.palette.accent?.name ?? null,
						spec.palette.accent?.hex ?? null,
						spec.palette.accent?.film ?? null,
					) +
					swatch(
						"Neutral",
						spec.palette.neutral?.name ?? null,
						spec.palette.neutral?.hex ?? null,
						spec.palette.neutral?.film ?? null,
					) +
					`<h2>Livery zones</h2><ul>${livery.zones.map((z) => `<li><b>${esc(z.label)}</b> — ${esc(z.brief)}</li>`).join("")}</ul><p><i>Keep-outs: ${esc(livery.keepOuts.join("; "))}.</i></p>` +
					`<h2>Plan (deterministic — real dimensions)</h2>${planSvg(spec, current.version)}` +
					`<h2>Curbside elevation (deterministic)</h2>${elevationSvg(spec, current.version)}` +
					`<h2>Equipment + power</h2><ul>${spec.equipment.map((e) => `<li>${esc(e)}</li>`).join("")}</ul><p>Design load ~${budget.designWatts}W (${budget.ampsAt240V}A @ 240V) — supply: <b>${esc(budget.supply)}</b>${budget.overShore ? " — exceeds single shore feed, plan generator or dual feed." : ""}</p>${budget.propaneUnits.length > 0 ? `<p>Cooking heat is propane-fired under extraction, never on the battery or the shore feed: ${esc(budget.propaneUnits.join(", "))}.</p>` : ""}` +
					`<h2>Revision history</h2><ol>${s.designVersions.map((d) => `<li>v${d.version} (${esc(d.state)}) — ${esc(d.changeSummary ?? "initial")} — ${new Date(d.createdAt).toISOString()}</li>`).join("")}</ol>` +
					`<h2>Fabrication notes — open questions for the shop</h2><ol>${openQuestions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` +
					`<div style="background:#0c1424;color:#fff;padding:8px 12px;font-weight:800;margin-top:24px">CONCEPT — REQUIRES FABRICATOR VALIDATION · ${esc(stamp)}</div>` +
					`</body></html>`;
				return new Response(html, {
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
