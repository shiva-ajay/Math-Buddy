import { useState, useCallback, useMemo, memo } from 'react'
import { Copy, Check, User, Sparkles, BookOpen, Loader2 } from 'lucide-react'
import type { Message } from '@/types/chat'
import { formatTime } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ImageDisplay } from './ImageDisplay'
import { QuizRenderer } from './QuizRenderer'
import { parseQuizFromMessage, buildQuizSubmissionMessage } from '@/lib/quizParser'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.metadata?.error === true
  const imageUrl = message.metadata?.image_url as string | undefined

  const sendMessage = useChatStore((s) => s.sendMessage)
  const model = useSettingsStore((s) => s.model)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)

  const parsedQuiz = useMemo(() => {
    if (isUser) return null
    if (isStreaming) {
      // During streaming, detect if quiz JSON is being generated
      // Show a placeholder instead of ugly raw JSON
      const c = message.content.trim()
      if (c.startsWith('{"') && c.includes('"quiz"')) {
        return { quiz: null, beforeText: '', afterText: '', isQuizStreaming: true }
      }
      return null
    }
    return parseQuizFromMessage(message.content)
  }, [message.content, isUser, isStreaming])

  const hasQuiz = parsedQuiz?.quiz != null
  const isQuizStreaming = !!(parsedQuiz && 'isQuizStreaming' in parsedQuiz && parsedQuiz.isQuizStreaming)

  const handleQuizSubmit = useCallback(
    (answers: Record<number, number>) => {
      if (!parsedQuiz?.quiz) return
      const reviewMessage = buildQuizSubmissionMessage(parsedQuiz.quiz, answers)
      sendMessage(reviewMessage, model, systemPrompt)
    },
    [parsedQuiz, sendMessage, model, systemPrompt],
  )

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up mb-6">
        <div className="max-w-[88%] sm:max-w-[65%] flex flex-col items-end gap-1.5">
          <div className="flex items-end gap-2.5">
            <div className="bg-user-bubble text-user-bubble-text rounded-2xl rounded-br-sm px-6 py-4 shadow-md shadow-user-bubble/8">
              <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
            <div className="shrink-0 w-7 h-7 rounded-full bg-user-bubble/90 flex items-center justify-center shadow-sm shadow-user-bubble/15">
              <User size={13} className="text-white" />
            </div>
          </div>
          <span className="text-[0.6875rem] text-text-quaternary mr-10 select-none">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    )
  }

  // Quiz detected — render interactive quiz UI
  if (hasQuiz) {
    return (
      <div className="flex justify-start animate-fade-in-up mb-6">
        <div className="max-w-full sm:max-w-[85%] flex flex-col items-start gap-1.5">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-accent to-accent-dim flex items-center justify-center mt-0.5 shadow-sm shadow-accent/10">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              {parsedQuiz!.beforeText && (
                <div className="rounded-2xl rounded-tl-sm px-6 py-4 bg-surface-2 text-text-primary border border-border-subtle/50 mb-3">
                  <MarkdownRenderer content={parsedQuiz!.beforeText} />
                </div>
              )}
              <QuizRenderer quiz={parsedQuiz!.quiz!} onSubmit={handleQuizSubmit} />
              {parsedQuiz!.afterText && (
                <div className="rounded-2xl rounded-tl-sm px-6 py-4 bg-surface-2 text-text-primary border border-border-subtle/50 mt-3">
                  <MarkdownRenderer content={parsedQuiz!.afterText} />
                </div>
              )}
            </div>
          </div>
          <span className="text-[0.6875rem] text-text-quaternary ml-10 select-none">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    )
  }

  // Quiz is being streamed — show a nice placeholder instead of raw JSON
  if (isQuizStreaming) {
    return (
      <div className="flex justify-start animate-fade-in-up mb-6">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-accent to-accent-dim flex items-center justify-center mt-0.5 shadow-sm shadow-accent/10">
            <Sparkles size={13} className="text-white" />
          </div>
          <div className="rounded-2xl rounded-tl-sm px-6 py-4 bg-surface-2 text-text-primary border border-border-subtle/50">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-accent animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Generating your quiz...</p>
                <p className="text-xs text-text-tertiary mt-0.5">Preparing questions, hang tight!</p>
              </div>
              <Loader2 size={16} className="animate-spin text-accent ml-2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular assistant message
  return (
    <div className={`flex justify-start mb-6 ${isStreaming ? '' : 'animate-fade-in-up'}`}>
      <div className="max-w-full sm:max-w-[85%] flex flex-col items-start gap-1.5">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-accent to-accent-dim flex items-center justify-center mt-0.5 shadow-sm shadow-accent/10">
            <Sparkles size={13} className="text-white" />
          </div>
          <div className="group relative min-w-0">
            <div
              className={`rounded-2xl rounded-tl-sm px-6 py-4 ${
                isError
                  ? 'bg-error-bg text-error border border-error/10'
                  : 'bg-surface-2 text-text-primary border border-border-subtle/50'
              }`}
            >
              <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
              {imageUrl && <ImageDisplay url={imageUrl} />}
            </div>

            {/* Copy action */}
            {!isStreaming && message.content && (
              <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.6875rem] font-medium text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-all duration-150 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <span className="text-[0.6875rem] text-text-quaternary ml-10 select-none">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
})
