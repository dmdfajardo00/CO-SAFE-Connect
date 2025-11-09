import { useEffect, useState, useRef } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { Button } from './components/ui/button'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Sessions from './pages/Sessions'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'
import PWAReloadPrompt from './components/ui/PWAReloadPrompt'
import './index.css'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}

// App Layout Component (for authenticated routes)
function AppLayout() {
  const [showSourceSelector, setShowSourceSelector] = useState(false)
  const sourceSelectorRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const {
    settings,
    device,
    updateSettings
  } = useAppStore()

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', settings.darkMode)

    // Handle click outside dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceSelectorRef.current && !sourceSelectorRef.current.contains(event.target as Node)) {
        setShowSourceSelector(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [settings.darkMode])

  const hapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  const toggleTheme = () => {
    updateSettings({ darkMode: !settings.darkMode })
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
        <Routes>
          <Route path="/" element={
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Dashboard />
            </div>
          } />
          <Route path="/dashboard" element={
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Dashboard />
            </div>
          } />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/sessions/*" element={
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Sessions />
            </div>
          } />
          <Route path="/settings" element={
            <div className="mx-auto w-full max-w-md pb-24 h-full overflow-y-auto">
              <Settings />
            </div>
          } />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-2xl z-50 transition-colors">
        <div className="mx-auto w-full max-w-md grid grid-cols-4 text-center">
          {[
            { id: 'home', path: '/dashboard', icon: 'tabler:home', label: 'Home' },
            { id: 'alerts', path: '/alerts', icon: 'solar:danger-triangle-linear', label: 'Alerts' },
            { id: 'sessions', path: '/sessions', icon: 'mdi:history', label: 'Sessions' },
            { id: 'settings', path: '/settings', icon: 'solar:settings-minimalistic-linear', label: 'Settings' }
          ].map(item => (
            <Link
              key={item.id}
              to={item.path}
              onClick={hapticFeedback}
            >
              <motion.div
                className={`py-3 flex flex-col items-center gap-1 transition-all duration-200 ${
                  isActive(item.path)
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Icon icon={item.icon} className="w-6 h-6" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </nav>
      
      {/* PWA Reload Prompt */}
      <PWAReloadPrompt />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
