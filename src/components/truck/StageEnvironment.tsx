/**
 * The ground and light the trailer stands in — the buyer's own pitch.
 * Grass for festivals, gravel for a brewery yard, pavers for an office
 * plaza; night service dims the sky so the trailer's own lights carry it.
 */
import { ContactShadows, Environment } from "@react-three/drei";
import { Suspense } from "react";
import type { GroundKind } from "#/lib/food-truck/build-scene";

const GROUND: Record<GroundKind, { color: string; roughness: number }> = {
	studio: { color: "#2a241e", roughness: 0.95 },
	concrete: { color: "#8d8a85", roughness: 0.95 },
	grass: { color: "#5f7d3a", roughness: 1 },
	lawn: { color: "#6f8f45", roughness: 1 },
	pavers: { color: "#a39a8c", roughness: 0.9 },
	gravel: { color: "#9b8e7a", roughness: 1 },
};

export default function StageEnvironment({
	ground,
	night,
	floorY,
	radius,
}: {
	ground: GroundKind;
	night: boolean;
	/** World y of the ground plane. */
	floorY: number;
	radius: number;
}) {
	const g = GROUND[ground];
	return (
		<>
			<Suspense fallback={null}>
				<Environment preset={night ? "night" : "city"} />
			</Suspense>
			<hemisphereLight
				args={[night ? "#3b4a6b" : "#fff6e9", "#3a3129", night ? 0.25 : 0.6]}
			/>
			<directionalLight
				position={[6, 10, 6]}
				intensity={night ? 0.35 : 2}
				castShadow
				shadow-mapSize={[1024, 1024]}
				shadow-bias={-0.0004}
			/>
			<directionalLight position={[-6, 4, -4]} intensity={night ? 0.15 : 0.5} />
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, floorY - 0.004, 0]}
				receiveShadow
			>
				<circleGeometry args={[radius * 1.6, 64]} />
				<meshStandardMaterial
					color={night ? "#1d1a17" : g.color}
					roughness={g.roughness}
				/>
			</mesh>
			<ContactShadows
				position={[0, floorY, 0]}
				opacity={night ? 0.4 : 0.6}
				scale={radius * 4}
				blur={2.4}
				far={3.5}
			/>
		</>
	);
}
