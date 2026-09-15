/**
 * Factory reference photos — the base the renders are built on.
 *
 * Every concept starts from a real photograph of a trailer Food Truck Factory
 * has actually built, so the model is restyling a known shell rather than
 * inventing one. Drop files in and they are picked up:
 *
 *   public/references/<vehicleId>/*.{jpg,jpeg,png,webp}
 *   public/references/<body>/*            (airstream | square — used as a
 *                                          fallback for any size of that body)
 *
 * Nothing here is required. With no photos on disk the pipeline behaves
 * exactly as it did before, just without the consistency lock.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Resolved per call — process.cwd() at module load is wrong under test and
 * unreliable on a serverless cold start. */
const root = () => path.join(process.cwd(), "public", "references");
const EXT: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

/** Gemini charges per reference byte; a catalog shot past this is a mistake. */
const MAX_BYTES = 4_000_000;

const cache = new Map<string, string | null>();

async function firstImageIn(dir: string): Promise<string | null> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return null;
	}
	const usable = entries
		.filter((f) => EXT[path.extname(f).toLowerCase()])
		.sort();
	for (const file of usable) {
		try {
			const buf = await readFile(path.join(dir, file));
			if (buf.byteLength > MAX_BYTES) {
				console.warn(
					`[food-truck] reference ${file} is ${Math.round(buf.byteLength / 1e6)}MB, skipping`,
				);
				continue;
			}
			const mime = EXT[path.extname(file).toLowerCase()];
			return `data:${mime};base64,${buf.toString("base64")}`;
		} catch {
			/* try the next one */
		}
	}
	return null;
}

/**
 * The catalog photo for a vehicle: its own folder if there is one, otherwise
 * any photo of the same body. Returns a data URL, or null if none is on disk.
 */
export async function factoryReference(
	vehicleId: string | null | undefined,
	body: "airstream" | "square",
): Promise<string | null> {
	const key = `${vehicleId ?? ""}|${body}`;
	const hit = cache.get(key);
	if (hit !== undefined) return hit;

	let found: string | null = null;
	if (vehicleId && /^[a-z0-9-]+$/.test(vehicleId)) {
		found = await firstImageIn(path.join(root(), vehicleId));
	}
	if (!found) found = await firstImageIn(path.join(root(), body));

	cache.set(key, found);
	if (!found) {
		console.info(
			`[food-truck] no factory reference for ${vehicleId ?? body} — add one at public/references/${vehicleId ?? body}/`,
		);
	}
	return found;
}

/** Test seam: drop the memoised lookups after adding photos in a running dev server. */
export function clearReferenceCache() {
	cache.clear();
}
