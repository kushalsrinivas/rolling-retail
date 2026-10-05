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

/** Half-width of the skin at height y (local), for curved Airstream walls. */
function skinZAt(dims: TruckDimensions, y: number) {
	const { widthM: W, heightM: H, body } = dims;
	if (body !== "airstream") return W / 2;
	const cy = FLOOR_Y + (H - BELLY) / 2;
	const t = Math.min(0.98, Math.abs(y - cy) / ((H + BELLY) / 2));
	return (W / 2) * Math.sqrt(1 - t * t);
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
}: {
	dims: TruckDimensions;
	open: boolean;
	trim: string;
	clipTop: THREE.Plane | null;
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
				<meshStandardMaterial {...STAINLESS_TOP} />
			</mesh>
			{/* hatch door, hinged on its top edge — hidden in the cutaway, where it
			    would hang straight across the view into the line */}
			<group
				ref={panel}
				visible={!clipTop}
				position={[x, topY, z + 0.02]}
				rotation={[open ? -1.15 : 0, 0, 0]}
			>
				<mesh position={[0, -h / 2, 0.015]} castShadow>
					<boxGeometry args={[w + 0.06, h + 0.04, 0.035]} />
					<meshStandardMaterial {...STAINLESS} />
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

function Roof({ dims, clipped }: { dims: TruckDimensions; clipped: boolean }) {
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
				<meshStandardMaterial color="#f2f2f0" roughness={0.55} />
			</RoundedBox>
			{[dims.lengthM * 0.28, -dims.lengthM * 0.3].map((x) => (
				<mesh
					key={x}
					position={[x, roofY + 0.02, dims.widthM * 0.16]}
					castShadow
				>
					<boxGeometry args={[0.36, 0.1, 0.36]} />
					<meshStandardMaterial color="#e4e4e7" roughness={0.6} />
				</mesh>
			))}
		</group>
	);
}

/* ── Equipment ────────────────────────────────────────────────────────── */

function topDetail(id: string, w: number, d: number) {
	if (/griddle|plancha|chargrill|hot-station/.test(id))
		return (
			<mesh position={[0, 0.012, 0]}>
				<boxGeometry args={[w * 0.86, 0.02, d * 0.7]} />
				<meshStandardMaterial
					color="#1b1b1f"
					metalness={0.6}
					roughness={0.45}
				/>
			</mesh>
		);
	if (/fryer/.test(id))
		return (
			<group>
				{[-0.2, 0.2].map((f) => (
					<mesh key={f} position={[w * f, 0.01, 0]}>
						<boxGeometry args={[w * 0.32, 0.02, d * 0.6]} />
						<meshStandardMaterial color="#3a2a12" roughness={0.4} />
					</mesh>
				))}
			</group>
		);
	if (/espresso|coffee/.test(id))
		return (
			<RoundedBox
				args={[w * 0.8, 0.42, d * 0.7]}
				radius={0.04}
				position={[0, 0.22, 0]}
			>
				<meshStandardMaterial
					color="#c8ccd1"
					metalness={0.95}
					roughness={0.2}
				/>
			</RoundedBox>
		);
	if (/pizza-oven/.test(id))
		return (
			<RoundedBox
				args={[w * 0.9, 0.5, d * 0.85]}
				radius={0.05}
				position={[0, 0.26, 0]}
			>
				<meshStandardMaterial color="#2b2b30" metalness={0.5} roughness={0.5} />
			</RoundedBox>
		);
	if (/display|dipping/.test(id))
		return (
			<mesh position={[0, 0.2, 0]}>
				<boxGeometry args={[w * 0.95, 0.38, d * 0.9]} />
				<meshPhysicalMaterial
					color="#dff3ff"
					transmission={0.7}
					roughness={0.05}
					thickness={0.02}
					transparent
					opacity={0.6}
				/>
			</mesh>
		);
	return null;
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
}) {
	const { lengthM, widthM } = dims;
	const runStart = -lengthM / 2 + layout.marginM;
	return (
		<group>
			{layout.placed.map((p) => {
				const { spec } = p;
				const w = spec.widthM;
				const d = spec.depthM;
				const h = spec.heightM;
				const x = runStart + p.offsetM + w / 2;
				const zSign = p.wall === "curbside" ? 1 : -1;
				const inner = skinZAt(dims, FLOOR_Y + 0.9);
				const z = zSign * (Math.min(inner, widthM / 2) - d / 2 - 0.08);
				const mount = spec.mount ?? "floor";
				if (mount === "subfloor") return null;
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
				const glow = active ? 0.35 : hover ? 0.18 : 0;
				// Above the cut line an overhead unit would float in mid-air.
				if (mount === "overhead" && cutaway) return null;
				if (mount === "overhead") {
					return (
						<group
							key={`${spec.id}-${p.offsetM}`}
							position={[x, FLOOR_Y + 1.95, z]}
							{...handlers}
						>
							<mesh castShadow>
								<boxGeometry args={[w, 0.32, d]} />
								<meshStandardMaterial
									{...STAINLESS}
									emissive="#ff5a1f"
									emissiveIntensity={glow}
								/>
								{(active || hover) && <Edges color="#ff5a1f" />}
							</mesh>
						</group>
					);
				}
				const baseY = mount === "counter" ? FLOOR_Y + 0.9 : FLOOR_Y;
				const bodyH = mount === "counter" ? h : Math.max(0.3, h - 0.04);
				const aisleFace = -zSign * (d / 2 + 0.001);
				return (
					<group
						key={`${spec.id}-${p.wall}-${p.offsetM}`}
						position={[x, baseY, z]}
						{...handlers}
					>
						{/* cabinet */}
						<mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
							<boxGeometry args={[w - 0.01, bodyH, d]} />
							<meshStandardMaterial
								{...STAINLESS}
								emissive="#ff5a1f"
								emissiveIntensity={glow}
							/>
							{(active || hover) && <Edges color="#ff5a1f" />}
						</mesh>
						{mount === "floor" && (
							<>
								{/* worktop */}
								<mesh position={[0, bodyH + 0.02, 0]} castShadow>
									<boxGeometry args={[w + 0.01, 0.04, d + 0.03]} />
									<meshStandardMaterial {...STAINLESS_TOP} />
								</mesh>
								<group position={[0, bodyH + 0.04, 0]}>
									{topDetail(spec.id, w, d)}
								</group>
								{/* kick plate */}
								<mesh position={[0, 0.05, aisleFace]}>
									<boxGeometry args={[w - 0.02, 0.1, 0.01]} />
									<meshStandardMaterial color="#26262b" roughness={0.8} />
								</mesh>
								{/* door seam + handle on the aisle face */}
								<mesh position={[0, bodyH * 0.5, aisleFace]}>
									<boxGeometry args={[0.006, bodyH * 0.7, 0.006]} />
									<meshStandardMaterial color="#5a5e64" />
								</mesh>
								<mesh
									position={[0, bodyH * 0.82, aisleFace - zSign * 0.02]}
									rotation={[0, 0, Math.PI / 2]}
								>
									<cylinderGeometry
										args={[0.012, 0.012, Math.min(0.4, w * 0.6), 10]}
									/>
									<meshStandardMaterial {...STAINLESS_TOP} />
								</mesh>
								{palette === "zones" && (
									<mesh position={[0, bodyH - 0.06, aisleFace]}>
										<boxGeometry args={[w - 0.04, 0.03, 0.006]} />
										<meshStandardMaterial
											color={accent}
											emissive={accent}
											emissiveIntensity={0.4}
										/>
									</mesh>
								)}
							</>
						)}
						{showLabels && (active || hover) && (
							<Html
								position={[0, bodyH + 0.55, 0]}
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
						)}
					</group>
				);
			})}
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
	// Cut just above the counters: walls stay, the roof and upper walls go.
	const clipTop = useMemo(
		() =>
			cutaway
				? new THREE.Plane(new THREE.Vector3(0, -1, 0), FLOOR_Y + 1.2 + yOffset)
				: null,
		[cutaway, yOffset],
	);

	return (
		<group
			position={[0, yOffset, 0]}
			onPointerMissed={() => onSelectEquipment?.(null)}
		>
			<Shell
				dims={dims}
				colors={colors}
				finishRoughness={roughness}
				clipTop={clipTop}
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
					color={cutaway ? "#5b5d63" : "#2c2c31"}
					roughness={0.9}
				/>
			</mesh>
			<Hatch
				dims={dims}
				open={hatchOpen}
				trim={colors.trim.hex}
				clipTop={clipTop}
			/>
			{/* Cutaway: light the galley like a kitchen, so the line reads. */}
			{cutaway && (
				<>
					<pointLight
						position={[-dims.lengthM * 0.25, FLOOR_Y + 2.2, 0]}
						intensity={6}
						distance={6}
						color="#fff1dd"
					/>
					<pointLight
						position={[dims.lengthM * 0.25, FLOOR_Y + 2.2, 0]}
						intensity={6}
						distance={6}
						color="#fff1dd"
					/>
				</>
			)}
			<Doors
				dims={dims}
				color={hexOr(colors.band.hex, "#d4d4d8")}
				clipTop={clipTop}
			/>
			<Roof dims={dims} clipped={cutaway} />
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
			/>
		</group>
	);
}

/** Readable label for an equipment id, for chips outside the canvas. */
export function equipmentLabel(id: string): string {
	return getEquipment(id)?.label ?? id.replace(/-/g, " ");
}
