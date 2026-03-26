import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Weights {
	daytime: number;
	pedestrian: number;
	commercial: number;
	affluence: number;
	parks: number;
}

interface BrandWeightSliderProps {
	weights: Weights;
	onChange: (weights: Weights) => void;
}

const WEIGHT_LABELS: { key: keyof Weights; label: string; color: string }[] = [
	{ key: "daytime", label: "Daytime Population", color: "#3b82f6" },
	{ key: "pedestrian", label: "Pedestrian Activity", color: "#10b981" },
	{ key: "commercial", label: "Commercial Activation", color: "#8b5cf6" },
	{ key: "affluence", label: "Affluence & Spending", color: "#f59e0b" },
	{ key: "parks", label: "Parks & Recreation", color: "#ef4444" },
];

export default function BrandWeightSlider({
	weights,
	onChange,
}: BrandWeightSliderProps) {
	const handleChange = (key: keyof Weights, rawValue: number) => {
		const updated = { ...weights, [key]: rawValue };
		const total = Object.values(updated).reduce((s, v) => s + v, 0);
		if (total === 0) return;

		const normalized = {} as Weights;
		for (const k of Object.keys(updated) as (keyof Weights)[]) {
			normalized[k] = Math.round((updated[k] / total) * 100) / 100;
		}
		onChange(normalized);
	};

	return (
		<div className="space-y-4">
			{WEIGHT_LABELS.map(({ key, label, color }) => (
				<div key={key} className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-medium">
							<span
								className="mr-1.5 inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: color }}
							/>
							{label}
						</Label>
						<span className="text-xs tabular-nums text-muted-foreground">
							{Math.round(weights[key] * 100)}%
						</span>
					</div>
					<Slider
						value={[weights[key] * 100]}
						min={0}
						max={100}
						step={1}
						onValueChange={([v]) => handleChange(key, v / 100)}
						className="h-1.5"
					/>
				</div>
			))}
		</div>
	);
}

export type { Weights };
