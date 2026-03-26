import {
	ContactShadows,
	Environment,
	Float,
	OrbitControls,
	Text,
	useGLTF,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

const MODEL_URL = "/models/truck.glb";

function TruckModel({ brandName }: { brandName: string }) {
	const { scene } = useGLTF(MODEL_URL);

	const cloned = useMemo(() => scene.clone(true), [scene]);

	useEffect(() => {
		const purple = new THREE.MeshStandardMaterial({
			color: new THREE.Color("#a855f7"),
			metalness: 0.3,
			roughness: 0.55,
		});

		cloned.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.castShadow = true;
				child.receiveShadow = true;

				const mat = child.material as THREE.MeshStandardMaterial;
				if (!mat?.color) return;

				const hsl = { h: 0, s: 0, l: 0 };
				mat.color.getHSL(hsl);

				const isGlass = mat.transparent || mat.opacity < 0.95;
				if (isGlass) {
					child.material = new THREE.MeshStandardMaterial({
						color: new THREE.Color("#0a0a14"),
						metalness: 0.95,
						roughness: 0.05,
						transparent: true,
						opacity: 0.8,
					});
				} else if (hsl.l < 0.15) {
					child.material = new THREE.MeshStandardMaterial({
						color: new THREE.Color("#1a1a22"),
						metalness: 0.6,
						roughness: 0.4,
					});
				} else if (hsl.l > 0.85) {
					child.material = new THREE.MeshStandardMaterial({
						color: new THREE.Color("#e9d5ff"),
						metalness: 0.2,
						roughness: 0.4,
					});
				} else {
					child.material = purple.clone();
				}
			}
		});
	}, [cloned]);

	const box = useMemo(() => {
		const b = new THREE.Box3().setFromObject(cloned);
		const size = new THREE.Vector3();
		const center = new THREE.Vector3();
		b.getSize(size);
		b.getCenter(center);
		return { size, center };
	}, [cloned]);

	const targetHeight = 2.5;
	const scale = targetHeight / Math.max(box.size.y, 0.01);

	return (
		<Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.2}>
			<group
				scale={[scale, scale, scale]}
				position={[
					-box.center.x * scale,
					-box.center.y * scale + (targetHeight / 2) * 0.4,
					-box.center.z * scale,
				]}
			>
				<primitive object={cloned} />
			</group>

			{/* Brand name floating above */}
			<Text
				position={[0, targetHeight * 0.95, 0]}
				fontSize={0.25}
				color="#e9d5ff"
				anchorX="center"
				anchorY="middle"
				letterSpacing={0.15}
				fontWeight={700}
			>
				{brandName.toUpperCase()}
			</Text>

			<Text
				position={[0, targetHeight * 0.95 - 0.35, 0]}
				fontSize={0.11}
				color="#c084fc"
				anchorX="center"
				anchorY="middle"
				letterSpacing={0.2}
			>
				MOBILE RETAIL
			</Text>
		</Float>
	);
}

function LoadingFallback() {
	return (
		<mesh>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial color="#a855f7" wireframe />
		</mesh>
	);
}

export default function TruckScene({ brandName }: { brandName: string }) {
	return (
		<Canvas
			camera={{ position: [6, 3.5, 6], fov: 36 }}
			dpr={[1, 2]}
			gl={{ antialias: true, alpha: true }}
			style={{ background: "transparent" }}
			shadows
		>
			<color attach="background" args={["#09090b"]} />
			<fog attach="fog" args={["#09090b", 12, 28]} />

			<ambientLight intensity={0.4} />
			<directionalLight
				position={[5, 8, 5]}
				intensity={1.5}
				castShadow
				color="#f5f0ff"
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
			/>
			<directionalLight
				position={[-4, 3, -2]}
				intensity={0.4}
				color="#c084fc"
			/>
			<pointLight position={[0, 6, 0]} intensity={0.4} color="#a855f7" />

			<Suspense fallback={<LoadingFallback />}>
				<TruckModel brandName={brandName} />
				<Environment preset="city" />
			</Suspense>

			<ContactShadows
				position={[0, -0.01, 0]}
				opacity={0.35}
				scale={16}
				blur={2.5}
				far={6}
				color="#7c3aed"
			/>

			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -0.02, 0]}
				receiveShadow
			>
				<planeGeometry args={[40, 40]} />
				<meshStandardMaterial color="#09090b" roughness={1} />
			</mesh>

			<OrbitControls
				enableZoom={false}
				enablePan={false}
				minPolarAngle={Math.PI / 6}
				maxPolarAngle={Math.PI / 2.2}
				autoRotate
				autoRotateSpeed={1.2}
			/>
		</Canvas>
	);
}

useGLTF.preload(MODEL_URL);
