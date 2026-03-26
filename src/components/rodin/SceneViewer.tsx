/**
 * SceneViewer — places the truck in a full outdoor park scene.
 * Used on the landing page ModelShowcase section.
 *
 * - Polyhaven "park" HDR as both lighting AND visible background
 * - Reflective ground plane (the "tarmac / grass edge")
 * - Truck fixed at centre, user orbits around it
 * - Subtle fog for depth
 */

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, Suspense } from "react";
import ModelComponent from "./ModelComponent";

/* ─── Error boundary ─── */
class SceneErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[SceneViewer] Caught error:", error.message, info);
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-zinc-950">
					<p className="text-xs text-zinc-600">3D scene unavailable</p>
				</div>
			);
		}
		return this.props.children;
	}
}

/* ─── Ground plane ─── */
function Ground() {
	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
			<planeGeometry args={[60, 60]} />
			<meshStandardMaterial color="#2d4a2d" roughness={0.95} metalness={0.0} />
		</mesh>
	);
}

/* ─── Tarmac patch under the truck ─── */
function Tarmac() {
	return (
		<mesh
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, -1.18, 0]}
			receiveShadow
		>
			<planeGeometry args={[8, 5]} />
			<meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.1} />
		</mesh>
	);
}

/* ─── Simple tree instanced geometry ─── */
function Tree({ position }: { position: [number, number, number] }) {
	return (
		<group position={position}>
			{/* trunk */}
			<mesh position={[0, -0.2, 0]} castShadow>
				<cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
				<meshStandardMaterial color="#5c3a1e" roughness={1} />
			</mesh>
			{/* canopy */}
			<mesh position={[0, 0.9, 0]} castShadow>
				<sphereGeometry args={[0.7, 10, 10]} />
				<meshStandardMaterial color="#2d6a2d" roughness={1} />
			</mesh>
		</group>
	);
}

/* ─── Scene contents ─── */
function ParkScene({ modelUrl }: { modelUrl: string }) {
	return (
		<>
			{/* HDR — park preset uses Polyhaven evening_meadow under the hood */}
			<Suspense fallback={null}>
				<Environment
					preset="park"
					background
					backgroundBlurriness={0.04}
					backgroundIntensity={0.8}
				/>
			</Suspense>

			{/* Fog for depth */}
			<fog attach="fog" args={["#a8c5a0", 18, 55]} />

			{/* Lighting */}
			<ambientLight intensity={0.6} />
			<directionalLight
				position={[8, 12, 6]}
				intensity={2.5}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-far={50}
				shadow-camera-left={-10}
				shadow-camera-right={10}
				shadow-camera-top={10}
				shadow-camera-bottom={-10}
			/>
			<hemisphereLight args={["#87ceaa", "#3a5a3a", 0.8]} />

			{/* Ground & tarmac */}
			<Ground />
			<Tarmac />

			{/* Contact shadow under truck */}
			<ContactShadows
				position={[0, -1.15, 0]}
				opacity={0.7}
				scale={12}
				blur={2.5}
				far={4}
			/>

			{/* Trees scattered around */}
			<Tree position={[-6, -1.2, -5]} />
			<Tree position={[-8, -1.2, -2]} />
			<Tree position={[7, -1.2, -4]} />
			<Tree position={[8.5, -1.2, -7]} />
			<Tree position={[-5, -1.2, -9]} />
			<Tree position={[5, -1.2, -10]} />
			<Tree position={[-10, -1.2, -8]} />

			{/* Truck */}
			<Suspense fallback={null}>
				<ModelComponent url={modelUrl} resetCamera={false} />
			</Suspense>
		</>
	);
}

/* ─── Public component ─── */
export default function SceneViewer({ modelUrl }: { modelUrl: string }) {
	return (
		<SceneErrorBoundary>
			<div className="h-full w-full">
				<Canvas
					shadows
					camera={{ position: [5, 2, 7], fov: 40 }}
					gl={{ antialias: true }}
					onCreated={({ scene }) => {
						scene.background = null;
					}}
				>
					<ParkScene modelUrl={modelUrl} />
					<OrbitControls
						target={[0, 0, 0]}
						minDistance={4}
						maxDistance={18}
						maxPolarAngle={Math.PI / 2 - 0.05}
						enablePan={false}
						enableZoom={true}
						autoRotate={false}
					/>
				</Canvas>
			</div>
		</SceneErrorBoundary>
	);
}
