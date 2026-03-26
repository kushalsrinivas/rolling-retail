interface ScoreCardProps {
	label: string;
	score: number | null | undefined;
	maxScore?: number;
	color?: string;
}

const COLOR_MAP: Record<string, string> = {
	daytime: "#3b82f6",
	affluence: "#f59e0b",
	pedestrian: "#10b981",
	commercial: "#8b5cf6",
	composite: "#ef4444",
};

export default function ScoreCard({
	label,
	score,
	maxScore = 100,
	color,
}: ScoreCardProps) {
	const value = score ?? 0;
	const pct = Math.min(value / maxScore, 1);
	const radius = 36;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference * (1 - pct);

	const key = label.toLowerCase().split(" ")[0];
	const strokeColor = color ?? COLOR_MAP[key] ?? "#6366f1";

	const tier =
		value >= 80
			? "Excellent"
			: value >= 60
				? "Good"
				: value >= 40
					? "Fair"
					: "Low";

	return (
		<div className="flex flex-col items-center gap-1.5">
			<div className="relative h-24 w-24">
				<svg
					viewBox="0 0 80 80"
					className="h-full w-full -rotate-90"
					role="img"
					aria-label={`${label}: ${Math.round(value)} out of ${maxScore}`}
				>
					<circle
						cx="40"
						cy="40"
						r={radius}
						fill="none"
						stroke="currentColor"
						className="text-muted/40"
						strokeWidth="6"
					/>
					<circle
						cx="40"
						cy="40"
						r={radius}
						fill="none"
						stroke={strokeColor}
						strokeWidth="6"
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						style={{ transition: "stroke-dashoffset 0.6s ease" }}
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-lg font-bold" style={{ color: strokeColor }}>
						{Math.round(value)}
					</span>
				</div>
			</div>
			<span className="text-xs font-semibold text-muted-foreground">
				{label}
			</span>
			<span className="text-[10px] font-medium" style={{ color: strokeColor }}>
				{tier}
			</span>
		</div>
	);
}
