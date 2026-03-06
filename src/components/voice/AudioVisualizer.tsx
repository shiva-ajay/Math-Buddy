import { useRef, useEffect } from 'react'

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null
  isActive: boolean
  size?: number
}

export function AudioVisualizer({ analyserNode, isActive, size = 160 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.32
    const barCount = 48
    const maxBarHeight = size * 0.15

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      if (analyserNode && isActive) {
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
        analyserNode.getByteFrequencyData(dataArray)

        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
          const dataIndex = Math.floor((i / barCount) * dataArray.length)
          const value = dataArray[dataIndex] / 255
          const barHeight = Math.max(2, value * maxBarHeight)

          const x1 = centerX + Math.cos(angle) * radius
          const y1 = centerY + Math.sin(angle) * radius
          const x2 = centerX + Math.cos(angle) * (radius + barHeight)
          const y2 = centerY + Math.sin(angle) * (radius + barHeight)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `rgba(200, 149, 108, ${0.4 + value * 0.6})`
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      } else {
        // Idle state: gentle breathing dots
        const time = Date.now() / 1000
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
          const pulse = Math.sin(time * 2 + i * 0.3) * 0.3 + 0.7
          const barHeight = 3 * pulse

          const x1 = centerX + Math.cos(angle) * radius
          const y1 = centerY + Math.sin(angle) * radius
          const x2 = centerX + Math.cos(angle) * (radius + barHeight)
          const y2 = centerY + Math.sin(angle) * (radius + barHeight)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `rgba(200, 149, 108, ${0.15 + pulse * 0.15})`
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [analyserNode, isActive, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="absolute inset-0 m-auto"
    />
  )
}
