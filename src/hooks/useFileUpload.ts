import { useState, useCallback } from 'react'
import { apiUpload } from '@/lib/api'
import { useChatStore } from '@/stores/chatStore'
import type { UploadResponse } from '@/types/chat'
import { MAX_FILE_SIZE } from '@/lib/constants'

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setUploadedFileContext = useChatStore((s) => s.setUploadedFileContext)

  const upload = useCallback(
    async (file: File) => {
      setError(null)

      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 4MB.')
        return
      }

      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'txt', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'heic'].includes(ext || '')) {
        setError('Unsupported file type. Use PDF, TXT, DOCX, or images.')
        return
      }

      setIsUploading(true)
      try {
        const data = await apiUpload<UploadResponse>('/upload', file)
        setUploadedFileContext({ text: data.text, name: data.file_name })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [setUploadedFileContext],
  )

  const clearFile = useCallback(() => {
    setUploadedFileContext(null)
    setError(null)
  }, [setUploadedFileContext])

  return { upload, clearFile, isUploading, error }
}
