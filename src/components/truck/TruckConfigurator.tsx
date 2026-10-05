/**
 * The interactive trailer: walk around it, open the hatch, look inside, and
 * tap any unit to see what it is and what it draws.
 *
 * Everything shown is derived from the vehicle dimensions, the equipment
 * list and the palette — the same inputs the renders and the spec sheet use
 * — so the model cannot disagree with the trailer the factory quotes.
 */
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import {
	Component,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { getVehicle } from "#/lib/food-truck/constants";
import {
	getEquipment,
	MIN_AISLE_M,
	planGalley,
	powerBudget,
} from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { cn } from "#/lib/utils";
import TruckModel, { ZONE_COLOR } from "./TruckModel";

class SceneBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[TruckConfigurator]", error.message, info);
	}
	render() {
		if (this.state.failed) {
			return (
				<div className="flex h-full w-full items-center justify-center">
					<p className="text-sm text-white/70">
						3D view isn&apos;t available on this device.
					</p>
				</div>
			);
		}
		return this.props.children;
	}
}

const FOV_DEG = 38;
const ft = (m: number) => `${Math.round(m * 3.28084 * 10) / 10} ft`;

type Preset = "three-quarter" | "curbside" | "rear" | "inside";

const PRESETS: Array<{ id: Preset; label: string }> = [
	{ id: "three-quarter", label: "3/4 view" },
	{ id: "curbside", label: "Curbside" },
	{ id: "rear", label: "Rear" },
	{ id: "inside", label: "Inside" },
];

function presetPosition(p: Preset, d: number): THREE.Vector3 {
	switch (p) {
		case "curbside":
			return new THREE.Vector3(0, d * 0.16, d * 1.02);
		case "rear":
			return new THREE.Vector3(d * 0.85, d * 0.22, -d * 0.48);
		case "inside":
			// High over the cut, slightly to the curbside, close enough to read the line.
			return new THREE.Vector3(d * 0.04, d * 0.62, d * 0.3);
		default:
			return new THREE.Vector3(-d * 0.62, d * 0.3, d * 0.74);
	}
}

/** Glides the camera to a preset, then hands control back to the buyer. */
function CameraRig({
	target,
	controls,
	onArrive,
}: {
	target: THREE.Vector3 | null;
	controls: React.RefObject<OrbitControlsImpl | null>;
	onArrive: () => void;
}) {
	const { camera } = useThree();
	useFrame((_, dt) => {
		if (!target) return;
		camera.position.x = THREE.MathUtils.damp(
			camera.position.x,
			target.x,
			4,
			dt,
		);
		camera.position.y = THREE.MathUtils.damp(
			camera.position.y,
			target.y,
			4,
			dt,
		);
		camera.position.z = THREE.MathUtils.damp(
			camera.position.z,
			target.z,
			4,
			dt,
		);
		controls.current?.target.set(0, 0, 0);
		controls.current?.update();
		if (camera.position.distanceTo(target) < 0.03) onArrive();
	});
	return null;
}

export interface TruckConfiguratorProps {
	vehicleId: string | null | undefined;
	equipmentIds: string[];
	wrapColors?: string[] | null;
	finish?: string | null;
	className?: string;
}

export default function TruckConfigurator({
	vehicleId,
	equipmentIds,
	wrapColors,
	finish,
	className,
}: TruckConfiguratorProps) {
	const [selected, setSelected] = useState<string | null>(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const [inside, setInside] = useState(false);
	const [hatchOpen, setHatchOpen] = useState(true);
	const [preset, setPreset] = useState<Preset>("three-quarter");
	const [goTo, setGoTo] = useState<THREE.Vector3 | null>(null);
	const [touched, setTouched] = useState(false);
	const controls = useRef<OrbitControlsImpl | null>(null);

	const vehicle = getVehicle(vehicleId) ?? getVehicle("airstream-m");
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
	const layout = useMemo(
		() => (dims ? planGalley(equipmentIds, dims) : null),
		[equipmentIds, dims],
	);
	const power = useMemo(() => powerBudget(equipmentIds), [equipmentIds]);
	const selectedSpec = selected ? getEquipment(selected) : null;

	const radius = dims
		? Math.sqrt(
				(dims.lengthM + 1.2) ** 2 + dims.widthM ** 2 + dims.heightM ** 2,
			) / 2
		: 4;
	const distance = (radius / Math.tan((FOV_DEG * Math.PI) / 360)) * 1.05;

	// Picking a unit from the chips opens the inside view so it can be seen.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new selection should open the cutaway
	useEffect(() => {
		if (selected && !inside) setInside(true);
	}, [selected]);

	if (!vehicle || !dims || !layout) return null;
	const tightAisle = layout.aisleM < MIN_AISLE_M;
	const units = layout.placed.filter(
		(p) => (p.spec.mount ?? "floor") !== "subfloor",
	);

	const go = (p: Preset) => {
		setPreset(p);
		setTouched(true);
		if (p === "inside") setInside(true);
		setGoTo(presetPosition(p, distance));
	};

	const chip =
		"rounded-full border-2 px-3 py-1 text-[12px] font-bold transition-colors";

	return (
		<div className={className}>
			<div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_35%,#3a3129_0%,#17130f_70%)] sm:h-[440px]">
				<SceneBoundary>
					<Canvas
						shadows
						dpr={[1, 1.75]}
						camera={{
							position: presetPosition("three-quarter", distance).toArray(),
							fov: FOV_DEG,
						}}
						gl={{ localClippingEnabled: true, antialias: true }}
						onPointerDown={() => setTouched(true)}
					>
						<Suspense fallback={null}>
							<Environment preset="city" />
						</Suspense>
						<hemisphereLight args={["#fff6e9", "#3a3129", 0.6]} />
						<directionalLight
							position={[6, 10, 6]}
							intensity={2}
							castShadow
							shadow-mapSize={[2048, 2048]}
							shadow-bias={-0.0004}
						/>
						<directionalLight position={[-6, 4, -4]} intensity={0.5} />
						<TruckModel
							dims={dims}
							equipmentIds={equipmentIds}
							cutaway={inside}
							hatchOpen={hatchOpen}
							selectedEquipment={selected}
							onSelectEquipment={setSelected}
							hoveredEquipment={hovered}
							onHoverEquipment={setHovered}
							wrapColors={wrapColors}
							finish={finish}
							palette="zones"
							showLabels
						/>
						<ContactShadows
							position={[0, -(0.62 + dims.heightM) / 2 - 0.005, 0]}
							opacity={0.65}
							scale={radius * 4}
							blur={2.4}
							far={3.5}
						/>
						<OrbitControls
							ref={controls}
							makeDefault
							enablePan={false}
							enableDamping
							dampingFactor={0.08}
							autoRotate={!touched}
							autoRotateSpeed={0.6}
							minDistance={distance * 0.45}
							maxDistance={distance * 1.8}
							maxPolarAngle={Math.PI / 2 - 0.04}
							onStart={() => {
								setTouched(true);
								setGoTo(null);
							}}
						/>
						<CameraRig
							target={goTo}
							controls={controls}
							onArrive={() => setGoTo(null)}
						/>
					</Canvas>
				</SceneBoundary>

				{/* toolbar */}
				<div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
					<div className="flex flex-wrap gap-1.5">
						{PRESETS.map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => go(p.id)}
								className={cn(
									chip,
									preset === p.id && touched
										? "border-[#ff5a1f] bg-[#ff5a1f] text-[#17130f]"
										: "border-white/30 bg-black/40 text-white hover:border-white",
								)}
							>
								{p.label}
							</button>
						))}
					</div>
					<div className="flex gap-1.5">
						<button
							type="button"
							aria-pressed={inside}
							onClick={() => setInside((v) => !v)}
							className={cn(
								chip,
								inside
									? "border-[#ffc83d] bg-[#ffc83d] text-[#17130f]"
									: "border-white/30 bg-black/40 text-white hover:border-white",
							)}
						>
							{inside ? "Hide inside" : "See inside"}
						</button>
						<button
							type="button"
							aria-pressed={hatchOpen}
							onClick={() => setHatchOpen((v) => !v)}
							className={cn(
								chip,
								"border-white/30 bg-black/40 text-white hover:border-white",
							)}
						>
							{hatchOpen ? "Close hatch" : "Open hatch"}
						</button>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
					<span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white/85">
						{vehicle.label} · {ft(dims.lengthM)} × {ft(dims.widthM)}
					</span>
					<span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/70">
						{selectedSpec
							? `${selectedSpec.label} · ${ft(selectedSpec.widthM)} wide · ${selectedSpec.fuel === "propane" ? "propane-fired" : selectedSpec.watts > 0 ? `${(selectedSpec.watts / 1000).toFixed(1)} kW` : "no power"}`
							: "Drag to turn · scroll to zoom · tap a unit"}
					</span>
				</div>
			</div>

			{/* the line, as chips — two-way with the 3D selection */}
			<div className="mt-3 flex flex-wrap gap-1.5">
				{units.map((p) => {
					const on = selected === p.spec.id;
					return (
						<button
							key={`${p.spec.id}-${p.offsetM}`}
							type="button"
							onClick={() => setSelected(on ? null : p.spec.id)}
							onMouseEnter={() => setHovered(p.spec.id)}
							onMouseLeave={() => setHovered(null)}
							className={cn(
								"flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[12px] font-bold transition-colors",
								on
									? "border-[var(--ftf-ink)] bg-[var(--ftf-ink)] text-white"
									: "border-[var(--ftf-ink)] bg-white hover:bg-[var(--ftf-amber-100)]",
							)}
						>
							<span
								className="h-2 w-2 rounded-full"
								style={{ backgroundColor: ZONE_COLOR[p.spec.zone] }}
							/>
							{p.spec.label}
						</button>
					);
				})}
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-xl border-2 border-[var(--ftf-ink)] bg-white p-3">
					<p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ftf-ink-3)]">
						Electrical load
					</p>
					<p className="ftf-display mt-1 text-[24px]">
						{(power.designWatts / 1000).toFixed(1)} kW
					</p>
					<p className="mt-1 text-[11.5px] text-[var(--ftf-ink-3)]">
						{power.ampsAt240V}A at 240V · {power.supply}
						{power.propaneUnits.length > 0 && <> · cooking on propane</>}
					</p>
				</div>
				<div className="rounded-xl border-2 border-[var(--ftf-ink)] bg-white p-3">
					<p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ftf-ink-3)]">
						Working aisle
					</p>
					<p
						className={cn(
							"ftf-display mt-1 text-[24px]",
							tightAisle && "text-[var(--ftf-red-600)]",
						)}
					>
						{ft(layout.aisleM)}
					</p>
					<p className="mt-1 text-[11.5px] text-[var(--ftf-ink-3)]">
						{tightAisle
							? "Below the working minimum"
							: "Comfortable for service"}
					</p>
				</div>
			</div>
			{(tightAisle || power.overShore || layout.overflow.length > 0) && (
				<ul className="mt-2 space-y-1.5 text-[12px]">
					{tightAisle && (
						<li className="rounded-lg bg-[var(--ftf-amber-100)] px-3 py-2">
							This menu fills both walls of a {ft(dims.lengthM)} box. A longer
							body, or moving the drinks station, buys the aisle back.
						</li>
					)}
					{power.overShore && (
						<li className="rounded-lg bg-[var(--ftf-amber-100)] px-3 py-2">
							{(power.designWatts / 1000).toFixed(1)} kW is more than a 50A
							shore supply. Drop an electric unit rather than add power.
						</li>
					)}
					{layout.overflow.length > 0 && (
						<li className="rounded-lg bg-[var(--ftf-red-100)] px-3 py-2">
							No room for {layout.overflow.map((o) => o.label).join(", ")} in
							this body.
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
