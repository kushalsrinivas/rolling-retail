import { Bot, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
}

export default function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "chat-message flex w-full gap-3 px-1",
        isUser ? "flex-row-reverse" : "flex-row",
        isLatest && "chat-message--latest",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
            : "border-[rgba(163,130,255,0.15)] bg-[rgba(168,85,247,0.08)] text-purple-400",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-purple-600/20 text-[#fafafa] ring-1 ring-purple-500/25"
            : "rounded-tl-sm bg-[#18181b] text-[#e4e4e7] ring-1 ring-[rgba(163,130,255,0.08)]",
        )}
      >
        {isUser && message.content.startsWith("[Context:") ? (
          (() => {
            const nlIdx = message.content.indexOf("\n\n");
            const contextLine =
              nlIdx !== -1 ? message.content.slice(0, nlIdx) : "";
            const questionText =
              nlIdx !== -1 ? message.content.slice(nlIdx + 2) : message.content;
            const ctxMatch = contextLine.match(/^\[Context: (.+?) = (.+?)\]$/);
            return (
              <>
                {ctxMatch && (
                  <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1.5">
                    <span className="text-[10px] font-medium text-purple-300">
                      {ctxMatch[1]}
                    </span>
                    <span className="text-[10px] text-purple-400/60">·</span>
                    <span className="truncate text-[10px] text-purple-300/70">
                      {ctxMatch[2]}
                    </span>
                  </div>
                )}
                <span className="whitespace-pre-wrap">{questionText}</span>
              </>
            );
          })()
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-purple-400/80" />
        )}
        <span
          className={cn(
            "mt-1 block text-[10px]",
            isUser
              ? "text-right text-purple-300/50"
              : "text-left text-zinc-600",
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
