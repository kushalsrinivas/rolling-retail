/**
 * The hero: the vehicle, immediately.
 *
 * The best thing on this page is a trailer you can turn around and open up, so
 * it goes first rather than three screens down. The canvas cycles through the
 * builds the factory is actually asked for — a visitor who runs a coffee cart
 * sees a coffee cart within a few seconds — and stops the moment anyone drags
 * it, because from then on they are driving.
 */
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { TrailerArt } from "#/components/site/TrailerArt";
import TruckModel from "#/components/truck/TruckModel";
import { getVehicle } from "#/lib/food-truck/constants";
import { powerBudget } from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { SHOWCASE_PRESETS } from "./showcase-presets";

/** How long the tour holds the outside of a build, then each stop inside it. */
const OUTSIDE_MS = 4800;
const INSIDE_MS = 3600;
const FOV = 36;

/**
 * Studio reflections generated on the GPU from three's own room scene: no HDR
 * download, no third-party CDN, and chrome reads as polished metal under soft
 * boxes instead of mirroring a city street into a black void.
 */
function StudioEnvironment() {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	useEffect(() => {
		const pmrem = new THREE.PMREMGenerator(gl);
		const room = new RoomEnvironment();
		const env = pmrem.fromScene(room, 0.04).texture;
		scene.environment = env;
		return () => {
			scene.environment = null;
			env.dispose();
			room.dispose();
			pmrem.dispose();
		};
	}, [gl, scene]);
	return null;
}

/**
 * Frames the whole trailer for the canvas's actual shape. Phones are portrait,
 * so the horizontal field of view is the tight one; fitting to the vertical
 * one alone clipped both ends of the trailer.
 */
function FitCamera({ radius }: { radius: number }) {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
	useEffect(() => {
		const v = (FOV * Math.PI) / 180;
		const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
		const fit = radius / Math.sin(Math.min(v, h) / 2);
		camera.position.setLength(fit);
		camera.updateProjectionMatrix();
	}, [camera, aspect, radius]);
	return null;
}

/**
 * Moves the camera for the tour. Outside, it holds the trailer at its viewing
 * distance and lets the turntable turn. Inside, it looks down through the cut
 * at the unit being shown, from the aisle side. It only steers while the tour
 * runs, or for a moment after a unit is picked by hand, so a visitor who
 * drags the trailer is never fought for the camera.
 */
function TourCamera({
	focus,
	inside,
	drive,
	distance,
	halfWidth,
	instant,
}: {
	focus: string | null;
	inside: boolean;
	drive: boolean;
	/** The trailer's bounding radius; the viewing distance is fitted from it. */
	distance: number;
	halfWidth: number;
	instant: boolean;
}) {
	const camera = useThree((s) => s.camera);
	const scene = useThree((s) => s.scene);
	const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
	// The same framing FitCamera uses: a portrait screen stands further back.
	const v = (FOV * Math.PI) / 180;
	const fit =
		distance /
		Math.sin(Math.min(v, 2 * Math.atan(Math.tan(v / 2) * aspect)) / 2);
	const controls = useThree((s) => s.controls) as unknown as {
		target: THREE.Vector3;
	} | null;
	const goal = useMemo(() => new THREE.Vector3(), []);
	const look = useMemo(() => new THREE.Vector3(), []);
	const sph = useMemo(() => new THREE.Spherical(), []);
	useFrame((_, dt) => {
		if (!drive || !controls) return;
		const k = instant ? 1 : 1 - Math.exp(-2.4 * dt);
		const unit =
			inside && focus ? scene.getObjectByName(`unit-${focus}`) : null;
		if (unit) {
			unit.getWorldPosition(look);
			look.y += 0.55;
			// From beyond the opposite wall, above the cut, looking down across
			// the aisle at the unit, so no wall ever stands between them.
			const side = look.z > 0 ? -1 : 1;
			// A portrait screen sees less across, so it stands further back.
			const widen = Math.min(1.8, fit / (distance / Math.sin(v / 2)));
			goal.set(
				look.x * 0.85 + 0.5,
				look.y + 2.2 * widen,
				side * (halfWidth + 1.9 * widen),
			);
		} else {
			look.set(0, inside ? -0.2 : 0, 0);
			const off = camera.position.clone().sub(controls.target);
			sph.setFromVector3(off);
			sph.radius = inside ? fit * 0.78 : fit;
			sph.phi = inside ? 0.72 : 1.26;
			goal.setFromSpherical(sph).add(look);
		}
		controls.target.lerp(look, k);
		camera.position.lerp(goal, k);
	});
	return null;
}

function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		if (!mq) return;
		setReduced(mq.matches);
		const on = () => setReduced(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, []);
	return reduced;
}

/** True while any part of the element is on screen. */
function useOnScreen<T extends Element>() {
	const ref = useRef<T>(null);
	const [on, setOn] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || !("IntersectionObserver" in window)) {
			setOn(true);
			return;
		}
		const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {
			rootMargin: "120px 0px",
		});
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return { ref, on };
}

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

class SceneBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[HeroShowcase]", error.message, info);
	}
	render() {
		if (this.state.failed) return this.props.fallback;
		return this.props.children;
	}
}

export default function HeroShowcase() {
	const [index, setIndex] = useState(0);
	const [hotspot, setHotspot] = useState<string | null>(null);
	const [paused, setPaused] = useState(false);
	// -1 is the outside of the build; 0, 1, 2… are its stops inside.
	const [stop, setStop] = useState(-1);
	const [manualFocusAt, setManualFocusAt] = useState(0);
	const reduced = usePrefersReducedMotion();
	// Phones show the unit's description under the canvas, so the floating
	// label (wider than a phone's canvas at close range) is left to wider screens.
	const [wide, setWide] = useState(true);
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		setWide(mq.matches);
		const on = () => setWide(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, []);
	const { ref: frameRef, on: onScreen } = useOnScreen<HTMLDivElement>();
	const [webgl, setWebgl] = useState(true);
	useEffect(() => setWebgl(hasWebGL()), []);

	const preset = SHOWCASE_PRESETS[index];
	// The tour moves on its own only when nobody has taken over, the visitor
	// has not asked for less motion, and the showcase is actually on screen.
	const touring = !paused && !reduced && onScreen;

	// The tour: the outside of a build, then each of its stops inside, then
	// the next build.
	useEffect(() => {
		if (!touring) return;
		const stops = SHOWCASE_PRESETS[index].hotspots;
		const id = setTimeout(
			() => {
				if (stop + 1 < stops.length) {
					setStop(stop + 1);
					setHotspot(stops[stop + 1].equipmentId);
				} else {
					setStop(-1);
					setHotspot(null);
					setIndex((index + 1) % SHOWCASE_PRESETS.length);
				}
			},
			stop < 0 ? OUTSIDE_MS : INSIDE_MS,
		);
		return () => clearTimeout(id);
	}, [index, stop, touring]);

	const take = (next: number) => {
		setPaused(true);
		setIndex(next);
		setStop(-1);
		setHotspot(null);
		// Fly back out to the viewing distance, wherever the camera was left.
		setManualFocusAt(performance.now());
	};
	const pick = (id: string | null) => {
		setPaused(true);
		setHotspot(id);
		setManualFocusAt(performance.now());
	};
	const inside = hotspot !== null;
	const [now, setNow] = useState(0);
	useEffect(() => {
		if (!manualFocusAt) return;
		setNow(performance.now());
		const t = setTimeout(() => setNow(performance.now()), 1800);
		return () => clearTimeout(t);
	}, [manualFocusAt]);
	const drive = touring || (manualFocusAt > 0 && now - manualFocusAt < 1700);

	const vehicle = getVehicle(preset.vehicleId);
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
	const power = useMemo(
		() => powerBudget(preset.equipmentIds),
		[preset.equipmentIds],
	);

	if (!vehicle || !dims) return null;

	const radius =
		Math.sqrt(dims.lengthM ** 2 + dims.widthM ** 2 + dims.heightM ** 2) / 2;
	const distance = (radius / Math.tan((FOV * Math.PI) / 360)) * 1.06;
	const detail = preset.hotspots.find((h) => h.equipmentId === hotspot);

	const still = (
		<div className="flex h-full w-full items-center justify-center px-8 pb-24 pt-28 md:pt-10">
			<TrailerArt
				vehicleId={preset.vehicleId}
				primary="#ff5a1f"
				className="w-full max-w-xl text-stone-200"
				title={`Drawing of the ${vehicle.label} ${preset.name.toLowerCase()} build`}
			/>
		</div>
	);

	return (
		<div
			ref={frameRef}
			className="relative flex h-[64vh] max-h-[760px] min-h-[460px] w-full flex-col overflow-hidden bg-[#111110] md:block md:h-[66vh]"
		>
			<div className="relative min-h-0 flex-1 md:absolute md:inset-0">
				{webgl ? (
					<SceneBoundary fallback={still}>
						<Canvas
							dpr={[1, 1.6]}
							frameloop={onScreen ? "always" : "never"}
							camera={{
								position: [distance * 0.68, distance * 0.3, distance * 0.66],
								fov: FOV,
							}}
							onPointerDown={() => setPaused(true)}
						>
							<StudioEnvironment />
							<FitCamera radius={radius} />
							<ambientLight intensity={0.35} />
							<directionalLight position={[7, 11, 6]} intensity={1.6} />
							<directionalLight position={[-6, 4, -5]} intensity={0.45} />
							<TruckModel
								key={preset.id}
								dims={dims}
								equipmentIds={preset.equipmentIds}
								// Whole trailer by default; open it up only to show a picked unit.
								cutaway={inside}
								showLabels={wide}
								selectedEquipment={hotspot}
								onSelectEquipment={pick}
								wrapColors={preset.wrapColors}
								palette="materials"
							/>
							{/* The trailer only changes when the build does, so the
							    contact shadow is rendered while the units settle and
							    then held, instead of re-rendering the scene every frame. */}
							<ContactShadows
								key={`${preset.id}-${hotspot ?? "shell"}`}
								frames={90}
								position={[0, -(0.62 + dims.heightM) / 2 - 0.01, 0]}
								opacity={0.6}
								scale={radius * 4}
								blur={2.8}
								far={3}
							/>
							<TourCamera
								focus={hotspot}
								inside={inside}
								drive={drive}
								distance={radius}
								halfWidth={dims.widthM / 2}
								instant={reduced}
							/>
							<OrbitControls
								makeDefault
								enablePan={false}
								autoRotate={touring && !inside}
								autoRotateSpeed={0.5}
								minDistance={distance * 0.62}
								maxDistance={distance * 2.2}
								maxPolarAngle={Math.PI / 2 - 0.05}
							/>
						</Canvas>
					</SceneBoundary>
				) : (
					still
				)}
			</div>

			{/* Readability wash under the overlaid type. */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#111110] via-[#111110]/70 to-transparent" />

			{/* Which build, and what it draws. */}
			<div className="pointer-events-none relative order-first p-5 sm:p-7 md:absolute md:left-0 md:top-0">
				<p
					key={`${preset.id}-name`}
					className="rr-reveal font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400"
					data-shown="true"
				>
					{vehicle.label}
				</p>
				<h2 className="mt-1.5 text-[22px] font-semibold tracking-tight text-stone-50 sm:text-[26px]">
					{preset.name}
				</h2>
				<p className="mt-1 max-w-xs text-[13.5px] leading-snug text-stone-400">
					{preset.summary}
				</p>
				<p className="mt-3 font-mono text-[12px] text-stone-400">
					{(power.designWatts / 1000).toFixed(1)} kW · {power.supply}
				</p>
			</div>

			{/* The parts a buyer looks for. */}
			<div className="absolute right-0 top-0 hidden w-64 p-5 sm:p-7 md:block">
				<div className="space-y-px">
					{preset.hotspots.map((h) => {
						const on = hotspot === h.equipmentId;
						return (
							<div key={h.equipmentId}>
								<button
									type="button"
									onClick={() => pick(on ? null : h.equipmentId)}
									className={`flex w-full items-baseline justify-between gap-3 border-b border-white/10 py-2.5 text-left text-[13.5px] transition-colors ${
										on ? "text-stone-50" : "text-stone-400 hover:text-stone-100"
									}`}
								>
									{h.label}
									<span className="font-mono text-[11px] text-stone-400">
										{on ? "−" : "+"}
									</span>
								</button>
								<div className="rr-disclose" data-open={on}>
									<div>
										<p className="py-2.5 text-[12.5px] leading-relaxed text-stone-400">
											{h.detail}
										</p>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Build switcher. */}
			<div className="relative order-last flex flex-wrap items-center gap-1.5 p-5 sm:p-7 md:absolute md:inset-x-0 md:bottom-0">
				{SHOWCASE_PRESETS.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => take(i)}
						aria-current={i === index}
						className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ${
							i === index
								? "bg-stone-50 text-stone-900"
								: "bg-white/10 text-stone-300 backdrop-blur hover:bg-white/20 hover:text-white"
						}`}
					>
						{p.name}
					</button>
				))}
				{!reduced && (
					<button
						type="button"
						onClick={() => setPaused((p) => !p)}
						aria-pressed={paused}
						className="ml-auto rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
					>
						{paused ? "Play tour" : "Pause tour"}
					</button>
				)}
			</div>

			{/* On phones the hotspot detail sits under the switcher instead. */}
			{detail && (
				<p className="relative px-5 pt-2 text-[12.5px] leading-relaxed text-stone-300 md:hidden">
					{detail.detail}
				</p>
			)}
		</div>
	);
}
