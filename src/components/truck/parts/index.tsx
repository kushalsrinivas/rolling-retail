/**
 * Equipment parts — a lightweight 3D model for every unit in the catalog.
 *
 * Procedural (nothing downloaded) and built from a handful of shared
 * materials, so a full galley stays cheap on a phone. Each part draws itself
 * in a local frame: origin at the floor, centered on its footprint, with the
 * aisle on the `face` side (+1 = +z, -1 = -z). Sizes come from the catalog
 * (`equipment.ts`), so a part is always the size the layout planned for.
 *
 * Counter-top units (espresso, grinder, till…) bring their own counter
 * cabinet underneath, so nothing floats at counter height.
 */
import { RoundedBox } from "@react-three/drei";
import type { ReactNode } from "react";
import * as THREE from "three";

export interface PartProps {
	w: number;
	d: number;
	h: number;
	/** +1 if the aisle (front) is toward +z, -1 toward -z. */
	face: 1 | -1;
}

export type PartComponent = (p: PartProps) => ReactNode;

/* ── Shared materials (one instance each, for the whole scene) ─────────── */

let cache: ReturnType<typeof makeMaterials> | null = null;
function makeMaterials() {
	const std = (o: THREE.MeshStandardMaterialParameters) =>
		new THREE.MeshStandardMaterial(o);
	return {
		stainless: std({ color: "#c7ccd1", metalness: 0.9, roughness: 0.32 }),
		brushed: std({ color: "#dde1e5", metalness: 0.95, roughness: 0.22 }),
		dark: std({ color: "#1b1b1f", metalness: 0.5, roughness: 0.5 }),
		black: std({ color: "#101013", roughness: 0.8 }),
		rubber: std({ color: "#26262b", roughness: 0.9 }),
		seam: std({ color: "#5a5e64", roughness: 0.6 }),
		// Transparent with a clear coat rather than `transmission`: transmission
		// makes three.js render the whole scene a second time every frame to
		// see through the glass, which nearly doubled a galley's draw calls.
		glass: new THREE.MeshPhysicalMaterial({
			color: "#e6f4ff",
			roughness: 0.05,
			metalness: 0,
			clearcoat: 1,
			clearcoatRoughness: 0.04,
			transparent: true,
			opacity: 0.32,
			envMapIntensity: 1.4,
			depthWrite: false,
		}),
		darkGlass: std({
			color: "#1d2733",
			metalness: 0.4,
			roughness: 0.1,
			transparent: true,
			opacity: 0.85,
		}),
		wood: std({ color: "#b8834f", roughness: 0.7 }),
		oil: std({ color: "#7a5512", metalness: 0.3, roughness: 0.15 }),
		ember: std({
			color: "#ff6a1f",
			emissive: "#ff4a0f",
			emissiveIntensity: 1.2,
		}),
		screen: std({
			color: "#0e1a26",
			emissive: "#2a6fb3",
			emissiveIntensity: 0.6,
		}),
		ice: std({ color: "#f3fbff", roughness: 0.2 }),
		copper: std({ color: "#b06a3b", metalness: 0.9, roughness: 0.3 }),
		cream: std({ color: "#f1ebe0", roughness: 0.7 }),
		gelato: [
			"#f7c9d4",
			"#a8d8a0",
			"#f3e3a2",
			"#7a4b2e",
			"#ffffff",
			"#c9a6e8",
		].map((c) => std({ color: c, roughness: 0.6 })),
		stock: ["#ff5a1f", "#0f8b8d", "#ffc83d", "#17130f", "#ff7ab6"].map((c) =>
			std({ color: c, roughness: 0.7 }),
		),
	};
}
export function mats() {
	if (!cache) cache = makeMaterials();
	return cache;
}

const COUNTER_H = 0.9;

/* ── Building blocks ──────────────────────────────────────────────────── */

type DoorStyle = "solid" | "glass" | "drawers" | "open";

/** A stainless base cabinet with worktop, kick plate, doors and handles. */
function Base({
	w,
	d,
	h = COUNTER_H,
	face,
	doors = "solid",
	top = true,
}: PartProps & { doors?: DoorStyle; top?: boolean }) {
	const m = mats();
	const bodyH = h - (top ? 0.04 : 0);
	const fz = face * (d / 2 + 0.002);
	const nDoors = Math.max(1, Math.round(w / 0.5));
	const doorW = (w - 0.04) / nDoors;
	return (
		<group>
			<mesh
				position={[0, bodyH / 2, 0]}
				material={m.stainless}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[w - 0.01, bodyH, d]} />
			</mesh>
			{top && (
				<mesh position={[0, bodyH + 0.02, 0]} material={m.brushed} castShadow>
					<boxGeometry args={[w + 0.01, 0.04, d + 0.03]} />
				</mesh>
			)}
			<mesh position={[0, 0.05, fz]} material={m.rubber}>
				<boxGeometry args={[w - 0.02, 0.1, 0.01]} />
			</mesh>
			{doors !== "open" &&
				Array.from(
					{ length: nDoors },
					(_, i) => -w / 2 + 0.02 + doorW * (i + 0.5),
				).map((x) => (
					<group key={x} position={[x, 0.1 + (bodyH - 0.12) / 2, fz]}>
						{doors === "glass" ? (
							<mesh material={m.darkGlass}>
								<boxGeometry args={[doorW - 0.05, bodyH - 0.2, 0.008]} />
							</mesh>
						) : doors === "drawers" ? (
							[0.25, -0.05, -0.32].map((y) => (
								<mesh
									key={y}
									position={[0, y * (bodyH - 0.12), 0]}
									material={m.seam}
								>
									<boxGeometry args={[doorW - 0.06, 0.006, 0.006]} />
								</mesh>
							))
						) : (
							<mesh material={m.seam}>
								<boxGeometry args={[0.006, bodyH - 0.2, 0.006]} />
							</mesh>
						)}
						<mesh
							position={[doorW * 0.3, (bodyH - 0.12) * 0.32, face * 0.02]}
							rotation={[0, 0, Math.PI / 2]}
							material={m.brushed}
						>
							<cylinderGeometry
								args={[0.01, 0.01, Math.min(0.28, doorW * 0.5), 8]}
							/>
						</mesh>
					</group>
				))}
		</group>
	);
}

/** Things standing on a counter: counter cabinet + the unit on top. */
function OnCounter({ p, children }: { p: PartProps; children: ReactNode }) {
	return (
		<group>
			<Base {...p} h={COUNTER_H} />
			<group position={[0, COUNTER_H + 0.04, 0]}>{children}</group>
		</group>
	);
}

function Knobs({
	w,
	d,
	face,
	n = 3,
}: {
	w: number;
	d: number;
	face: 1 | -1;
	n?: number;
}) {
	const m = mats();
	return (
		<group>
			{Array.from(
				{ length: n },
				(_, i) => -w / 2 + (w / (n + 1)) * (i + 1),
			).map((x) => (
				<mesh
					key={x}
					position={[x, COUNTER_H - 0.12, face * (d / 2 + 0.02)]}
					rotation={[Math.PI / 2, 0, 0]}
					material={m.black}
				>
					<cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
				</mesh>
			))}
		</group>
	);
}

/* ── Hot line ─────────────────────────────────────────────────────────── */

const Griddle: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} doors="drawers" top={false} />
			<mesh position={[0, COUNTER_H - 0.01, 0]} material={m.stainless}>
				<boxGeometry args={[p.w, 0.06, p.d]} />
			</mesh>
			<mesh position={[0, COUNTER_H + 0.025, -p.face * 0.04]} material={m.dark}>
				<boxGeometry args={[p.w - 0.08, 0.015, p.d - 0.16]} />
			</mesh>
			{/* backsplash + grease trough */}
			<mesh
				position={[0, COUNTER_H + 0.1, -p.face * (p.d / 2 - 0.02)]}
				material={m.brushed}
			>
				<boxGeometry args={[p.w, 0.2, 0.03]} />
			</mesh>
			<mesh
				position={[0, COUNTER_H + 0.015, p.face * (p.d / 2 - 0.05)]}
				material={m.black}
			>
				<boxGeometry args={[p.w - 0.08, 0.02, 0.05]} />
			</mesh>
			<Knobs
				w={p.w}
				d={p.d}
				face={p.face}
				n={Math.max(2, Math.round(p.w / 0.3))}
			/>
		</group>
	);
};

const GriddleChargrill: PartComponent = (p) => {
	const m = mats();
	const half = p.w / 2;
	return (
		<group>
			<Griddle {...p} />
			{/* chargrill bars over the right half */}
			{Array.from(
				{ length: 8 },
				(_, i) => -p.d / 2 + 0.12 + i * ((p.d - 0.24) / 7),
			).map((z) => (
				<mesh
					key={z}
					position={[half / 2, COUNTER_H + 0.04, z]}
					material={m.black}
				>
					<boxGeometry args={[half - 0.08, 0.015, 0.012]} />
				</mesh>
			))}
		</group>
	);
};

const Fryer: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} top={false} />
			<mesh position={[0, COUNTER_H, 0]} material={m.stainless}>
				<boxGeometry args={[p.w, 0.04, p.d]} />
			</mesh>
			{[-0.25, 0.25].map((f) => (
				<group key={f} position={[p.w * f, COUNTER_H + 0.02, -p.face * 0.05]}>
					<mesh material={m.oil}>
						<boxGeometry args={[p.w * 0.4, 0.01, p.d * 0.5]} />
					</mesh>
					{/* basket hanging on the rail */}
					<mesh position={[0, 0.12, 0]} material={m.seam}>
						<boxGeometry args={[p.w * 0.36, 0.14, p.d * 0.4]} />
					</mesh>
					<mesh
						position={[0, 0.16, p.face * (p.d * 0.3)]}
						rotation={[Math.PI / 2, 0, 0]}
						material={m.black}
					>
						<cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
					</mesh>
				</group>
			))}
		</group>
	);
};

const PizzaOven: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} h={0.75} doors="open" />
			<RoundedBox
				args={[p.w, 0.62, p.d]}
				radius={0.05}
				position={[0, 0.79 + 0.31, 0]}
				material={m.stainless}
				castShadow
			/>
			{/* mouth with embers */}
			<mesh position={[0, 0.98, p.face * (p.d / 2 + 0.002)]} material={m.black}>
				<boxGeometry args={[p.w * 0.6, 0.18, 0.01]} />
			</mesh>
			<mesh position={[0, 0.94, p.face * (p.d / 2 - 0.05)]} material={m.ember}>
				<boxGeometry args={[p.w * 0.5, 0.03, 0.06]} />
			</mesh>
			<mesh position={[-p.w * 0.25, 1.55, 0]} material={m.stainless}>
				<cylinderGeometry args={[0.07, 0.07, 0.35, 16]} />
			</mesh>
		</group>
	);
};

const WokStation: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} top />
			{[-0.22, 0.22].map((f) => (
				<group key={f} position={[p.w * f, COUNTER_H + 0.05, 0]}>
					<mesh rotation={[Math.PI / 2, 0, 0]} material={m.black}>
						<torusGeometry args={[0.15, 0.025, 8, 24]} />
					</mesh>
					<mesh
						position={[0, 0.06, 0]}
						rotation={[Math.PI, 0, 0]}
						material={m.dark}
					>
						<sphereGeometry
							args={[0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
						/>
					</mesh>
				</group>
			))}
			<Knobs w={p.w} d={p.d} face={p.face} n={2} />
		</group>
	);
};

const HotStation: PartComponent = (p) => {
	const m = mats();
	const n = Math.max(2, Math.round(p.w / 0.33));
	return (
		<group>
			<Base {...p} />
			{Array.from(
				{ length: n },
				(_, i) => -p.w / 2 + (p.w / n) * (i + 0.5),
			).map((x) => (
				<mesh key={x} position={[x, COUNTER_H + 0.035, 0]} material={m.brushed}>
					<boxGeometry args={[p.w / n - 0.05, 0.025, p.d * 0.6]} />
				</mesh>
			))}
			{/* sneeze guard */}
			<mesh
				position={[0, COUNTER_H + 0.35, p.face * (p.d / 2 - 0.05)]}
				rotation={[p.face * 0.3, 0, 0]}
				material={m.glass}
			>
				<boxGeometry args={[p.w - 0.06, 0.4, 0.01]} />
			</mesh>
		</group>
	);
};

function filterXs(w: number): number[] {
	const n = Math.max(3, Math.round(w / 0.4));
	return Array.from({ length: n }, (_, i) => -w / 2 + (w / n) * (i + 0.5));
}

const Hood: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<mesh position={[0, p.h / 2, 0]} material={m.stainless} castShadow>
				<boxGeometry args={[p.w, p.h, p.d]} />
			</mesh>
			{/* baffle filters on the underside */}
			{filterXs(p.w).map((x) => (
				<mesh key={x} position={[x, -0.005, 0]} material={m.seam}>
					<boxGeometry
						args={[p.w / filterXs(p.w).length - 0.03, 0.01, p.d - 0.12]}
					/>
				</mesh>
			))}
			<mesh position={[0, p.h + 0.2, -p.face * 0.1]} material={m.brushed}>
				<boxGeometry args={[0.35, 0.4, 0.3]} />
			</mesh>
		</group>
	);
};

const SuppressionPipe: PartComponent = (p) => {
	const m = mats();
	return (
		<group position={[0, 0.3, 0]}>
			<mesh rotation={[0, 0, Math.PI / 2]} material={m.brushed}>
				<cylinderGeometry args={[0.015, 0.015, p.w, 8]} />
			</mesh>
			{[-0.35, 0, 0.35].map((f) => (
				<mesh key={f} position={[p.w * f, -0.05, 0]} material={m.copper}>
					<coneGeometry args={[0.025, 0.06, 8]} />
				</mesh>
			))}
		</group>
	);
};

/* ── Drinks ───────────────────────────────────────────────────────────── */

const Espresso: PartComponent = (p) => {
	const m = mats();
	const mw = Math.min(p.w, 0.75);
	return (
		<OnCounter p={{ ...p, w: Math.max(p.w, 0.8) }}>
			<RoundedBox
				args={[mw, 0.42, p.d * 0.75]}
				radius={0.04}
				position={[0, 0.21, -p.face * 0.05]}
				material={m.brushed}
				castShadow
			/>
			{/* cup warmer */}
			<mesh position={[0, 0.43, -p.face * 0.05]} material={m.seam}>
				<boxGeometry args={[mw - 0.06, 0.01, p.d * 0.6]} />
			</mesh>
			{/* group heads + portafilters */}
			{[-0.22, 0.22].map((f) => (
				<group key={f} position={[mw * f, 0.2, p.face * (p.d * 0.33)]}>
					<mesh material={m.dark}>
						<cylinderGeometry args={[0.05, 0.04, 0.06, 16]} />
					</mesh>
					<mesh
						position={[0, -0.04, p.face * 0.08]}
						rotation={[Math.PI / 2, 0, 0]}
						material={m.black}
					>
						<cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
					</mesh>
				</group>
			))}
			{/* steam wand */}
			<mesh
				position={[mw / 2 - 0.04, 0.15, p.face * (p.d * 0.35)]}
				rotation={[0.3 * p.face, 0, 0]}
				material={m.brushed}
			>
				<cylinderGeometry args={[0.008, 0.008, 0.2, 8]} />
			</mesh>
		</OnCounter>
	);
};

const Grinder: PartComponent = (p) => {
	const m = mats();
	return (
		<OnCounter p={{ ...p, w: Math.max(p.w, 0.4) }}>
			<mesh position={[0, 0.17, 0]} material={m.dark}>
				<boxGeometry args={[0.16, 0.34, 0.22]} />
			</mesh>
			<mesh position={[0, 0.44, 0]} material={m.glass}>
				<coneGeometry args={[0.1, 0.2, 16, 1, true]} />
			</mesh>
		</OnCounter>
	);
};

const TeaBrewers: PartComponent = (p) => {
	const m = mats();
	return (
		<OnCounter p={p}>
			{[-0.3, 0, 0.3].map((f) => (
				<mesh
					key={f}
					position={[p.w * f, 0.22, -p.face * 0.08]}
					material={m.brushed}
					castShadow
				>
					<cylinderGeometry args={[0.1, 0.1, 0.44, 20]} />
				</mesh>
			))}
		</OnCounter>
	);
};

const Sealer: PartComponent = (p) => {
	const m = mats();
	return (
		<OnCounter p={{ ...p, w: Math.max(p.w, 0.4) }}>
			<mesh position={[0, 0.12, 0]} material={m.cream}>
				<boxGeometry args={[0.22, 0.24, 0.3]} />
			</mesh>
			<mesh position={[0, 0.34, -p.face * 0.05]} material={m.cream}>
				<boxGeometry args={[0.2, 0.2, 0.12]} />
			</mesh>
		</OnCounter>
	);
};

const PourStation: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} doors="glass" />
			<mesh
				position={[0, COUNTER_H + 0.28, -p.face * 0.1]}
				material={m.brushed}
			>
				<boxGeometry args={[p.w * 0.7, 0.08, 0.08]} />
			</mesh>
			{[-0.25, 0, 0.25].map((f) => (
				<group key={f} position={[p.w * f, COUNTER_H + 0.04, -p.face * 0.1]}>
					<mesh position={[0, 0.12, 0]} material={m.brushed}>
						<cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
					</mesh>
					<mesh position={[0, 0.3, p.face * 0.05]} material={m.black}>
						<cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
					</mesh>
				</group>
			))}
			<mesh position={[0, COUNTER_H + 0.05, p.face * 0.05]} material={m.seam}>
				<boxGeometry args={[p.w * 0.75, 0.015, 0.14]} />
			</mesh>
		</group>
	);
};

/* ── Cold ─────────────────────────────────────────────────────────────── */

const Fridge: PartComponent = (p) => <Base {...p} doors="glass" />;
const SolidCold: PartComponent = (p) => <Base {...p} doors="solid" />;

const IceWell: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} />
			<mesh position={[0, COUNTER_H + 0.03, 0]} material={m.ice}>
				<boxGeometry args={[p.w - 0.12, 0.03, p.d - 0.14]} />
			</mesh>
		</group>
	);
};

const DisplayCase: PartComponent = (p) => {
	const m = mats();
	const glassH = Math.max(0.3, p.h - COUNTER_H);
	return (
		<group>
			<Base {...p} doors="solid" />
			{/* trays of product */}
			{Array.from(
				{ length: 6 },
				(_, i) => -p.w / 2 + 0.1 + i * ((p.w - 0.2) / 5),
			).map((x, i) => (
				<mesh
					key={x}
					position={[x, COUNTER_H + 0.06, 0]}
					material={m.gelato[i % m.gelato.length]}
				>
					<boxGeometry args={[(p.w - 0.2) / 6, 0.06, p.d * 0.5]} />
				</mesh>
			))}
			<mesh
				position={[0, COUNTER_H + glassH / 2, p.face * (p.d * 0.15)]}
				rotation={[p.face * 0.25, 0, 0]}
				material={m.glass}
			>
				<boxGeometry args={[p.w - 0.04, glassH, 0.01]} />
			</mesh>
		</group>
	);
};

/* ── Prep, sink, service ──────────────────────────────────────────────── */

const PrepCounter: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} doors="drawers" />
			<mesh position={[-p.w * 0.15, COUNTER_H + 0.055, 0]} material={m.wood}>
				<boxGeometry args={[p.w * 0.45, 0.03, p.d * 0.55]} />
			</mesh>
		</group>
	);
};

const HandSink: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<Base {...p} top={false} />
			<mesh position={[0, COUNTER_H - 0.01, 0]} material={m.brushed}>
				<boxGeometry args={[p.w, 0.04, p.d]} />
			</mesh>
			<mesh position={[0, COUNTER_H + 0.012, 0.0]} material={m.dark}>
				<boxGeometry args={[p.w * 0.7, 0.01, p.d * 0.6]} />
			</mesh>
			{/* gooseneck tap */}
			<mesh
				position={[0, COUNTER_H + 0.14, -p.face * (p.d * 0.32)]}
				material={m.brushed}
			>
				<cylinderGeometry args={[0.012, 0.012, 0.26, 8]} />
			</mesh>
			<mesh
				position={[0, COUNTER_H + 0.27, -p.face * (p.d * 0.22)]}
				rotation={[0, Math.PI / 2, 0]}
				material={m.brushed}
			>
				<torusGeometry args={[0.07, 0.012, 8, 16, Math.PI]} />
			</mesh>
		</group>
	);
};

const GlassWash: PartComponent = (p) => <Base {...p} doors="glass" />;

const Till: PartComponent = (p) => {
	const m = mats();
	return (
		<OnCounter p={{ ...p, w: Math.max(p.w, 0.5), d: Math.max(p.d, 0.6) }}>
			<mesh position={[0, 0.08, 0]} material={m.dark}>
				<cylinderGeometry args={[0.03, 0.06, 0.16, 12]} />
			</mesh>
			<mesh
				position={[0, 0.22, 0]}
				rotation={[-p.face * 0.35, 0, 0]}
				material={m.screen}
			>
				<boxGeometry args={[0.32, 0.22, 0.02]} />
			</mesh>
		</OnCounter>
	);
};

const MenuScreen: PartComponent = (p) => {
	const m = mats();
	return (
		<group position={[0, -0.35, 0]}>
			<mesh material={m.dark}>
				<boxGeometry args={[p.w, 0.62, 0.05]} />
			</mesh>
			<mesh position={[0, 0, p.face * 0.03]} material={m.screen}>
				<boxGeometry args={[p.w - 0.06, 0.56, 0.01]} />
			</mesh>
		</group>
	);
};

const TrackLights: PartComponent = (p) => {
	const m = mats();
	return (
		<group position={[0, 0.25, 0]}>
			<mesh material={m.black}>
				<boxGeometry args={[p.w, 0.03, 0.04]} />
			</mesh>
			{[-0.35, -0.12, 0.12, 0.35].map((f) => (
				<mesh key={f} position={[p.w * f, -0.06, 0]} material={m.black}>
					<cylinderGeometry args={[0.03, 0.025, 0.1, 10]} />
				</mesh>
			))}
		</group>
	);
};

/** Shelving with stock — display wall, merch rail, bookshelf, lockers. */
function Shelving({
	p,
	kind,
}: {
	p: PartProps;
	kind: "display" | "rail" | "books" | "locker";
}) {
	const m = mats();
	if (kind === "locker") return <Base {...p} doors="solid" />;
	const shelves =
		kind === "rail"
			? []
			: [0.35, 0.75, 1.15, 1.55].filter((y) => y < p.h - 0.1);
	return (
		<group>
			<mesh
				position={[0, p.h / 2, -p.face * (p.d / 2 - 0.02)]}
				material={kind === "books" ? m.wood : m.cream}
			>
				<boxGeometry args={[p.w, p.h, 0.03]} />
			</mesh>
			{shelves.map((y, i) => (
				<group key={y} position={[0, y, 0]}>
					<mesh material={m.wood}>
						<boxGeometry args={[p.w, 0.025, p.d]} />
					</mesh>
					{Array.from(
						{ length: Math.round(p.w / 0.18) },
						(_, k) => -p.w / 2 + 0.1 + k * 0.18,
					).map((x, k) => (
						<mesh
							key={x}
							position={[x, 0.11, 0]}
							material={m.stock[(i + k) % m.stock.length]}
						>
							<boxGeometry
								args={[
									kind === "books" ? 0.04 : 0.12,
									kind === "books" ? 0.2 : 0.16,
									p.d * 0.7,
								]}
							/>
						</mesh>
					))}
				</group>
			))}
			{kind === "rail" && (
				<group>
					<mesh
						position={[0, 1.55, 0]}
						rotation={[0, 0, Math.PI / 2]}
						material={m.brushed}
					>
						<cylinderGeometry args={[0.015, 0.015, p.w, 8]} />
					</mesh>
					{Array.from(
						{ length: Math.round(p.w / 0.12) },
						(_, k) => -p.w / 2 + 0.08 + k * 0.12,
					).map((x, k) => (
						<mesh
							key={x}
							position={[x, 1.2, 0]}
							material={m.stock[k % m.stock.length]}
						>
							<boxGeometry args={[0.03, 0.62, 0.4]} />
						</mesh>
					))}
				</group>
			)}
		</group>
	);
}

const Bench: PartComponent = (p) => {
	const m = mats();
	return (
		<mesh position={[0, p.h / 2, 0]} material={m.wood} castShadow>
			<boxGeometry args={[p.w, p.h, p.d]} />
		</mesh>
	);
};

const FittingNook: PartComponent = (p) => {
	const m = mats();
	return (
		<group>
			<mesh
				position={[0, 1.9, 0]}
				rotation={[0, 0, Math.PI / 2]}
				material={m.brushed}
			>
				<cylinderGeometry args={[0.012, 0.012, p.w, 8]} />
			</mesh>
			<mesh
				position={[0, 1.0, p.face * (p.d / 2 - 0.02)]}
				material={m.stock[1]}
			>
				<boxGeometry args={[p.w, 1.8, 0.02]} />
			</mesh>
		</group>
	);
};

const None: PartComponent = () => null;

/** Every catalog id → its part. `parts.test.ts` checks nothing is missing. */
export const PARTS: Record<string, PartComponent> = {
	till: Till,
	servery: (p) => <Base {...p} />,
	"display-case": DisplayCase,
	"display-wall": (p) => <Shelving p={p} kind="display" />,
	"pour-stations": PourStation,
	fryer: Fryer,
	griddle: Griddle,
	"griddle-chargrill": GriddleChargrill,
	"pizza-oven": PizzaOven,
	"wok-rice-station": WokStation,
	"hot-station": HotStation,
	"extraction-hood": Hood,
	"coffee-machine": Espresso,
	"espresso-machine": Espresso,
	grinder: Grinder,
	"drinks-station": Fridge,
	"boba-tea-brewers": TeaBrewers,
	"sealing-machine": Sealer,
	ice: IceWell,
	"glass-wash": GlassWash,
	refrigeration: Fridge,
	"chilled-storage": SolidCold,
	"chilled-milk-storage": Fridge,
	freezers: SolidCold,
	"prep-counter": PrepCounter,
	"finishing-counter": PrepCounter,
	"dough-prep": PrepCounter,
	"hand-basin": HandSink,
	"secure-storage": (p) => <Shelving p={p} kind="locker" />,
	bookshelf: (p) => <Shelving p={p} kind="books" />,
	"reading-bench": Bench,
	"merch-rail": (p) => <Shelving p={p} kind="rail" />,
	"fitting-nook": FittingNook,
	"fire-suppression": SuppressionPipe,
	// Under the deck, on the roof or part of the shell — drawn elsewhere.
	"fresh-grey-water-tanks": None,
	"water-filtration": None,
	"digital-menu-board": MenuScreen,
	"led-track-lights": TrackLights,
	hvac: None,
	"rear-walk-in-door": None,
	"cellar-refrigeration": SolidCold,
	"reserve-freezers": SolidCold,
	"dipping-cabinet": DisplayCase,
};

export const GenericCabinet: PartComponent = (p) => <Base {...p} />;

export function partFor(id: string): PartComponent {
	return PARTS[id] ?? GenericCabinet;
}

/** Height above the deck a mount hangs from (overhead units only). */
export const OVERHEAD_Y: Record<string, number> = {
	"extraction-hood": 1.75,
	"fire-suppression": 1.75,
	"digital-menu-board": 1.95,
	"led-track-lights": 2.1,
};
