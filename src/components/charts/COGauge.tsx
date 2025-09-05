import React, { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { type COGaugeProps, type AlertThresholds } from '@/types'

interface GaugeCanvasProps {
  value: number
  thresholds: AlertThresholds
  size: number
}

const GaugeCanvas: React.FC<GaugeCanvasProps> = ({ value, thresholds, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawGauge = () => {
      const { width, height } = canvas
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) / 2 - 24

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Gauge parameters
      const startAngle = Math.PI * 0.75 // 135 degrees
      const endAngle = Math.PI * 2.25   // 405 degrees (270 degree span)
      const angleRange = endAngle - startAngle

      // Background arc
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.lineWidth = 28
      ctx.lineCap = 'round'
      
      // Use CSS custom property for dynamic theming
      const isDark = document.documentElement.classList.contains('dark')
      ctx.strokeStyle = isDark ? '#1e2836' : '#e5eaf1'
      ctx.stroke()

      // Color segments
      const segments = [
        { from: 0, to: thresholds.warning, color: getComputedStyle(document.documentElement).getPropertyValue('--co-green').trim() },
        { from: thresholds.warning, to: thresholds.critical, color: getComputedStyle(document.documentElement).getPropertyValue('--co-amber').trim() },
        { from: thresholds.critical, to: 100, color: getComputedStyle(document.documentElement).getPropertyValue('--co-red').trim() },
      ]

      segments.forEach(segment => {
        const fromAngle = startAngle + (segment.from / 100) * angleRange
        const toAngle = startAngle + (segment.to / 100) * angleRange
        
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, fromAngle, toAngle)
        ctx.strokeStyle = segment.color || '#00C851'
        ctx.stroke()
      })

      // Value arc
      const clampedValue = Math.max(0, Math.min(100, value))
      const valueAngle = startAngle + (clampedValue / 100) * angleRange
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, startAngle, valueAngle)
      ctx.strokeStyle = getColorForValue(clampedValue, thresholds)
      ctx.stroke()

      // Needle
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(valueAngle - Math.PI / 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.moveTo(-8, 0)
      ctx.lineTo(0, -radius + 8)
      ctx.lineTo(8, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Center cap
      ctx.beginPath()
      ctx.arc(centerX, centerY, 10, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? '#0f1520' : '#fff'
      ctx.fill()
    }

    drawGauge()
  }, [value, thresholds, size])

  const getColorForValue = (val: number, thresh: AlertThresholds): string => {
    if (val >= thresh.critical) return '#FF3547'
    if (val >= thresh.warning) return '#FF8800'
    return '#00C851'
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full"
      aria-hidden="true"
    />
  )
}

export const COGauge: React.FC<COGaugeProps> = ({ 
  reading, 
  thresholds, 
  className 
}) => {
  const value = reading?.value ?? 0
  const status = reading?.status ?? 'safe'
  
  const getStatusText = () => {
    if (!reading) return 'Waiting for data…'
    switch (status) {
      case 'critical': return 'CRITICAL'
      case 'warning': return 'ELEVATED' 
      default: return 'SAFE'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'text-co-red'
      case 'warning': return 'text-co-amber'
      default: return 'text-co-green'
    }
  }

  return (
    <Card className={cn("flex flex-col items-center justify-center p-4", className)}>
      <div className="co-gauge" aria-live="polite">
        <GaugeCanvas 
          value={value}
          thresholds={thresholds}
          size={480}
        />
        <div className="co-gauge-readout">
          <div className="co-ppm" aria-label="CO parts per million">
            {reading ? `${value.toFixed(0)} ppm` : '-- ppm'}
          </div>
          <div className={cn("text-sm font-medium", getStatusColor())}>
            {getStatusText()}
          </div>
        </div>
      </div>
    </Card>
  )
}