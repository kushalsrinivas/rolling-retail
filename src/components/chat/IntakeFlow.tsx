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
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
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

/** One control treatment for every text-ish field in the flow. */
const FIELD =
	"w-full rounded border border-[var(--ftf-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--ftf-ink)] placeholder:text-[var(--ftf-ink-4)] outline-none transition-colors focus:border-[var(--ftf-blue-600)]";

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
						className={FIELD}
					/>
				);
			case "textarea":
				return (
					<textarea
						value={value}
						onChange={(e) => set(field.id, e.target.value)}
						placeholder={field.placeholder}
						rows={3}
						className={cn(FIELD, "resize-none")}
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
									"rounded border px-3 py-2.5 text-left transition-colors",
									value === o.value
										? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-50)]"
										: "border-[var(--ftf-line)] bg-white hover:border-[var(--ftf-line-strong)]",
								)}
							>
								<span
									className={cn(
										"block text-sm font-semibold",
										value === o.value
											? "text-[var(--ftf-blue-800)]"
											: "text-[var(--ftf-ink)]",
									)}
								>
									{o.label}
								</span>
								{o.blurb && (
									<span className="mt-0.5 block text-[11px] leading-snug text-[var(--ftf-ink-3)]">
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
										"rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors",
										selected.includes(s)
											? "border-[var(--ftf-blue-800)] bg-[var(--ftf-blue-800)] text-white"
											: "border-[var(--ftf-line)] bg-white text-[var(--ftf-ink-2)] hover:border-[var(--ftf-line-strong)] hover:text-[var(--ftf-ink)]",
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
							className={cn(FIELD, "mt-2")}
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
									className="h-28 rounded border border-[var(--ftf-line)] object-cover"
								/>
								<button
									type="button"
									onClick={() => setImage(null)}
									aria-label="Remove image"
									className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--ftf-ink)] text-white transition-colors hover:bg-[var(--ftf-red-500)]"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[var(--ftf-line-strong)] bg-white px-3 py-6 text-sm font-medium text-[var(--ftf-ink-2)] transition-colors hover:border-[var(--ftf-blue-600)] hover:text-[var(--ftf-blue-800)]"
							>
								<ImagePlus className="h-4 w-4" />
								Add a photo
							</button>
						)}
						{imageError && (
							<p className="mt-1.5 text-[11px] text-[var(--ftf-red-600)]">
								{imageError}
							</p>
						)}
					</div>
				);
		}
	};

	/**
	 * One sheet, centred, with the factory's blue rule across the top. The card
	 * is the only elevated thing on the page — there is nothing else to look at.
	 */
	const shell = (children: React.ReactNode) => (
		<div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--ftf-paper-2)] px-4 py-8">
			<div className="mx-auto my-auto w-full max-w-lg">
				<div className="overflow-hidden rounded border border-[var(--ftf-line)] bg-white shadow-[var(--ftf-shadow-lg)]">
					<div className="h-1 bg-[var(--ftf-blue-800)]" />
					<div className="px-6 py-7 sm:px-8">{children}</div>
				</div>
				<p className="mt-4 text-center text-[11px] text-[var(--ftf-ink-4)]">
					Free concept renders · no account needed
				</p>
			</div>
		</div>
	);

	if (stepIndex === -1) {
		return shell(
			<>
				<p className="ftf-label">Custom food truck design</p>
				<h1 className="ftf-display mt-2 text-[26px] leading-[1.15] text-[var(--ftf-ink)]">
					{config.welcomeTitle}
				</h1>
				<p className="mt-2.5 text-sm leading-relaxed text-[var(--ftf-ink-2)]">
					{config.welcomeBody}
				</p>

				<button
					type="button"
					onClick={() => setStepIndex(0)}
					className="ftf-cta mt-6 flex w-full items-center justify-center gap-2 rounded px-4 py-3 text-sm"
				>
					Start the brief <ArrowRight className="h-4 w-4" />
				</button>

				<div className="mt-7 flex items-center gap-3">
					<span className="ftf-label shrink-0">Or start from a build</span>
					<span className="h-px flex-1 bg-[var(--ftf-line)]" />
				</div>
				<div className="mt-3 divide-y divide-[var(--ftf-line)] border-y border-[var(--ftf-line)]">
					{config.templates.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => {
								setAnswers(t.values);
								finish(t.values);
							}}
							className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-[var(--ftf-blue-50)]"
						>
							<span className="min-w-0">
								<span className="block text-sm font-semibold text-[var(--ftf-ink)]">
									{t.label}
								</span>
								<span className="mt-0.5 block text-[11px] leading-snug text-[var(--ftf-ink-3)]">
									{t.blurb}
								</span>
							</span>
							<ArrowRight className="h-4 w-4 shrink-0 text-[var(--ftf-ink-4)] transition-colors group-hover:text-[var(--ftf-blue-800)]" />
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={onSkip}
					className="mt-5 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
				>
					Skip — I'd rather just look around
				</button>
			</>,
		);
	}

	const step = config.steps[stepIndex];
	const isLast = stepIndex === config.steps.length - 1;

	return shell(
		<>
			<div className="flex items-center justify-between">
				<p className="ftf-label">
					Step {stepIndex + 1} of {config.steps.length}
				</p>
				<span className="text-[11px] tabular-nums text-[var(--ftf-ink-4)]">
					{Math.round(((stepIndex + 1) / config.steps.length) * 100)}%
				</span>
			</div>
			<div className="mt-2 flex items-center gap-1">
				{config.steps.map((s, i) => (
					<span
						key={s.id}
						className={cn(
							"h-1 flex-1 transition-colors",
							i <= stepIndex
								? "bg-[var(--ftf-blue-800)]"
								: "bg-[var(--ftf-paper-3)]",
						)}
					/>
				))}
			</div>

			<h2 className="ftf-display mt-5 text-[22px] leading-tight text-[var(--ftf-ink)]">
				{step.title}
			</h2>
			{step.subtitle && (
				<p className="mt-1.5 text-sm leading-relaxed text-[var(--ftf-ink-2)]">
					{step.subtitle}
				</p>
			)}

			<div className="mt-6 space-y-5">
				{step.fields.map((field) => (
					<div key={field.id}>
						<p className="text-[13px] font-semibold text-[var(--ftf-ink)]">
							{field.label}
						</p>
						{field.hint && (
							<p className="mb-2 mt-0.5 text-[11px] leading-snug text-[var(--ftf-ink-3)]">
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
					className="flex items-center gap-1.5 rounded border border-[var(--ftf-line-strong)] px-3.5 py-2.5 text-sm font-medium text-[var(--ftf-ink-2)] transition-colors hover:bg-[var(--ftf-paper-2)] hover:text-[var(--ftf-ink)]"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
				<button
					type="button"
					onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
					className="ftf-cta flex flex-1 items-center justify-center gap-2 rounded px-4 py-2.5 text-sm"
				>
					{isLast ? "See my concepts" : "Next"}
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>

			<button
				type="button"
				onClick={() => finish()}
				className="mt-3 w-full text-center text-xs font-medium text-[var(--ftf-ink-3)] underline-offset-4 transition-colors hover:text-[var(--ftf-blue-800)] hover:underline"
			>
				{isLast ? "Skip the rest" : "Skip the rest — I'll fill it in as I go"}
			</button>
		</>,
	);
}
