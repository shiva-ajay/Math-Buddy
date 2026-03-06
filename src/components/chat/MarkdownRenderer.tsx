import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import { CodeBlock } from './CodeBlock'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark-dimmed.css'

interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [
  [rehypeKatex, { throwOnError: false, errorColor: '#a0a0b4', strict: false, trust: true }],
  rehypeHighlight,
] as any

const mdComponents = {
  pre({ children }: any) {
    return <>{children}</>
  },
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    const codeString = String(children).replace(/\n$/, '')

    if (match) {
      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

/**
 * Normalize LaTeX delimiters so remark-math can parse them.
 *
 * AI models output math in many formats that remark-math (which only understands
 * $...$ and $$...$$) cannot parse directly. This preprocessor handles:
 *
 *  1. Escaped dollar signs:  \$...\$  →  $...$  (OpenAI models since May 2025)
 *  2. Display delimiters:    \[...\]  →  $$...$$
 *  3. Inline delimiters:     \(...\)  →  $...$
 *  4. Bare environments:     \begin{env}...\end{env}  →  $$...$$
 *  5. LaTeX in code fences:  ```math ... ```  →  $$...$$
 */
function preprocessLaTeX(text: string): string {
  let result = text

  // Step 1: Unwrap LaTeX from fenced code blocks (```math, ```latex, ```tex)
  result = result.replace(/```(?:latex|math|tex)\n([\s\S]*?)```/g, (_m, inner: string) => {
    const trimmed = inner.trim()
    if (!trimmed.startsWith('$$')) return `\n$$\n${trimmed}\n$$\n`
    return trimmed
  })

  // Step 2: Unescape dollar signs that are part of math delimiters.
  // \$\$ ... \$\$  →  $$ ... $$  (display)
  result = result.replace(/\\\$\\\$([\s\S]*?)\\\$\\\$/g, (_m, inner) => `$$${inner}$$`)
  // \$ ... \$  →  $ ... $  (inline) — only when content looks like math
  result = result.replace(/\\\$((?:[^$\\]|\\.)+?)\\\$/g, (_m, inner) => {
    const hasLatex = /[\\{}_^]|[a-zA-Z]{2,}/.test(inner)
    if (hasLatex) return `$${inner}$`
    return _m
  })

  // Step 3: \[...\] → $$...$$ (display math)
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `\n$$\n${inner.trim()}\n$$\n`)

  // Step 4: \(...\) → $...$ (inline math)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`)

  // Step 5: Bare \begin{env}...\end{env} not already inside $ delimiters → $$...$$
  result = result.replace(
    /(?<!\$)(\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})(?!\$)/g,
    (_m, block) => `\n$$\n${block}\n$$\n`
  )

  // Step 6: Clean up any triple+ dollar signs from overlapping replacements
  result = result.replace(/\${3,}/g, '$$')

  return result
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const processedContent = useMemo(() => preprocessLaTeX(content), [content])

  return (
    <div className={`markdown-body text-[0.9375rem] ${isStreaming ? 'typing-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mdComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
})
