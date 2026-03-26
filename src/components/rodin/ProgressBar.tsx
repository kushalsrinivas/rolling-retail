import { cn } from "#/lib/utils";

interface ProgressBarProps {
	totalTasks: number;
	completedTasks: number;
	className?: string;
	isIndeterminate?: boolean;
}

export default function ProgressBar({
	totalTasks,
	completedTasks,
	className,
	isIndeterminate = false,
}: ProgressBarProps) {
	const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

	return (
		<div
			className={cn(
				"h-2 w-full overflow-hidden rounded-full border border-white bg-black p-[1px]",
				className,
			)}
		>
			{isIndeterminate ? (
				<div className="relative h-full w-full">
					<div className="absolute h-full w-[40%] animate-[progress-indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-white" />
				</div>
			) : (
				<div
					className="h-full rounded-full bg-white transition-all duration-500"
					style={{ width: `${percentage}%` }}
				/>
			)}
		</div>
	);
}
