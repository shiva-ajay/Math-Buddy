import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { prompt, size = '1024x1024', quality = 'standard' } = req.body

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' })
  }

  const apiKey = process.env.OPENAI_API_KEY!

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        size,
        quality,
        n: 1,
      }),
    })

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text()
      console.error('DALL-E error:', openaiRes.status, errorText)
      return res.status(openaiRes.status).json({
        message: `Image generation failed: ${openaiRes.statusText}`,
      })
    }

    const data = await openaiRes.json()
    const image = data.data?.[0]

    return res.json({
      image_url: image?.url || '',
      revised_prompt: image?.revised_prompt || prompt,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return res.status(500).json({ message: 'Failed to generate image' })
  }
}
