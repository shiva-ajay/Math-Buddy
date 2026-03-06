import { useState } from 'react'
import { Download, Maximize2, X } from 'lucide-react'

interface ImageDisplayProps {
  url: string
  alt?: string
}

export function ImageDisplay({ url, alt = 'Generated image' }: ImageDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className="mt-4 relative group/img">
        <img
          src={url}
          alt={alt}
          className="rounded-xl max-w-full max-h-80 object-contain cursor-pointer border border-border-subtle hover:border-border transition-colors duration-200"
          onClick={() => setExpanded(true)}
        />
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setExpanded(true)}
            className="p-2 bg-surface-0/80 backdrop-blur-sm rounded-lg hover:bg-surface-0 transition-colors cursor-pointer border border-border-subtle/50"
          >
            <Maximize2 size={13} className="text-text-secondary" />
          </button>
          <a
            href={url}
            download
            className="p-2 bg-surface-0/80 backdrop-blur-sm rounded-lg hover:bg-surface-0 transition-colors border border-border-subtle/50"
          >
            <Download size={13} className="text-text-secondary" />
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-surface-0/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-xl transition-all cursor-pointer"
          >
            <X size={22} />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
