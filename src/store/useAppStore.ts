import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  type AppState, 
  type COReading, 
  type COAlert, 
  type AppSettings,
  type DeviceStatus,
  type HistoryDataPoint,
  type TabName,
  CO_THRESHOLDS 
} from '@/types'

interface AppStore extends AppState {
  // Actions
  updateReading: (reading: COReading) => void
  addAlert: (alert: Omit<COAlert, 'id' | 'timestamp'>) => void
  acknowledgeAlert: (alertId: string) => void
  clearAlerts: () => void
  updateDeviceStatus: (status: Partial<DeviceStatus>) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setActiveTab: (tab: TabName) => void
  toggleSimulation: () => void
  clearHistory: () => void
  setEmergencyBanner: (visible: boolean) => void
  muteAlarms: (muted: boolean) => void
  exportData: () => void
  
  // Computed getters
  getCurrentStatus: () => 'safe' | 'warning' | 'critical'
  getActiveAlertsCount: () => number
  getLatestReading: () => COReading | null
}

const defaultSettings: AppSettings = {
  audibleAlarms: true,
  emergencyContact: '911',
  units: 'ppm',
  thresholds: {
    warning: CO_THRESHOLDS.DEFAULT_WARNING,
    critical: CO_THRESHOLDS.DEFAULT_CRITICAL,
  },
  muteAlarms: false,
  darkMode: false,
  notifications: true,
}

const defaultDeviceStatus: DeviceStatus = {
  connected: false,
  battery: null,
  filterHealth: 100,
  lastUpdate: null,
  deviceId: undefined,
  name: undefined,
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      device: defaultDeviceStatus,
      currentReading: null,
      history: [],
      alerts: [],
      activeAlerts: [],
      settings: defaultSettings,
      activeTab: 'dashboard',
      chartViewport: {
        startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
        endTime: Date.now(),
        zoomLevel: 1,
      },
      emergencyBannerVisible: false,
      isSimulating: false,
      isOnline: navigator.onLine,
      lastSyncTime: null,

      // Actions
      updateReading: (reading: COReading) => {
        set((state) => {
          const newHistoryPoint: HistoryDataPoint = {
            timestamp: reading.timestamp,
            value: reading.value,
          }
          
          // Keep history under max limit
          const newHistory = [...state.history, newHistoryPoint]
          if (newHistory.length > 5000) {
            newHistory.shift()
          }

          // Auto-generate alerts based on thresholds
          const { warning, critical } = state.settings.thresholds
          let shouldAddAlert = false
          let alertLevel: 'warning' | 'critical' | undefined

          if (reading.value >= critical && 
              (!state.currentReading || state.currentReading.value < critical)) {
            shouldAddAlert = true
            alertLevel = 'critical'
          } else if (reading.value >= warning && 
                     (!state.currentReading || state.currentReading.value < warning)) {
            shouldAddAlert = true
            alertLevel = 'warning'
          }

          let newAlerts = state.alerts
          let newActiveAlerts = state.activeAlerts

          if (shouldAddAlert && alertLevel) {
            const newAlert: COAlert = {
              id: `alert_${Date.now()}`,
              timestamp: reading.timestamp,
              level: alertLevel,
              title: alertLevel === 'critical' ? 'Critical CO spike' : 'CO level elevated',
              message: `${reading.value.toFixed(0)} ppm above the ${alertLevel} limit`,
              acknowledged: false,
              deviceId: state.device.deviceId,
            }
            
            newAlerts = [newAlert, ...state.alerts]
            newActiveAlerts = [newAlert, ...state.activeAlerts]
          }

          return {
            currentReading: reading,
            history: newHistory,
            alerts: newAlerts,
            activeAlerts: newActiveAlerts,
            device: {
              ...state.device,
              lastUpdate: reading.timestamp,
            },
            emergencyBannerVisible: reading.value >= state.settings.thresholds.critical,
          }
        })
      },

      addAlert: (alertData) => {
        const newAlert: COAlert = {
          ...alertData,
          id: `alert_${Date.now()}`,
          timestamp: Date.now(),
          acknowledged: false,
        }
        
        set((state) => ({
          alerts: [newAlert, ...state.alerts],
          activeAlerts: [newAlert, ...state.activeAlerts],
        }))
      },

      acknowledgeAlert: (alertId: string) => {
        set((state) => ({
          activeAlerts: state.activeAlerts.filter(alert => alert.id !== alertId),
          alerts: state.alerts.map(alert => 
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          ),
        }))
      },

      clearAlerts: () => {
        set({ alerts: [], activeAlerts: [] })
      },

      updateDeviceStatus: (status: Partial<DeviceStatus>) => {
        set((state) => ({
          device: { ...state.device, ...status },
        }))
      },

      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      setActiveTab: (tab: TabName) => {
        set({ activeTab: tab })
      },

      toggleSimulation: () => {
        set((state) => ({
          isSimulating: !state.isSimulating,
        }))
      },

      clearHistory: () => {
        set({ history: [] })
      },

      setEmergencyBanner: (visible: boolean) => {
        set({ emergencyBannerVisible: visible })
      },

      muteAlarms: (muted: boolean) => {
        set((state) => ({
          settings: { ...state.settings, muteAlarms: muted },
        }))
      },

      exportData: () => {
        const state = get()
        const dataToExport = {
          history: state.history,
          alerts: state.alerts,
          settings: state.settings,
          exportTimestamp: Date.now(),
        }
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cosafe-data-${new Date().toISOString().slice(0, 19)}.json`
        a.click()
        URL.revokeObjectURL(url)
      },

      // Computed getters
      getCurrentStatus: () => {
        const state = get()
        if (!state.currentReading) return 'safe'
        
        const { value } = state.currentReading
        const { warning, critical } = state.settings.thresholds
        
        if (value >= critical) return 'critical'
        if (value >= warning) return 'warning'
        return 'safe'
      },

      getActiveAlertsCount: () => {
        return get().activeAlerts.length
      },

      getLatestReading: () => {
        return get().currentReading
      },
    }),
    {
      name: 'co-safe-storage',
      partialize: (state) => ({
        // Only persist essential data
        history: state.history.slice(-1000), // Keep last 1000 points
        alerts: state.alerts.slice(0, 100), // Keep last 100 alerts
        settings: state.settings,
        device: {
          ...state.device,
          connected: false, // Reset connection on reload
        },
        isSimulating: false, // Reset simulation on reload
      }),
    }
  )
)

// Simulation hook for generating demo data
export const useSimulation = () => {
  const store = useAppStore()
  
  const startSimulation = React.useCallback(() => {
    if (store.isSimulating) return
    
    store.toggleSimulation()
    let currentValue = 10 + Math.random() * 10 // Starting baseline
    
    const interval = setInterval(() => {
      // Simple stochastic process with occasional spikes
      const spike = Math.random() < 0.04 ? (20 + Math.random() * 50) : 0
      const drift = (Math.random() - 0.5) * 3
      currentValue = Math.max(0, Math.min(100, currentValue + drift + spike))
      
      const reading: COReading = {
        timestamp: Date.now(),
        value: currentValue,
        status: currentValue >= store.settings.thresholds.critical ? 'critical' :
               currentValue >= store.settings.thresholds.warning ? 'warning' : 'safe'
      }
      
      store.updateReading(reading)
    }, 1500)
    
    // Store interval reference for cleanup
    ;(window as any).__coSafeSimInterval = interval
  }, [store])
  
  const stopSimulation = React.useCallback(() => {
    if (!store.isSimulating) return
    
    store.toggleSimulation()
    if ((window as any).__coSafeSimInterval) {
      clearInterval((window as any).__coSafeSimInterval)
      delete (window as any).__coSafeSimInterval
    }
  }, [store])
  
  return { startSimulation, stopSimulation }
}

// Add React import
import React from 'react'
