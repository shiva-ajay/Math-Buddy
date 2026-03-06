import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../db/index.js'
import { conversations } from '../../db/schema.js'
import { eq } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid conversation ID' })
    }

    const db = getDb()

    if (req.method === 'GET') {
      const result = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1)
      if (!result[0]) {
        return res.status(404).json({ message: 'Conversation not found' })
      }
      return res.json({ conversation: result[0] })
    }

    if (req.method === 'PUT') {
      const { title, model, system_prompt } = req.body || {}
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (title !== undefined) updates.title = title
      if (model !== undefined) updates.model = model
      if (system_prompt !== undefined) updates.system_prompt = system_prompt

      const result = await db
        .update(conversations)
        .set(updates)
        .where(eq(conversations.id, id))
        .returning()
      return res.json({ conversation: result[0] })
    }

    if (req.method === 'DELETE') {
      await db.delete(conversations).where(eq(conversations.id, id))
      return res.json({ success: true })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' })
  }
}
