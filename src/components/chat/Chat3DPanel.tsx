import { type ComponentType, useEffect, useState } from "react";

export default function Chat3DPanel() {
	const [RodinViewer, setRodinViewer] = useState<ComponentType | null>(null);

	useEffect(() => {
		import("../rodin/RodinViewer").then((mod) => {
			setRodinViewer(() => mod.default);
		});
	}, []);

	if (!RodinViewer) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--ftf-well)]">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--ftf-blue-600)]" />
				<p className="ftf-label !text-white/40">Loading 3D studio</p>
			</div>
		);
	}

	return (
		<div className="h-full w-full">
			<RodinViewer />
		</div>
	);
}
