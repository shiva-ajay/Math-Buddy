import { useMemo } from "react";
import { useChatStore } from "@/stores/chatStore";
import { groupConversationsByDate } from "@/lib/utils";
import { ConversationItem } from "./ConversationItem";
import { MessageSquareDashed, Loader2, SearchX } from "lucide-react";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  searchQuery?: string;
}

export function ConversationList({ searchQuery = "" }: ConversationListProps) {
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isLoadingConversations = useChatStore((s) => s.isLoadingConversations);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  if (isLoadingConversations) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-text-quaternary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/3 border border-white/6 flex items-center justify-center mb-3">
          <MessageSquareDashed
            size={18}
            className="text-text-quaternary"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-[0.8125rem] font-medium text-text-tertiary">
          No conversations yet
        </p>
        <p className="text-[0.6875rem] text-text-quaternary mt-1">
          Start a new chat to begin
        </p>
      </div>
    );
  }

  if (filtered.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <SearchX size={20} className="text-text-quaternary mb-2" strokeWidth={1.5} />
        <p className="text-[0.75rem] text-text-tertiary">No results found</p>
      </div>
    );
  }

  const groups = groupConversationsByDate(filtered);

  return (
    <div className="flex-1 overflow-y-auto px-3 pt-1 pb-3 scrollbar-thin scrollbar-thumb-white/8 scrollbar-track-transparent">
      {groups.map((group, i) => (
        <div key={group.label} className={i > 0 ? "mt-4" : ""}>
          <p className="text-[0.625rem] font-semibold text-text-quaternary/70 uppercase tracking-[0.1em] px-1 mb-1.5">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {(group.items as Conversation[]).map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
