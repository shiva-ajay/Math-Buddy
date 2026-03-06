import { useRef } from 'react'
import { Paperclip, X, FileText, Loader2 } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useChatStore } from '@/stores/chatStore'

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, clearFile, isUploading, error } = useFileUpload()
  const uploadedFileContext = useChatStore((s) => s.uploadedFileContext)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      upload(file)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp,.heic"
        onChange={handleChange}
        className="hidden"
      />

      {uploadedFileContext ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-muted rounded-lg border border-accent/15">
          <FileText size={14} className="text-accent shrink-0" />
          <span className="text-[0.75rem] font-medium text-accent truncate max-w-[120px]">
            {uploadedFileContext.name}
          </span>
          <button
            onClick={clearFile}
            className="text-accent/50 hover:text-accent transition-colors cursor-pointer p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40"
          title="Attach file (PDF, TXT, DOCX, Images)"
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>
      )}

      {error && (
        <span className="ml-2 text-[0.6875rem] text-error font-medium">{error}</span>
      )}
    </div>
  )
}
