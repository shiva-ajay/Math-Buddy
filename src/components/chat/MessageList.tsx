import { useMemo, memo } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { Loader2, Sparkles } from "lucide-react";

export const MessageList = memo(function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const scrollRef = useAutoScroll([messages, streamingContent]);

  const streamingMessage = useMemo(
    () => ({
      id: "streaming",
      conversation_id: "",
      role: "assistant" as const,
      content: streamingContent,
      metadata: {},
      created_at: "",
    }),
    [streamingContent]
  );

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-xs font-medium text-text-tertiary">
            Loading messages...
          </span>
        </div>
      </div>
    );
  }

  if (!activeConversationId && messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-stretch gap-1.5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={streamingMessage}
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="w-full flex justify-start animate-fade-in-up mb-6">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-dim flex items-center justify-center shadow-sm shadow-accent/10">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-surface-2 border border-border-subtle/50 rounded-2xl rounded-tl-sm px-7 py-5">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
                      style={{
                        animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
})
