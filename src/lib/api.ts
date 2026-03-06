const API_BASE = '/api'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'API request failed')
  }
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'API request failed')
  }
  return res.json()
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'API request failed')
  }
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'API request failed')
  }
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'Upload failed')
  }
  return res.json()
}

export function streamChat(
  body: unknown,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
) {
  fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(error.message || 'Chat request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Append chunk to buffer to handle lines split across chunks
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')

        // Keep the last element — it may be an incomplete line
        lineBuffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6)
            if (data === '[DONE]') {
              onDone(accumulated)
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulated += parsed.content
                onChunk(accumulated)
              }
              if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
      }

      // Process any remaining data in the buffer
      if (lineBuffer.trim()) {
        const trimmedLine = lineBuffer.trim()
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulated += parsed.content
              }
            } catch {
              // ignore final incomplete chunk
            }
          }
        }
      }

      onDone(accumulated)
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err)
      }
    })
}
