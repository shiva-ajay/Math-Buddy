import { useEffect, useRef } from 'react'

export function useAutoScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, deps)

  return scrollRef
}
