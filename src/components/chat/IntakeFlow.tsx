/**
 * What a buyer meets before the prompt box.
 *
 * The chat used to open on an empty field and "dump everything", which is a
 * lot to ask of someone who has never described a truck before. This asks a
 * few concrete questions instead, every one of them skippable, and hands the
 * agent a brief good enough to generate from.
 *
 * Three ways in, matching how people actually arrive: start from a template,
 * answer the questions, or skip straight to seeing ideas.
 */
import { ArrowLeft, ArrowRight, ImagePlus, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import {
	composeBrief,
	FOOD_TRUCK_INTAKE,
	type IntakeAnswers,
	type IntakeConfig,
	type IntakeField,
} from "#/lib/food-truck/intake";
import { fileToDataUrl } from "#/lib/image-file";
import { cn } from "#/lib/utils";

export interface IntakeFlowProps {
	config?: IntakeConfig;
	onComplete: (brief: string, answers: IntakeAnswers, image?: string) => void;
	onSkip: () => void;
}

export default function IntakeFlow({
	config = FOOD_TRUCK_INTAKE,
	onComplete,
	onSkip,
}: IntakeFlowProps) {
	// -1 is the welcome screen; 0..n-1 are the question steps.
	const [stepIndex, setStepIndex] = useState(-1);
	const [answers, setAnswers] = useState<IntakeAnswers>({});
	const [image, setImage] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const set = (id: string, value: string) =>
		setAnswers((prev) => ({ ...prev, [id]: value }));

	const toggleChip = (id: string, value: string) => {
		const current = (answers[id] ?? "")
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);
		const next = current.includes(value)
			? current.filter((v) => v !== value)
			: [...current, value];
		set(id, next.join(", "));
	};

	const finish = (extra?: IntakeAnswers) => {
		const merged = { ...answers, ...extra };
		onComplete(composeBrief(merged, config), merged, image ?? undefined);
	};

	const pickImage = async (file: File | undefined) => {
		if (!file) return;
		setImageError(null);
		try {
			setImage(await fileToDataUrl(file));
		} catch (err) {
			setImageError(
				err instanceof Error ? err.message : "Could not read that image.",
			);
		}
	};

	const renderField = (field: IntakeField) => {
		const value = answers[field.id] ?? "";
		switch (field.type) {
			case "text":
				return (
					<input
						value={value}
						onChange={(e) => set(field.id, e.target.value)}
						placeholder={field.placeholder}
						className="w-full rounded-xl border border-[rgba(163,130,255,0.15)] bg-[#141417] px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
					/>
				);
			case "textarea":
				return (
					<textarea
						value={value}
						onChange={(e) => set(field.id, e.target.value)}
						placeholder={field.placeholder}
						rows={3}
						className="w-full resize-none rounded-xl border border-[rgba(163,130,255,0.15)] bg-[#141417] px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
					/>
				);
			case "choice":
				return (
					<div className="grid gap-1.5 sm:grid-cols-2">
						{field.options?.map((o) => (
							<button
								key={o.value}
								type="button"
								onClick={() => set(field.id, value === o.value ? "" : o.value)}
								className={cn(
									"rounded-xl border px-3.5 py-2.5 text-left transition-colors",
									value === o.value
										? "border-purple-500/50 bg-purple-500/10"
										: "border-[rgba(163,130,255,0.12)] bg-[#141417] hover:border-[rgba(163,130,255,0.3)]",
								)}
							>
								<span className="block text-sm font-medium text-zinc-100">
									{o.label}
								</span>
								{o.blurb && (
									<span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
										{o.blurb}
									</span>
								)}
							</button>
						))}
					</div>
				);
			case "chips": {
				const selected = value
					.split(",")
					.map((v) => v.trim())
					.filter(Boolean);
				return (
					<div>
						<div className="flex flex-wrap gap-1.5">
							{field.suggestions?.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => toggleChip(field.id, s)}
									className={cn(
										"rounded-full border px-3 py-1.5 text-xs transition-colors",
										selected.includes(s)
											? "border-purple-500/50 bg-purple-500/15 text-purple-200"
											: "border-[rgba(163,130,255,0.15)] bg-[#141417] text-zinc-400 hover:text-zinc-200",
									)}
								>
									{s}
								</button>
							))}
						</div>
						<input
							value={value}
							onChange={(e) => set(field.id, e.target.value)}
							placeholder="…or type your own, separated by commas"
							className="mt-2 w-full rounded-xl border border-[rgba(163,130,255,0.12)] bg-[#141417] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
						/>
					</div>
				);
			}
			case "image":
				return (
					<div>
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							hidden
							onChange={(e) => pickImage(e.target.files?.[0])}
						/>
						{image ? (
							<div className="relative inline-block">
								<img
									src={image}
									alt="Your inspiration"
									className="h-28 rounded-xl border border-[rgba(163,130,255,0.15)] object-cover"
								/>
								<button
									type="button"
									onClick={() => setImage(null)}
									aria-label="Remove image"
									className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-white/70 hover:text-white"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(163,130,255,0.22)] bg-[#141417] px-3.5 py-6 text-sm text-zinc-400 transition-colors hover:border-purple-500/40 hover:text-zinc-200"
							>
								<ImagePlus className="h-4 w-4" />
								Add a photo
							</button>
						)}
						{imageError && (
							<p className="mt-1.5 text-[11px] text-red-400">{imageError}</p>
						)}
					</div>
				);
		}
	};

	const shell = (children: React.ReactNode) => (
		<div className="flex h-full w-full flex-col overflow-y-auto bg-[#09090b] px-4 py-8">
			<div className="mx-auto my-auto w-full max-w-lg">{children}</div>
		</div>
	);

	if (stepIndex === -1) {
		return shell(
			<>
				<h1 className="text-2xl font-bold tracking-tight text-zinc-50">
					{config.welcomeTitle}
				</h1>
				<p className="mt-2 text-sm leading-relaxed text-zinc-400">
					{config.welcomeBody}
				</p>

				<button
					type="button"
					onClick={() => setStepIndex(0)}
					className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
				>
					Start <ArrowRight className="h-4 w-4" />
				</button>

				<p className="mt-7 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
					Or start from one of these
				</p>
				<div className="mt-2 grid gap-1.5">
					{config.templates.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => {
								setAnswers(t.values);
								finish(t.values);
							}}
							className="flex items-center justify-between rounded-xl border border-[rgba(163,130,255,0.12)] bg-[#141417] px-3.5 py-3 text-left transition-colors hover:border-purple-500/35"
						>
							<span>
								<span className="block text-sm font-medium text-zinc-100">
									{t.label}
								</span>
								<span className="mt-0.5 block text-[11px] text-zinc-500">
									{t.blurb}
								</span>
							</span>
							<ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={onSkip}
					className="mt-6 flex w-full items-center justify-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
				>
					<Sparkles className="h-3.5 w-3.5" />
					Skip — I'd rather just look around
				</button>
			</>,
		);
	}

	const step = config.steps[stepIndex];
	const isLast = stepIndex === config.steps.length - 1;

	return shell(
		<>
			<div className="flex items-center gap-1.5">
				{config.steps.map((s, i) => (
					<span
						key={s.id}
						className={cn(
							"h-1 flex-1 rounded-full transition-colors",
							i <= stepIndex ? "bg-purple-500" : "bg-zinc-800",
						)}
					/>
				))}
			</div>

			<h2 className="mt-5 text-xl font-bold tracking-tight text-zinc-50">
				{step.title}
			</h2>
			{step.subtitle && (
				<p className="mt-1.5 text-sm text-zinc-400">{step.subtitle}</p>
			)}

			<div className="mt-5 space-y-5">
				{step.fields.map((field) => (
					<div key={field.id}>
						<p className="text-sm font-medium text-zinc-200">{field.label}</p>
						{field.hint && (
							<p className="mb-2 mt-0.5 text-[11px] leading-snug text-zinc-500">
								{field.hint}
							</p>
						)}
						<div className={field.hint ? "" : "mt-2"}>{renderField(field)}</div>
					</div>
				))}
			</div>

			<div className="mt-7 flex items-center gap-2">
				<button
					type="button"
					onClick={() => setStepIndex((i) => i - 1)}
					className="flex items-center gap-1.5 rounded-xl border border-[rgba(163,130,255,0.15)] px-3.5 py-2.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
				<button
					type="button"
					onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
					className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
				>
					{isLast ? "See my concepts" : "Next"}
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>

			<button
				type="button"
				onClick={() => finish()}
				className="mt-3 w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
			>
				{isLast ? "Skip the rest" : "Skip the rest — I'll fill it in as I go"}
			</button>
		</>,
	);
}
