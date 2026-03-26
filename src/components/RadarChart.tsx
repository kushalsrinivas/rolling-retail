interface RadarChartProps {
	scores: {
		daytime: number;
		affluence: number;
		pedestrian: number;
		commercial: number;
		composite: number;
	};
	size?: number;
}

const LABELS = [
	"Daytime Pop",
	"Affluence",
	"Pedestrian",
	"Commercial",
	"Composite",
];
const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

export default function RadarChart({ scores, size = 200 }: RadarChartProps) {
	const cx = size / 2;
	const cy = size / 2;
	const maxR = size * 0.38;
	const values = [
		scores.daytime,
		scores.affluence,
		scores.pedestrian,
		scores.commercial,
		scores.composite,
	];
	const n = values.length;
	const angleStep = (2 * Math.PI) / n;

	const getPoint = (index: number, radius: number) => {
		const angle = angleStep * index - Math.PI / 2;
		return {
			x: cx + radius * Math.cos(angle),
			y: cy + radius * Math.sin(angle),
		};
	};

	const dataPoints = values.map((v, i) => getPoint(i, (v / 100) * maxR));
	const pathD =
		dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
		"Z";

	const gridLevels = [0.25, 0.5, 0.75, 1];

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			role="img"
			aria-label="Radar chart showing five score dimensions"
		>
			{gridLevels.map((level) => {
				const pts = Array.from({ length: n }, (_, i) =>
					getPoint(i, maxR * level),
				);
				const d =
					pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
					"Z";
				return (
					<path
						key={level}
						d={d}
						fill="none"
						stroke="currentColor"
						className="text-border"
						strokeWidth="0.5"
					/>
				);
			})}

			{Array.from({ length: n }, (_, i) => {
				const outer = getPoint(i, maxR);
				return (
					<line
						key={LABELS[i]}
						x1={cx}
						y1={cy}
						x2={outer.x}
						y2={outer.y}
						stroke="currentColor"
						className="text-border"
						strokeWidth="0.5"
					/>
				);
			})}

			<path
				d={pathD}
				fill="rgba(99, 102, 241, 0.15)"
				stroke="#6366f1"
				strokeWidth="2"
			/>

			{dataPoints.map((p, i) => (
				<circle key={LABELS[i]} cx={p.x} cy={p.y} r="4" fill={COLORS[i]} />
			))}

			{Array.from({ length: n }, (_, i) => {
				const labelR = maxR + 18;
				const pt = getPoint(i, labelR);
				return (
					<text
						key={`label-${LABELS[i]}`}
						x={pt.x}
						y={pt.y}
						textAnchor="middle"
						dominantBaseline="middle"
						className="fill-muted-foreground text-[9px] font-medium"
					>
						{LABELS[i]}
					</text>
				);
			})}
		</svg>
	);
}
