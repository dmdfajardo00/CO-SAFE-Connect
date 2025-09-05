import React, { useState } from 'react'
import { Button } from './button'
import { Card } from './card'
import { X, Download, RotateCcw } from 'lucide-react'
import { usePWA } from '@/utils/pwa'
import { cn } from '@/lib/utils'

export const PWAPrompt: React.FC = () => {
  const { installAvailable, updateAvailable, showInstallPrompt, reloadApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || (!installAvailable && !updateAvailable)) {
    return null
  }

  const handleInstall = async () => {
    const success = await showInstallPrompt()
    if (success) {
      setDismissed(true)
    }
  }

  const handleUpdate = async () => {
    await reloadApp()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40">
      <Card className={cn(
        "p-4 shadow-lg border-primary/20",
        installAvailable && "bg-primary/5",
        updateAvailable && "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-sm mb-1">
              {installAvailable && "Install CO-SAFE"}
              {updateAvailable && "Update Available"}
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              {installAvailable && "Add CO-SAFE to your home screen for quick access to emergency features"}
              {updateAvailable && "A newer version of CO-SAFE is available with important safety improvements"}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={installAvailable ? handleInstall : handleUpdate}
                className="text-xs h-8"
              >
                {installAvailable && (
                  <>
                    <Download className="w-3 h-3 mr-1" />
                    Install
                  </>
                )}
                {updateAvailable && (
                  <>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Update
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs h-8"
              >
                Later
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}