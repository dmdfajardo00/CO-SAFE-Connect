import { useEffect, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { Button } from './components/ui/button'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'
import WelcomeOptions from './pages/WelcomeOptions'
import PWAReloadPrompt from './components/ui/PWAReloadPrompt'
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
    updateSettings,
    isAuthenticated
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

  // Show Welcome page if not authenticated
  if (!isAuthenticated) {
    return <Welcome />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto w-full max-w-md px-4 py-3 flex items-center justify-between">
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
                  CO-SAFE <span className="text-primary flex items-center gap-1 whitespace-nowrap">
                    <Icon icon="mdi:car" className="w-4 h-4" />
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
                icon={settings.darkMode ? 'solar:sun-bold' : 'solar:moon-bold'} 
                className="w-5 h-5" 
              />
            </Button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Dashboard key="dashboard" />
            </div>
          )}
          {activeTab === 'alerts' && <Alerts key="alerts" />}
          {activeTab === 'analytics' && (
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Analytics key="analytics" />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Settings key="settings" />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-2xl z-50 transition-colors">
        <div className="mx-auto w-full max-w-md grid grid-cols-4 text-center">
          {[
            { id: 'home', icon: 'tabler:home', label: 'Home' },
            { id: 'alerts', icon: 'solar:danger-triangle-linear', label: 'Alerts' },
            { id: 'analytics', icon: 'solar:chart-square-linear', label: 'Analytics' },
            { id: 'settings', icon: 'solar:settings-minimalistic-linear', label: 'Settings' }
          ].map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => handleNavigation(tab.id)}
              className={`py-3 flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-black dark:text-white'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Icon icon={tab.icon} className="w-6 h-6" />
              <span className="text-[11px] font-medium">{tab.label}</span>
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
