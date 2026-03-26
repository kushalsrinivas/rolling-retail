import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function SceneSetup() {
	const { scene } = useThree();

	useEffect(() => {
		scene.background = null;
	}, [scene]);

	return null;
}
