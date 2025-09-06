import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface SpeedometerProps {
  value: number
  max?: number
  warningThreshold: number
  criticalThreshold: number
  unit?: string
}

const Speedometer: React.FC<SpeedometerProps> = ({
  value,
  max = 100,
  warningThreshold,
  criticalThreshold,
  unit = 'ppm'
}) => {
  // Calculate the angle for the needle (180 degree arc)
  const angle = useMemo(() => {
    const clampedValue = Math.min(Math.max(value, 0), max)
    return (clampedValue / max) * 180 - 90 // -90 to 90 degrees
  }, [value, max])

  // Determine color based on value
  const getColor = useMemo(() => {
    if (value < warningThreshold) return '#10B981' // green
    if (value < criticalThreshold) return '#F59E0B' // yellow/amber
    return '#EF4444' // red
  }, [value, warningThreshold, criticalThreshold])

  // Create tick marks for the gauge
  const ticks = useMemo(() => {
    const tickCount = 10
    return Array.from({ length: tickCount + 1 }, (_, i) => {
      const tickValue = (i / tickCount) * max
      const tickAngle = (i / tickCount) * 180 - 90
      const isMainTick = i % 2 === 0
      return { value: tickValue, angle: tickAngle, isMainTick }
    })
  }, [max])

  // Create gradient sections for the arc
  const sections = useMemo(() => {
    const safeEnd = (warningThreshold / max) * 100
    const warningEnd = (criticalThreshold / max) * 100
    return { safeEnd, warningEnd }
  }, [warningThreshold, criticalThreshold, max])

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg
        viewBox="0 0 240 140"
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      >
        {/* Background arc */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset={`${sections.safeEnd}%`} stopColor="#10B981" stopOpacity="0.2" />
            <stop offset={`${sections.safeEnd}%`} stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset={`${sections.warningEnd}%`} stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset={`${sections.warningEnd}%`} stopColor="#EF4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
          </linearGradient>
          
          <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset={`${sections.safeEnd}%`} stopColor="#10B981" />
            <stop offset={`${sections.safeEnd}%`} stopColor="#F59E0B" />
            <stop offset={`${sections.warningEnd}%`} stopColor="#F59E0B" />
            <stop offset={`${sections.warningEnd}%`} stopColor="#EF4444" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d="M 30 110 A 90 90 0 0 1 210 110"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Active track */}
        <motion.path
          d="M 30 110 A 90 90 0 0 1 210 110"
          fill="none"
          stroke="url(#activeGradient)"
          strokeWidth="20"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / max }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.2))',
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => {
          const x1 = 120 + 75 * Math.cos((tick.angle * Math.PI) / 180)
          const y1 = 110 + 75 * Math.sin((tick.angle * Math.PI) / 180)
          const x2 = 120 + (tick.isMainTick ? 65 : 70) * Math.cos((tick.angle * Math.PI) / 180)
          const y2 = 110 + (tick.isMainTick ? 65 : 70) * Math.sin((tick.angle * Math.PI) / 180)
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tick.value <= value ? getColor : '#e5e7eb'}
              strokeWidth={tick.isMainTick ? 2 : 1}
              opacity={tick.isMainTick ? 1 : 0.5}
            />
          )
        })}

        {/* Tick labels */}
        {ticks.filter(t => t.isMainTick).map((tick, i) => {
          const x = 120 + 55 * Math.cos((tick.angle * Math.PI) / 180)
          const y = 110 + 55 * Math.sin((tick.angle * Math.PI) / 180)
          
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-gray-500 font-medium"
            >
              {Math.round(tick.value)}
            </text>
          )
        })}

        {/* Center circle */}
        <circle
          cx="120"
          cy="110"
          r="8"
          fill="white"
          stroke={getColor}
          strokeWidth="3"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          }}
        />

        {/* Needle */}
        <motion.line
          x1="120"
          y1="110"
          x2={120 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={110 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke={getColor}
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            transformOrigin: '120px 110px',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
          }}
        />

        {/* Center dot */}
        <circle
          cx="120"
          cy="110"
          r="4"
          fill={getColor}
        />
      </svg>

      {/* Digital display */}
      <div className="absolute inset-x-0 bottom-0 text-center">
        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="inline-flex flex-col items-center"
        >
          <div 
            className="text-4xl font-bold tabular-nums"
            style={{ color: getColor }}
          >
            {value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">
            {unit}
          </div>
        </motion.div>
      </div>

      {/* Status indicator */}
      <div className="mt-4 flex justify-center">
        <div 
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${getColor}20`,
            color: getColor
          }}
        >
          {value < warningThreshold ? 'Safe' : 
           value < criticalThreshold ? 'Warning' : 
           'Critical'}
        </div>
      </div>
    </div>
  )
}

export default Speedometer