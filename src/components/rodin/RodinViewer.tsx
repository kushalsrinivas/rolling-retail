import { ArrowLeft, Download, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { checkJobStatus, downloadModel, submitRodinJob } from "#/lib/rodin-api";
import type { FormValues } from "#/lib/rodin-schema";
import ModelViewer from "./ModelViewer";
import OptionsDialog from "./OptionsDialog";
import RodinForm from "./RodinForm";
import StatusIndicator from "./StatusIndicator";

interface RodinViewerProps {
	brandName?: string;
}

export default function RodinViewer({ brandName }: RodinViewerProps) {
	// Rodin jobs run for minutes; past this something has gone wrong and we
	// should stop asking rather than poll until the tab closes.
	const POLL_LIMIT_MS = 6 * 60_000;
	const pollDeadlineRef = useRef(Number.POSITIVE_INFINITY);
	const pollTimerRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (pollTimerRef.current !== null) {
				window.clearTimeout(pollTimerRef.current);
			}
		},
		[],
	);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [modelUrl, setModelUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [jobStatuses, setJobStatuses] = useState<
		Array<{ uuid: string; status: string }>
	>([]);
	const [showOptions, setShowOptions] = useState(false);
	const [showPromptContainer, setShowPromptContainer] = useState(true);
	const [environment, setEnvironment] = useState<
		| "apartment"
		| "city"
		| "dawn"
		| "forest"
		| "lobby"
		| "night"
		| "park"
		| "studio"
		| "sunset"
		| "warehouse"
	>("night");
	const [options, setOptions] = useState<{
		condition_mode: "concat" | "fuse";
		quality: "high" | "medium" | "low" | "extra-low";
		geometry_file_format: "glb" | "usdz" | "fbx" | "obj" | "stl";
		use_hyper: boolean;
		tier: "Regular" | "Sketch" | "Gen-2";
		TAPose: boolean;
		material: "PBR" | "Shaded";
		mesh_mode: "Quad" | "Raw";
		quality_override?: number;
	}>({
		condition_mode: "concat",
		quality: "medium",
		geometry_file_format: "glb",
		use_hyper: false,
		tier: "Gen-2",
		TAPose: false,
		material: "PBR",
		mesh_mode: "Raw",
		quality_override: 500000,
	});

	async function handleStatusCheck(subscriptionKey: string, taskUuid: string) {
		try {
			const data = await checkJobStatus(subscriptionKey);

			if (!data.jobs || !Array.isArray(data.jobs) || data.jobs.length === 0) {
				throw new Error("No jobs found in status response");
			}

			setJobStatuses(data.jobs);

			const allJobsDone = data.jobs.every(
				(job: { status: string }) => job.status === "Done",
			);
			const anyJobFailed = data.jobs.some(
				(job: { status: string }) => job.status === "Failed",
			);

			if (allJobsDone) {
				try {
					const downloadData = await downloadModel(taskUuid);

					if (downloadData.error && downloadData.error !== "OK") {
						throw new Error(`Download error: ${downloadData.error}`);
					}

					if (downloadData.list && downloadData.list.length > 0) {
						const glbFile = downloadData.list.find((file: { name: string }) =>
							file.name.toLowerCase().endsWith(".glb"),
						);

						if (glbFile) {
							const proxyUrl = `/api/rodin/proxy-download?url=${encodeURIComponent(glbFile.url)}`;
							setModelUrl(proxyUrl);
							setDownloadUrl(glbFile.url);
							setIsLoading(false);
							setShowPromptContainer(false);
						} else {
							setError("No GLB file found in the results");
							setIsLoading(false);
						}
					} else {
						setError("No files available for download");
						setIsLoading(false);
					}
				} catch (downloadErr) {
					setError(
						`Failed to download model: ${downloadErr instanceof Error ? downloadErr.message : "Unknown error"}`,
					);
					setIsLoading(false);
				}
			} else if (anyJobFailed) {
				setError("Generation task failed");
				setIsLoading(false);
			} else if (Date.now() > pollDeadlineRef.current) {
				setError(
					"This is taking longer than expected. The job may still finish — check back shortly.",
				);
				setIsLoading(false);
			} else {
				pollTimerRef.current = window.setTimeout(
					() => handleStatusCheck(subscriptionKey, taskUuid),
					3000,
				);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to check status");
			setIsLoading(false);
		}
	}

	async function handleSubmit(values: FormValues) {
		pollDeadlineRef.current = Date.now() + POLL_LIMIT_MS;
		setIsLoading(true);
		setError(null);
		setModelUrl(null);
		setDownloadUrl(null);
		setJobStatuses([]);

		try {
			const formData = new FormData();

			if (values.images && values.images.length > 0) {
				for (const image of values.images) {
					formData.append("images", image);
				}
			}

			if (values.prompt) {
				formData.append("prompt", values.prompt);
			}

			formData.append("condition_mode", options.condition_mode);
			formData.append("geometry_file_format", options.geometry_file_format);
			formData.append("material", options.material);
			formData.append("quality", options.quality);
			formData.append("use_hyper", options.use_hyper.toString());
			formData.append("tier", options.tier);
			formData.append("TAPose", options.TAPose.toString());
			formData.append("mesh_mode", options.mesh_mode);
			if (options.quality_override) {
				formData.append(
					"quality_override",
					options.quality_override.toString(),
				);
			}

			const data = await submitRodinJob(formData);

			if (data.jobs?.subscription_key && data.uuid) {
				handleStatusCheck(data.jobs.subscription_key, data.uuid);
			} else {
				setError("Missing required data for status checking");
				setIsLoading(false);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred",
			);
			setIsLoading(false);
		}
	}

	const handleDownload = () => {
		if (downloadUrl) {
			window.open(downloadUrl, "_blank");
		}
	};

	const handleBack = () => {
		setShowPromptContainer(true);
	};

	const defaultPrompt = brandName
		? `A branded mobile retail truck for ${brandName}`
		: "";

	return (
		<div className="relative h-full w-full">
			{/* Full-area canvas */}
			<div className="absolute inset-0 z-0">
				<ModelViewer
					modelUrl={isLoading ? null : modelUrl}
					environment={environment}
				/>
			</div>

			{/* Overlay UI */}
			<div className="pointer-events-none absolute inset-0 z-10">
				{/* Persistent settings button — always visible top-right */}
				<div className="pointer-events-auto absolute right-6 top-6">
					<Button
						onClick={() => setShowOptions(true)}
						variant="ghost"
						size="icon"
						className="h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
						title="Environment &amp; options"
					>
						<Settings2 className="h-5 w-5" />
					</Button>
				</div>

				{/* Loading indicator */}
				<StatusIndicator isLoading={isLoading} jobStatuses={jobStatuses} />

				{/* Error message */}
				{error && (
					<div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-md bg-gray-900/80 px-4 py-2 text-white">
						{error}
					</div>
				)}

				{/* Model controls when model is loaded */}
				{!isLoading && modelUrl && !showPromptContainer && (
					<div className="pointer-events-auto absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
						<Button
							onClick={handleBack}
							className="flex items-center gap-2 rounded-full border border-white/20 bg-black px-4 py-2 text-white hover:bg-gray-900"
						>
							<ArrowLeft className="h-4 w-4" />
							<span>Back</span>
						</Button>

						<Button
							onClick={handleDownload}
							className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black hover:bg-gray-200"
						>
							<Download className="h-4 w-4" />
							<span>Download</span>
						</Button>
					</div>
				)}

				{/* Input field at bottom */}
				{showPromptContainer && (
					<div className="pointer-events-auto absolute bottom-8 left-1/2 w-full max-w-3xl -translate-x-1/2 px-4 sm:px-0">
						<RodinForm
							isLoading={isLoading}
							onSubmit={handleSubmit}
							onOpenOptions={() => setShowOptions(true)}
							defaultPrompt={defaultPrompt}
						/>
					</div>
				)}
			</div>

			{/* Options Dialog/Drawer */}
			<OptionsDialog
				open={showOptions}
				onOpenChange={setShowOptions}
				options={options}
				onOptionsChange={setOptions}
				environment={environment}
				onEnvironmentChange={setEnvironment}
			/>
		</div>
	);
}
