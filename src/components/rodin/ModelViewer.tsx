import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, Suspense } from "react";
import LoadingPlaceholder from "./LoadingPlaceholder";
import ModelComponent from "./ModelComponent";
import SceneSetup from "./SceneSetup";

export type EnvironmentPreset =
	| "apartment"
	| "city"
	| "dawn"
	| "forest"
	| "lobby"
	| "night"
	| "park"
	| "studio"
	| "sunset"
	| "warehouse";

/* Catches errors at the React tree level above the Canvas */
class ViewerErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; error: string }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, error: "" };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error: error.message };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[ModelViewer] Caught error:", error.message, info);
	}

	render() {
		if (this.state.hasError) {
			// The usual cause is the model failing to download, so say that and
			// offer another go rather than a dead end that hides the reason.
			return (
				<div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black px-6 text-center">
					<p className="text-xs text-zinc-400">Could not load the 3D model</p>
					<p className="max-w-xs text-[11px] leading-relaxed text-zinc-600">
						{this.state.error || "The file may still be downloading."}
					</p>
					<button
						type="button"
						onClick={() => this.setState({ hasError: false, error: "" })}
						className="mt-1 rounded-full border border-zinc-700 px-3 py-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default function ModelViewer({
	modelUrl,
	environment = "night",
}: {
	modelUrl: string | null;
	environment?: EnvironmentPreset;
}) {
	return (
		<ViewerErrorBoundary>
			<div className="h-full w-full bg-black bg-[radial-gradient(ellipse_at_center,rgba(50,50,50,0.3)_0%,transparent_70%)]">
				<Canvas
					camera={{ position: [0, 0, 5], fov: 50 }}
					gl={{ alpha: true, antialias: true }}
					style={{ background: "transparent" }}
					onCreated={({ gl }) => {
						gl.setClearColor(0x000000, 0);
					}}
				>
					<SceneSetup />
					<ambientLight intensity={0.3} />
					<spotLight
						position={[10, 10, 10]}
						angle={0.15}
						penumbra={1}
						castShadow
						intensity={1}
					/>
					<pointLight position={[-10, -10, -10]} intensity={0.5} />

					<Suspense fallback={<LoadingPlaceholder />}>
						{modelUrl ? (
							<ModelComponent url={modelUrl} />
						) : (
							<LoadingPlaceholder />
						)}
					</Suspense>

					<OrbitControls
						minDistance={3}
						maxDistance={10}
						enableZoom={true}
						enablePan={false}
						autoRotate={true}
						autoRotateSpeed={1}
					/>

					<Suspense fallback={null}>
						<Environment preset={environment} />
					</Suspense>
				</Canvas>
			</div>
		</ViewerErrorBoundary>
	);
}
