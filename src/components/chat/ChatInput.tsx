import { ArrowUp, ImagePlus, Paperclip, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface ChatInputProps {
	onSend: (message: string, opts?: { image?: string }) => void;
	disabled?: boolean;
	placeholder?: string;
}

/** Downscale to a vision-friendly JPEG data URL (keeps uploads small). */
function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Could not read that file."));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () =>
				reject(new Error("That file is not a readable image."));
			img.onload = () => {
				const maxDim = 1536;
				const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Could not process that image."));
					return;
				}
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", 0.82));
			};
			img.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	});
}

export default function ChatInput({
	onSend,
	disabled,
	placeholder = "Ask about your 3D model...",
}: ChatInputProps) {
	const [value, setValue] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [attached, setAttached] = useState<string | null>(null);
	const [attachError, setAttachError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setValue(e.target.value);
		const el = e.target;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	};

	const submit = () => {
		const trimmed = value.trim();
		if ((!trimmed && !attached) || disabled) return;
		onSend(trimmed, attached ? { image: attached } : undefined);
		setValue("");
		setAttached(null);
		setAttachError(null);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	};

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setAttachError(null);
		try {
			const url = await fileToDataUrl(file);
			setAttached(url);
		} catch (err) {
			setAttachError(err instanceof Error ? err.message : "Attach failed.");
		}
	};

	const canSend = (value.trim().length > 0 || attached) && !disabled;

	return (
		<div className="px-4 pb-4 pt-2">
			<div
				className={cn(
					"relative overflow-hidden rounded-[20px] border bg-[#111113] transition-all duration-200",
					isFocused
						? "border-purple-500/40 shadow-[0_0_0_3px_rgba(168,85,247,0.08)] ring-1 ring-purple-500/20"
						: "border-[rgba(163,130,255,0.12)]",
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{attached && (
					<div className="flex items-center gap-2 px-4 pt-3">
						<div className="relative">
							<img
								src={attached}
								alt="Attached inspiration"
								className="h-14 w-14 rounded-lg border border-purple-500/30 object-cover"
							/>
							<button
								type="button"
								onClick={() => setAttached(null)}
								className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
								title="Remove image"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
						<span className="text-[11px] text-zinc-500">
							Inspiration image attached — the designer will reference it;
							your concept remains original.
						</span>
					</div>
				)}
				<textarea
					ref={textareaRef}
					value={value}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					placeholder={placeholder}
					rows={1}
					disabled={disabled}
					className="block w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-[#fafafa] placeholder:text-[#52525b] focus:outline-none"
					style={{ minHeight: "44px", maxHeight: "160px" }}
				/>

				<div className="flex items-center justify-between px-3 pb-2.5">
					<div className="flex items-center gap-1">
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleFile}
							disabled={disabled}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full text-zinc-500 hover:bg-[rgba(163,130,255,0.08)] hover:text-purple-400"
							disabled={disabled}
							title="Attach an inspiration image"
							onClick={() => fileRef.current?.click()}
						>
							<Paperclip className="h-4 w-4" />
						</Button>
						{attachError ? (
							<span className="text-[11px] text-red-400">{attachError}</span>
						) : (
							<span className="hidden items-center gap-1 text-[11px] text-zinc-600 sm:flex">
								<ImagePlus className="h-3 w-3" />
								Add inspiration image
							</span>
						)}
					</div>

					<Button
						type="button"
						onClick={submit}
						disabled={!canSend}
						className={cn(
							"h-8 w-8 rounded-full p-0 transition-all duration-200",
							canSend
								? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] hover:bg-purple-500 hover:shadow-[0_0_18px_rgba(168,85,247,0.5)]"
								: "bg-[rgba(163,130,255,0.08)] text-zinc-600",
						)}
					>
						<ArrowUp className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<p className="mt-2 text-center text-[11px] text-zinc-700">
				Press{" "}
				<kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-500">
					Enter
				</kbd>{" "}
				to send ·{" "}
				<kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-500">
					Shift+Enter
				</kbd>{" "}
				for new line
			</p>
		</div>
	);
}
