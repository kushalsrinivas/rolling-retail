import { ArrowUp, Paperclip } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask about your 3D model...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
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

  const canSend = value.trim().length > 0 && !disabled;

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-zinc-500 hover:bg-[rgba(163,130,255,0.08)] hover:text-purple-400"
            disabled={disabled}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

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
