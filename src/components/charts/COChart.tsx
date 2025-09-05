import React, { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { type ChartProps } from '@/types'

interface ChartViewport {
  x0: number
  x1: number
}

export const COChart: React.FC<ChartProps> = ({ 
  data, 
  thresholds,
  width = 1200,
  height = 400,
  interactive = true,
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [chartView, setChartView] = useState<ChartViewport>({ x0: 0, x1: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawChart = () => {
      const { width: w, height: h } = canvas
      
      // Clear canvas
      ctx.clearRect(0, 0, w, h)

      // Chart margins
      const marginLeft = 50
      const marginRight = 10  
      const marginTop = 20
      const marginBottom = 40
      const chartWidth = w - marginLeft - marginRight
      const chartHeight = h - marginTop - marginBottom

      // Theme-aware colors
      const isDark = document.documentElement.classList.contains('dark')
      const axisColor = isDark ? '#2a3442' : '#e3e8f0'
      const gridColor = axisColor + '55'
      
      // Draw axes
      ctx.strokeStyle = axisColor
      ctx.lineWidth = 2
      ctx.beginPath()
      // X axis
      ctx.moveTo(marginLeft, h - marginBottom)
      ctx.lineTo(w - marginRight, h - marginBottom)
      // Y axis  
      ctx.moveTo(marginLeft, marginTop)
      ctx.lineTo(marginLeft, h - marginBottom)
      ctx.stroke()

      if (data.length === 0) return

      // Data bounds
      const timeStart = data[0].timestamp
      const timeEnd = data[data.length - 1].timestamp
      const viewStart = timeStart + (timeEnd - timeStart) * chartView.x0
      const viewEnd = timeStart + (timeEnd - timeStart) * chartView.x1
      
      // Filter data to viewport
      const viewData = data.filter(d => d.timestamp >= viewStart && d.timestamp <= viewEnd)
      if (viewData.length === 0) return

      const minValue = 0
      const maxValue = Math.max(100, ...viewData.map(d => d.value))

      // Scaling functions
      const scaleX = (timestamp: number) => 
        marginLeft + ((timestamp - viewStart) / (viewEnd - viewStart)) * chartWidth
      const scaleY = (value: number) => 
        (h - marginBottom) - ((value - minValue) / (maxValue - minValue)) * chartHeight

      // Draw grid lines
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      for (let i = 0; i <= 5; i++) {
        const y = (h - marginBottom) - (i * chartHeight) / 5
        ctx.beginPath()
        ctx.moveTo(marginLeft, y)
        ctx.lineTo(w - marginRight, y)
        ctx.stroke()
      }

      // Draw threshold lines
      ctx.setLineDash([6, 6])
      
      // Warning threshold
      const warnY = scaleY(thresholds.warning)
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--co-amber').trim()
      ctx.beginPath()
      ctx.moveTo(marginLeft, warnY)
      ctx.lineTo(w - marginRight, warnY)
      ctx.stroke()

      // Critical threshold
      const critY = scaleY(thresholds.critical)
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--co-red').trim()
      ctx.beginPath()
      ctx.moveTo(marginLeft, critY)
      ctx.lineTo(w - marginRight, critY)
      ctx.stroke()

      ctx.setLineDash([])

      // Draw data line
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--co-blue').trim()
      ctx.lineWidth = 3
      ctx.beginPath()
      
      viewData.forEach((point, index) => {
        const x = scaleX(point.timestamp)
        const y = scaleY(point.value)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }

    drawChart()
  }, [data, chartView, thresholds])

  // Interactive chart handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!interactive || !canvas) return

    let dragging = false
    let lastX = 0

    const handlePointerDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      canvas.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging) return
      
      const rect = canvas.getBoundingClientRect()
      const dx = (e.clientX - lastX) / rect.width
      lastX = e.clientX
      
      setChartView(prev => ({
        x0: Math.max(0, Math.min(0.99, prev.x0 - dx)),
        x1: Math.max(0.01, Math.min(1, prev.x1 - dx))
      }))
    }

    const handlePointerUp = () => {
      dragging = false
    }

    const handleDoubleClick = () => {
      setChartView({ x0: 0, x1: 1 })
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('dblclick', handleDoubleClick)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)  
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('dblclick', handleDoubleClick)
    }
  }, [interactive])

  return (
    <Card className={cn("p-4", className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full aspect-video border border-border rounded-lg"
        aria-label="CO history chart (24h)"
      />
      <p className="text-sm text-muted-foreground mt-2">
        24‑hour CO ppm trend. {interactive ? 'Drag to pan, double‑tap to reset.' : ''}
      </p>
    </Card>
  )
}