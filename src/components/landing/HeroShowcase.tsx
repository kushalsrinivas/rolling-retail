/**
 * The hero: the vehicle, immediately.
 *
 * The best thing on this page is a trailer you can turn around and open up, so
 * it goes first rather than three screens down. The canvas cycles through the
 * builds the factory is actually asked for — a visitor who runs a coffee cart
 * sees a coffee cart within a few seconds — and stops the moment anyone drags
 * it, because from then on they are driving.
 */
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, Suspense, useEffect, useMemo, useState } from "react";
import TruckModel from "#/components/truck/TruckModel";
import { getVehicle } from "#/lib/food-truck/constants";
import { powerBudget } from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { SHOWCASE_PRESETS } from "./showcase-presets";

const DWELL_MS = 5600;
const FOV = 36;

class SceneBoundary extends Component<
	{ children: ReactNode },
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
		if (this.state.failed) return null;
		return this.props.children;
	}
}

export default function HeroShowcase() {
	const [index, setIndex] = useState(0);
	const [hotspot, setHotspot] = useState<string | null>(null);
	const [paused, setPaused] = useState(false);

	const preset = SHOWCASE_PRESETS[index];

	useEffect(() => {
		if (paused) return;
		const id = setTimeout(() => {
			setIndex((index + 1) % SHOWCASE_PRESETS.length);
			setHotspot(null);
		}, DWELL_MS);
		return () => clearTimeout(id);
	}, [index, paused]);

	const take = (next: number) => {
		setPaused(true);
		setIndex(next);
		setHotspot(null);
	};

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

	return (
		<div className="relative h-[58vh] min-h-[380px] w-full overflow-hidden bg-[#111110] sm:h-[66vh]">
			<SceneBoundary>
				<Canvas
					shadows
					dpr={[1, 1.6]}
					camera={{
						position: [distance * 0.68, distance * 0.3, distance * 0.66],
						fov: FOV,
					}}
					onPointerDown={() => setPaused(true)}
				>
					<Suspense fallback={null}>
						<Environment preset="city" />
					</Suspense>
					<ambientLight intensity={0.9} />
					<directionalLight
						position={[7, 11, 6]}
						intensity={1.7}
						castShadow
						shadow-mapSize={[1024, 1024]}
					/>
					<TruckModel
						key={preset.id}
						dims={dims}
						equipmentIds={preset.equipmentIds}
						cutaway
						selectedEquipment={hotspot}
						onSelectEquipment={(id) => {
							setPaused(true);
							setHotspot(id);
						}}
						wrapColors={preset.wrapColors}
						palette="materials"
					/>
					<ContactShadows
						position={[0, -(0.62 + dims.heightM) / 2 - 0.01, 0]}
						opacity={0.6}
						scale={radius * 4}
						blur={2.8}
						far={3}
					/>
					<OrbitControls
						makeDefault
						enablePan={false}
						autoRotate={!paused}
						autoRotateSpeed={0.5}
						minDistance={distance * 0.62}
						maxDistance={distance * 1.8}
						maxPolarAngle={Math.PI / 2 - 0.05}
					/>
				</Canvas>
			</SceneBoundary>

			{/* Readability wash under the overlaid type. */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#111110] via-[#111110]/70 to-transparent" />

			{/* Which build, and what it draws. */}
			<div className="pointer-events-none absolute left-0 top-0 p-5 sm:p-7">
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
									onClick={() => {
										setPaused(true);
										setHotspot(on ? null : h.equipmentId);
									}}
									className={`flex w-full items-baseline justify-between gap-3 border-b border-white/10 py-2.5 text-left text-[13.5px] transition-colors ${
										on ? "text-stone-50" : "text-stone-400 hover:text-stone-100"
									}`}
								>
									{h.label}
									<span className="font-mono text-[11px] text-stone-500">
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
			<div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-5 sm:p-7">
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
				<span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-stone-500 sm:block">
					{paused ? "Drag to orbit" : "Auto · drag to take over"}
				</span>
			</div>

			{/* On phones the hotspot detail sits under the switcher instead. */}
			{detail && (
				<p className="absolute inset-x-0 bottom-16 px-5 text-[12.5px] leading-relaxed text-stone-300 md:hidden">
					{detail.detail}
				</p>
			)}
		</div>
	);
}
