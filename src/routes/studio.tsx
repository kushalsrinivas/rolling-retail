import { createFileRoute } from "@tanstack/react-router";
import { type ComponentType, useEffect, useState } from "react";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
	const [Rodin, setRodin] = useState<ComponentType | null>(null);

	useEffect(() => {
		import("../components/rodin/RodinViewer").then((mod) => {
			setRodin(() => mod.default);
		});
	}, []);

	if (!Rodin) {
		return (
			<main className="flex h-dvh w-screen items-center justify-center bg-black">
				<div className="flex flex-col items-center gap-4">
					<div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
					<p className="text-xs text-zinc-500">Loading 3D studio...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="h-dvh w-screen overflow-hidden bg-black">
			<div className="h-full w-full">
				<Rodin />
			</div>
		</main>
	);
}
