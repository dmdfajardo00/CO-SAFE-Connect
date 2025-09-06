import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from './ui/button'

function PWAReloadPrompt() {
  const [offlineReady, setOfflineReady] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)
  
  const updateServiceWorker = () => {
    window.location.reload()
  }

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <>
      {(offlineReady || needRefresh) && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 z-50">
          <div className="flex items-start gap-3">
            <Icon icon="mdi:cloud-download" className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                {offlineReady
                  ? 'App ready to work offline'
                  : 'New version available!'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {offlineReady
                  ? 'CO-SAFE Connect is now available offline.'
                  : 'Click reload to update to the latest version.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {needRefresh && (
              <Button
                size="sm"
                onClick={() => updateServiceWorker(true)}
                className="flex-1"
              >
                Reload
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={close}
              className="flex-1"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default PWAReloadPrompt