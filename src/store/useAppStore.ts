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
import type { User } from '@/lib/supabase'
import { getLatestReadings, subscribeToReadings, type Database } from '@/services/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface AppStore extends AppState {
  // User state
  currentUser: User | null
  isAuthenticated: boolean

  // Supabase state
  realtimeChannel: RealtimeChannel | null
  isLoadingFromSupabase: boolean
  lastSupabaseFetch: number | null

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
  setUser: (user: User | null) => void
  logout: () => void

  // Supabase actions
  fetchFromSupabase: (deviceId: string, limit?: number) => Promise<void>
  subscribeToRealtimeUpdates: (deviceId: string) => void
  unsubscribeFromRealtime: () => void

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
      currentUser: null,
      isAuthenticated: false,
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

      // Supabase state
      realtimeChannel: null,
      isLoadingFromSupabase: false,
      lastSupabaseFetch: null,

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

      setUser: (user: User | null) => {
        set({
          currentUser: user,
          isAuthenticated: user !== null
        })
      },

      logout: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          history: [],
          alerts: [],
          activeAlerts: []
        })
      },

      // Supabase actions
      fetchFromSupabase: async (deviceId: string, limit = 1000) => {
        set({ isLoadingFromSupabase: true })

        try {
          const readings = await getLatestReadings(deviceId, limit)

          if (readings && readings.length > 0) {
            // Convert Supabase readings to app format
            const historyPoints: HistoryDataPoint[] = readings.map(r => ({
              timestamp: new Date(r.created_at!).getTime(),
              value: r.co_level,
            })).reverse() // Reverse to get chronological order

            // Get the latest reading
            const latestReading = readings[0]
            const currentReading: COReading = {
              timestamp: new Date(latestReading.created_at!).getTime(),
              value: latestReading.co_level,
              status: latestReading.status || 'safe',
              mosfetStatus: latestReading.mosfet_status || false,
            }

            set({
              history: historyPoints,
              currentReading,
              device: {
                ...get().device,
                connected: true,
                lastUpdate: new Date(latestReading.created_at!).getTime(),
                deviceId,
              },
              lastSupabaseFetch: Date.now(),
              isLoadingFromSupabase: false,
            })
          } else {
            set({ isLoadingFromSupabase: false })
          }
        } catch (error) {
          console.error('Failed to fetch from Supabase:', error)
          set({ isLoadingFromSupabase: false })
        }
      },

      subscribeToRealtimeUpdates: (deviceId: string) => {
        // Unsubscribe from existing channel first
        get().unsubscribeFromRealtime()

        const channel = subscribeToReadings(deviceId, (reading) => {
          // Convert Supabase reading to app format
          const newReading: COReading = {
            timestamp: new Date(reading.created_at!).getTime(),
            value: reading.co_level,
            status: reading.status || 'safe',
            mosfetStatus: reading.mosfet_status || false,
          }

          // Update the store with the new reading
          get().updateReading(newReading)
        })

        set({ realtimeChannel: channel })
      },

      unsubscribeFromRealtime: () => {
        const channel = get().realtimeChannel
        if (channel) {
          channel.unsubscribe()
          set({ realtimeChannel: null })
        }
      },
    }),
    {
      name: 'co-safe-storage',
      partialize: (state) => ({
        // Only persist essential data
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
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

// Add React import
import React from 'react'

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
               currentValue >= store.settings.thresholds.warning ? 'warning' : 'safe',
        mosfetStatus: currentValue > 200, // MOSFET activates at 200 ppm
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

// Supabase real-time hook for live data
export const useSupabaseRealtime = (deviceId: string = 'CO-SAFE-001', autoFetch = true) => {
  const fetchFromSupabase = useAppStore((state) => state.fetchFromSupabase)
  const subscribeToRealtimeUpdates = useAppStore((state) => state.subscribeToRealtimeUpdates)
  const unsubscribeFromRealtime = useAppStore((state) => state.unsubscribeFromRealtime)
  const isLoadingFromSupabase = useAppStore((state) => state.isLoadingFromSupabase)
  const lastSupabaseFetch = useAppStore((state) => state.lastSupabaseFetch)

  React.useEffect(() => {
    if (!autoFetch) return

    // Fetch initial data from Supabase
    fetchFromSupabase(deviceId).catch(console.error)

    // Subscribe to real-time updates
    subscribeToRealtimeUpdates(deviceId)

    // Cleanup on unmount
    return () => {
      unsubscribeFromRealtime()
    }
  }, [deviceId, autoFetch, fetchFromSupabase, subscribeToRealtimeUpdates, unsubscribeFromRealtime])

  return {
    isLoading: isLoadingFromSupabase,
    lastFetch: lastSupabaseFetch,
    refetch: () => fetchFromSupabase(deviceId),
  }
}
