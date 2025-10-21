import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type TabName } from '@/types'
import { useAppStore } from '@/store/useAppStore'

interface MobileLayoutProps {
  children: React.ReactNode
  activeTab: TabName
  onTabChange: (tab: TabName) => void
}

const tabIcons: Record<TabName, string> = {
  dashboard: 'tabler:home',
  alerts: 'solar:danger-triangle-linear',
  analytics: 'solar:chart-square-linear',
  settings: 'solar:settings-minimalistic-linear',
}

const tabLabels: Record<TabName, string> = {
  dashboard: 'Home',
  alerts: 'Alerts',
  analytics: 'Analytics',
  settings: 'Settings',
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { currentReading, settings, alerts } = useAppStore()
  const hasActiveAlerts = alerts.filter(a => !a.acknowledged).length > 0
  const isEmergency = currentReading?.status === 'critical'

  return (
    <div className="flex flex-col h-screen-safe bg-background">
      {/* Status Bar - iOS Style */}
      <div className="ios-backdrop sticky top-0 z-50 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">CO</span>
              </div>
              {hasActiveAlerts && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-sm">CO-SAFE Connect</h1>
              <p className="text-xs text-muted-foreground">
                {currentReading ? `${currentReading.value} ppm` : 'Monitoring'}
              </p>
            </div>
          </div>
          
          {isEmergency && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-destructive text-white p-2 rounded-full shadow-lg emergency-pulse"
              onClick={() => window.location.href = `tel:${settings.emergencyContact || '911'}`}
            >
              <Phone className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-hide relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-full pb-20"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - iOS Style */}
      <div className="ios-backdrop fixed bottom-0 left-0 right-0 border-t border-border/50 pb-safe">
        <nav className="grid grid-cols-4 px-2">
          {(Object.keys(tabIcons) as TabName[]).map((tab) => {
            const iconName = tabIcons[tab]
            const isActive = activeTab === tab
            const hasAlert = tab === 'alerts' && hasActiveAlerts

            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2 px-3 transition-all haptic-light",
                  "focus:outline-none focus-visible:bg-accent/10 rounded-lg"
                )}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative"
                >
                  <Icon
                    icon={iconName}
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isActive 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )}
                  />
                  {hasAlert && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </motion.div>
                <span 
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                >
                  {tabLabels[tab]}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
