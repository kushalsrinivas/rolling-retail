import { Center, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function ModelComponent({
	url,
	resetCamera = true,
}: {
	url: string;
	resetCamera?: boolean;
}) {
	const [isLoading, setIsLoading] = useState(true);
	const { scene } = useGLTF(url);
	const { camera } = useThree();

	useEffect(() => {
		if (resetCamera) {
			camera.position.set(0, 0, 5);
		}

		if (scene) {
			setIsLoading(false);
		}

		return () => {
			setIsLoading(true);
		};
	}, [camera, scene, resetCamera]);

	if (isLoading) {
		return <LoadingSpinner />;
	}

	return (
		<Center>
			<primitive object={scene} scale={1.5} />
		</Center>
	);
}
