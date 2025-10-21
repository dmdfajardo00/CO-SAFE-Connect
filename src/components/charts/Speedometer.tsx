import React from 'react'
import { GaugeContainer, GaugeValueArc, GaugeReferenceArc } from '@mui/x-charts/Gauge'
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
  // Check if dark mode is enabled
  const isDarkMode = document.documentElement.classList.contains('dark')

  // Determine status and color based on value
  const getStatus = () => {
    if (value < warningThreshold) return { text: 'SAFE', color: '#10B981' }
    if (value < criticalThreshold) return { text: 'WARNING', color: '#F59E0B' }
    return { text: 'CRITICAL', color: '#EF4444' }
  }

  const status = getStatus()

  return (
    <div className="flex flex-col items-center w-full">
      {/* MUI X Gauge - Full Circle with Custom Text */}
      <div className="relative flex justify-center py-2">
        <svg width={240} height={240}>
          <GaugeContainer
            value={value}
            valueMin={0}
            valueMax={max}
            startAngle={0}
            endAngle={360}
            innerRadius="70%"
            outerRadius="100%"
            width={240}
            height={240}
            cornerRadius="50%"
          >
            <GaugeReferenceArc
              style={{ fill: isDarkMode ? '#374151' : '#E5E7EB' }}
            />
            <GaugeValueArc
              style={{ fill: status.color }}
            />
            {/* Custom Text in Center */}
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '36px',
                fontWeight: 700,
                fill: status.color,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {value.toFixed(2)}
            </text>
            {/* PPM Unit Subtext */}
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                fill: isDarkMode ? '#9CA3AF' : '#6B7280',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {unit}
            </text>
          </GaugeContainer>
        </svg>
      </div>

      {/* Minimal Threshold Display - Option 3 */}
      <div className="text-center mt-4">
        {/* Icon-First Modern Threshold */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center justify-center gap-3 text-xs text-gray-600 dark:text-gray-400"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Safe &lt; {warningThreshold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Warning &lt; {criticalThreshold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Critical</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Speedometer
