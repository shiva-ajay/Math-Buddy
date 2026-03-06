import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  return res.json({
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced model with vision capabilities', available: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest GPT-4 with enhanced capabilities', available: true },
      { id: 'o3-mini', name: 'o3-mini', description: 'Fast and efficient reasoning model', available: true },
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model for complex tasks', available: true },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Optimized GPT-4 with vision capabilities', available: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective', available: true },
    ],
  })
}
