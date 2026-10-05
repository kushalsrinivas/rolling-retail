/**
 * The brief's live build — the trailer assembling beside the questions.
 *
 * Every answer changes something you can see: the business drops its line
 * onto a bare chassis, the truck step raises the walls, colors wrap them,
 * features bolt on, the pitch becomes the ground it stands on. By the review
 * step the buyer is looking at the trailer they designed, built from the
 * same layout engine and color plan the renders and the factory use.
 *
 * Loaded lazily — three.js stays out of the quiz's first paint.
 */
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Check } from "lucide-react";
import {
	Component,
	type ErrorInfo,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import TruckModel from "#/components/truck/TruckModel";
import StageEnvironment from "#/components/truck/StageEnvironment";
import type { BuildScene, BuildStep } from "#/lib/food-truck/build-scene";
import { footprintFt, getVehicle } from "#/lib/food-truck/constants";
import type { VehicleBody } from "#/lib/food-truck/images";
import { cn } from "#/lib/utils";

const FOV = 36;
const FLOOR_Y = 0.62;

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[BriefCompanion]", error.message, info);
	}
	render() {
		if (this.state.failed)
			return (
				<p className="grid h-full place-items-center px-6 text-center text-[13px] text-white/70">
					3D preview isn&apos;t available on this device — your brief still
					works.
				</p>
			);
		return this.props.children;
	}
}

/** Eases the camera's distance when the body changes size; keeps its angle. */
function Framing({
	distance,
	touched,
}: {
	distance: number;
	touched: boolean;
}) {
	const { camera } = useThree();
	const done = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new distance restarts the glide
	useEffect(() => {
		done.current = false;
	}, [distance]);
	useFrame((_, dt) => {
		if (done.current) return;
		const dir = camera.position.clone().normalize();
		const cur = camera.position.length();
		const next = THREE.MathUtils.damp(cur, distance, 3, dt);
		camera.position.copy(dir.multiplyScalar(next));
		if (Math.abs(next - distance) < 0.02 || touched) done.current = true;
	});
	return null;
}

const STEPS: Array<{ id: BuildStep; label: string }> = [
	{ id: "chassis", label: "Chassis" },
	{ id: "line", label: "Line" },
	{ id: "body", label: "Body" },
	{ id: "wrap", label: "Wrap" },
	{ id: "features", label: "Features" },
];

export interface BriefCompanionProps {
	scene: BuildScene;
	caption: string | null;
	className?: string;
}

export default function BriefCompanion({
	scene,
	caption,
	className,
}: BriefCompanionProps) {
	const [touched, setTouched] = useState(false);
	const [visible, setVisible] = useState(true);
	const host = useRef<HTMLDivElement>(null);
	const vehicle = getVehicle(scene.bodyId) ?? getVehicle("square-4m");

	// Stop rendering when the companion is off screen or the tab is hidden.
	useEffect(() => {
		const el = host.current;
		if (!el || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
			threshold: 0.05,
		});
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const dims = useMemo(
		() =>
			vehicle
				? {
						lengthM: vehicle.lengthM,
						widthM: vehicle.widthM,
						heightM: vehicle.heightM,
						body: vehicle.body as VehicleBody,
					}
				: null,
		[vehicle],
	);
	if (!vehicle || !dims) return null;

	const radius =
		Math.sqrt(
			(dims.lengthM + 1.3) ** 2 + dims.widthM ** 2 + (dims.heightM + 0.6) ** 2,
		) / 2;
	const distance = (radius / Math.tan((FOV * Math.PI) / 360)) * 1.08;
	const start: [number, number, number] = [
		-distance * 0.62,
		distance * 0.34,
		distance * 0.71,
	];
	const groundY = -(FLOOR_Y + dims.heightM) / 2;
	const reduced =
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

	return (
		<div
			ref={host}
			className={cn(
				"relative h-full w-full overflow-hidden rounded-2xl border-2 border-[var(--ftf-ink)] bg-[radial-gradient(ellipse_at_50%_30%,#3d3329_0%,#17130f_72%)] shadow-[6px_6px_0_var(--ftf-ink)]",
				scene.night &&
					"bg-[radial-gradient(ellipse_at_50%_30%,#1f2a44_0%,#0b0d14_75%)]",
				className,
			)}
		>
			<Boundary>
				<Canvas
					shadows
					dpr={[1, 1.6]}
					frameloop={visible ? "always" : "never"}
					camera={{ position: start, fov: FOV }}
					gl={{ localClippingEnabled: true, antialias: true }}
					onPointerDown={() => setTouched(true)}
				>
					<StageEnvironment
						ground={scene.ground}
						night={scene.night}
						floorY={groundY}
						radius={radius}
					/>
					<TruckModel
						key={scene.bodyId}
						dims={dims}
						equipmentIds={scene.equipmentIds}
						reveal={scene.reveal}
						wrapColors={scene.wrapColors}
						finish={scene.finish}
						features={scene.features}
						brandName={scene.brandName}
						night={scene.night}
						palette="materials"
						hatchOpen
						showLabels
					/>
					<OrbitControls
						makeDefault
						enablePan={false}
						enableDamping
						autoRotate={!touched && !reduced}
						autoRotateSpeed={scene.finished ? 1.1 : 0.55}
						minDistance={distance * 0.5}
						maxDistance={distance * 1.7}
						maxPolarAngle={Math.PI / 2 - 0.04}
						onStart={() => setTouched(true)}
					/>
					<Framing distance={distance} touched={touched} />
				</Canvas>
			</Boundary>

			{/* header */}
			<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
				<div>
					<p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white/55">
						{scene.finished ? "Your trailer" : "Building your trailer"}
					</p>
					<p className="ftf-display mt-1 text-[22px] text-white">
						{scene.brandName || vehicle.label}
					</p>
					<p className="mt-0.5 text-[12px] text-white/65">
						{vehicle.label} · {footprintFt(vehicle)}
					</p>
				</div>
				{scene.reveal > 0 && (
					<span
						className={cn(
							"rounded-full border-2 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase",
							scene.bodyLocked
								? "border-[#ffc83d] bg-[#ffc83d] text-[#17130f]"
								: "border-white/40 text-white/80",
						)}
					>
						{scene.bodyLocked ? "Your pick" : "Our pick"}
					</span>
				)}
			</div>

			{/* caption + checklist */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
				{caption && (
					<p
						key={caption}
						className="ftf-caption mb-3 inline-block rounded-full border-2 border-[#ff5a1f] bg-[#17130f]/90 px-3.5 py-1.5 text-[12.5px] font-bold text-white"
					>
						{caption}
					</p>
				)}
				<ol className="flex flex-wrap gap-1.5" aria-label="Build progress">
					{STEPS.map((s) => {
						const on = scene.done[s.id];
						return (
							<li
								key={s.id}
								className={cn(
									"flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-500",
									on ? "bg-white text-[#17130f]" : "bg-white/10 text-white/50",
								)}
							>
								{on && <Check className="h-3 w-3" />}
								{s.label}
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
