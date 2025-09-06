import React, { useEffect, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { Card } from './components/ui/card'
import { Button } from './components/ui/button'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import PWAReloadPrompt from './components/PWAReloadPrompt'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showSourceSelector, setShowSourceSelector] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sourceSelectorRef = useRef<HTMLDivElement>(null)
  
  const { 
    settings,
    alerts,
    device,
    currentReading,
    updateSettings
  } = useAppStore()

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', settings.darkMode)

    // Handle click outside dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false)
      }
      if (sourceSelectorRef.current && !sourceSelectorRef.current.contains(event.target as Node)) {
        setShowSourceSelector(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [settings.darkMode])

  const handleNavigation = (tab: string) => {
    setActiveTab(tab)
    // Add haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const toggleTheme = () => {
    updateSettings({ darkMode: !settings.darkMode })
  }

  const activeAlerts = alerts.filter(a => !a.acknowledged)

  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col bg-white dark:bg-gray-900 shadow-soft">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 grid place-items-center rounded-2xl bg-primary/10 text-primary"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon icon="mdi:gas-cylinder" className="w-6 h-6" />
          </motion.div>
          <div className="leading-tight" ref={sourceSelectorRef}>
            <button 
              onClick={() => setShowSourceSelector(!showSourceSelector)}
              className="text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors relative"
            >
              <p className="text-base font-semibold flex items-center gap-2">
                CO-SAFE — <span className="text-primary flex items-center gap-1">
                  <Icon icon="mdi:home" className="w-4 h-4" />
                  {device.name || 'Monitor'}
                  <Icon icon="mdi:chevron-down" className={`w-4 h-4 transition-transform ${showSourceSelector ? 'rotate-180' : ''}`} />
                </span>
              </p>
            </button>
            
            <AnimatePresence>
              {showSourceSelector && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50"
                >
                  <div className="p-2">
                    <h3 className="text-sm font-semibold px-3 py-2">Device Status</h3>
                    <div className="px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Connection</span>
                        <span className={device.connected ? 'text-safe' : 'text-gray-400'}>
                          {device.connected ? 'Connected' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Battery</span>
                        <span>{device.battery || '--'}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Filter Health</span>
                        <span>{device.filterHealth}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl"
          >
            <Icon 
              icon={settings.darkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'} 
              className="w-5 h-5" 
            />
          </Button>
          
          {/* Notification Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="relative rounded-xl"
            >
              <Icon icon="mdi:bell" className="w-5 h-5" />
              {activeAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
              )}
            </Button>
            
            <AnimatePresence>
              {showNotificationDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50"
                >
                  <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {activeAlerts.length > 0 ? (
                      activeAlerts.slice(0, 5).map(alert => (
                        <div key={alert.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              alert.level === 'critical' || alert.level === 'emergency' ? 'bg-danger' :
                              alert.level === 'warning' ? 'bg-caution' : 'bg-safe'
                            }`}></div>
                            <div className="flex-1">
                              <p className={`text-xs font-medium ${
                                alert.level === 'critical' || alert.level === 'emergency' ? 'text-danger' :
                                alert.level === 'warning' ? 'text-caution' : 'text-safe'
                              }`}>{alert.title}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{alert.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No new notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button 
                      onClick={() => { setShowNotificationDropdown(false); setActiveTab('alerts'); }}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      View All Notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <Dashboard key="dashboard" />}
          {activeTab === 'alerts' && <Alerts key="alerts" />}
          {activeTab === 'analytics' && <Analytics key="analytics" />}
          {activeTab === 'settings' && <Settings key="settings" />}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-md border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-40">
        <div className="grid grid-cols-4 text-center">
          {[
            { id: 'home', icon: 'mdi:home', label: 'Home' },
            { id: 'alerts', icon: 'mdi:bell', label: 'Alerts' },
            { id: 'analytics', icon: 'mdi:chart-line', label: 'Analytics' },
            { id: 'settings', icon: 'mdi:cog', label: 'Settings' }
          ].map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => handleNavigation(tab.id)}
              className={`py-3 flex flex-col items-center gap-1 ${
                activeTab === tab.id ? 'text-primary' : 'text-gray-500'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Icon icon={tab.icon} className="w-6 h-6" />
              <span className="text-[11px]">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>
      
      {/* PWA Reload Prompt */}
      <PWAReloadPrompt />
    </div>
  )
}

export default App