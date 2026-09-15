/**
 * The interactive trailer view: orbit the truck, click a unit to inspect it,
 * and see the power budget and aisle the current fit-out actually produces.
 *
 * This is the "single source of truth" surface — everything shown here is
 * derived from the vehicle dimensions and the equipment list, so it cannot
 * disagree with the spec sheet the factory quotes from.
 */
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, Suspense, useMemo, useState } from "react";
import { getVehicle } from "#/lib/food-truck/constants";
import {
	getEquipment,
	MIN_AISLE_M,
	planGalley,
	powerBudget,
} from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
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
					<p className="text-xs text-zinc-500">
						3D view unavailable on this device
					</p>
				</div>
			);
		}
		return this.props.children;
	}
}

const FOV_DEG = 42;

const ft = (m: number) => `${Math.round(m * 3.28084 * 10) / 10} ft`;

export interface TruckConfiguratorProps {
	vehicleId: string | null | undefined;
	equipmentIds: string[];
	wrapColors?: string[] | null;
	className?: string;
}

export default function TruckConfigurator({
	vehicleId,
	equipmentIds,
	wrapColors,
	className,
}: TruckConfiguratorProps) {
	const [selected, setSelected] = useState<string | null>(null);
	const [cutaway, setCutaway] = useState(true);

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

	if (!vehicle || !dims || !layout) return null;

	const tightAisle = layout.aisleM < MIN_AISLE_M;

	// Frame from the body's bounding sphere rather than its length: a 10ft
	// trailer is nearly as tall as it is long, so sizing on length alone crops
	// the roof and the wheels.
	const radius =
		Math.sqrt(dims.lengthM ** 2 + dims.widthM ** 2 + dims.heightM ** 2) / 2;
	const distance = (radius / Math.tan((FOV_DEG * Math.PI) / 360)) * 1.18;
	// A three-quarter view — front corner, slightly above eye level.
	const camera: [number, number, number] = [
		distance * 0.62,
		distance * 0.34,
		distance * 0.71,
	];

	return (
		<div className={className}>
			<div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#0b0b10] sm:h-[340px]">
				<SceneBoundary>
					<Canvas
						shadows
						dpr={[1, 1.75]}
						camera={{ position: camera, fov: FOV_DEG }}
					>
						<Suspense fallback={null}>
							<Environment preset="city" />
						</Suspense>
						<ambientLight intensity={0.55} />
						<directionalLight
							position={[6, 9, 5]}
							intensity={1.8}
							castShadow
							shadow-mapSize={[1024, 1024]}
						/>
						<TruckModel
							dims={dims}
							equipmentIds={equipmentIds}
							cutaway={cutaway}
							selectedEquipment={selected}
							onSelectEquipment={setSelected}
							wrapColors={wrapColors}
						/>
						<ContactShadows
							position={[0, -(0.62 + dims.heightM) / 2 - 0.01, 0]}
							opacity={0.55}
							scale={radius * 4}
							blur={2.2}
							far={3}
						/>
						<OrbitControls
							makeDefault
							enablePan={false}
							minDistance={distance * 0.55}
							maxDistance={distance * 2.2}
							maxPolarAngle={Math.PI / 2 - 0.04}
						/>
					</Canvas>
				</SceneBoundary>

				<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
					<span className="pointer-events-auto rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-zinc-300 backdrop-blur">
						{vehicle.label} · {ft(dims.widthM)} wide
					</span>
					<button
						type="button"
						onClick={() => setCutaway((v) => !v)}
						className="pointer-events-auto rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-zinc-300 backdrop-blur transition hover:text-white"
					>
						{cutaway ? "Show shell" : "Cutaway"}
					</button>
				</div>

				<p className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 text-center text-[10px] text-zinc-600">
					{selectedSpec
						? `${selectedSpec.label} · ${ft(selectedSpec.widthM)} wide · ${selectedSpec.watts > 0 ? `${selectedSpec.watts.toLocaleString()} W` : "no power"}`
						: "Drag to orbit · tap a unit to inspect it"}
				</p>
			</div>

			{/* Zone legend */}
			<div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
				{(
					Object.entries(ZONE_COLOR) as Array<[keyof typeof ZONE_COLOR, string]>
				)
					.filter(([zone]) => layout.placed.some((p) => p.spec.zone === zone))
					.map(([zone, color]) => (
						<span
							key={zone}
							className="flex items-center gap-1.5 text-[10px] capitalize text-zinc-500"
						>
							<span
								className="h-2 w-2 rounded-sm"
								style={{ backgroundColor: color }}
							/>
							{zone}
						</span>
					))}
			</div>

			{/* What the fit-out costs you in power and space */}
			<div className="mt-2.5 grid grid-cols-2 gap-2">
				<div className="rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3">
					<p className="text-[10px] text-zinc-500">Power draw</p>
					<p className="text-lg font-bold text-amber-400">
						{(power.designWatts / 1000).toFixed(1)} kW
					</p>
					<p className="text-[10px] text-zinc-600">
						{power.ampsAt240V}A · {power.supply}
					</p>
				</div>
				<div className="rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] p-3">
					<p className="text-[10px] text-zinc-500">Chef aisle</p>
					<p
						className={`text-lg font-bold ${tightAisle ? "text-red-400" : "text-emerald-400"}`}
					>
						{ft(layout.aisleM)}
					</p>
					<p className="text-[10px] text-zinc-600">
						{tightAisle ? "below working minimum" : "workable clearance"}
					</p>
				</div>
			</div>

			{(tightAisle || power.overShore || layout.overflow.length > 0) && (
				<ul className="mt-2 space-y-1">
					{tightAisle && (
						<li className="text-[10px] leading-relaxed text-amber-400/90">
							This menu fills both walls of a {ft(dims.lengthM)} box, leaving a{" "}
							{ft(layout.aisleM)} aisle. A longer body, or moving the drinks
							station to a hatch end-cap, buys the clearance back.
						</li>
					)}
					{power.overShore && (
						<li className="text-[10px] leading-relaxed text-amber-400/90">
							{(power.designWatts / 1000).toFixed(1)} kW exceeds a 50A shore
							supply — this build needs a generator or a second feed. Swapping
							the fryer to gas is the usual fix.
						</li>
					)}
					{layout.overflow.length > 0 && (
						<li className="text-[10px] leading-relaxed text-red-400/90">
							No room for {layout.overflow.map((o) => o.label).join(", ")} in
							this body.
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
