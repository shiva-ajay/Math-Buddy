import { useEffect, useState } from "react";
import {
  Plus,
  PanelLeftClose,
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ConversationList } from "./ConversationList";

export function Sidebar() {
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const conversationCount = useChatStore((s) => s.conversations.length);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="flex flex-col h-full bg-surface-0/90 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-sm shadow-accent/20">
            <GraduationCap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[0.8125rem] font-semibold text-text-primary tracking-[-0.01em]">
            Mohana GPT
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-text-quaternary hover:text-text-secondary rounded-lg transition-colors cursor-pointer hover:bg-white/5"
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Actions row */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <button
          onClick={clearMessages}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-accent/12 hover:bg-accent/18 border border-accent/20 text-accent transition-all duration-200 cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="text-[0.75rem] font-semibold">New Chat</span>
        </button>
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchQuery("");
          }}
          className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
            searchOpen
              ? "bg-white/9 text-text-primary border border-white/10"
              : "text-text-quaternary hover:text-text-secondary hover:bg-white/5 border border-transparent hover:border-white/8"
          }`}
        >
          {searchOpen ? (
            <X size={14} strokeWidth={2} />
          ) : (
            <Search size={14} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Search input */}
      {searchOpen && (
        <div className="px-4 pb-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-quaternary"
              strokeWidth={2}
            />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/4 border border-white/7 text-[0.75rem] text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent/35 focus:bg-white/6 transition-all"
            />
          </div>
        </div>
      )}

      {/* Conversation section heading */}
      <div className="px-4 pt-1 pb-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-text-quaternary/80">
            {searchOpen && searchQuery.trim() ? "Search Results" : "Conversations"}
          </span>
          <span className="rounded-md bg-white/6 px-1.5 py-0.5 text-[0.625rem] font-semibold text-text-tertiary tabular-nums">
            {conversationCount}
          </span>
        </div>
      </div>

      {/* Conversations */}
      <ConversationList searchQuery={searchQuery} />

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
          <span className="text-[0.625rem] text-text-quaternary font-medium">
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}
