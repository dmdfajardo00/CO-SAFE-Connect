import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { type COAlert } from '@/types'

interface AlertCardProps {
  alert: COAlert
  className?: string
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, className }) => {
  const getBadgeColor = () => {
    switch (alert.level) {
      case 'critical':
        return { background: 'var(--red)' }
      case 'warning': 
        return { background: 'var(--amber)' }
      case 'emergency':
        return { background: 'var(--red)' }
      case 'info':
        return { background: 'var(--blue)' }
      default:
        return { background: 'var(--green)' }
    }
  }

  return (
    <div className="alert">
      <div 
        className="badge"
        style={getBadgeColor()}
      />
      <div className="content">
        <div className="title">
          {alert.title}
        </div>
        {alert.message && (
          <div className="meta">
            {alert.message}
          </div>
        )}
        <div className="meta">
          {new Date(alert.timestamp).toLocaleString()}
          {alert.deviceId && ` • Device: ${alert.deviceId}`}
        </div>
      </div>
    </div>
  )
}