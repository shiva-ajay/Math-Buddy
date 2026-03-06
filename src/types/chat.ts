export interface Conversation {
  id: string
  title: string
  system_prompt: string
  model: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Model {
  id: string
  name: string
  description: string
  available: boolean
}

export interface ChatRequest {
  conversation_id: string
  message: string
  model: string
  system_prompt: string
  file_context?: string
}

export interface UploadResponse {
  text: string
  file_name: string
  file_type: string
}

export interface ImageResponse {
  image_url: string
  revised_prompt: string
}

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface QuizData {
  type: 'quiz'
  title: string
  description: string
  questions: QuizQuestion[]
}
