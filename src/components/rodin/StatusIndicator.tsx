import ProgressBar from "./ProgressBar";

interface StatusIndicatorProps {
	isLoading: boolean;
	jobStatuses: Array<{ uuid: string; status: string }>;
}

export default function StatusIndicator({
	isLoading,
	jobStatuses,
}: StatusIndicatorProps) {
	if (!isLoading) {
		return null;
	}

	const actualTasks = jobStatuses.length;
	const totalTasks = actualTasks > 0 ? actualTasks + 1 : 0;

	const completedJobTasks = jobStatuses.filter(
		(job) => job.status === "Done",
	).length;
	const initialRequestComplete = actualTasks > 0 ? 1 : 0;
	const completedTasks = completedJobTasks + initialRequestComplete;

	const isIndeterminate = actualTasks === 0;

	return (
		<div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
			<div className="w-64">
				<ProgressBar
					totalTasks={totalTasks}
					completedTasks={completedTasks}
					isIndeterminate={isIndeterminate}
				/>
			</div>
		</div>
	);
}
