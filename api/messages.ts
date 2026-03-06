import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db/index.js'
import { messages } from './_db/schema.js'
import { eq, asc } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    const { conversationId } = req.query
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({ message: 'conversationId is required' })
    }

    const db = getDb()
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(asc(messages.created_at))
    return res.json({ messages: result })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' })
  }
}
