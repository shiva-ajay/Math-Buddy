import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function parseMultipart(req: VercelRequest): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const contentType = req.headers['content-type'] || ''
      const boundaryMatch = contentType.match(/boundary=(.+)/)
      if (!boundaryMatch) {
        reject(new Error('No boundary found'))
        return
      }

      const boundary = boundaryMatch[1]
      const bodyStr = body.toString('latin1')
      const parts = bodyStr.split(`--${boundary}`)

      for (const part of parts) {
        if (part.includes('filename=')) {
          const filenameMatch = part.match(/filename="([^"]+)"/)
          const mimeMatch = part.match(/Content-Type:\s*(.+)\r\n/)
          const filename = filenameMatch ? filenameMatch[1] : 'unknown'
          const mimetype = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream'

          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd === -1) continue
          const content = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'))
          const buffer = Buffer.from(content, 'latin1')

          resolve({ buffer, filename, mimetype })
          return
        }
      }
      reject(new Error('No file found in upload'))
    })
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { buffer, filename, mimetype } = await parseMultipart(req)
    let text = ''

    if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (mimetype === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
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

      const visionData = await visionRes.json()
      text = visionData.choices?.[0]?.message?.content || ''
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Use PDF, TXT, DOCX, or images.' })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'unknown'

    return res.json({
      text: text.slice(0, 50000), // Limit to ~50k chars
      file_name: filename,
      file_type: ext,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ message: 'Failed to process file' })
  }
}
