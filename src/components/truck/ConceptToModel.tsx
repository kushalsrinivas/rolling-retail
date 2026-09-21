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
		<div className="mt-8">
			<div className="flex items-center gap-2.5 pb-3">
				<Box className="h-4 w-4 shrink-0 text-[var(--ftf-blue-800)]" />
				<span className="ftf-label !text-[var(--ftf-ink)]">
					Photoreal 3D model
				</span>
				<span className="shrink-0 rounded-sm bg-[var(--ftf-orange-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ftf-orange-600)]">
					Paid step
				</span>
				<div className="h-px flex-1 bg-[var(--ftf-line)]" />
			</div>

			<p className="text-xs leading-relaxed text-[var(--ftf-ink-2)]">
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
						className={`h-14 w-20 shrink-0 overflow-hidden rounded border-2 bg-[var(--ftf-well)] transition-colors disabled:opacity-50 ${
							c.url === best
								? "border-[var(--ftf-orange-500)]"
								: "border-transparent hover:border-[var(--ftf-blue-600)]"
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
					<div className="h-[260px] w-full overflow-hidden rounded bg-[var(--ftf-well)]">
						<Suspense
							fallback={
								<div className="ftf-working h-full w-full bg-[var(--ftf-well)]" />
							}
						>
							<ModelViewer modelUrl={model.viewerUrl} />
						</Suspense>
					</div>
					<div className="mt-2 flex items-center gap-2">
						<a
							href={model.downloadUrl}
							download
							className="ftf-cta inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs"
						>
							<Download className="h-3 w-3" /> Download .glb
						</a>
						<button
							type="button"
							onClick={run}
							className="inline-flex items-center gap-1.5 rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ftf-blue-800)] transition-colors hover:bg-[var(--ftf-blue-50)]"
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
					className="ftf-cta mt-3 flex w-full items-center justify-center gap-2 rounded px-4 py-3 text-xs"
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
				<div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-[var(--ftf-paper-3)]">
					<div
						className="h-full bg-[var(--ftf-blue-800)] transition-[width] duration-500"
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
				<p className="mt-1.5 text-[11px] text-[var(--ftf-ink-3)]">
					This usually takes a couple of minutes. You can keep designing — it
					will finish in the background.
				</p>
			)}

			{error && (
				<p className="mt-2 border-l-2 border-[var(--ftf-red-500)] bg-[var(--ftf-red-100)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--ftf-red-600)]">
					{error}
				</p>
			)}
		</div>
	);
}
