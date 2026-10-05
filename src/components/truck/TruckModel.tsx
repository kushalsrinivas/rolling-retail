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
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { colorPlan } from "#/lib/food-truck/art-direction";
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

/**
 * Half-width of the skin at height y (local), for curved Airstream walls.
 * Pass x to also follow the domed nose and tail, which pinch in lengthwise.
 */
function skinZAt(dims: TruckDimensions, y: number, x = 0) {
	const { lengthM: L, widthM: W, heightM: H, body } = dims;
	if (body !== "airstream") return W / 2;
	const cy = FLOOR_Y + (H - BELLY) / 2;
	const t = Math.abs(y - cy) / ((H + BELLY) / 2);
	// Same proportions as useAirstreamGeometry: domes kx/2 long.
	const kx = Math.max(1, 1.3 * H);
	const straightHalf = (Math.max(0.05, L / kx - 1) * kx) / 2;
	const u = Math.max(0, Math.abs(x) - straightHalf) / (kx / 2);
	return (W / 2) * Math.sqrt(Math.max(0.0004, 1 - t * t - u * u));
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

function useAirstreamGeometry(dims: TruckDimensions, inflate = 0) {
	return useMemo(() => {
		const { lengthM: L, widthM: W, heightM: H } = dims;
		// Domed ends roughly 0.65× the height long, the rest straight.
		const kx = Math.max(1, 1.3 * H);
		const straight = Math.max(0.05, L / kx - 1);
		const g = new THREE.CapsuleGeometry(0.5, straight, 16, 48);
		g.rotateZ(Math.PI / 2);
		g.scale(kx * (1 + inflate / L), H + BELLY + inflate, W + inflate);
		return g;
	}, [dims, inflate]);
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
	const { lengthM: L, widthM: W, heightM: H, body } = dims;
	const cy = body === "airstream" ? FLOOR_Y + (H - BELLY) / 2 : FLOOR_Y + H / 2;
	const yOffset = -(FLOOR_Y + H) / 2;
	const planes = clipTop ? [clipTop] : [];
	const capsule = useAirstreamGeometry(dims);
	const bandGeo = useAirstreamGeometry(dims, 0.012);

	// Clipping planes live in world space; the model group is offset in y.
	const bandPlanes = useMemo(() => {
		const sill = FLOOR_Y + 1.05; // counter height
		const bottom = sill - 0.05 + yOffset;
		const top = sill + 0.3 + yOffset;
		return [
			new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottom),
			new THREE.Plane(new THREE.Vector3(0, -1, 0), top),
		];
	}, [yOffset]);
	const stripePlanes = useMemo(() => {
		const sill = FLOOR_Y + 1.05;
		const bottom = sill + 0.3 + yOffset;
		const top = sill + 0.34 + yOffset;
		return [
			new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottom),
			new THREE.Plane(new THREE.Vector3(0, -1, 0), top),
		];
	}, [yOffset]);

	if (body === "airstream") {
		return (
			<group>
				<mesh geometry={capsule} position={[0, cy, 0]} castShadow receiveShadow>
					<meshStandardMaterial
						color="#d9dde2"
						metalness={1}
						roughness={0.16}
						envMapIntensity={1.4}
						clippingPlanes={planes}
					/>
				</mesh>
				{/* interior liner: matte white wall panels, seen through the cut */}
				<mesh
					geometry={capsule}
					position={[0, cy, 0]}
					scale={[0.99, 0.985, 0.96]}
				>
					<meshStandardMaterial
						color="#f1efe9"
						roughness={0.85}
						side={THREE.BackSide}
						clippingPlanes={planes}
					/>
				</mesh>
				<mesh geometry={bandGeo} position={[0, cy, 0]}>
					<meshStandardMaterial
						color={hexOr(colors.band.hex, "#ff5a1f")}
						roughness={finishRoughness}
						metalness={0.1}
						clippingPlanes={[...bandPlanes, ...planes]}
						side={THREE.DoubleSide}
					/>
				</mesh>
				<mesh
					geometry={bandGeo}
					position={[0, cy, 0]}
					scale={[1.0005, 1.0005, 1.0005]}
				>
					<meshStandardMaterial
						color={hexOr(colors.trim.hex, BLACK)}
						roughness={0.5}
						clippingPlanes={[...stripePlanes, ...planes]}
						side={THREE.DoubleSide}
					/>
				</mesh>
			</group>
		);
	}

	const lowerH = H * 0.38;
	return (
		<group>
			<RoundedBox
				args={[L, H, W]}
				radius={0.06}
				smoothness={4}
				position={[0, cy, 0]}
				castShadow
				receiveShadow
			>
				<meshStandardMaterial
					color={hexOr(colors.base.hex, "#f5f5f5")}
					roughness={finishRoughness}
					metalness={0.08}
					clippingPlanes={planes}
				/>
			</RoundedBox>
			<mesh position={[0, cy, 0]}>
				<boxGeometry args={[L - 0.05, H - 0.03, W - 0.05]} />
				<meshStandardMaterial
					color="#f1efe9"
					roughness={0.85}
					side={THREE.BackSide}
					clippingPlanes={planes}
				/>
			</mesh>
			<RoundedBox
				args={[L + 0.012, lowerH, W + 0.012]}
				radius={0.06}
				smoothness={4}
				position={[0, FLOOR_Y + lowerH / 2, 0]}
				castShadow
			>
				<meshStandardMaterial
					color={hexOr(colors.band.hex, "#ff5a1f")}
					roughness={finishRoughness}
					metalness={0.08}
					clippingPlanes={planes}
					side={THREE.DoubleSide}
				/>
			</RoundedBox>
			<mesh position={[0, FLOOR_Y + lowerH, 0]}>
				<boxGeometry args={[L + 0.016, 0.04, W + 0.016]} />
				<meshStandardMaterial
					color={hexOr(colors.trim.hex, BLACK)}
					roughness={0.5}
					clippingPlanes={planes}
				/>
			</mesh>
			{/* drip rail */}
			<mesh position={[0, FLOOR_Y + H - 0.02, 0]}>
				<boxGeometry args={[L + 0.02, 0.03, W + 0.02]} />
				<meshStandardMaterial {...STAINLESS} clippingPlanes={planes} />
			</mesh>
		</group>
	);
}

/* ── Openings ─────────────────────────────────────────────────────────── */

function Hatch({
	dims,
	open,
	trim,
	clipTop,
	hidePanel = false,
}: {
	dims: TruckDimensions;
	open: boolean;
	trim: string;
	clipTop: THREE.Plane | null;
	hidePanel?: boolean;
}) {
	const o = defaultOpenings(dims.body, dims.lengthM).find(
		(x) => x.type === "hatch",
	);
	const panel = useRef<THREE.Group>(null);
	useFrame((_, dt) => {
		if (!panel.current) return;
		const target = open ? -1.15 : 0;
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
			{/* the opening */}
			<mesh position={[x, sillY + h / 2, z]}>
				<planeGeometry args={[w, h]} />
				<meshStandardMaterial
					color="#0d0d10"
					roughness={0.9}
					clippingPlanes={planes}
				/>
			</mesh>
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
				rotation={[open ? -1.15 : 0, 0, 0]}
			>
				<mesh position={[0, -h / 2, 0.015]} castShadow>
					<boxGeometry args={[w + 0.06, h + 0.04, 0.035]} />
					<meshStandardMaterial {...STAINLESS} clippingPlanes={planes} />
				</mesh>
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
				const x = -dims.lengthM / 2 + o.xFromFront + o.width / 2;
				const y = FLOOR_Y + o.height / 2 + 0.05;
				const z = skinZAt(dims, y) + 0.008;
				return (
					<group key={`${o.side}-${o.xFromFront}`} position={[x, y, z]}>
						<RoundedBox
							args={[o.width, o.height, 0.02]}
							radius={dims.body === "airstream" ? 0.12 : 0.02}
							smoothness={3}
						>
							<meshStandardMaterial
								color={dims.body === "airstream" ? "#cfd3d8" : color}
								metalness={dims.body === "airstream" ? 1 : 0.1}
								roughness={dims.body === "airstream" ? 0.2 : 0.45}
								clippingPlanes={planes}
							/>
						</RoundedBox>
						<mesh position={[o.width * 0.36, 0, 0.03]}>
							<boxGeometry args={[0.03, 0.16, 0.04]} />
							<meshStandardMaterial {...STAINLESS_TOP} />
						</mesh>
					</group>
				);
			})}
		</group>
	);
}

/* ── Running gear and roof ────────────────────────────────────────────── */

function RunningGear({ dims }: { dims: TruckDimensions }) {
	const { lengthM: L, widthM: W } = dims;
	const axleX = L * 0.08;
	const frontX = -L / 2;
	return (
		<group>
			{/* chassis + belly pan */}
			<mesh position={[0, FLOOR_Y - 0.1, 0]} castShadow receiveShadow>
				<boxGeometry args={[L * 0.92, 0.16, W * 0.78]} />
				<meshStandardMaterial color="#202024" roughness={0.85} />
			</mesh>
			{/* wheels */}
			{[1, -1].map((s) => (
				<group
					key={s}
					position={[axleX, 0.34, s * (W / 2 - 0.1)]}
					rotation={[Math.PI / 2, 0, 0]}
				>
					<mesh castShadow>
						<cylinderGeometry args={[0.34, 0.34, 0.22, 32]} />
						<meshStandardMaterial color="#111114" roughness={0.95} />
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
			))}
			{/* fenders */}
			{[1, -1].map((s) => (
				<mesh
					key={`f${s}`}
					position={[axleX, 0.74, s * (W / 2 + 0.01)]}
					castShadow
				>
					<boxGeometry args={[0.95, 0.04, 0.26]} />
					<meshStandardMaterial color={BLACK} roughness={0.6} />
				</mesh>
			))}
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
			<RoundedBox
				args={[0.95, 0.26, 0.72]}
				radius={0.06}
				position={[-dims.lengthM * 0.05, roofY + 0.1, 0]}
				castShadow
			>
				<meshStandardMaterial
					color="#f2f2f0"
					roughness={0.55}
					clippingPlanes={planes}
				/>
			</RoundedBox>
			{[dims.lengthM * 0.28, -dims.lengthM * 0.3].map((x) => (
				<mesh
					key={x}
					position={[x, roofY + 0.02, dims.widthM * 0.16]}
					castShadow
				>
					<boxGeometry args={[0.36, 0.1, 0.36]} />
					<meshStandardMaterial
						color="#e4e4e7"
						roughness={0.6}
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
function Unit({
	children,
	position,
	w,
	h,
	d,
	highlight,
	handlers,
	label,
}: {
	children: React.ReactNode;
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
				const outerX = Math.abs(x) + w / 2;
				const inner = Math.min(skinZAt(dims, topY, outerX), widthM / 2);
				const z = zSign * Math.max(0, inner - d / 2 - 0.08);
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
						<Part w={w} d={d} h={spec.heightM} face={face} />
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
	const shellVisible = cutaway || reveal > 0;

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
				<meshStandardMaterial
					color={cutaway || !shellVisible ? "#6b6d73" : "#2c2c31"}
					roughness={0.9}
				/>
			</mesh>
			<Hatch
				dims={dims}
				open={hatchOpen}
				trim={colors.trim.hex}
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
