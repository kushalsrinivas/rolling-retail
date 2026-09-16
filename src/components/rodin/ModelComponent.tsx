import { Center, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";

/**
 * Renders a generated .glb.
 *
 * useGLTF hands back a scene it keeps in a cache shared across every mount.
 * Rendering that object directly means React Three Fiber disposes the cache's
 * own geometries and materials when this unmounts, so the next viewer gets a
 * gutted scene — which is why the model would load once and then fail. Cloning
 * gives this mount its own copy and leaves the cached original intact.
 */
export default function ModelComponent({
	url,
	resetCamera = true,
}: {
	url: string;
	resetCamera?: boolean;
}) {
	const { scene } = useGLTF(url);
	const { camera } = useThree();

	const model = useMemo(() => scene.clone(true), [scene]);

	useEffect(() => {
		if (resetCamera) camera.position.set(0, 0, 5);
	}, [camera, resetCamera]);

	useEffect(() => {
		return () => {
			// Each generation is a new signed URL, so without this the cache grows
			// by another ~13MB model on every run and never gives any of it back.
			useGLTF.clear(url);
		};
	}, [url]);

	return (
		<Center>
			<primitive object={model} scale={1.5} />
		</Center>
	);
}
