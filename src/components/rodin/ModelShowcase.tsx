import SceneViewer from "./SceneViewer";

const MODEL_URL = "/models/truck.glb";

export default function ModelShowcase() {
	return <SceneViewer modelUrl={MODEL_URL} />;
}
