import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../db/index.js'
import { conversations } from '../db/schema.js'
import { desc } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb()

  if (req.method === 'GET') {
    try {
      const result = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.updated_at))
      return res.json({ conversations: result })
    } catch (error) {
      console.error('Error fetching conversations:', error)
      return res.status(500).json({ message: 'Failed to fetch conversations' })
    }
  }

  if (req.method === 'POST') {
    try {
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
    } catch (error) {
      console.error('Error creating conversation:', error)
      return res.status(500).json({ message: 'Failed to create conversation' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
