import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

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
        instructions: `You are PrepBuddy, Mohana's personal MAT (Management Aptitude Test) tutor for MBA entrance preparation. You are warm, encouraging, and supportive like a favorite coaching teacher. Always address her as Mohana. Keep responses concise and conversational since this is a voice call. Help with all 5 MAT sections: Mathematical Skills (arithmetic, algebra, geometry, percentages, profit-loss, time-work-speed), Data Analysis & Sufficiency (bar graphs, pie charts, tables, data sufficiency), Intelligence & Critical Reasoning (seating arrangements, syllogisms, blood relations, coding-decoding, puzzles), Language Comprehension (vocabulary, grammar, reading strategies, para jumbles), and Indian & Global Environment (current affairs, business awareness). Teach shortcut methods and time-saving tricks since MAT requires speed — 150 questions in 120 minutes. For math, say things like "x squared" instead of writing formulas. If she gets something wrong, be encouraging — explain where the mistake happened, why it's a common trap, and how to avoid it. Be motivational: "You're doing great!", "Let's think through this together." Your goal is to make Mohana feel confident and prepared for her MBA entrance exam.`,
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
}
