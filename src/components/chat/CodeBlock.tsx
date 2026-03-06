import { useState, useCallback } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'

interface CodeBlockProps {
  language?: string
  children: string
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  const displayLang = language || 'text'

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-border-subtle bg-surface-1">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/80 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-text-quaternary" />
          <span className="text-[0.6875rem] font-mono font-medium text-text-tertiary uppercase tracking-wider">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-text-tertiary hover:text-text-secondary transition-colors duration-150 cursor-pointer px-2 py-1 rounded-md hover:bg-surface-3"
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[0.8125rem] leading-relaxed">
        <code className={`font-mono ${language ? `hljs language-${language}` : ''}`}>
          {children}
        </code>
      </pre>
    </div>
  )
}
