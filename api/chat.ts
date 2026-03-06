import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db/index.js'
import { messages, conversations } from './_db/schema.js'
import { eq } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { conversation_id, message, model, system_prompt } = req.body

  if (!conversation_id || !message) {
    return res.status(400).json({ message: 'conversation_id and message are required' })
  }

  const db = getDb()
  const selectedModel = model || 'gpt-4o'

  try {
    // Save user message
    await db.insert(messages).values({
      conversation_id,
      role: 'user',
      content: message,
    })

    // Get conversation history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversation_id))
      .orderBy(messages.created_at)

    const chatMessages: { role: string; content: string }[] = []

    if (system_prompt) {
      chatMessages.push({ role: 'system', content: system_prompt })
    }

    for (const msg of history) {
      chatMessages.push({ role: msg.role, content: msg.content })
    }

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY!

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 4096,
        ...(!/^(o1|o3|o4)/.test(selectedModel) && { temperature: 0.7 }),
      }),
    })

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text()
      console.error('OpenAI error:', openaiRes.status, errorText)
      return res.status(openaiRes.status).json({
        message: `OpenAI error: ${openaiRes.statusText}`,
      })
    }

    // Stream response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = openaiRes.body?.getReader()
    if (!reader) {
      return res.status(500).json({ message: 'No response stream' })
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n')
              continue
            }
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              if (delta?.content) {
                fullContent += delta.content
                res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`)
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError)
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
    }

    // Save assistant message
    if (fullContent) {
      await db.insert(messages).values({
        conversation_id,
        role: 'assistant',
        content: fullContent,
      })

      // Auto-generate title from first message if title is "New Chat"
      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversation_id))
        .limit(1)

      if (conv[0]?.title === 'New Chat') {
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
        await db
          .update(conversations)
          .set({ title, updated_at: new Date() })
          .where(eq(conversations.id, conversation_id))
      } else {
        await db
          .update(conversations)
          .set({ updated_at: new Date() })
          .where(eq(conversations.id, conversation_id))
      }
    }

    res.end()
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
