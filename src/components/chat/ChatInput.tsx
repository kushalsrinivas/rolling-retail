import { ArrowUp, Paperclip, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { fileToDataUrl } from "#/lib/image-file";
import { cn } from "#/lib/utils";

interface ChatInputProps {
	onSend: (message: string, opts?: { image?: string }) => void;
	disabled?: boolean;
	placeholder?: string;
}

export default function ChatInput({
	onSend,
	disabled,
	placeholder = "Message the designer…",
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
		<div className="px-4 pb-4 pt-3 sm:px-5">
			<div
				className={cn(
					"relative overflow-hidden rounded-2xl border-2 border-[var(--ftf-ink)] bg-white transition-shadow",
					isFocused
						? "shadow-[3px_3px_0_var(--ftf-orange-500)]"
						: "shadow-none",
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{attached && (
					<div className="flex items-center gap-2.5 border-b border-[var(--ftf-line)] bg-[var(--ftf-paper-2)] px-3 py-2.5">
						<div className="relative">
							<img
								src={attached}
								alt="Attached inspiration"
								className="h-12 w-12 rounded-sm border border-[var(--ftf-line)] object-cover"
							/>
							<button
								type="button"
								onClick={() => setAttached(null)}
								className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--ftf-ink)] text-white transition-colors hover:bg-[var(--ftf-red-500)]"
								title="Remove image"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
						<span className="text-[11px] leading-snug text-[var(--ftf-ink-2)]">
							Reference attached — used for styling direction only. Your concept
							stays original.
						</span>
					</div>
				)}
				<textarea
					id="chat-input"
					ref={textareaRef}
					value={value}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					placeholder={placeholder}
					rows={1}
					disabled={disabled}
					className="block w-full resize-none bg-transparent px-4 py-3 text-[14px] text-[var(--ftf-ink)] placeholder:text-[var(--ftf-ink-4)] focus:outline-none"
					style={{ minHeight: "44px", maxHeight: "160px" }}
				/>

				<div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
					<div className="flex min-w-0 items-center gap-2">
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleFile}
							disabled={disabled}
						/>
						<button
							type="button"
							disabled={disabled}
							title="Attach a reference image"
							onClick={() => fileRef.current?.click()}
							className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold text-[var(--ftf-ink-2)] transition-colors hover:bg-[var(--ftf-paper-2)] hover:text-[var(--ftf-ink)]"
						>
							<Paperclip className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Add a photo</span>
						</button>
						{attachError && (
							<span className="truncate text-[11px] text-[var(--ftf-red-600)]">
								{attachError}
							</span>
						)}
					</div>

					<button
						type="button"
						onClick={submit}
						disabled={!canSend}
						aria-label="Send message"
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
							canSend
								? "ftf-cta"
								: "border-2 border-[var(--ftf-line)] bg-[var(--ftf-paper-2)] text-[var(--ftf-ink-4)]",
						)}
					>
						<ArrowUp className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
