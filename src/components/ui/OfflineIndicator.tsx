import React from 'react'
import { cn } from '@/lib/utils'
import { WifiOff, Wifi } from 'lucide-react'
import { usePWA } from '@/utils/pwa'

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA()

  if (isOnline) {
    return null
  }

  return (
    <div 
      className={cn(
        "fixed top-2 left-1/2 transform -translate-x-1/2 z-50",
        "bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "animate-in slide-in-from-top-2"
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4" />
      <span>Offline - Limited functionality</span>
    </div>
  )
}

interface ConnectionStatusProps {
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const { isOnline } = usePWA()

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isOnline ? "text-muted-foreground" : "text-destructive",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{isOnline ? "Online" : "Offline"}</span>
    </div>
  )
}