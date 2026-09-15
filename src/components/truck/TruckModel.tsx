/**
 * The trailer, built in code from the factory's own dimensions.
 *
 * Nothing here is downloaded or generated: the shell comes straight from
 * VEHICLES and the fit-out from planGalley, so changing the business type or
 * the body changes the model, the power budget and every camera angle at once.
 * That is what lets the 3D view act as the source of truth the 2D renders are
 * then taken from, instead of nine images that quietly disagree.
 *
 * The features modelled here are exactly the ones VEHICLE_GEOMETRY describes to
 * the image model — same hatch, same door, same vents — so the render and the
 * model are talking about one trailer.
 */
import { Edges, RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import {
	type EquipmentZone,
	type GalleyLayout,
	planGalley,
} from "#/lib/food-truck/equipment";
import type { VehicleBody } from "#/lib/food-truck/images";
import { resolveWrap } from "#/lib/food-truck/wrap-color";

export interface TruckDimensions {
	lengthM: number;
	widthM: number;
	heightM: number;
	body: VehicleBody;
}

/** Zone colours double as the legend in the designer's panel. */
export const ZONE_COLOR: Record<EquipmentZone, string> = {
	hot: "#f97316",
	cold: "#38bdf8",
	service: "#a855f7",
	prep: "#facc15",
	sink: "#4ade80",
	storage: "#94a3b8",
};

/**
 * How a fit-out is actually finished: brushed stainless on the wet and hot
 * runs, warm ply on the customer-facing joinery. The zone palette above is a
 * diagram — useful while you are designing, but on the marketing page it reads
 * as a debug view rather than a vehicle, so the showcase asks for this one.
 */
export const MATERIAL_COLOR: Record<EquipmentZone, string> = {
	hot: "#8f9296",
	cold: "#a9adb1",
	service: "#b08d5f",
	prep: "#9a9ea2",
	sink: "#c3c7ca",
	storage: "#7d6a53",
};

export type TruckPalette = "zones" | "materials";

const SHELL = {
	airstream: { color: "#d8dade", metalness: 0.85, roughness: 0.25 },
	square: { color: "#f4f4f5", metalness: 0.2, roughness: 0.6 },
} as const;

const FLOOR_Y = 0.62; // deck height above the ground, metres

function Wheel({ x, z }: { x: number; z: number }) {
	return (
		<mesh position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
			<cylinderGeometry args={[0.33, 0.33, 0.22, 20]} />
			<meshStandardMaterial color="#18181b" roughness={0.9} />
		</mesh>
	);
}

function Jack({ x, z }: { x: number; z: number }) {
	return (
		<mesh position={[x, 0.2, z]} castShadow>
			<cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
			<meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} />
		</mesh>
	);
}

/** A-frame tongue and coupler at the nose. */
function Tongue({ length, floorY }: { length: number; floorY: number }) {
	const x = -length / 2;
	return (
		<group position={[x, floorY - 0.12, 0]}>
			<mesh position={[-0.35, 0, 0]} castShadow>
				<boxGeometry args={[0.7, 0.08, 0.08]} />
				<meshStandardMaterial color="#3f3f46" metalness={0.7} roughness={0.4} />
			</mesh>
			<mesh position={[-0.72, 0.02, 0]} castShadow>
				<sphereGeometry args={[0.07, 10, 10]} />
				<meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} />
			</mesh>
		</group>
	);
}

/** The serving hatch, propped open upward as an awning. */
function ServingHatch({
	length,
	width,
	height,
	floorY,
}: {
	length: number;
	width: number;
	height: number;
	floorY: number;
}) {
	const hatchW = Math.min(1.8, length * 0.42);
	const hatchH = Math.min(0.9, height * 0.34);
	const sillY = floorY + height * 0.42;
	// Ahead of the entry door, on the curbside (+Z).
	const x = -length * 0.08;
	return (
		<group>
			{/* opening */}
			<mesh position={[x, sillY, width / 2 + 0.005]}>
				<planeGeometry args={[hatchW, hatchH]} />
				<meshStandardMaterial color="#0b0b10" roughness={0.9} />
			</mesh>
			{/* awning panel, hinged along the top edge */}
			<mesh
				position={[x, sillY + hatchH / 2 + 0.2, width / 2 + 0.3]}
				rotation={[-Math.PI / 2.6, 0, 0]}
				castShadow
			>
				<boxGeometry args={[hatchW, 0.035, hatchH]} />
				<meshStandardMaterial
					color="#e4e4e7"
					metalness={0.5}
					roughness={0.35}
				/>
			</mesh>
			{/* counter lip */}
			<mesh position={[x, sillY - hatchH / 2, width / 2 + 0.12]} castShadow>
				<boxGeometry args={[hatchW + 0.12, 0.05, 0.3]} />
				<meshStandardMaterial color="#d4d4d8" metalness={0.7} roughness={0.3} />
			</mesh>
		</group>
	);
}

/** Entry door, curbside toward the rear. */
function EntryDoor({
	length,
	width,
	height,
	floorY,
}: {
	length: number;
	width: number;
	height: number;
	floorY: number;
}) {
	const doorH = Math.min(1.75, height * 0.62);
	return (
		<mesh
			position={[length * 0.3, floorY + doorH / 2, width / 2 + 0.006]}
			castShadow
		>
			<planeGeometry args={[0.66, doorH]} />
			<meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.3} />
		</mesh>
	);
}

function RoofKit({
	length,
	width,
	roofY,
}: {
	length: number;
	width: number;
	roofY: number;
}) {
	return (
		<group>
			{/* rooftop HVAC over the hot line */}
			<mesh position={[-length * 0.05, roofY + 0.14, 0]} castShadow>
				<boxGeometry args={[0.9, 0.28, 0.75]} />
				<meshStandardMaterial color="#e4e4e7" roughness={0.6} />
			</mesh>
			{/* vents */}
			{[length * 0.26, -length * 0.3].map((x) => (
				<mesh key={x} position={[x, roofY + 0.07, width * 0.18]} castShadow>
					<boxGeometry args={[0.32, 0.14, 0.32]} />
					<meshStandardMaterial color="#d4d4d8" roughness={0.7} />
				</mesh>
			))}
		</group>
	);
}

function EquipmentBlocks({
	layout,
	dims,
	floorY,
	selectedId,
	onSelect,
	palette,
}: {
	layout: GalleyLayout;
	dims: TruckDimensions;
	floorY: number;
	selectedId?: string | null;
	onSelect?: (id: string | null) => void;
	palette: TruckPalette;
}) {
	const colorFor = (zone: EquipmentZone) =>
		palette === "materials" ? MATERIAL_COLOR[zone] : ZONE_COLOR[zone];
	const { lengthM, widthM } = dims;
	const runStart = -lengthM / 2 + layout.marginM;

	return (
		<group>
			{layout.placed.map((p) => {
				const { spec } = p;
				const w = spec.widthM;
				const d = spec.depthM;
				const h = spec.heightM;
				const x = runStart + p.offsetM + w / 2;
				// Curbside units back onto +Z, streetside onto -Z.
				const zSign = p.wall === "curbside" ? 1 : -1;
				const z = zSign * (widthM / 2 - d / 2 - 0.06);
				const mount = spec.mount ?? "floor";
				const y =
					mount === "overhead"
						? floorY + 1.95
						: mount === "counter"
							? floorY + 0.9 + h / 2
							: mount === "subfloor"
								? floorY - 0.05 - h / 2
								: floorY + h / 2;
				const selected = selectedId === spec.id;
				return (
					<mesh
						key={`${spec.id}-${p.wall}-${p.offsetM}`}
						position={[x, y, z]}
						castShadow
						onClick={(e) => {
							e.stopPropagation();
							onSelect?.(selected ? null : spec.id);
						}}
					>
						<boxGeometry args={[w, h, d]} />
						<meshStandardMaterial
							color={colorFor(spec.zone)}
							roughness={palette === "materials" ? 0.32 : 0.45}
							metalness={palette === "materials" ? 0.55 : 0.15}
							transparent
							opacity={selected ? 1 : 0.92}
							emissive={colorFor(spec.zone)}
							emissiveIntensity={selected ? 0.35 : 0}
						/>
						<Edges threshold={15} color={selected ? "#ffffff" : "#00000033"} />
					</mesh>
				);
			})}
		</group>
	);
}

export interface TruckModelProps {
	dims: TruckDimensions;
	equipmentIds: string[];
	/** Hide the shell's near wall so the fit-out is visible. */
	cutaway?: boolean;
	selectedEquipment?: string | null;
	onSelectEquipment?: (id: string | null) => void;
	/** The buyer's brand colour words, resolved to a real finish. */
	wrapColors?: string[] | null;
	/** "zones" colour-codes by function (the designer); "materials" reads as a finished build. */
	palette?: TruckPalette;
}

export default function TruckModel({
	dims,
	equipmentIds,
	cutaway = true,
	selectedEquipment,
	onSelectEquipment,
	wrapColors,
	palette = "zones",
}: TruckModelProps) {
	const { lengthM, widthM, heightM, body } = dims;
	const layout = useMemo(
		() => planGalley(equipmentIds, dims),
		[equipmentIds, dims],
	);
	const shell = SHELL[body];
	const wrap = resolveWrap(wrapColors);
	// An Airstream's shell is one continuous curve; a box trailer barely breaks
	// its corners. One primitive, two very different silhouettes.
	const radius = body === "airstream" ? Math.min(widthM, heightM) * 0.26 : 0.08;
	// Where the skin actually sits at counter height, once the corner radius has
	// pulled it in. Panels hung off widthM/2 would float in mid-air without this.
	const skinZ = widthM / 2 - radius * 0.14;
	const roofY = FLOOR_Y + heightM;

	return (
		<group position={[0, -(FLOOR_Y + heightM) / 2, 0]}>
			{/* chassis */}
			<mesh position={[0, FLOOR_Y - 0.12, 0]} castShadow receiveShadow>
				<boxGeometry args={[lengthM * 0.9, 0.12, widthM * 0.7]} />
				<meshStandardMaterial color="#27272a" roughness={0.85} />
			</mesh>

			{/* shell */}
			<RoundedBox
				args={[lengthM, heightM, widthM]}
				radius={radius}
				smoothness={6}
				position={[0, FLOOR_Y + heightM / 2, 0]}
				castShadow
				receiveShadow
			>
				<meshStandardMaterial
					color={wrap?.hex ?? shell.color}
					metalness={wrap?.metalness ?? shell.metalness}
					roughness={wrap?.roughness ?? shell.roughness}
					transparent={cutaway}
					opacity={cutaway ? 0.22 : 1}
					depthWrite={!cutaway}
				/>
			</RoundedBox>

			{/* deck */}
			<mesh position={[0, FLOOR_Y + 0.01, 0]} receiveShadow>
				<boxGeometry args={[lengthM - 0.1, 0.02, widthM - 0.1]} />
				<meshStandardMaterial color="#3f3f46" roughness={0.95} />
			</mesh>

			<ServingHatch
				length={lengthM}
				width={skinZ * 2}
				height={heightM}
				floorY={FLOOR_Y}
			/>
			<EntryDoor
				length={lengthM}
				width={skinZ * 2}
				height={heightM}
				floorY={FLOOR_Y}
			/>
			<RoofKit length={lengthM} width={widthM} roofY={roofY} />
			<Tongue length={lengthM} floorY={FLOOR_Y} />

			<Wheel x={lengthM * 0.12} z={widthM * 0.36} />
			<Wheel x={lengthM * 0.12} z={-widthM * 0.36} />
			{[
				[-lengthM * 0.42, widthM * 0.3],
				[-lengthM * 0.42, -widthM * 0.3],
				[lengthM * 0.42, widthM * 0.3],
				[lengthM * 0.42, -widthM * 0.3],
			].map(([x, z]) => (
				<Jack key={`${x}-${z}`} x={x} z={z} />
			))}

			<EquipmentBlocks
				layout={layout}
				dims={dims}
				floorY={FLOOR_Y}
				selectedId={selectedEquipment}
				onSelect={onSelectEquipment}
				palette={palette}
			/>
		</group>
	);
}
