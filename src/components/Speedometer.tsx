import React from 'react'
import GaugeComponent from 'react-gauge-component'
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
  // Determine status based on value
  const getStatus = () => {
    if (value < warningThreshold) return { text: 'Safe', color: '#10B981' }
    if (value < criticalThreshold) return { text: 'Warning', color: '#F59E0B' }
    return { text: 'Critical', color: '#EF4444' }
  }

  const status = getStatus()

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto space-y-0">
      {/* Gauge Component Container */}
      <div className="relative w-full h-40">
        <GaugeComponent
          type="semicircle"
          arc={{
            width: 0.15,
            padding: 0.005,
            cornerRadius: 1,
            subArcs: [
              {
                limit: warningThreshold,
                color: '#10B981',
                showTick: true
              },
              {
                limit: criticalThreshold,
                color: '#F59E0B',
                showTick: true
              },
              {
                limit: max,
                color: '#EF4444',
                showTick: true
              }
            ]
          }}
          pointer={{
            color: '#1F2937',
            length: 0.80,
            width: 15,
            elastic: true,
            animationDelay: 0,
            animationDuration: 1500
          }}
          labels={{
            valueLabel: {
              hide: true
            },
            tickLabels: {
              type: 'outer',
              ticks: [
                { value: 0 },
                { value: 25 },
                { value: 50 },
                { value: 75 },
                { value: 100 }
              ],
              defaultTickValueConfig: {
                formatTextValue: (val) => Math.round(val).toString(),
                style: {
                  fontSize: '10px',
                  fill: '#6B7280',
                  fontWeight: '500'
                }
              }
            }
          }}
          value={value}
          minValue={0}
          maxValue={max}
        />
      </div>
      
      {/* Custom Value Display - Below the gauge */}
      <div className="-mt-8 text-center space-y-2">
        <motion.div
          key={value}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <div 
            className="text-4xl font-bold tabular-nums"
            style={{ color: status.color }}
          >
            {value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 font-medium uppercase tracking-wider">
            {unit}
          </div>
        </motion.div>
        
        {/* Status Badge */}
        <motion.div 
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${status.color}15`,
            color: status.color
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {status.text}
        </motion.div>
      </div>
    </div>
  )
}

export default Speedometer