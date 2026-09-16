/**
 * The second half of the pipeline: one chosen concept becomes a real mesh.
 *
 * Sits under the parametric trailer, which is free, instant, and already
 * carries layout, power and clearances. This step costs money per run, so it
 * is explicitly opt-in and works from a single render the buyer points at —
 * that is the whole reason the flow is 2D first and 3D second.
 */
import { Box, Download, Loader2, RotateCcw } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
	generateModelFromConcept,
	RodinError,
	type RodinProgress,
} from "#/lib/rodin-job";

const ModelViewer = lazy(() => import("#/components/rodin/ModelViewer"));

export interface ConceptToModelProps {
	/** The renders this round produced, newest last. */
	concepts: Array<{ label: string; url: string }>;
	/** Describes the vehicle in words; Rodin reads it alongside the image. */
	prompt: string;
}

/** A photoreal render reconstructs far better than a line drawing or a plan. */
const PREFERRED = [
	"exterior_hero",
	"exterior_rear",
	"night_exterior",
	"side_elevation",
];

export default function ConceptToModel({
	concepts,
	prompt,
}: ConceptToModelProps) {
	const usable = concepts.filter((c) => c.url.startsWith("data:image/"));
	const [selected, setSelected] = useState<string | null>(null);
	const [progress, setProgress] = useState<RodinProgress | null>(null);
	const [model, setModel] = useState<{
		viewerUrl: string;
		downloadUrl: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	// A job outliving its panel is how the old studio leaked timers.
	useEffect(() => () => abortRef.current?.abort(), []);

	if (usable.length === 0) return null;

	const best =
		selected ??
		usable.find((c) => PREFERRED.includes(c.label))?.url ??
		usable[0].url;

	const busy =
		progress?.phase === "submitting" || progress?.phase === "generating";

	const run = async () => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setError(null);
		setModel(null);
		try {
			const result = await generateModelFromConcept({
				imageDataUrl: best,
				prompt,
				signal: controller.signal,
				onProgress: setProgress,
			});
			setModel(result);
		} catch (err) {
			if (controller.signal.aborted) return;
			setError(
				err instanceof RodinError
					? err.message
					: "Something went wrong building the model.",
			);
			setProgress(null);
		}
	};

	return (
		<div className="mt-6">
			<div className="flex items-center justify-between gap-3">
				<p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
					<Box className="h-3 w-3" />
					Photoreal 3D model
				</p>
				<span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
					paid step
				</span>
			</div>

			<p className="mt-2 text-xs leading-relaxed text-zinc-500">
				The trailer above is built from the factory&rsquo;s dimensions and is
				free to change as often as you like. When a direction is settled, turn
				one render into a real mesh you can spin, share and hand to a
				fabricator.
			</p>

			{/* Which render gets reconstructed. */}
			<div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
				{usable.map((c) => (
					<button
						key={c.label}
						type="button"
						onClick={() => setSelected(c.url)}
						disabled={busy}
						title={c.label.replace(/_/g, " ")}
						className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors disabled:opacity-50 ${
							c.url === best
								? "border-purple-500/60"
								: "border-transparent hover:border-[rgba(163,130,255,0.3)]"
						}`}
					>
						<img
							src={c.url}
							alt={c.label.replace(/_/g, " ")}
							className="h-full w-full object-cover"
						/>
					</button>
				))}
			</div>

			{model ? (
				<div className="mt-3">
					<div className="h-[260px] w-full overflow-hidden rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#0b0b10]">
						<Suspense
							fallback={
								<div className="h-full w-full animate-pulse bg-[#111113]" />
							}
						>
							<ModelViewer modelUrl={model.viewerUrl} />
						</Suspense>
					</div>
					<div className="mt-2 flex items-center gap-2">
						<a
							href={model.downloadUrl}
							download
							className="flex items-center gap-1.5 rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10"
						>
							<Download className="h-3 w-3" /> Download .glb
						</a>
						<button
							type="button"
							onClick={run}
							className="flex items-center gap-1.5 rounded-full border border-[rgba(163,130,255,0.2)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
						>
							<RotateCcw className="h-3 w-3" /> Rebuild
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={run}
					disabled={busy}
					className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60"
				>
					{busy ? (
						<>
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							{progress?.message ?? "Working…"}
						</>
					) : (
						<>
							<Box className="h-3.5 w-3.5" />
							Build the 3D model from this render
						</>
					)}
				</button>
			)}

			{busy && (
				<div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
					<div
						className="h-full bg-purple-500 transition-[width] duration-500"
						style={{
							width:
								progress?.fraction === null || progress?.fraction === undefined
									? "35%"
									: `${Math.round(progress.fraction * 100)}%`,
						}}
					/>
				</div>
			)}

			{busy && (
				<p className="mt-1.5 text-[10px] text-zinc-600">
					This usually takes a couple of minutes. You can keep designing — it
					will finish in the background.
				</p>
			)}

			{error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
		</div>
	);
}
