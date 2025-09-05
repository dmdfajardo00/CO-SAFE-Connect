import React from 'react'
import { cn } from '@/lib/utils'
import { type StatusPillProps } from '@/types'

export const StatusPill: React.FC<StatusPillProps> = ({ 
  connected, 
  status, 
  className 
}) => {
  return (
    <div 
      className={cn("co-status-pill", className)}
      role="status" 
      aria-live="polite"
    >
      <span 
        className={cn(
          "co-dot",
          connected ? "online" : "offline"
        )}
      />
      <span>{status}</span>
    </div>
  )
}