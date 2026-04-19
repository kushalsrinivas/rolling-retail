import { AlertCircle, Bot, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { useChat } from "#/hooks/use-chat";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

interface ChatPanelProps {
  chat: ReturnType<typeof useChat>;
}

export default function ChatPanel({ chat }: ChatPanelProps) {
  const {
    messages,
    isStreaming,
    isConnecting,
    isGeneratingImages,
    error,
    sendMessage,
    clearError,
  } = chat;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, isConnecting]);

  return (
    <div className="chat-panel flex h-full flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[rgba(163,130,255,0.08)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 ring-1 ring-purple-500/20">
          <Bot className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#fafafa]">
            Brand Intake Agent
          </p>
          <p className="flex items-center gap-1 text-xs text-[#52525b]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400/80" />
            Online
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isGeneratingImages && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Generating images...
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(163,130,255,0.15)] bg-[rgba(168,85,247,0.06)] px-3 py-1.5 text-xs text-purple-400">
            <Sparkles className="h-3 w-3" />
            Gemini 2.5 Flash
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 rounded-full p-0.5 transition hover:bg-red-500/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLatest={i === messages.length - 1}
          />
        ))}
        {(isConnecting ||
          (isStreaming && messages[messages.length - 1]?.content === "")) && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[rgba(163,130,255,0.08)]">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming || isConnecting}
          placeholder="Tell me about your brand..."
        />
      </div>
    </div>
  );
}
