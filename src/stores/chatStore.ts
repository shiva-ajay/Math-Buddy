import { create } from 'zustand'
import type { Conversation, Message } from '@/types/chat'
import { apiGet, apiPost, apiPut, apiDelete, streamChat } from '@/lib/api'
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_MODEL } from '@/lib/constants'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  uploadedFileContext: { text: string; name: string } | null
  abortController: AbortController | null

  fetchConversations: () => Promise<void>
  createConversation: (model?: string, systemPrompt?: string) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  setActiveConversation: (id: string | null) => Promise<void>
  sendMessage: (content: string, model: string, systemPrompt: string) => Promise<void>
  stopStreaming: () => void
  setUploadedFileContext: (ctx: { text: string; name: string } | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  isLoadingConversations: false,
  isLoadingMessages: false,
  uploadedFileContext: null,
  abortController: null,

  fetchConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const data = await apiGet<{ conversations: Conversation[] }>('/conversations')
      set({ conversations: data.conversations })
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      set({ isLoadingConversations: false })
    }
  },

  createConversation: async (model?: string, systemPrompt?: string) => {
    const data = await apiPost<{ conversation: Conversation }>('/conversations', {
      model: model || DEFAULT_MODEL,
      system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    })
    const conv = data.conversation
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConversationId: conv.id,
      messages: [],
    }))
    return conv.id
  },

  deleteConversation: async (id: string) => {
    await apiDelete(`/conversations/${id}`)
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id)
      const activeConversationId =
        state.activeConversationId === id ? null : state.activeConversationId
      return { conversations, activeConversationId, messages: activeConversationId ? state.messages : [] }
    })
  },

  renameConversation: async (id: string, title: string) => {
    await apiPut(`/conversations/${id}`, { title })
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    }))
  },

  setActiveConversation: async (id: string | null) => {
    set({ activeConversationId: id, messages: [], isLoadingMessages: !!id })
    if (!id) return
    try {
      const data = await apiGet<{ messages: Message[] }>(`/messages?conversationId=${id}`)
      set({ messages: data.messages })
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  sendMessage: async (content: string, model: string, systemPrompt: string) => {
    const state = get()
    let conversationId = state.activeConversationId

    if (!conversationId) {
      conversationId = await get().createConversation(model, systemPrompt)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    }

    set((s) => ({ messages: [...s.messages, userMessage] }))

    const fileContext = state.uploadedFileContext
    const abortController = new AbortController()

    set({ isStreaming: true, streamingContent: '', abortController, uploadedFileContext: null })

    const messageContent = fileContext
      ? `[File: ${fileContext.name}]\n\n${fileContext.text}\n\n---\n\n${content}`
      : content

    // Throttle streaming updates to ~30fps to prevent excessive re-renders
    let pendingContent = ''
    let rafId: number | null = null

    const flushStreamingContent = () => {
      rafId = null
      set({ streamingContent: pendingContent })
    }

    streamChat(
      {
        conversation_id: conversationId,
        message: messageContent,
        model,
        system_prompt: systemPrompt,
      },
      (accumulated) => {
        pendingContent = accumulated
        if (rafId === null) {
          rafId = requestAnimationFrame(flushStreamingContent)
        }
      },
      (fullText) => {
        if (rafId !== null) cancelAnimationFrame(rafId)
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: 'assistant',
          content: fullText,
          metadata: {},
          created_at: new Date().toISOString(),
        }
        set((s) => ({
          messages: [...s.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
          abortController: null,
        }))
        // Refresh conversations to update title/timestamp
        get().fetchConversations()
      },
      (error) => {
        if (rafId !== null) cancelAnimationFrame(rafId)
        console.error('Stream error:', error)
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: 'assistant',
          content: `Error: ${error.message}`,
          metadata: { error: true },
          created_at: new Date().toISOString(),
        }
        set((s) => ({
          messages: [...s.messages, errorMessage],
          isStreaming: false,
          streamingContent: '',
          abortController: null,
        }))
      },
      abortController.signal,
    )
  },

  stopStreaming: () => {
    const { abortController, streamingContent } = get()
    abortController?.abort()
    if (streamingContent) {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: get().activeConversationId!,
        role: 'assistant',
        content: streamingContent,
        metadata: { stopped: true },
        created_at: new Date().toISOString(),
      }
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        isStreaming: false,
        streamingContent: '',
        abortController: null,
      }))
    } else {
      set({ isStreaming: false, streamingContent: '', abortController: null })
    }
  },

  setUploadedFileContext: (ctx) => set({ uploadedFileContext: ctx }),

  clearMessages: () => set({ messages: [], activeConversationId: null }),
}))
