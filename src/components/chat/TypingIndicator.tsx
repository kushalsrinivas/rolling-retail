import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex w-full gap-3 px-1">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(163,130,255,0.15)] bg-[rgba(168,85,247,0.08)] text-purple-400">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[#18181b] px-4 py-3.5 ring-1 ring-[rgba(163,130,255,0.08)]">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-purple-400/60" />
        <span className="typing-dot typing-dot--2 h-1.5 w-1.5 rounded-full bg-purple-400/60" />
        <span className="typing-dot typing-dot--3 h-1.5 w-1.5 rounded-full bg-purple-400/60" />
      </div>
    </div>
  );
}
