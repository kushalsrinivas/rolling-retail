/**
 * The showcase: one canvas, several real builds, cycling.
 *
 * A visitor who runs a coffee cart should see a coffee cart. If they have to
 * imagine their own use case into a generic box, the page has already lost
 * them — so the canvas moves through the builds the factory is actually asked
 * for, and each one names the parts a buyer would look for.
 *
 * It advances on its own until someone touches it, then it gets out of the way
 * and lets them drive.
 */
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import { Component, Suspense, useEffect, useMemo, useState } from "react";
import TruckModel from "#/components/truck/TruckModel";
import { getVehicle } from "#/lib/food-truck/constants";
import { getEquipment, powerBudget } from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { SHOWCASE_PRESETS } from "./showcase-presets";

/** Long enough to read the build, short enough not to feel stuck. */
const DWELL_MS = 5200;
const FOV = 38;

class SceneBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[VehicleShowcase]", error.message, info);
	}
	render() {
		if (this.state.failed) return null;
		return this.props.children;
	}
}

export default function VehicleShowcase() {
	const [index, setIndex] = useState(0);
	const [hotspot, setHotspot] = useState<string | null>(null);
	const [paused, setPaused] = useState(false);

	const preset = SHOWCASE_PRESETS[index];

	// Cycle until someone interacts, then hand over control for good. Reading
	// `index` here is what restarts the dwell timer on each change.
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
	const active = hotspot
		? preset.hotspots.find((h) => h.equipmentId === hotspot)
		: null;

	if (!vehicle || !dims) return null;

	const radius =
		Math.sqrt(dims.lengthM ** 2 + dims.widthM ** 2 + dims.heightM ** 2) / 2;
	const distance = (radius / Math.tan((FOV * Math.PI) / 360)) * 1.02;

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
			{/* ── Canvas ── */}
			<div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-sm bg-stone-900 sm:aspect-[16/10]">
				<SceneBoundary>
					<Canvas
						shadows
						dpr={[1, 1.6]}
						camera={{
							position: [distance * 0.66, distance * 0.36, distance * 0.66],
							fov: FOV,
						}}
						onPointerDown={() => setPaused(true)}
					>
						<Suspense fallback={null}>
							<Environment preset="city" />
						</Suspense>
						<ambientLight intensity={0.85} />
						<directionalLight
							position={[6, 10, 5]}
							intensity={1.6}
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
							opacity={0.55}
							scale={radius * 4}
							blur={2.6}
							far={3}
						/>
						<OrbitControls
							makeDefault
							enablePan={false}
							autoRotate={!paused}
							autoRotateSpeed={0.55}
							minDistance={distance * 0.6}
							maxDistance={distance * 1.9}
							maxPolarAngle={Math.PI / 2 - 0.05}
						/>
					</Canvas>
				</SceneBoundary>

				{/* Build switcher, over the canvas so the eye stays in one place. */}
				<div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-3">
					{SHOWCASE_PRESETS.map((p, i) => (
						<button
							key={p.id}
							type="button"
							onClick={() => take(i)}
							aria-current={i === index}
							className={
								i === index
									? "rounded-sm bg-stone-100 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-stone-900"
									: "rounded-sm bg-white/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-stone-300 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
							}
						>
							{p.name}
						</button>
					))}
				</div>

				{!paused && (
					<span className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">
						Drag to take over
					</span>
				)}
			</div>

			{/* ── The parts a buyer actually looks for ── */}
			<div>
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
					{vehicle.label}
				</p>
				<h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
					{preset.name}
				</h3>
				<p className="mt-1.5 text-[15px] leading-relaxed text-stone-600">
					{preset.summary}
				</p>

				<div className="mt-6 space-y-px border-y border-stone-200">
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
									className="flex w-full items-baseline justify-between gap-4 py-3 text-left"
								>
									<span
										className={
											on
												? "text-[15px] font-medium text-stone-900"
												: "text-[15px] text-stone-700 transition-colors hover:text-stone-900"
										}
									>
										{h.label}
									</span>
									<span className="font-mono text-[11px] text-stone-400">
										{on ? "−" : "+"}
									</span>
								</button>
								{on && (
									<p className="pb-4 pr-8 text-[13.5px] leading-relaxed text-stone-600">
										{h.detail}
									</p>
								)}
							</div>
						);
					})}
				</div>

				{/* Real numbers, because the audience checks. */}
				<dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
					<div>
						<dt className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
							On-board power
						</dt>
						<dd className="mt-0.5 font-mono text-lg text-stone-900">
							{(power.designWatts / 1000).toFixed(1)} kW
						</dd>
					</div>
					<div>
						<dt className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
							Supply
						</dt>
						<dd className="mt-0.5 font-mono text-lg text-stone-900">
							{power.supply}
						</dd>
					</div>
					<div>
						<dt className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
							Fitted units
						</dt>
						<dd className="mt-0.5 font-mono text-lg text-stone-900">
							{preset.equipmentIds.filter((id) => getEquipment(id)).length}
						</dd>
					</div>
				</dl>

				{active && (
					<p className="sr-only" aria-live="polite">
						{active.detail}
					</p>
				)}
			</div>
		</div>
	);
}
