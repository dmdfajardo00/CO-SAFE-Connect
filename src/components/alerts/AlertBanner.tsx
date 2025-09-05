import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { type AlertBannerProps } from '@/types'

export const AlertBanner: React.FC<AlertBannerProps> = ({ 
  alert, 
  onMute, 
  onCall, 
  visible 
}) => {
  if (!visible || !alert) return null

  const getBannerStyles = () => {
    switch (alert.level) {
      case 'critical':
        return 'bg-co-red text-white'
      case 'warning':
        return 'bg-co-amber text-black'
      case 'emergency':
        return 'bg-co-red text-white'
      default:
        return 'bg-co-green text-white'
    }
  }

  return (
    <div 
      className="sticky top-14 z-20" 
      role="region" 
      aria-label="Alert banner"
    >
      <div className={cn(
        "mx-3 my-2 rounded-2xl p-3 shadow-lg",
        "flex items-center justify-between",
        getBannerStyles()
      )}>
        <div className="font-bold flex-1">
          {alert.title}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMute}
            className="text-current border-2 border-current hover:bg-white/20"
          >
            Mute
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCall}
            className="bg-white text-black hover:bg-white/90"
          >
            Call
          </Button>
        </div>
      </div>
    </div>
  )
}