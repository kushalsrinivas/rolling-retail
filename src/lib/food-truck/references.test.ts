import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { geometryFor, VEHICLE_GEOMETRY } from "./constants";
import { clearReferenceCache, factoryReference } from "./references";

// A 1x1 PNG — enough for the loader to treat as a real image.
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);

let cwd: string;
let sandbox: string;

beforeEach(async () => {
	sandbox = await mkdtemp(path.join(tmpdir(), "refs-"));
	delete process.env.REFERENCES_DIR;
	cwd = process.cwd();
	process.chdir(sandbox);
	clearReferenceCache();
});

afterEach(() => {
	process.chdir(cwd);
	clearReferenceCache();
});

async function putReference(dir: string, name: string, body: Buffer = PNG) {
	const full = path.join(sandbox, "references", dir);
	await mkdir(full, { recursive: true });
	await writeFile(path.join(full, name), body);
}

describe("factoryReference", () => {
	it("returns null when no photos are on disk", async () => {
		expect(await factoryReference("airstream-m", "airstream")).toBeNull();
	});

	it("prefers the exact vehicle folder", async () => {
		await putReference("airstream-m", "hero.png");
		const ref = await factoryReference("airstream-m", "airstream");
		expect(ref).toMatch(/^data:image\/png;base64,/);
	});

	it("falls back to the body folder when the vehicle has no photo", async () => {
		await putReference("airstream", "any.png");
		expect(await factoryReference("airstream-l", "airstream")).toMatch(
			/^data:image\/png;base64,/,
		);
	});

	it("does not serve one body's photo for another", async () => {
		await putReference("square", "box.png");
		expect(await factoryReference("airstream-m", "airstream")).toBeNull();
	});

	it("skips a reference that is too large to send", async () => {
		await putReference("square", "huge.png", Buffer.alloc(5_000_000, 1));
		expect(await factoryReference("square-4m", "square")).toBeNull();
	});

	it("ignores non-image files", async () => {
		await putReference("square", "notes.txt", Buffer.from("hello"));
		expect(await factoryReference("square-4m", "square")).toBeNull();
	});

	it("refuses a vehicle id that could escape the references folder", async () => {
		await putReference("square", "box.png");
		// Traversal must not resolve; it falls through to the body folder only.
		const ref = await factoryReference("../../../etc", "square");
		expect(ref).toMatch(/^data:image\/png;base64,/);
	});
});

describe("REFERENCES_DIR override", () => {
	it("reads from the directory it names", async () => {
		const elsewhere = await mkdtemp(path.join(tmpdir(), "refs-alt-"));
		await mkdir(path.join(elsewhere, "square"), { recursive: true });
		await writeFile(path.join(elsewhere, "square", "a.png"), PNG);
		process.env.REFERENCES_DIR = elsewhere;
		clearReferenceCache();
		expect(await factoryReference("square-4m", "square")).toMatch(
			/^data:image\/png;base64,/,
		);
		delete process.env.REFERENCES_DIR;
	});
});

describe("vehicle geometry", () => {
	it("describes both bodies", () => {
		expect(Object.keys(VEHICLE_GEOMETRY).sort()).toEqual([
			"airstream",
			"square",
		]);
	});

	it("names the features that drift between views", () => {
		for (const body of ["airstream", "square"] as const) {
			const g = geometryFor(body);
			expect(g).toMatch(/hatch/);
			expect(g).toMatch(/door/);
			expect(g).toMatch(/vent/);
		}
	});

	it("distinguishes a rounded shell from a flat-sided one", () => {
		expect(geometryFor("airstream")).toMatch(/rounded|curved/);
		expect(geometryFor("square")).toMatch(/flat vertical side walls/);
	});
});
