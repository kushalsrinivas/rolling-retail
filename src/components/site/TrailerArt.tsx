/**
 * Side-elevation drawing of one of our bodies, drawn from its real length.
 *
 * Product visuals for the marketing site without stock photography: each
 * body is drawn to proportion from VEHICLES, with the curbside hatch open
 * and the door where the factory puts it, in the wrap's colors. The same
 * geometry rules as the render prompts — one hatch, one curbside door, a
 * rear door only on square bodies.
 */
import { getVehicle } from "#/lib/food-truck/constants";

export interface TrailerArtProps {
	vehicleId: string;
	/** Wrap band / lower-third color. */
	primary?: string;
	/** Hatch surround and accents. */
	accent?: string;
	className?: string;
	/** Accessible description; decorative when omitted. */
	title?: string;
}

export function TrailerArt({
	vehicleId,
	primary = "#ff5a1f",
	accent = "#17130f",
	className,
	title,
}: TrailerArtProps) {
	const v = getVehicle(vehicleId);
	const length = v?.lengthM ?? 4;
	const height = v?.heightM ?? 2.6;
	const airstream = v?.body === "airstream";
	// 100 px per metre, scaled into a fixed viewBox height.
	const W = length * 100;
	const H = height * 100;
	const groundY = H + 46;
	const bodyTop = 30;
	const bodyBottom = H + 10;
	const bodyLeft = 70;
	const bodyRight = bodyLeft + W;
	const hatchX = bodyLeft + W * (airstream ? 0.32 : 0.28);
	const hatchW = Math.min(W * 0.36, 230);
	const hatchTop = bodyTop + (bodyBottom - bodyTop) * 0.28;
	const hatchBottom = hatchTop + (bodyBottom - bodyTop) * 0.36;
	const doorX = bodyLeft + W * (airstream ? 0.74 : 0.76);
	const axleX = bodyLeft + W * 0.58;
	const r = airstream ? (bodyBottom - bodyTop) * 0.48 : 10;
	const viewW = bodyRight + 40;
	const viewH = groundY + 16;

	return (
		<svg
			viewBox={`0 0 ${viewW} ${viewH}`}
			className={className}
			role={title ? "img" : undefined}
			aria-hidden={title ? undefined : true}
			aria-label={title}
		>
			{title && <title>{title}</title>}
			{/* ground shadow */}
			<ellipse
				cx={(bodyLeft + bodyRight) / 2}
				cy={groundY + 4}
				rx={W * 0.55}
				ry={6}
				fill="currentColor"
				opacity={0.08}
			/>
			{/* tongue + coupler */}
			<path
				d={`M${bodyLeft} ${bodyBottom - 18} L${bodyLeft - 58} ${bodyBottom + 6}`}
				stroke={accent}
				strokeWidth={5}
				strokeLinecap="round"
			/>
			<circle cx={bodyLeft - 60} cy={bodyBottom + 7} r={6} fill={accent} />
			{/* jack */}
			<rect
				x={bodyLeft - 30}
				y={bodyBottom - 4}
				width={5}
				height={groundY - bodyBottom}
				fill={accent}
				opacity={0.7}
			/>
			{/* body */}
			<rect
				x={bodyLeft}
				y={bodyTop}
				width={W}
				height={bodyBottom - bodyTop}
				rx={r}
				fill={airstream ? "#d9dde1" : "#f4f2ee"}
				stroke={accent}
				strokeOpacity={0.35}
				strokeWidth={2}
			/>
			{airstream && (
				<>
					{/* polished highlight */}
					<rect
						x={bodyLeft + r * 0.4}
						y={bodyTop + 10}
						width={W - r * 0.8}
						height={14}
						rx={7}
						fill="#ffffff"
						opacity={0.55}
					/>
					{/* rivet seams */}
					{Array.from(
						{ length: Math.floor(W / 70) },
						(_, i) => bodyLeft + 70 * (i + 1),
					).map((x) => (
						<line
							key={`seam-${x}`}
							x1={x}
							x2={x}
							y1={bodyTop + 6}
							y2={bodyBottom - 6}
							stroke="#9aa1a8"
							strokeOpacity={0.35}
						/>
					))}
				</>
			)}
			{/* wrap band / lower third */}
			<clipPath id={`clip-${vehicleId}`}>
				<rect
					x={bodyLeft}
					y={bodyTop}
					width={W}
					height={bodyBottom - bodyTop}
					rx={r}
				/>
			</clipPath>
			<rect
				clipPath={`url(#clip-${vehicleId})`}
				x={bodyLeft}
				y={
					airstream
						? hatchBottom + 8
						: bodyBottom - (bodyBottom - bodyTop) * 0.34
				}
				width={W}
				height={airstream ? 26 : (bodyBottom - bodyTop) * 0.34}
				fill={primary}
			/>
			{/* hatch opening */}
			<rect
				x={hatchX}
				y={hatchTop}
				width={hatchW}
				height={hatchBottom - hatchTop}
				fill="#1c1c1e"
			/>
			<rect
				x={hatchX + 8}
				y={hatchTop + 10}
				width={hatchW - 16}
				height={6}
				fill="#f6c97a"
				opacity={0.85}
			/>
			{/* hatch door propped open upward */}
			<path
				d={`M${hatchX - 4} ${hatchTop} L${hatchX + hatchW + 4} ${hatchTop} L${hatchX + hatchW + 18} ${hatchTop - 34} L${hatchX - 18} ${hatchTop - 34} Z`}
				fill={accent}
			/>
			{/* fold-down counter */}
			<rect
				x={hatchX - 6}
				y={hatchBottom}
				width={hatchW + 12}
				height={6}
				fill="#9aa1a8"
			/>
			{/* door */}
			<rect
				x={doorX}
				y={bodyTop + (bodyBottom - bodyTop) * 0.12}
				width={42}
				height={(bodyBottom - bodyTop) * 0.82}
				rx={airstream ? 10 : 2}
				fill="none"
				stroke={accent}
				strokeOpacity={0.6}
				strokeWidth={2}
			/>
			<circle
				cx={doorX + 34}
				cy={bodyTop + (bodyBottom - bodyTop) * 0.55}
				r={3}
				fill={accent}
			/>
			{/* roof HVAC */}
			<rect
				x={bodyLeft + W * 0.55}
				y={bodyTop - 16}
				width={56}
				height={18}
				rx={3}
				fill="#c9ccd0"
				stroke={accent}
				strokeOpacity={0.3}
			/>
			{/* wheel */}
			<circle cx={axleX} cy={groundY - 18} r={20} fill="#1c1c1e" />
			<circle cx={axleX} cy={groundY - 18} r={8} fill="#9aa1a8" />
			<line
				x1={0}
				x2={viewW}
				y1={groundY + 2}
				y2={groundY + 2}
				stroke="currentColor"
				strokeOpacity={0.12}
			/>
		</svg>
	);
}
