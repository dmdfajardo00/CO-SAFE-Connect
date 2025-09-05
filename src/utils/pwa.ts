// PWA utilities for CO-SAFE Connect
// Handles service worker registration, installation prompts, and offline functionality

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private isInstalled = false
  private isOnline = navigator.onLine

  constructor() {
    this.init()
  }

  private async init() {
    // Register service worker
    await this.registerServiceWorker()
    
    // Set up installation prompt handling
    this.setupInstallPrompt()
    
    // Set up online/offline detection
    this.setupOnlineDetection()
    
    // Check if already installed
    this.checkInstallStatus()
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        
        console.log('[PWA] Service Worker registered:', registration.scope)
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.showUpdateAvailable()
              }
            })
          }
        })
        
        // Enable background sync for critical data
        if ('sync' in window.ServiceWorkerRegistration.prototype) {
          console.log('[PWA] Background Sync supported')
        }
        
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
      }
    } else {
      console.warn('[PWA] Service Workers not supported')
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      const event = e as BeforeInstallPromptEvent
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault()
      
      // Store the event so it can be triggered later
      this.deferredPrompt = event
      
      console.log('[PWA] Install prompt available')
      
      // Notify app that install is available
      this.dispatchCustomEvent('pwa-install-available')
    })

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed')
      this.isInstalled = true
      this.deferredPrompt = null
      
      // Notify app of successful installation
      this.dispatchCustomEvent('pwa-installed')
    })
  }

  private setupOnlineDetection(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline
      this.isOnline = navigator.onLine
      
      if (wasOnline !== this.isOnline) {
        console.log(`[PWA] Connection status changed: ${this.isOnline ? 'online' : 'offline'}`)
        this.dispatchCustomEvent('pwa-connection-change', { online: this.isOnline })
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  }

  private checkInstallStatus(): void {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://')
    
    this.isInstalled = isStandalone
    console.log(`[PWA] App install status: ${this.isInstalled ? 'installed' : 'browser'}`)
  }

  private showUpdateAvailable(): void {
    console.log('[PWA] App update available')
    this.dispatchCustomEvent('pwa-update-available')
  }

  private dispatchCustomEvent(name: string, detail?: any): void {
    const event = new CustomEvent(name, { detail })
    window.dispatchEvent(event)
  }

  // Public API
  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA] Install prompt not available')
      return false
    }

    try {
      // Show the prompt
      await this.deferredPrompt.prompt()
      
      // Wait for the user's response
      const choiceResult = await this.deferredPrompt.userChoice
      
      console.log(`[PWA] User choice: ${choiceResult.outcome}`)
      
      // Clean up
      this.deferredPrompt = null
      
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error)
      return false
    }
  }

  public isInstallAvailable(): boolean {
    return this.deferredPrompt !== null
  }

  public isAppInstalled(): boolean {
    return this.isInstalled
  }

  public isAppOnline(): boolean {
    return this.isOnline
  }

  public async reloadApp(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Send skip waiting message to service worker
      navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' })
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      window.location.reload()
    }
  }

  // Background sync for critical safety data
  public async syncCriticalData(data: any): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        // Store data for sync
        await this.storeDataForSync(data)
        
        // Request background sync
        const registration = await navigator.serviceWorker.ready
        if ('sync' in registration) {
          await (registration as any).sync.register('co-data-sync')
        }
        
        console.log('[PWA] Background sync registered')
      } catch (error) {
        console.error('[PWA] Background sync failed:', error)
      }
    }
  }

  private async storeDataForSync(data: any): Promise<void> {
    // In a real implementation, this would use IndexedDB
    // For now, store in localStorage as fallback
    try {
      const existing = localStorage.getItem('pendingSync')
      const pendingData = existing ? JSON.parse(existing) : []
      pendingData.push(data)
      localStorage.setItem('pendingSync', JSON.stringify(pendingData))
    } catch (error) {
      console.error('[PWA] Failed to store sync data:', error)
    }
  }
}

// Create singleton instance
export const pwaManager = new PWAManager()

// React hook for PWA functionality
export function usePWA() {
  const [installAvailable, setInstallAvailable] = React.useState(pwaManager.isInstallAvailable())
  const [isInstalled, setIsInstalled] = React.useState(pwaManager.isAppInstalled())
  const [isOnline, setIsOnline] = React.useState(pwaManager.isAppOnline())
  const [updateAvailable, setUpdateAvailable] = React.useState(false)

  React.useEffect(() => {
    const handleInstallAvailable = () => setInstallAvailable(true)
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallAvailable(false)
    }
    const handleConnectionChange = (event: CustomEvent) => {
      setIsOnline(event.detail.online)
    }
    const handleUpdateAvailable = () => setUpdateAvailable(true)

    window.addEventListener('pwa-install-available', handleInstallAvailable)
    window.addEventListener('pwa-installed', handleInstalled)
    window.addEventListener('pwa-connection-change', handleConnectionChange as EventListener)
    window.addEventListener('pwa-update-available', handleUpdateAvailable)

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable)
      window.removeEventListener('pwa-installed', handleInstalled)
      window.removeEventListener('pwa-connection-change', handleConnectionChange as EventListener)
      window.removeEventListener('pwa-update-available', handleUpdateAvailable)
    }
  }, [])

  const showInstallPrompt = React.useCallback(async () => {
    const result = await pwaManager.showInstallPrompt()
    if (result) {
      setInstallAvailable(false)
    }
    return result
  }, [])

  const reloadApp = React.useCallback(async () => {
    await pwaManager.reloadApp()
  }, [])

  return {
    installAvailable,
    isInstalled,
    isOnline,
    updateAvailable,
    showInstallPrompt,
    reloadApp,
    syncCriticalData: pwaManager.syncCriticalData.bind(pwaManager)
  }
}

// Import React for the hook
import React from 'react'