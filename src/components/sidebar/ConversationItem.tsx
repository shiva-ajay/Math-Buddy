import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import type { Conversation } from "@/types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export function ConversationItem({
  conversation,
  isActive,
}: ConversationItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleRename = () => {
    if (title.trim() && title !== conversation.title) {
      renameConversation(conversation.id, title.trim());
    } else {
      setTitle(conversation.title);
    }
    setIsRenaming(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      deleteConversation(conversation.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 2000);
    }
  };

  return (
    <div
      className={`group relative flex items-center min-h-10 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ease-out ${
        isActive
          ? "bg-accent/10 border border-accent/25 text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          : "border border-transparent text-text-secondary hover:bg-white/[0.04] hover:border-white/8 hover:text-text-primary"
      }`}
      onClick={() => !isRenaming && setActiveConversation(conversation.id)}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full shadow-[0_0_8px_rgba(200,149,108,0.4)]" />
      )}

      {isRenaming ? (
        <div
          className="flex items-center gap-1.5 flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setTitle(conversation.title);
                setIsRenaming(false);
              }
            }}
            className="flex-1 min-w-0 bg-surface-0/90 border border-white/10 rounded-lg px-2.5 py-1 text-[0.75rem] text-text-primary outline-none focus:border-accent/45 transition-colors"
          />
          <button
            onClick={handleRename}
            className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded-md cursor-pointer transition-colors shrink-0"
          >
            <Check size={12} />
          </button>
          <button
            onClick={() => {
              setTitle(conversation.title);
              setIsRenaming(false);
            }}
            className="p-1 text-text-quaternary hover:bg-white/6 rounded-md cursor-pointer transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 w-full min-w-0">
          <span
            className={`min-w-0 truncate text-[0.8125rem] leading-snug ${
              isActive ? "font-semibold" : "font-medium"
            }`}
          >
            {conversation.title}
          </span>

          {/* Inline action buttons */}
          <div
            className={`ml-auto flex items-center gap-0.5 shrink-0 transition-opacity duration-150 ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsRenaming(true)}
              className="p-1 text-text-quaternary hover:text-text-secondary hover:bg-white/7 rounded-md cursor-pointer transition-colors"
            >
              <Pencil size={11} strokeWidth={1.5} />
            </button>
            <button
              onClick={handleDeleteClick}
              className={`p-1 rounded-md cursor-pointer transition-colors ${
                confirmDelete
                  ? "text-red-400 bg-red-400/10"
                  : "text-text-quaternary hover:text-red-400 hover:bg-red-400/8"
              }`}
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
