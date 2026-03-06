import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getDb } from './db/index.js'
import { conversations, messages } from './db/schema.js'
import { eq, desc, asc } from 'drizzle-orm'

dotenv.config()

const app = express()
app.use(cors())

// --- Upload (before express.json() so body stream isn't consumed) ---
app.post('/api/upload', express.raw({ type: () => true, limit: '10mb' }), async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || ''
    const boundaryMatch = contentType.match(/boundary=(.+)/)
    if (!boundaryMatch) return res.status(400).json({ message: 'No boundary found' })

    const boundary = boundaryMatch[1]
    const bodyStr = req.body.toString('latin1')
    const parts = bodyStr.split(`--${boundary}`)

    let buffer: Buffer | null = null
    let filename = 'unknown'
    let mimetype = 'application/octet-stream'

    for (const part of parts) {
      if (part.includes('filename=')) {
        const filenameMatch = part.match(/filename="([^"]+)"/)
        const mimeMatch = part.match(/Content-Type:\s*(.+)\r\n/)
        filename = filenameMatch ? filenameMatch[1] : 'unknown'
        mimetype = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream'

        const headerEnd = part.indexOf('\r\n\r\n')
        if (headerEnd === -1) continue
        const content = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'))
        buffer = Buffer.from(content, 'latin1')
        break
      }
    }

    if (!buffer) return res.status(400).json({ message: 'No file found in upload' })

    let text = ''

    if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (mimetype === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (mimetype.startsWith('image/')) {
      // Use GPT-4o vision to extract text from handwritten math notes
      const base64Image = buffer.toString('base64')
      const dataUrl = `data:${mimetype};base64,${base64Image}`

      const apiKey = process.env.OPENAI_API_KEY!

      const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text, mathematical expressions, equations, and notes from this image. Use LaTeX notation (e.g. $x^2$, $$\\int_0^1 f(x)dx$$) for any mathematical content. Preserve the structure and ordering of the content as closely as possible.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      })

      if (!visionRes.ok) {
        const errorText = await visionRes.text()
        console.error('Vision API error:', visionRes.status, errorText)
        return res.status(500).json({ message: 'Failed to extract text from image' })
      }

      const visionData = await visionRes.json() as { choices?: { message?: { content?: string } }[] }
      text = visionData.choices?.[0]?.message?.content || ''
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Use PDF, TXT, DOCX, or images.' })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'unknown'
    res.json({ text: text.slice(0, 50000), file_name: filename, file_type: ext })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ message: 'Failed to process file' })
  }
})

app.use(express.json())

// --- Conversations ---
app.get('/api/conversations', async (_req, res) => {
  try {
    const db = getDb()
    const result = await db.select().from(conversations).orderBy(desc(conversations.updated_at))
    res.json({ conversations: result })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ message: 'Failed to fetch conversations' })
  }
})

app.post('/api/conversations', async (req, res) => {
  try {
    const db = getDb()
    const { title, model, system_prompt } = req.body || {}
    const result = await db.insert(conversations).values({
      title: title || 'New Chat',
      model: model || 'gpt-4o',
      system_prompt: system_prompt || '',
    }).returning()
    res.json({ conversation: result[0] })
  } catch (error) {
    console.error('Error creating conversation:', error)
    res.status(500).json({ message: 'Failed to create conversation' })
  }
})

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const db = getDb()
    const result = await db.select().from(conversations).where(eq(conversations.id, req.params.id)).limit(1)
    if (!result[0]) return res.status(404).json({ message: 'Not found' })
    res.json({ conversation: result[0] })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Failed' })
  }
})

app.put('/api/conversations/:id', async (req, res) => {
  try {
    const db = getDb()
    const { title, model, system_prompt } = req.body || {}
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (title !== undefined) updates.title = title
    if (model !== undefined) updates.model = model
    if (system_prompt !== undefined) updates.system_prompt = system_prompt
    const result = await db.update(conversations).set(updates).where(eq(conversations.id, req.params.id)).returning()
    res.json({ conversation: result[0] })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Failed' })
  }
})

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const db = getDb()
    await db.delete(conversations).where(eq(conversations.id, req.params.id))
    res.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Failed' })
  }
})

// --- Messages ---
app.get('/api/messages', async (req, res) => {
  try {
    const db = getDb()
    const conversationId = req.query.conversationId as string
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' })
    const result = await db.select().from(messages).where(eq(messages.conversation_id, conversationId)).orderBy(asc(messages.created_at))
    res.json({ messages: result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Failed' })
  }
})

// --- Chat (Streaming) ---
app.post('/api/chat', async (req, res) => {
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
    const history = await db.select().from(messages).where(eq(messages.conversation_id, conversation_id)).orderBy(asc(messages.created_at))

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
      return res.status(openaiRes.status).json({ message: `OpenAI error: ${openaiRes.statusText}` })
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

      // Auto-generate title from first message
      const conv = await db.select().from(conversations).where(eq(conversations.id, conversation_id)).limit(1)
      if (conv[0]?.title === 'New Chat') {
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
        await db.update(conversations).set({ title, updated_at: new Date() }).where(eq(conversations.id, conversation_id))
      } else {
        await db.update(conversations).set({ updated_at: new Date() }).where(eq(conversations.id, conversation_id))
      }
    }

    res.end()
  } catch (error) {
    console.error('Chat error:', error)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' })
    }
  }
})

// --- Models ---
app.get('/api/models', (_req, res) => {
  res.json({
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced model with vision capabilities', available: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest GPT-4 with enhanced capabilities', available: true },
      { id: 'o3-mini', name: 'o3-mini', description: 'Fast and efficient reasoning model', available: true },
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model for complex tasks', available: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective', available: true },
    ],
  })
})

// --- Image ---
app.post('/api/image', async (req, res) => {
  const { prompt, size = '1024x1024', quality = 'standard' } = req.body
  if (!prompt) return res.status(400).json({ message: 'Prompt is required' })

  const apiKey = process.env.OPENAI_API_KEY!

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt, size, quality, n: 1 }),
    })

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text()
      console.error('DALL-E error:', openaiRes.status, errorText)
      return res.status(openaiRes.status).json({ message: `Image generation failed: ${openaiRes.statusText}` })
    }

    const data = await openaiRes.json()
    const image = data.data?.[0]
    res.json({ image_url: image?.url || '', revised_prompt: image?.revised_prompt || prompt })
  } catch (error) {
    console.error('Image generation error:', error)
    res.status(500).json({ message: 'Failed to generate image' })
  }
})

// --- Realtime Voice Session (ephemeral token) ---
app.post('/api/realtime-session', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY not configured' })
  }

  const { voice = 'ash' } = req.body || {}

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice,
        instructions: `You are MathBuddy, Mohana's personal MAT (Mathematics Admissions Test) tutor. You are warm, encouraging, and supportive like a favorite teacher. Always address her as Mohana. Keep responses concise and conversational since this is a voice call. Explain math concepts step by step using spoken language - say things like "x squared" instead of writing formulas. Be motivational: "You're doing great!", "Let's think through this together." Help with algebra, calculus, geometry, sequences, combinatorics, logic, and problem-solving strategies for the MAT exam. If she gets something wrong, be encouraging and guide her to the answer. Your goal is to make Mohana feel confident and prepared.`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI Realtime session error:', response.status, errorText)
      return res.status(response.status).json({ message: `Failed to create realtime session: ${response.statusText}` })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Realtime session error:', error)
    res.status(500).json({ message: 'Failed to create realtime session' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
