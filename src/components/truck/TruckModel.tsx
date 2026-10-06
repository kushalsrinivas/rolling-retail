/**
 * The trailer, built in code from the factory's own dimensions.
 *
 * Nothing is downloaded or generated: the shell comes from VEHICLES, the
 * openings from the same `defaultOpenings` the render prompts quote, the wrap
 * from the same color plan the renders are briefed with, and the fit-out from
 * planGalley. So the model, the renders and the spec sheet describe one
 * trailer — and changing the body, the menu or the palette changes all three.
 *
 * What it looks like:
 *  - Airstream: an elongated capsule with domed nose and tail, polished
 *    aluminium, a belt band clipped exactly to the body.
 *  - Square: a crisp shell with the upper wall / lower third / pinstripe
 *    layout the renders use.
 *  - Real fittings: a top-hinged hatch that animates open, counter shelf,
 *    door with handle, A-frame tongue, wheels with rims, jacks, roof HVAC.
 *  - Stainless equipment with tops, kick plates, door seams and handles.
 *
 * `cutaway` slices the shell at counter height (a clipping plane, not a
 * see-through material) so the line inside reads clearly from any angle.
 */
import { Edges, Html, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { colorPlan } from "#/lib/food-truck/art-direction";
import { axleCount } from "#/lib/food-truck/constants";
import {
	type EquipmentZone,
	type GalleyLayout,
	getEquipment,
	planGalley,
} from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { defaultOpenings } from "#/lib/food-truck/openings";
import { OVERHEAD_Y, partFor } from "./parts";

export interface TruckDimensions {
	lengthM: number;
	widthM: number;
	heightM: number;
	body: VehicleBody;
}

/** Zone colours double as the legend in the configurator. */
export const ZONE_COLOR: Record<EquipmentZone, string> = {
	hot: "#ff5a1f",
	cold: "#2b9fd9",
	service: "#a855f7",
	prep: "#ffc83d",
	sink: "#22c55e",
	storage: "#94a3b8",
};

export type TruckPalette = "zones" | "materials";

const FLOOR_Y = 0.62; // deck height above the ground, metres
/** The Airstream's curved belly continues below the deck, behind the chassis. */
const BELLY = 0.38;
const STAINLESS = { color: "#c9cdd2", metalness: 0.9, roughness: 0.32 };
const STAINLESS_TOP = { color: "#dde1e5", metalness: 0.95, roughness: 0.22 };
const BLACK = "#16161a";

function hexOr(hex: string, fallback: string) {
	return /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
}

/* ── Shell shape ───────────────────────────────────────────────────────── */

/**
 * The shell's shape as numbers, shared by the mesh and everything placed on
 * it, so a hatch, door or unit always meets the skin it was planned for.
 *
 * Both bodies are one lofted superellipse: a cross-section that is boxy with
 * rounded corners, scaled by an end profile that closes the shell at the nose
 * and tail. The Airstream takes a soft section and long domed ends (about
 * 0.6× its height, never more than 30% of its length); the square body takes a near-square section and short,
 * near-flat ends with a small edge radius.
 */
function shellShape(dims: TruckDimensions) {
	const { lengthM: L, widthM: W, heightM: H, body } = dims;
	const air = body === "airstream";
	return {
		a: L / 2,
		b: air ? (H + BELLY) / 2 : H / 2,
		c: W / 2,
		cy: air ? FLOOR_Y + (H - BELLY) / 2 : FLOOR_Y + H / 2,
		endLen: air ? Math.min(L * 0.3, 0.6 * H) : 0.12,
		pe: air ? 2.4 : 6,
		n: air ? 3 : 14,
	};
}
type ShellShape = ReturnType<typeof shellShape>;

/** How much of the full section remains at x: 1 along the body, 0 at the tip. */
function endFactor(s: ShellShape, x: number) {
	const u = Math.max(0, Math.abs(x) - (s.a - s.endLen)) / s.endLen;
	return u >= 1 ? 0 : (1 - u ** s.pe) ** (1 / s.pe);
}

/**
 * Half-width of the skin at height y (local), for curved Airstream walls.
 * Pass x to also follow the domed nose and tail, which pinch in lengthwise.
 * The square body's walls are vertical, so it is the half-width throughout.
 */
function skinZAt(dims: TruckDimensions, y: number, x = 0) {
	if (dims.body !== "airstream") return dims.widthM / 2;
	const s = shellShape(dims);
	const t = Math.min(1, Math.abs(y - s.cy) / s.b);
	return s.c * Math.max(0.0004, endFactor(s, x) ** s.n - t ** s.n) ** (1 / s.n);
}

const RINGS = 96;
/** Wheel radius (a 27 in trailer tyre) and the axle's place, just behind the middle. */
const WHEEL_R = 0.34;
const wheelX = (lengthM: number) => lengthM * 0.08;
/** Axle positions: one just behind the middle, or a tandem pair 0.9 m apart around it. */
const axlesX = (lengthM: number) =>
	axleCount(lengthM) === 2
		? [wheelX(lengthM) - 0.45, wheelX(lengthM) + 0.45]
		: [wheelX(lengthM)];
const SIDES = 72;

/** The point on the shell at length fraction u and angle theta (from the bottom, up the curbside). */
function shellPoint(s: ShellShape, x: number, theta: number, inflate: number) {
	const f = endFactor(s, x);
	const sn = Math.sin(theta);
	const cs = Math.cos(theta);
	const y =
		s.cy + (s.b + inflate) * f * Math.sign(sn) * Math.abs(sn) ** (2 / s.n);
	const z = (s.c + inflate) * f * Math.sign(cs) * Math.abs(cs) ** (2 / s.n);
	return [y, z] as const;
}

function useShellGeometry(dims: TruckDimensions, inflate = 0) {
	return useMemo(() => {
		const s = shellShape(dims);
		const a = s.a + inflate;
		const pos: number[] = [];
		const uv: number[] = [];
		for (let i = 0; i <= RINGS; i++) {
			// Rings crowd toward the ends, where the shell turns fastest.
			const x = a * Math.sin(-Math.PI / 2 + (Math.PI * i) / RINGS);
			for (let j = 0; j <= SIDES; j++) {
				const theta = -Math.PI / 2 + (2 * Math.PI * j) / SIDES;
				const [y, z] = shellPoint(s, (x * s.a) / a, theta, inflate);
				pos.push(x, y, z);
				uv.push((x + a) / (2 * a), j / SIDES);
			}
		}
		const idx: number[] = [];
		const row = SIDES + 1;
		for (let i = 0; i < RINGS; i++) {
			for (let j = 0; j < SIDES; j++) {
				const p0 = i * row + j;
				const p1 = p0 + 1;
				const p2 = p0 + row;
				const p3 = p2 + 1;
				idx.push(p0, p2, p1, p1, p2, p3);
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
		g.setIndex(idx);
		g.computeVertexNormals();
		return g;
	}, [dims, inflate]);
}

/**
 * A mask that cuts the serving hatch out of the shell (an alphaMap read with
 * alphaTest), so the open window shows the lit line inside instead of a
 * painted black panel. Computed in the shell's own uv space, so every layer
 * lofted from the same shape (skin, liner, band) loses the same rectangle.
 */
function useHatchMask(dims: TruckDimensions) {
	return useMemo(() => {
		const s = shellShape(dims);
		const o = defaultOpenings(dims.body, dims.lengthM).find(
			(x) => x.type === "hatch",
		);
		const W = 1024;
		const H = 1024;
		const data = new Uint8Array(W * H * 4).fill(255);
		if (o) {
			const x0 = -dims.lengthM / 2 + o.xFromFront;
			const x1 = x0 + o.width;
			const y0 = FLOOR_Y + o.sillHeight;
			const y1 = y0 + o.height;
			const c0 = Math.max(0, Math.floor(((x0 + s.a) / (2 * s.a)) * W));
			const c1 = Math.min(W - 1, Math.ceil(((x1 + s.a) / (2 * s.a)) * W));
			for (let r = 0; r < H; r++) {
				const theta = -Math.PI / 2 + (2 * Math.PI * (r + 0.5)) / H;
				if (Math.cos(theta) <= 0) continue;
				for (let col = c0; col <= c1; col++) {
					const x = -s.a + (2 * s.a * (col + 0.5)) / W;
					if (x < x0 || x > x1) continue;
					const [y] = shellPoint(s, x, theta, 0);
					if (y > y0 && y < y1) {
						const k = (r * W + col) * 4;
						data[k] = data[k + 1] = data[k + 2] = 0;
					}
				}
			}
		}
		// Wheel wells, both sides: the skin stops in an arch over each wheel.
		const xs = axlesX(dims.lengthM);
		const wr = WHEEL_R + 0.07;
		const w0 = Math.max(0, Math.floor(((xs[0] - wr + s.a) / (2 * s.a)) * W));
		const w1 = Math.min(
			W - 1,
			Math.ceil(((xs[xs.length - 1] + wr + s.a) / (2 * s.a)) * W),
		);
		// A tandem pair shares one long well: the distance is measured to the
		// segment between the two axles, which makes a stadium-shaped opening.
		const ax0 = xs[0];
		const ax1 = xs[xs.length - 1];
		for (let r = 0; r < H; r++) {
			const theta = -Math.PI / 2 + (2 * Math.PI * (r + 0.5)) / H;
			for (let col = w0; col <= w1; col++) {
				const x = -s.a + (2 * s.a * (col + 0.5)) / W;
				const [y] = shellPoint(s, x, theta, 0);
				const ax = Math.min(ax1, Math.max(ax0, x));
				if ((x - ax) ** 2 + (y - WHEEL_R) ** 2 < wr * wr) {
					const k = (r * W + col) * 4;
					data[k] = data[k + 1] = data[k + 2] = 0;
				}
			}
		}
		const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
		t.magFilter = THREE.LinearFilter;
		t.minFilter = THREE.LinearFilter;
		t.needsUpdate = true;
		return t;
	}, [dims]);
}

/**
 * Riveted aluminium: vertical panel seams with rivet rows along them and a
 * horizontal seam every panel course, as a bump map, plus a slightly
 * different roughness per panel, the way real sheets catch the light.
 */
function usePanelMaps(lengthM: number) {
	return useMemo(() => {
		const W = 1024;
		const H = 512;
		const cols = 4;
		const rows = 7;
		const bump = document.createElement("canvas");
		bump.width = W;
		bump.height = H;
		const g = bump.getContext("2d") as CanvasRenderingContext2D;
		g.fillStyle = "rgb(128,128,128)";
		g.fillRect(0, 0, W, H);
		const rough = document.createElement("canvas");
		rough.width = W;
		rough.height = H;
		const r = rough.getContext("2d") as CanvasRenderingContext2D;
		let seed = 7;
		const rand = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		for (let i = 0; i < cols; i++) {
			for (let k = 0; k < rows; k++) {
				const shade = 70 + Math.round(rand() * 50);
				r.fillStyle = `rgb(${shade},${shade},${shade})`;
				r.fillRect((i * W) / cols, (k * H) / rows, W / cols, H / rows);
			}
		}
		g.fillStyle = "rgb(70,70,70)";
		for (let i = 0; i <= cols; i++) g.fillRect((i * W) / cols - 1.5, 0, 3, H);
		for (let k = 0; k <= rows; k++) g.fillRect(0, (k * H) / rows - 1, W, 2);
		g.fillStyle = "rgb(205,205,205)";
		for (let i = 0; i <= cols; i++) {
			for (let y = 6; y < H; y += 11) {
				g.beginPath();
				g.arc((i * W) / cols + 6, y, 2.1, 0, Math.PI * 2);
				g.fill();
			}
		}
		const bumpMap = new THREE.CanvasTexture(bump);
		const roughnessMap = new THREE.CanvasTexture(rough);
		for (const t of [bumpMap, roughnessMap]) {
			t.wrapS = THREE.RepeatWrapping;
			t.wrapT = THREE.RepeatWrapping;
			t.repeat.set(Math.max(1, lengthM / 3.2), 1);
			t.anisotropy = 4;
		}
		return { bumpMap, roughnessMap };
	}, [lengthM]);
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

/** Two clipping planes keeping only lo < y < hi. Planes live in world space; the model group is offset by yOffset. */
function between(lo: number, hi: number, yOffset: number) {
	return [
		new THREE.Plane(new THREE.Vector3(0, 1, 0), -(lo + yOffset)),
		new THREE.Plane(new THREE.Vector3(0, -1, 0), hi + yOffset),
	];
}

function Shell({
	dims,
	colors,
	finishRoughness,
	clipTop,
}: {
	dims: TruckDimensions;
	colors: ReturnType<typeof colorPlan>;
	finishRoughness: number;
	clipTop: THREE.Plane | null;
}) {
	const { heightM: H, body } = dims;
	const yOffset = -(FLOOR_Y + H) / 2;
	const planes = clipTop ? [clipTop] : [];
	const skin = useShellGeometry(dims);
	const bandGeo = useShellGeometry(dims, 0.012);
	const stripeGeo = useShellGeometry(dims, 0.016);
	const mask = useHatchMask(dims);
	const panels = usePanelMaps(dims.lengthM);
	const air = body === "airstream";

	const sill = FLOOR_Y + 1.05; // counter height
	const lower = FLOOR_Y + H * 0.38; // the square body's lower third
	const bandPlanes = useMemo(
		() =>
			air
				? between(sill - 0.05, sill + 0.3, yOffset)
				: between(-5, lower, yOffset),
		[air, sill, lower, yOffset],
	);
	const stripePlanes = useMemo(
		() =>
			air
				? between(sill + 0.3, sill + 0.34, yOffset)
				: between(lower, lower + 0.04, yOffset),
		[air, sill, lower, yOffset],
	);

	const cut = { alphaMap: mask, alphaTest: 0.5 };
	return (
		<group>
			<mesh geometry={skin} castShadow receiveShadow>
				{air ? (
					<meshPhysicalMaterial
						color="#d6dbe0"
						metalness={1}
						roughness={1}
						roughnessMap={panels.roughnessMap}
						bumpMap={panels.bumpMap}
						bumpScale={0.6}
						envMapIntensity={1.25}
						clippingPlanes={planes}
						{...cut}
					/>
				) : (
					<meshPhysicalMaterial
						color={hexOr(colors.base.hex, "#f5f5f5")}
						roughness={finishRoughness}
						metalness={0.05}
						clearcoat={0.55}
						clearcoatRoughness={0.18}
						clippingPlanes={planes}
						{...cut}
					/>
				)}
			</mesh>
			{/* interior liner: matte white wall panels, seen through the cut and the hatch */}
			<mesh geometry={skin} scale={[0.99, 0.985, 0.96]}>
				<meshStandardMaterial
					color="#f1efe9"
					roughness={0.85}
					side={THREE.BackSide}
					clippingPlanes={planes}
					{...cut}
				/>
			</mesh>
			<mesh geometry={bandGeo}>
				<meshPhysicalMaterial
					color={hexOr(colors.band.hex, "#ff5a1f")}
					roughness={finishRoughness}
					metalness={0.08}
					clearcoat={0.6}
					clearcoatRoughness={0.15}
					clippingPlanes={[...bandPlanes, ...planes]}
					side={THREE.DoubleSide}
					{...cut}
				/>
			</mesh>
			<mesh geometry={stripeGeo}>
				<meshStandardMaterial
					color={hexOr(colors.trim.hex, BLACK)}
					roughness={0.5}
					clippingPlanes={[...stripePlanes, ...planes]}
					side={THREE.DoubleSide}
					{...cut}
				/>
			</mesh>
			{!air && (
				// drip rail
				<mesh position={[0, FLOOR_Y + H - 0.02, 0]}>
					<boxGeometry args={[dims.lengthM + 0.02, 0.03, dims.widthM + 0.02]} />
					<meshStandardMaterial {...STAINLESS} clippingPlanes={planes} />
				</mesh>
			)}
		</group>
	);
}

/* ── Openings ─────────────────────────────────────────────────────────── */

function Hatch({
	dims,
	open,
	trim,
	skinColor,
	clipTop,
	hidePanel = false,
}: {
	dims: TruckDimensions;
	open: boolean;
	trim: string;
	/** The square body's paint, so the door reads as part of the wall. */
	skinColor?: string;
	clipTop: THREE.Plane | null;
	hidePanel?: boolean;
}) {
	const o = defaultOpenings(dims.body, dims.lengthM).find(
		(x) => x.type === "hatch",
	);
	const panel = useRef<THREE.Group>(null);
	useFrame((_, dt) => {
		if (!panel.current) return;
		const target = open ? -1.42 : 0;
		panel.current.rotation.x = THREE.MathUtils.damp(
			panel.current.rotation.x,
			target,
			5,
			dt,
		);
	});
	if (!o) return null;
	const w = o.width;
	const h = o.height;
	const x = -dims.lengthM / 2 + o.xFromFront + w / 2;
	const sillY = FLOOR_Y + o.sillHeight;
	const topY = sillY + h;
	const z = skinZAt(dims, sillY + h / 2) + 0.006;
	const planes = clipTop ? [clipTop] : [];
	const frame = hexOr(trim, BLACK);
	return (
		<group>
			{/* frame */}
			{[
				[x, topY, w + 0.08, 0.05],
				[x, sillY, w + 0.08, 0.05],
			].map(([fx, fy, fw, fh]) => (
				<mesh key={`h-${fy}`} position={[fx, fy, z + 0.01]}>
					<boxGeometry args={[fw, fh, 0.03]} />
					<meshStandardMaterial
						color={frame}
						roughness={0.5}
						clippingPlanes={planes}
					/>
				</mesh>
			))}
			{[x - w / 2, x + w / 2].map((fx) => (
				<mesh key={`v-${fx}`} position={[fx, sillY + h / 2, z + 0.01]}>
					<boxGeometry args={[0.05, h + 0.05, 0.03]} />
					<meshStandardMaterial
						color={frame}
						roughness={0.5}
						clippingPlanes={planes}
					/>
				</mesh>
			))}
			{/* counter shelf */}
			<mesh position={[x, sillY - 0.02, z + 0.15]} castShadow>
				<boxGeometry args={[w + 0.1, 0.035, 0.3]} />
				<meshStandardMaterial {...STAINLESS_TOP} clippingPlanes={planes} />
			</mesh>
			{/* hatch door, hinged on its top edge — hidden in the cutaway, where it
			    would hang straight across the view into the line */}
			<group
				ref={panel}
				visible={!hidePanel}
				position={[x, topY, z + 0.02]}
				rotation={[open ? -1.42 : 0, 0, 0]}
			>
				<mesh position={[0, -h / 2, 0.015]} castShadow>
					<boxGeometry args={[w + 0.06, h + 0.04, 0.035]} />
					{dims.body === "airstream" ? (
						<meshPhysicalMaterial
							color="#d6dbe0"
							metalness={1}
							roughness={0.22}
							clippingPlanes={planes}
						/>
					) : (
						<meshPhysicalMaterial
							color={hexOr(skinColor ?? "", "#f5f5f5")}
							roughness={0.3}
							metalness={0.05}
							clearcoat={0.5}
							clippingPlanes={planes}
						/>
					)}
				</mesh>
				{/* gas struts, door to frame */}
				{[-w / 2 + 0.08, w / 2 - 0.08].map((sx) => (
					<mesh
						key={sx}
						position={[sx, -h * 0.5, -0.24]}
						rotation={[-0.62, 0, 0]}
					>
						<cylinderGeometry args={[0.009, 0.009, h * 0.62, 8]} />
						<meshStandardMaterial {...STAINLESS} clippingPlanes={planes} />
					</mesh>
				))}
			</group>
			{/* warm light from inside */}
			{open && (
				<pointLight
					position={[x, sillY + h * 0.6, z - 0.5]}
					intensity={3}
					distance={3.5}
					color="#ffd7a0"
				/>
			)}
		</group>
	);
}

/**
 * A curbside door that follows the skin it is cut into: a curved panel a few
 * millimetres proud of the shell, a dark gasket around it, a window in its
 * top third and a stainless handle. On an Airstream it bends with the wall
 * instead of standing off it as a flat slab.
 */
function SkinDoor({
	dims,
	x0,
	x1,
	y0,
	y1,
	color,
	planes,
}: {
	dims: TruckDimensions;
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	color: string;
	planes: THREE.Plane[];
}) {
	const air = dims.body === "airstream";
	const patch = (
		ax: number,
		bx: number,
		ay: number,
		by: number,
		out: number,
	) => {
		const nx = 6;
		const ny = 18;
		const pos: number[] = [];
		const idx: number[] = [];
		for (let j = 0; j <= ny; j++) {
			for (let i = 0; i <= nx; i++) {
				const x = ax + ((bx - ax) * i) / nx;
				const y = ay + ((by - ay) * j) / ny;
				pos.push(x, y, skinZAt(dims, y, x) + out);
			}
		}
		for (let j = 0; j < ny; j++) {
			for (let i = 0; i < nx; i++) {
				const p0 = j * (nx + 1) + i;
				idx.push(p0, p0 + 1, p0 + nx + 1, p0 + 1, p0 + nx + 2, p0 + nx + 1);
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		return g;
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: patch reads only these inputs
	const geo = useMemo(() => {
		const e = 0.022;
		const wy0 = y0 + (y1 - y0) * 0.64;
		return {
			gasket: patch(x0 - e, x1 + e, y0 - e, y1 + e, 0.004),
			panel: patch(x0, x1, y0, y1, 0.009),
			window: patch(x0 + 0.1, x1 - 0.1, wy0, y1 - 0.12, 0.013),
		};
	}, [dims, x0, x1, y0, y1]);
	const hy = y0 + (y1 - y0) * 0.48;
	const hx = x1 - 0.1;
	return (
		<group>
			<mesh geometry={geo.gasket}>
				<meshStandardMaterial
					color={BLACK}
					roughness={0.7}
					clippingPlanes={planes}
				/>
			</mesh>
			<mesh geometry={geo.panel}>
				{air ? (
					<meshPhysicalMaterial
						color="#d6dbe0"
						metalness={1}
						roughness={0.24}
						clippingPlanes={planes}
					/>
				) : (
					<meshPhysicalMaterial
						color={color}
						roughness={0.35}
						metalness={0.05}
						clearcoat={0.5}
						clippingPlanes={planes}
					/>
				)}
			</mesh>
			<mesh geometry={geo.window}>
				<meshPhysicalMaterial
					color="#1b2026"
					metalness={0.2}
					roughness={0.06}
					clearcoat={1}
					clippingPlanes={planes}
				/>
			</mesh>
			<mesh position={[hx, hy, skinZAt(dims, hy, hx) + 0.035]}>
				<boxGeometry args={[0.03, 0.16, 0.04]} />
				<meshStandardMaterial {...STAINLESS_TOP} clippingPlanes={planes} />
			</mesh>
		</group>
	);
}

function Doors({
	dims,
	color,
	clipTop,
}: {
	dims: TruckDimensions;
	color: string;
	clipTop: THREE.Plane | null;
}) {
	const planes = clipTop ? [clipTop] : [];
	const openings = defaultOpenings(dims.body, dims.lengthM).filter(
		(o) => o.type === "door",
	);
	return (
		<group>
			{openings.map((o) => {
				if (o.side === "rear") {
					return (
						<group
							key="rear"
							position={[
								dims.lengthM / 2 + 0.008,
								FLOOR_Y + o.height / 2 + 0.05,
								0,
							]}
							rotation={[0, Math.PI / 2, 0]}
						>
							<mesh>
								<planeGeometry args={[o.width, o.height]} />
								<meshStandardMaterial
									color={color}
									roughness={0.45}
									clippingPlanes={planes}
								/>
							</mesh>
							<mesh position={[o.width * 0.35, 0, 0.03]}>
								<boxGeometry args={[0.03, 0.16, 0.04]} />
								<meshStandardMaterial {...STAINLESS_TOP} />
							</mesh>
						</group>
					);
				}
				const x0 = -dims.lengthM / 2 + o.xFromFront;
				return (
					<SkinDoor
						key={`${o.side}-${o.xFromFront}`}
						dims={dims}
						x0={x0}
						x1={x0 + o.width}
						y0={FLOOR_Y + 0.05}
						y1={FLOOR_Y + 0.05 + o.height}
						color={color}
						planes={planes}
					/>
				);
			})}
		</group>
	);
}

/* ── Running gear and roof ────────────────────────────────────────────── */

function RunningGear({ dims }: { dims: TruckDimensions }) {
	const { lengthM: L, widthM: W } = dims;
	const xs = axlesX(L);
	const mid = (xs[0] + xs[xs.length - 1]) / 2;
	const span = xs[xs.length - 1] - xs[0];
	const frontX = -L / 2;
	const air = dims.body === "airstream";
	return (
		<group>
			{/* chassis + belly pan */}
			<mesh position={[0, FLOOR_Y - 0.1, 0]} castShadow receiveShadow>
				<boxGeometry args={[L * 0.92, 0.16, W * 0.78]} />
				<meshStandardMaterial color="#202024" roughness={0.85} />
			</mesh>
			{/* wheels */}
			{xs.flatMap((axleX) =>
				[1, -1].map((s) => (
					<group
						key={`${axleX}-${s}`}
						position={[axleX, WHEEL_R, s * (W / 2 - 0.1)]}
						rotation={[Math.PI / 2, 0, 0]}
					>
						<mesh castShadow>
							<cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.22, 40]} />
							<meshStandardMaterial color="#141417" roughness={0.92} />
						</mesh>
						{/* sidewall, slightly lighter, so the tyre reads as rubber not a disc */}
						<mesh position={[0, s * 0.111, 0]} rotation={[Math.PI / 2, 0, 0]}>
							<ringGeometry args={[0.21, WHEEL_R - 0.015, 40]} />
							<meshStandardMaterial
								color="#25252a"
								roughness={0.85}
								side={THREE.DoubleSide}
							/>
						</mesh>
						<mesh position={[0, s * 0.112, 0]}>
							<cylinderGeometry args={[0.2, 0.2, 0.01, 24]} />
							<meshStandardMaterial
								color="#b9bec4"
								metalness={0.9}
								roughness={0.3}
							/>
						</mesh>
					</group>
				)),
			)}
			{/* wheel arches: a rounded arch on the Airstream, a square fender on the box */}
			{[1, -1].map((s) =>
				air ? (
					<mesh
						key={`f${s}`}
						position={[mid, WHEEL_R, s * (W / 2 - 0.1)]}
						// The half-cylinder opens downward, over the wheel.
						rotation={[-Math.PI / 2, 0, 0]}
						scale={[1 + span / (2 * (WHEEL_R + 0.08)), 1, 1]}
						castShadow
					>
						<cylinderGeometry
							args={[
								WHEEL_R + 0.08,
								WHEEL_R + 0.08,
								0.3,
								40,
								1,
								true,
								-Math.PI / 2,
								Math.PI,
							]}
						/>
						<meshPhysicalMaterial
							color="#d6dbe0"
							metalness={1}
							roughness={0.25}
							side={THREE.DoubleSide}
						/>
					</mesh>
				) : (
					<group key={`f${s}`} position={[mid, 0, s * (W / 2 + 0.005)]}>
						<mesh position={[0, WHEEL_R * 2 + 0.06, 0]} castShadow>
							<boxGeometry args={[0.98 + span, 0.035, 0.27]} />
							<meshStandardMaterial
								color={BLACK}
								roughness={0.55}
								metalness={0.3}
							/>
						</mesh>
						{[-1, 1].map((e) => (
							<mesh
								key={e}
								position={[e * (0.47 + span / 2), WHEEL_R * 1.55, 0]}
							>
								<boxGeometry args={[0.035, WHEEL_R * 0.95, 0.27]} />
								<meshStandardMaterial
									color={BLACK}
									roughness={0.55}
									metalness={0.3}
								/>
							</mesh>
						))}
					</group>
				),
			)}
			{/* A-frame tongue + coupler + jack */}
			{[1, -1].map((s) => {
				const from = new THREE.Vector3(
					frontX + 0.1,
					FLOOR_Y - 0.12,
					s * W * 0.32,
				);
				const to = new THREE.Vector3(frontX - 1.05, FLOOR_Y - 0.12, 0);
				const mid = from.clone().add(to).multiplyScalar(0.5);
				const len = from.distanceTo(to);
				const angle = Math.atan2(to.z - from.z, to.x - from.x);
				return (
					<mesh
						key={`t${s}`}
						position={mid}
						rotation={[0, -angle, 0]}
						castShadow
					>
						<boxGeometry args={[len, 0.08, 0.08]} />
						<meshStandardMaterial
							color={BLACK}
							metalness={0.5}
							roughness={0.5}
						/>
					</mesh>
				);
			})}
			<mesh position={[frontX - 1.12, FLOOR_Y - 0.1, 0]} castShadow>
				<sphereGeometry args={[0.07, 16, 16]} />
				<meshStandardMaterial color="#3a3a40" metalness={0.8} roughness={0.3} />
			</mesh>
			<mesh position={[frontX - 0.75, FLOOR_Y / 2 - 0.05, 0]} castShadow>
				<cylinderGeometry args={[0.035, 0.035, FLOOR_Y, 10]} />
				<meshStandardMaterial
					color="#9aa0a6"
					metalness={0.8}
					roughness={0.35}
				/>
			</mesh>
			{/* stabilizer jacks */}
			{[
				[-L * 0.42, W * 0.32],
				[-L * 0.42, -W * 0.32],
				[L * 0.42, W * 0.32],
				[L * 0.42, -W * 0.32],
			].map(([x, z]) => (
				<group key={`${x}-${z}`}>
					<mesh position={[x, (FLOOR_Y - 0.12) / 2, z]} castShadow>
						<boxGeometry args={[0.05, FLOOR_Y - 0.12, 0.05]} />
						<meshStandardMaterial
							color={BLACK}
							metalness={0.4}
							roughness={0.5}
						/>
					</mesh>
					<mesh position={[x, 0.01, z]}>
						<boxGeometry args={[0.16, 0.02, 0.16]} />
						<meshStandardMaterial color="#2a2a2e" />
					</mesh>
				</group>
			))}
		</group>
	);
}

function Roof({
	dims,
	clipped,
	planes,
}: {
	dims: TruckDimensions;
	clipped: boolean;
	planes: THREE.Plane[];
}) {
	if (clipped) return null;
	const roofY = FLOOR_Y + dims.heightM;
	return (
		<group>
			{/* rooftop air conditioner: a moulded shroud with a dark grille along each side */}
			<group position={[-dims.lengthM * 0.05, roofY + 0.02, 0]}>
				<RoundedBox
					args={[0.98, 0.27, 0.74]}
					radius={0.09}
					smoothness={4}
					position={[0, 0.13, 0]}
					castShadow
				>
					<meshPhysicalMaterial
						color="#eeeeea"
						roughness={0.42}
						clearcoat={0.3}
						clippingPlanes={planes}
					/>
				</RoundedBox>
				{[1, -1].map((sz) => (
					<mesh key={sz} position={[0, 0.12, sz * 0.372]}>
						<boxGeometry args={[0.7, 0.12, 0.01]} />
						<meshStandardMaterial
							color="#2a2c30"
							roughness={0.8}
							clippingPlanes={planes}
						/>
					</mesh>
				))}
			</group>
			{/* roof vents: low domed covers */}
			{[dims.lengthM * 0.28, -dims.lengthM * 0.3].map((x) => (
				<mesh
					key={x}
					position={[x, roofY - 0.02, dims.widthM * 0.16]}
					scale={[1, 0.45, 1]}
					castShadow
				>
					<sphereGeometry
						args={[0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
					/>
					<meshPhysicalMaterial
						color="#e9e9e6"
						roughness={0.5}
						clearcoat={0.2}
						clippingPlanes={planes}
					/>
				</mesh>
			))}
		</group>
	);
}

/* ── Equipment ────────────────────────────────────────────────────────── */

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
	);
}

/** One unit: drops into place when it is added, outlined when active. */
/**
 * Draws a static part as one mesh per material instead of one per piece. An
 * espresso machine is a few dozen boxes and cylinders; merged, it costs a
 * handful of draw calls, which is what keeps a full galley smooth on a phone.
 * Parts carry no textures, handlers or animation, so only position and normal
 * are kept, and the originals stay mounted but hidden.
 */
function MergeStatic({ children }: { children: React.ReactNode }) {
	const src = useRef<THREE.Group>(null);
	const out = useRef<THREE.Group>(null);
	useLayoutEffect(() => {
		const g = src.current;
		const o = out.current;
		if (!g || !o) return;
		g.updateWorldMatrix(true, true);
		const inv = g.matrixWorld.clone().invert();
		const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
		g.traverse((m) => {
			if (!(m instanceof THREE.Mesh) || Array.isArray(m.material)) return;
			let geo = m.geometry.clone() as THREE.BufferGeometry;
			geo.applyMatrix4(
				new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld),
			);
			if (geo.index) geo = geo.toNonIndexed();
			for (const k of Object.keys(geo.attributes)) {
				if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
			}
			const list = buckets.get(m.material) ?? [];
			list.push(geo);
			buckets.set(m.material, list);
		});
		const made: THREE.Mesh[] = [];
		for (const [mat, list] of buckets) {
			const merged = mergeGeometries(list);
			for (const l of list) l.dispose();
			if (!merged) continue;
			const mesh = new THREE.Mesh(merged, mat);
			mesh.castShadow = true;
			o.add(mesh);
			made.push(mesh);
		}
		if (made.length) g.visible = false;
		return () => {
			for (const m of made) {
				o.remove(m);
				m.geometry.dispose();
			}
			g.visible = true;
		};
	}, []);
	return (
		<>
			<group ref={src}>{children}</group>
			<group ref={out} />
		</>
	);
}

function Unit({
	children,
	name,
	position,
	w,
	h,
	d,
	highlight,
	handlers,
	label,
}: {
	children: React.ReactNode;
	/** `unit-<equipment id>`, so a camera can find the unit in the scene. */
	name: string;
	position: [number, number, number];
	w: number;
	h: number;
	d: number;
	highlight: boolean;
	handlers: Record<string, (e: { stopPropagation: () => void }) => void>;
	label: React.ReactNode;
}) {
	const ref = useRef<THREE.Group>(null);
	const still = useMemo(prefersReducedMotion, []);
	useFrame((_, dt) => {
		const g = ref.current;
		if (!g || still) return;
		g.position.y = THREE.MathUtils.damp(g.position.y, position[1], 7, dt);
		const s = THREE.MathUtils.damp(g.scale.x, 1, 7, dt);
		g.scale.setScalar(s);
	});
	return (
		<group
			ref={ref}
			name={name}
			position={[
				position[0],
				still ? position[1] : position[1] + 0.9,
				position[2],
			]}
			scale={still ? 1 : 0.55}
		>
			{children}
			{/* invisible hit box: hover, click and the outline */}
			<mesh position={[0, h / 2, 0]} {...handlers}>
				<boxGeometry args={[w + 0.02, h + 0.02, d + 0.02]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
				{highlight && <Edges color="#ff5a1f" />}
			</mesh>
			{label}
		</group>
	);
}

function EquipmentUnits({
	layout,
	dims,
	selectedId,
	hoveredId,
	onSelect,
	onHover,
	palette,
	showLabels,
	cutaway = false,
	roofUp = true,
}: {
	layout: GalleyLayout;
	dims: TruckDimensions;
	selectedId?: string | null;
	hoveredId?: string | null;
	onSelect?: (id: string | null) => void;
	onHover?: (id: string | null) => void;
	palette: TruckPalette;
	showLabels: boolean;
	cutaway?: boolean;
	roofUp?: boolean;
}) {
	const { lengthM, widthM } = dims;
	const runStart = -lengthM / 2 + layout.marginM;
	return (
		<group>
			{layout.placed.map((p) => {
				const { spec } = p;
				const mount = spec.mount ?? "floor";
				if (mount === "subfloor") return null;
				// Overhead units hang from the roof: with the walls cut away or not
				// yet built they would float in mid-air.
				if (mount === "overhead" && (cutaway || !roofUp)) return null;
				const Part = partFor(spec.id);
				const w = spec.widthM;
				const d = spec.depthM;
				const zSign = p.wall === "curbside" ? 1 : -1;
				// Against the wall at the unit's own height: an Airstream's skin
				// curves in toward the roof, so overhead units sit further inboard.
				// Check the tightest corner — the top, at the end nearest a dome.
				const x = runStart + p.offsetM + w / 2;
				const topY =
					mount === "overhead"
						? FLOOR_Y + (OVERHEAD_Y[spec.id] ?? 1.8) + spec.heightM + 0.15
						: FLOOR_Y + Math.max(0.9, spec.heightM + 0.05);
				// The wall is narrowest at one of the unit's corners: near the floor
				// (where an Airstream's belly curves in), at its top (the roof
				// shoulder) or at the end nearest a dome. Check them all, so no
				// cabinet ever pokes through the skin.
				const outerX = Math.abs(x) + w / 2;
				const bottomY =
					mount === "overhead" ? topY - spec.heightM - 0.15 : FLOOR_Y + 0.02;
				const inner = Math.min(
					widthM / 2,
					...[bottomY, (bottomY + topY) / 2, topY].map((yy) =>
						skinZAt(dims, yy, outerX),
					),
				);
				const z = zSign * Math.max(0, inner - d / 2 - 0.05);
				const face = -zSign as 1 | -1;
				const h =
					mount === "overhead"
						? spec.heightM
						: mount === "counter"
							? 0.9 + spec.heightM
							: Math.max(spec.heightM, 0.9);
				const y =
					mount === "overhead"
						? FLOOR_Y + (OVERHEAD_Y[spec.id] ?? 1.8)
						: FLOOR_Y + 0.02;
				const active = selectedId === spec.id;
				const hover = hoveredId === spec.id;
				const accent = ZONE_COLOR[spec.zone];
				const handlers = {
					onClick: (e: { stopPropagation: () => void }) => {
						e.stopPropagation();
						onSelect?.(active ? null : spec.id);
					},
					onPointerOver: (e: { stopPropagation: () => void }) => {
						e.stopPropagation();
						onHover?.(spec.id);
						document.body.style.cursor = "pointer";
					},
					onPointerOut: () => {
						onHover?.(null);
						document.body.style.cursor = "";
					},
				};
				return (
					<Unit
						key={`${spec.id}-${p.wall}-${p.offsetM}`}
						name={`unit-${spec.id}`}
						position={[x, y, z]}
						w={w}
						h={h}
						d={d}
						highlight={active || hover}
						handlers={handlers}
						label={
							showLabels && (active || hover) ? (
								<Html
									position={[0, h + 0.45, 0]}
									center
									distanceFactor={8}
									zIndexRange={[20, 0]}
								>
									<div
										style={{
											background: "#17130f",
											color: "#fff6e9",
											padding: "6px 10px",
											borderRadius: 999,
											fontSize: 12,
											fontWeight: 700,
											whiteSpace: "nowrap",
											border: "2px solid #ff5a1f",
											fontFamily: "Inter, system-ui, sans-serif",
										}}
									>
										{spec.label}
										{spec.fuel === "propane"
											? " · propane"
											: spec.watts > 0
												? ` · ${(spec.watts / 1000).toFixed(1)} kW`
												: ""}
									</div>
								</Html>
							) : null
						}
					>
						<MergeStatic>
							<Part w={w} d={d} h={spec.heightM} face={face} />
						</MergeStatic>
						{palette === "zones" && mount !== "overhead" && (
							<mesh position={[0, 0.82, face * (d / 2 + 0.004)]}>
								<boxGeometry args={[w - 0.06, 0.025, 0.004]} />
								<meshStandardMaterial
									color={accent}
									emissive={accent}
									emissiveIntensity={0.4}
								/>
							</mesh>
						)}
					</Unit>
				);
			})}
		</group>
	);
}

/* ── Features and lettering ───────────────────────────────────────────── */

function useWordmarkTexture(text: string, color: string) {
	return useMemo(() => {
		if (!text || typeof document === "undefined") return null;
		const c = document.createElement("canvas");
		c.width = 1024;
		c.height = 256;
		const ctx = c.getContext("2d");
		if (!ctx) return null;
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		let size = 170;
		ctx.font = `400 ${size}px Anton, Impact, "Arial Narrow", sans-serif`;
		while (
			ctx.measureText(text.toUpperCase()).width > c.width * 0.94 &&
			size > 40
		) {
			size -= 8;
			ctx.font = `400 ${size}px Anton, Impact, "Arial Narrow", sans-serif`;
		}
		ctx.fillText(text.toUpperCase(), c.width / 2, c.height / 2 + 6);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		return t;
	}, [text, color]);
}

function Features({
	dims,
	features,
	colors,
	brandName,
	planes,
	night,
}: {
	dims: TruckDimensions;
	features: readonly string[];
	colors: ReturnType<typeof colorPlan>;
	brandName: string;
	planes: THREE.Plane[];
	night: boolean;
}) {
	const hatch = defaultOpenings(dims.body, dims.lengthM).find(
		(o) => o.type === "hatch",
	);
	const band = hexOr(colors.band.hex, "#ff5a1f");
	const trim = hexOr(colors.trim.hex, BLACK);
	const onLight =
		dims.body === "airstream"
			? hexOr(colors.panel.hex, "#efe4cf")
			: hexOr(colors.base.hex, "#f5f5f5");
	const darkBase = /^#[0-3]/i.test(onLight);
	const wordmark = useWordmarkTexture(brandName, darkBase ? "#fff6e9" : band);
	const signText = useWordmarkTexture(brandName, "#fff6e9");
	if (!hatch) return null;
	const hx = -dims.lengthM / 2 + hatch.xFromFront + hatch.width / 2;
	const sill = FLOOR_Y + hatch.sillHeight;
	const top = sill + hatch.height;
	const zAt = (y: number) => skinZAt(dims, y) + 0.01;
	const roofY = FLOOR_Y + dims.heightM;
	const has = (f: string) => features.includes(f);
	// Wordmark between the front corner and the hatch, on the upper wall.
	const wmCenterX =
		(-dims.lengthM / 2 + (hx - hatch.width / 2)) / 2 +
		(dims.body === "airstream" ? 0.25 : 0);
	const wmWidth = Math.max(
		0.8,
		Math.min(1.8, hx - hatch.width / 2 - -dims.lengthM / 2 - 0.35),
	);
	const wmY =
		dims.body === "airstream" ? sill + 0.65 : FLOOR_Y + dims.heightM * 0.72;
	return (
		<group>
			{wordmark && (
				<>
					{dims.body === "airstream" && (
						<mesh position={[wmCenterX, wmY, zAt(wmY) - 0.002]}>
							<planeGeometry args={[wmWidth + 0.15, wmWidth * 0.32]} />
							<meshStandardMaterial
								color={onLight}
								roughness={0.6}
								clippingPlanes={planes}
							/>
						</mesh>
					)}
					<mesh position={[wmCenterX, wmY, zAt(wmY) + 0.004]}>
						<planeGeometry args={[wmWidth, wmWidth / 4]} />
						<meshStandardMaterial
							map={wordmark}
							transparent
							roughness={0.5}
							clippingPlanes={planes}
						/>
					</mesh>
					{/* roadside: an unbroken wall, so the wordmark runs larger */}
					<mesh
						position={[0, wmY, -zAt(wmY) - 0.004]}
						rotation={[0, Math.PI, 0]}
					>
						<planeGeometry
							args={[
								Math.min(dims.lengthM * 0.6, 2.6),
								Math.min(dims.lengthM * 0.6, 2.6) / 4,
							]}
						/>
						<meshStandardMaterial
							map={wordmark}
							transparent
							roughness={0.5}
							clippingPlanes={planes}
						/>
					</mesh>
				</>
			)}
			{has("awning") && (
				<group position={[hx, top + 0.12, zAt(top)]}>
					<mesh position={[0, -0.12, 0.55]} rotation={[0.42, 0, 0]} castShadow>
						<boxGeometry args={[hatch.width + 0.4, 0.03, 1.15]} />
						<meshStandardMaterial
							color={trim === BLACK ? band : trim}
							roughness={0.85}
							side={THREE.DoubleSide}
							clippingPlanes={planes}
						/>
					</mesh>
					{[-1, 1].map((sgn) => (
						<mesh
							key={sgn}
							position={[sgn * (hatch.width / 2 + 0.15), -0.42, 0.5]}
							rotation={[-0.75, 0, 0]}
						>
							<cylinderGeometry args={[0.015, 0.015, 0.95, 8]} />
							<meshStandardMaterial
								color="#9aa0a6"
								metalness={0.8}
								roughness={0.3}
								clippingPlanes={planes}
							/>
						</mesh>
					))}
				</group>
			)}
			{has("roof-sign") && (
				<group position={[-dims.lengthM * 0.18, roofY + 0.38, 0]}>
					<mesh castShadow>
						<boxGeometry args={[1.25, 0.42, 0.14]} />
						<meshStandardMaterial
							color={band}
							emissive={band}
							emissiveIntensity={night ? 0.6 : 0.15}
							clippingPlanes={planes}
						/>
					</mesh>
					{signText &&
						[1, -1].map((sgn) => (
							<mesh
								key={sgn}
								position={[0, 0, sgn * 0.072]}
								rotation={[0, sgn > 0 ? 0 : Math.PI, 0]}
							>
								<planeGeometry args={[1.15, 0.29]} />
								<meshBasicMaterial
									map={signText}
									transparent
									clippingPlanes={planes}
								/>
							</mesh>
						))}
					<mesh position={[0, -0.28, 0]}>
						<boxGeometry args={[0.06, 0.16, 0.06]} />
						<meshStandardMaterial color={BLACK} clippingPlanes={planes} />
					</mesh>
				</group>
			)}
			{has("night-lighting") && (
				<group>
					<mesh position={[hx, top + 0.04, zAt(top) + 0.03]}>
						<boxGeometry args={[hatch.width, 0.025, 0.03]} />
						<meshStandardMaterial
							color="#fff3d6"
							emissive="#ffe2a8"
							emissiveIntensity={night ? 3 : 1.2}
							clippingPlanes={planes}
						/>
					</mesh>
					{[-1, 1].map((sgn) => (
						<group
							key={sgn}
							position={[
								hx + sgn * (hatch.width / 2 + 0.35),
								top + 0.15,
								zAt(top + 0.15) + 0.06,
							]}
						>
							<mesh>
								<cylinderGeometry args={[0.045, 0.06, 0.08, 12]} />
								<meshStandardMaterial color={BLACK} clippingPlanes={planes} />
							</mesh>
							{night && (
								<spotLight
									position={[0, -0.05, 0]}
									angle={0.7}
									penumbra={0.6}
									intensity={6}
									distance={4}
									color="#ffd9a0"
								/>
							)}
						</group>
					))}
				</group>
			)}
			{has("menu-board") && (
				<group
					position={[
						hx + hatch.width / 2 + 0.55,
						sill + 0.35,
						zAt(sill + 0.35) + 0.02,
					]}
				>
					<mesh>
						<boxGeometry args={[0.7, 0.95, 0.04]} />
						<meshStandardMaterial
							color={trim}
							roughness={0.5}
							clippingPlanes={planes}
						/>
					</mesh>
					<mesh position={[0, 0, 0.022]}>
						<planeGeometry args={[0.62, 0.86]} />
						<meshStandardMaterial
							color="#1c1f1d"
							roughness={0.9}
							clippingPlanes={planes}
						/>
					</mesh>
				</group>
			)}
			{has("condiment-shelf") && (
				<mesh position={[hx, sill - 0.32, zAt(sill - 0.32) + 0.12]} castShadow>
					<boxGeometry args={[hatch.width * 0.7, 0.03, 0.22]} />
					<meshStandardMaterial
						color="#dde1e5"
						metalness={0.95}
						roughness={0.22}
						clippingPlanes={planes}
					/>
				</mesh>
			)}
			{has("visible-kitchen") && (
				<mesh position={[hx, sill + 0.28, zAt(sill + 0.28) + 0.12]}>
					<boxGeometry args={[hatch.width - 0.1, 0.5, 0.01]} />
					<meshPhysicalMaterial
						color="#e6f4ff"
						transmission={0.8}
						roughness={0.05}
						transparent
						opacity={0.35}
						clippingPlanes={planes}
					/>
				</mesh>
			)}
		</group>
	);
}

/* ── Model ────────────────────────────────────────────────────────────── */

export interface TruckModelProps {
	dims: TruckDimensions;
	equipmentIds: string[];
	/** Slice the shell at counter height so the line inside is visible. */
	cutaway?: boolean;
	selectedEquipment?: string | null;
	onSelectEquipment?: (id: string | null) => void;
	hoveredEquipment?: string | null;
	onHoverEquipment?: (id: string | null) => void;
	/** The buyer's colour words — resolved with the renders' own color plan. */
	wrapColors?: string[] | null;
	/** "zones" adds a function stripe per unit; "materials" is the finished build. */
	palette?: TruckPalette;
	/** Animate the service hatch open (default) or closed. */
	hatchOpen?: boolean;
	/** Floating labels on the selected / hovered unit. */
	showLabels?: boolean;
	/** "gloss" | "matte" | "satin" — the wrap's film finish. */
	finish?: string | null;
	/**
	 * How much of the shell is built: 0 = chassis, deck and line only,
	 * 1 = full body. Changes animate as the walls rising.
	 */
	reveal?: number;
	/** Brief feature ids: awning, roof-sign, night-lighting, menu-board… */
	features?: readonly string[];
	/** Lettered on both long walls and the roof sign. */
	brandName?: string;
	/** Night service: signs and lights glow. */
	night?: boolean;
}

export default function TruckModel({
	dims,
	equipmentIds,
	cutaway = false,
	selectedEquipment,
	onSelectEquipment,
	hoveredEquipment,
	onHoverEquipment,
	wrapColors,
	palette = "zones",
	hatchOpen = true,
	showLabels = false,
	finish,
	reveal = 1,
	features = [],
	brandName = "",
	night = false,
}: TruckModelProps) {
	const { gl } = useThree();
	useEffect(() => {
		gl.localClippingEnabled = true;
	}, [gl]);
	const [internalHover, setInternalHover] = useState<string | null>(null);
	const hovered = hoveredEquipment ?? internalHover;
	const onHover = onHoverEquipment ?? setInternalHover;

	const layout = useMemo(
		() => planGalley(equipmentIds, dims),
		[equipmentIds, dims],
	);
	const colors = useMemo(
		() => colorPlan((wrapColors ?? []).join(", "), dims.body),
		[wrapColors, dims.body],
	);
	const roughness =
		finish === "matte" ? 0.78 : finish === "satin" ? 0.45 : 0.24;
	const yOffset = -(FLOOR_Y + dims.heightM) / 2;

	// One clipping plane drives both the cutaway and the build-up: its
	// height eases toward the target every frame, so the walls rise (or the
	// cut drops) instead of popping.
	const clip = useMemo(
		() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000),
		[],
	);
	const target = cutaway
		? FLOOR_Y + 1.2 + yOffset
		: reveal >= 1
			? FLOOR_Y + dims.heightM + 2 + yOffset
			: FLOOR_Y + 0.03 + (dims.heightM + 2) * Math.max(0, reveal) + yOffset;
	const still = useMemo(prefersReducedMotion, []);
	const first = useRef(true);
	useFrame((_, dt) => {
		if (first.current || still) {
			clip.constant = target;
			first.current = false;
			return;
		}
		clip.constant = THREE.MathUtils.damp(clip.constant, target, 2.6, dt);
	});

	return (
		<group
			position={[0, yOffset, 0]}
			onPointerMissed={() => onSelectEquipment?.(null)}
		>
			<Shell
				dims={dims}
				colors={colors}
				finishRoughness={roughness}
				clipTop={clip}
			/>
			{/* deck */}
			<mesh position={[0, FLOOR_Y + 0.012, 0]} receiveShadow>
				<boxGeometry
					args={[
						dims.lengthM - (dims.body === "airstream" ? 0.9 : 0.1),
						0.02,
						Math.min(dims.widthM, skinZAt(dims, FLOOR_Y + 0.02) * 2) - 0.1,
					]}
				/>
				<meshStandardMaterial color="#6b6d73" roughness={0.9} />
			</mesh>
			<Hatch
				dims={dims}
				open={hatchOpen}
				trim={colors.trim.hex}
				skinColor={colors.base.hex}
				clipTop={clip}
				hidePanel={cutaway}
			/>
			{/* Cutaway / open deck: light the galley like a kitchen, so the line reads. */}
			{(cutaway || reveal < 1) && (
				<>
					<pointLight
						position={[-dims.lengthM * 0.25, FLOOR_Y + 2.2, 0]}
						intensity={5}
						distance={6}
						color="#fff1dd"
					/>
					<pointLight
						position={[dims.lengthM * 0.25, FLOOR_Y + 2.2, 0]}
						intensity={5}
						distance={6}
						color="#fff1dd"
					/>
				</>
			)}
			<Doors
				dims={dims}
				color={hexOr(colors.band.hex, "#d4d4d8")}
				clipTop={clip}
			/>
			<Roof dims={dims} clipped={cutaway} planes={[clip]} />
			<Features
				dims={dims}
				features={features}
				colors={colors}
				brandName={brandName}
				planes={[clip]}
				night={night}
			/>
			<RunningGear dims={dims} />
			<EquipmentUnits
				layout={layout}
				dims={dims}
				selectedId={selectedEquipment}
				hoveredId={hovered}
				onSelect={onSelectEquipment}
				onHover={onHover}
				palette={palette}
				showLabels={showLabels}
				cutaway={cutaway}
				roofUp={reveal >= 1}
			/>
		</group>
	);
}

/** Readable label for an equipment id, for chips outside the canvas. */
export function equipmentLabel(id: string): string {
	return getEquipment(id)?.label ?? id.replace(/-/g, " ");
}
