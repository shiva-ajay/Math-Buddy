import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../db/index.js'
import { conversations } from '../db/schema.js'
import { desc } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb()

    if (req.method === 'GET') {
      const result = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.updated_at))
      return res.json({ conversations: result })
    }

    if (req.method === 'POST') {
      const { title, model, system_prompt } = req.body || {}
      const result = await db
        .insert(conversations)
        .values({
          title: title || 'New Chat',
          model: model || 'o4-mini',
          system_prompt: system_prompt || '',
        })
        .returning()
      return res.json({ conversation: result[0] })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' })
  }
}
