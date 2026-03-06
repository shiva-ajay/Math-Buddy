import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { FileUpload } from "./FileUpload";

export function ChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const model = useSettingsStore((s) => s.model);
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 220) + "px";
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    sendMessage(trimmed, model, systemPrompt);
  }, [input, isStreaming, sendMessage, model, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="shrink-0 bg-surface-0 px-4 pb-4 pt-3 sm:px-6 lg:px-8">
      <div className="flex w-full justify-center">
        <div className="w-full max-w-5xl">
          <div
            className={`relative overflow-hidden bg-surface-2/95 border rounded-2xl transition-all duration-200 shadow-lg shadow-black/10 focus-within:border-border-hover focus-within:ring-1 focus-within:ring-accent/15 ${
              hasInput
                ? "border-border-hover ring-1 ring-accent/12"
                : "border-border/80"
            }`}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Mohana GPT..."
              rows={1}
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary/90 text-[0.9375rem] resize-none outline-none leading-relaxed max-h-[220px] px-7 sm:px-8 pt-[1.375rem] pb-4"
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between gap-3 border-t border-border-subtle/70 px-6 sm:px-7 py-3">
              <div className="flex items-center gap-2.5">
                <FileUpload />
              </div>

              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="w-9 h-9 flex items-center justify-center bg-text-primary text-surface-0 rounded-xl hover:bg-text-secondary transition-colors duration-150 cursor-pointer shadow-sm"
                  title="Stop generating"
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!hasInput}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                    hasInput
                      ? "bg-accent text-white shadow-sm shadow-accent/20 hover:bg-accent-hover scale-100 hover:scale-105"
                      : "bg-surface-4/90 text-text-quaternary cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          <p className="text-[0.6875rem] text-text-quaternary text-center mt-2 select-none tracking-wide">
            Mohana GPT can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
