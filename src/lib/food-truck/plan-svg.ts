/**
 * Deterministic plan + curbside elevation as SVG from the design record.
 *
 * The roof plan and side elevation used to be AI-drawn "technical drawings"
 * with hallucinated dimensions and labels. This draws the real box, the
 * real openings and the equipment run from the parametric model, with real
 * dimensions and a "Concept — not for construction" title block.
 *
 * Pure and client-safe — the route serves it, the package embeds it.
 */
import type { DesignSpec } from "./design-record";
import { planGalley } from "./equipment";

function esc(s: string): string {
	return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function ft(m: number): string {
	return `${Math.round(m * 3.28084 * 10) / 10} ft`;
}

/** Top-down roof plan: box, openings on the curbside wall, equipment run. */
export function planSvg(spec: DesignSpec, version: number): string {
	const W = 800;
	const H = 420;
	const pad = 60;
	const scale = (W - pad * 2) / spec.lengthM;
	const boxW = spec.lengthM * scale;
	const boxH = spec.widthM * scale;
	const x0 = pad;
	const y0 = 80;

	const galley = planGalley(spec.equipment, {
		lengthM: spec.lengthM,
		widthM: spec.widthM,
		heightM: spec.heightM,
		body: spec.vehicleBody,
	});

	let equipmentRects = "";
	for (const p of galley.placed) {
		const ex = x0 + p.offsetM * scale;
		const ew = Math.max(3, p.spec.widthM * scale);
		const eh = p.wall === "curbside" ? 26 : 20;
		const ey = p.wall === "curbside" ? y0 : y0 + boxH - eh;
		equipmentRects += `<rect x="${ex.toFixed(1)}" y="${ey.toFixed(1)}" width="${ew.toFixed(1)}" height="${eh}" fill="none" stroke="#2071ba" stroke-width="1.5"/><text x="${(ex + 3).toFixed(1)}" y="${(ey + 13).toFixed(1)}" font-size="8" fill="#0c1424" font-family="sans-serif">${esc(p.spec.label.slice(0, 22))}</text>`;
	}

	let openingsMarks = "";
	for (const o of spec.openings) {
		if (o.side !== "curbside") continue;
		const ox = x0 + o.xFromFront * scale;
		const ow = o.width * scale;
		const color = o.type === "hatch" ? "#e2761f" : "#0a3dad";
		openingsMarks += `<rect x="${ox.toFixed(1)}" y="${(y0 - 12).toFixed(1)}" width="${ow.toFixed(1)}" height="12" fill="${color}" fill-opacity="0.85"/><text x="${ox.toFixed(1)}" y="${(y0 - 15).toFixed(1)}" font-size="9" fill="${color}" font-family="sans-serif">${o.type} ${o.width}m</text>`;
	}

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
		`<rect width="${W}" height="${H}" fill="#ffffff"/>` +
		`<text x="${x0}" y="30" font-size="16" font-weight="800" fill="#0c1424" font-family="sans-serif">${esc(spec.brand || "Unnamed concept")} — roof plan · v${version}</text>` +
		`<text x="${x0}" y="48" font-size="11" fill="#556" font-family="sans-serif">${esc(spec.vehicleId)} · ${spec.lengthM} × ${spec.widthM}m (${ft(spec.lengthM)} × ${ft(spec.widthM)}) · curbside up</text>` +
		`<rect x="${x0}" y="${y0}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="#f2f5fa" stroke="#0c1424" stroke-width="2"/>` +
		openingsMarks +
		equipmentRects +
		`<line x1="${x0}" y1="${(y0 + boxH + 28).toFixed(1)}" x2="${(x0 + boxW).toFixed(1)}" y2="${(y0 + boxH + 28).toFixed(1)}" stroke="#0c1424" stroke-width="1"/>` +
		`<text x="${(x0 + boxW / 2).toFixed(1)}" y="${(y0 + boxH + 44).toFixed(1)}" font-size="11" text-anchor="middle" fill="#0c1424" font-family="sans-serif">${spec.lengthM}m (${ft(spec.lengthM)})</text>` +
		`<text x="${x0}" y="${(H - 28).toFixed(1)}" font-size="10" fill="#666" font-family="sans-serif">Aisle ${galley.aisleM}m · Equipment: ${esc(spec.equipment.slice(0, 6).join(", "))}</text>` +
		`<rect x="${x0}" y="${(H - 22).toFixed(1)}" width="${boxW.toFixed(1)}" height="16" fill="#0c1424"/>` +
		`<text x="${(x0 + 8).toFixed(1)}" y="${(H - 10).toFixed(1)}" font-size="10" font-weight="700" fill="#ffffff" font-family="sans-serif">CONCEPT · v${version} · NOT FOR CONSTRUCTION — openings, equipment and dimensions confirmed by the factory before build.</text>` +
		`</svg>`
	);
}

/** Flat curbside elevation: shell, hatch + door at true positions, livery zones. */
export function elevationSvg(spec: DesignSpec, version: number): string {
	const W = 800;
	const H = 360;
	const pad = 60;
	const scale = (W - pad * 2) / spec.lengthM;
	const boxW = spec.lengthM * scale;
	const boxH = spec.heightM * scale * 0.75;
	const x0 = pad;
	const y0 = 90;
	const rounded = spec.vehicleBody === "airstream";

	let openingsShapes = "";
	for (const o of spec.openings) {
		if (o.side === "rear") continue;
		const ox = x0 + o.xFromFront * scale;
		const ow = o.width * scale;
		if (o.type === "hatch") {
			const oh = 46;
			openingsShapes += `<rect x="${ox.toFixed(1)}" y="${y0.toFixed(1)}" width="${ow.toFixed(1)}" height="${oh}" fill="#fff" stroke="#e2761f" stroke-width="3"/><line x1="${ox.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${(ox + ow).toFixed(1)}" y2="${(y0 - 26).toFixed(1)}" stroke="#e2761f" stroke-width="2"/><text x="${ox.toFixed(1)}" y="${(y0 + oh + 14).toFixed(1)}" font-size="9" fill="#e2761f" font-family="sans-serif">hatch ${o.width}m · sill ${o.sillHeight}m</text>`;
		} else if (o.type === "door") {
			const dh = boxH * 0.85;
			openingsShapes += `<rect x="${ox.toFixed(1)}" y="${(y0 + boxH - dh).toFixed(1)}" width="${Math.max(14, ow * 0.4).toFixed(1)}" height="${dh.toFixed(1)}" fill="#dfe6f2" stroke="#0a3dad" stroke-width="2"/><text x="${ox.toFixed(1)}" y="${(y0 + boxH + 14).toFixed(1)}" font-size="9" fill="#0a3dad" font-family="sans-serif">door ${o.width}m</text>`;
		}
	}

	const primary = spec.palette.primary?.hex ?? "#2a5ec2";
	const body =
		`<rect x="${x0}" y="${y0}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="${rounded ? 40 : 4}" fill="#e8ecf2" stroke="#0c1424" stroke-width="2"/>` +
		`<rect x="${x0}" y="${(y0 + boxH * 0.55).toFixed(1)}" width="${boxW.toFixed(1)}" height="${(boxH * 0.22).toFixed(1)}" fill="${primary}" fill-opacity="0.9"/>`;

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
		`<rect width="${W}" height="${H}" fill="#ffffff"/>` +
		`<text x="${x0}" y="30" font-size="16" font-weight="800" fill="#0c1424" font-family="sans-serif">${esc(spec.brand || "Unnamed concept")} — curbside elevation · v${version}</text>` +
		`<text x="${x0}" y="48" font-size="11" fill="#556" font-family="sans-serif">${esc(spec.vehicleId)} · livery ${esc(spec.liveryTemplateId)} · ${spec.lengthM}m long</text>` +
		body +
		openingsShapes +
		`<circle cx="${(x0 + boxW * 0.5).toFixed(1)}" cy="${(y0 + boxH + 18).toFixed(1)}" r="16" fill="#0c1424"/><circle cx="${(x0 + boxW * 0.5).toFixed(1)}" cy="${(y0 + boxH + 18).toFixed(1)}" r="6" fill="#8a8d91"/>` +
		`<rect x="${x0}" y="${(H - 22).toFixed(1)}" width="${boxW.toFixed(1)}" height="16" fill="#0c1424"/>` +
		`<text x="${(x0 + 8).toFixed(1)}" y="${(H - 10).toFixed(1)}" font-size="10" font-weight="700" fill="#ffffff" font-family="sans-serif">CONCEPT · v${version} · NOT FOR CONSTRUCTION</text>` +
		`</svg>`
	);
}
