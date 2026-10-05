/**
 * File persistence — designs survive restart, deploy and reload.
 *
 * Sessions lived in a server-memory Map with base64 images in RAM; a reload
 * lost the whole design and serverless could land on a fresh instance.
 * Prisma models (Project/DesignVersion/Asset/Approval) are the Postgres
 * record when DATABASE_URL is set; this file store is the always-on
 * fallback so nothing vanishes without a database. Asset bytes go to
 * data/assets/<id>.<ext> and are served as URLs, never data URLs in RAM.
 *
 * Server-only (node:fs).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function dataRoot(): string {
	return process.env.DATA_DIR
		? path.resolve(process.env.DATA_DIR)
		: path.join(process.cwd(), "data");
}

function sessionsDir(): string {
	return path.join(dataRoot(), "sessions");
}

function assetsDir(): string {
	return path.join(dataRoot(), "assets");
}

async function ensureDirs() {
	await mkdir(sessionsDir(), { recursive: true });
	await mkdir(assetsDir(), { recursive: true });
}

function sessionPath(sessionId: string): string {
	const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
	return path.join(sessionsDir(), `${safe}.json`);
}

/** Best-effort save — persistence must never break generation. */
export async function saveSessionSnapshot(
	sessionId: string,
	snapshot: unknown,
): Promise<void> {
	try {
		await ensureDirs();
		await writeFile(sessionPath(sessionId), JSON.stringify(snapshot));
	} catch (err) {
		console.warn("[food-truck] session snapshot failed:", err);
	}
}

export async function loadSessionSnapshot<T>(
	sessionId: string,
): Promise<T | null> {
	try {
		const raw = await readFile(sessionPath(sessionId), "utf8");
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

const DATA_URL_RE =
	/^data:(image|video)\/([^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/s;

function extFor(mime: string): string {
	if (mime.includes("png")) return "png";
	if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
	if (mime.includes("webp")) return "webp";
	if (mime.includes("mp4")) return "mp4";
	if (mime.includes("webm")) return "webm";
	return "bin";
}

/**
 * Store a data URL as a file, return the public URL path.
 * Small SVGs/placeholders are left inline — only real renders/video move.
 */
export async function storeDataUrl(
	dataUrl: string,
	prefix = "asset",
): Promise<string> {
	const m = dataUrl.match(DATA_URL_RE);
	if (!m?.[3] || m[2] === "svg+xml") return dataUrl;
	// ~200KB cap for inline; larger always goes to disk.
	if (m[3].length < 200_000) return dataUrl;
	try {
		await ensureDirs();
		const id = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
		const ext = extFor(`${m[1]}/${m[2]}`);
		const file = `${id}.${ext}`;
		await writeFile(path.join(assetsDir(), file), Buffer.from(m[3], "base64"));
		return `/api/assets/${file}`;
	} catch (err) {
		console.warn("[food-truck] asset store failed, keeping inline:", err);
		return dataUrl;
	}
}

export async function readAssetFile(
	file: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
	const safe = path.basename(file);
	try {
		const bytes = await readFile(path.join(assetsDir(), safe));
		const ext = path.extname(safe).toLowerCase();
		const mime =
			ext === ".png"
				? "image/png"
				: ext === ".jpg" || ext === ".jpeg"
					? "image/jpeg"
					: ext === ".webp"
						? "image/webp"
						: ext === ".mp4"
							? "video/mp4"
							: ext === ".webm"
								? "video/webm"
								: "application/octet-stream";
		return { bytes, mime };
	} catch {
		return null;
	}
}

export async function listStoredSessions(): Promise<string[]> {
	try {
		const entries = await readdir(sessionsDir());
		return entries.filter((f) => f.endsWith(".json"));
	} catch {
		return [];
	}
}

/**
 * Renders live on disk and travel as URLs.
 *
 * A finished render is ~1 MB of base64. Sent inline, every stream frame,
 * every reconcile and every snapshot carried every image again — and a
 * reverse proxy that buffers or caps frames silently dropped renders the
 * model had actually produced. Rasters are now always written to
 * data/assets and only the short /api/assets/… URL moves around.
 */
export async function persistRender(
	url: string,
	prefix = "render",
): Promise<string> {
	const m = url.match(DATA_URL_RE);
	if (!m?.[3] || m[2] === "svg+xml") return url;
	try {
		await ensureDirs();
		const id = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
		const file = `${id}.${extFor(`${m[1]}/${m[2]}`)}`;
		await writeFile(path.join(assetsDir(), file), Buffer.from(m[3], "base64"));
		return `/api/assets/${file}`;
	} catch (err) {
		console.warn("[food-truck] render store failed, keeping inline:", err);
		return url;
	}
}

/** The bytes behind a stored render, as a data URL — for model references. */
export async function toDataUrl(
	url: string | null | undefined,
): Promise<string | null> {
	if (!url) return null;
	if (url.startsWith("data:")) return url;
	if (!url.startsWith("/api/assets/")) return null;
	const file = await readAssetFile(url.slice("/api/assets/".length));
	if (!file || !file.mime.startsWith("image/")) return null;
	return `data:${file.mime};base64,${file.bytes.toString("base64")}`;
}

/** A view → URL map with every stored render resolved to bytes. */
export async function hydrateReferences(
	byView: Record<string, string>,
): Promise<Record<string, string>> {
	const out: Record<string, string> = {};
	await Promise.all(
		Object.entries(byView).map(async ([view, url]) => {
			const data = await toDataUrl(url);
			if (data) out[view] = data;
		}),
	);
	return out;
}
