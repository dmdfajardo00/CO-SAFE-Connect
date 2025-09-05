import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { NavigationHandler } from './components/navigation/NavigationHandler'
import { DashboardScreen } from './screens/DashboardScreen'
import { AlertsScreen } from './screens/AlertsScreen'
import { AnalyticsScreen } from './screens/AnalyticsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useAppStore } from './store/useAppStore'
import { type TabName } from './types'
import './utils/pwa' // Initialize PWA on import
import './index.css'

// Map tab names to routes
const tabToRoute: Record<TabName, string> = {
  'dashboard': '/dashboard',
  'alerts': '/alerts', 
  'analytics': '/analytics',
  'settings': '/settings',
}

function AppContent() {
  const navigate = useNavigate()
  const { activeTab, setActiveTab, currentReading, settings } = useAppStore()

  // Handle tab navigation by navigating to the route
  const handleTabChange = (tab: TabName) => {
    console.log('handleTabChange: changing from', activeTab, 'to', tab)
    setActiveTab(tab)
    const route = tabToRoute[tab]
    if (route) {
      console.log('handleTabChange: navigating to', route)
      navigate(route)
    }
  }

  // Initialize some demo data on first load
  useEffect(() => {
    const store = useAppStore.getState()
    
    // Add some historical data if none exists
    if (store.history.length === 0) {
      const now = Date.now()
      const demoHistory = []
      
      for (let i = 0; i < 120; i++) {
        const timestamp = now - (120 - i) * 60 * 1000 // One point per minute for 2 hours
        const baseValue = 10 + Math.sin(i / 8) * 6
        const noise = (Math.random() - 0.5) * 3
        const value = Math.max(0, baseValue + noise)
        
        demoHistory.push({ timestamp, value })
      }
      
      // Set initial history without triggering alerts
      store.history = demoHistory
    }

    // Set up online/offline detection
    const handleOnline = () => {
      store.isOnline = true
    }
    
    const handleOffline = () => {
      store.isOnline = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show emergency banner if current reading is critical
  const showEmergencyBanner = currentReading && 
    currentReading.value >= settings.thresholds.critical

  return (
    <>
      <NavigationHandler />
      <AppLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showAlertBanner={!!showEmergencyBanner}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={<DashboardScreen />} 
          />
          <Route 
            path="/alerts" 
            element={<AlertsScreen />} 
          />
          <Route 
            path="/analytics" 
            element={<AnalyticsScreen />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsScreen />} 
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App