import SceneViewer from "./SceneViewer";

const MODEL_URL = "/models/base_basic_pbr.glb";

export default function ModelShowcase() {
	return <SceneViewer modelUrl={MODEL_URL} />;
}
