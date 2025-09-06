import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, AlertCircle, Info, CheckCircle, 
  X, Clock, ChevronRight, Bell, BellOff 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { type COAlert } from '@/types'

export const ModernAlerts: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlerts } = useAppStore()
  
  const activeAlerts = alerts.filter(a => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged)

  const getAlertIcon = (level: COAlert['level']) => {
    switch (level) {
      case 'emergency': return AlertTriangle
      case 'critical': return AlertCircle
      case 'warning': return AlertTriangle
      default: return Info
    }
  }

  const getAlertColor = (level: COAlert['level']) => {
    switch (level) {
      case 'emergency': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200'
      case 'critical': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  const AlertCard: React.FC<{ alert: COAlert; isActive?: boolean }> = ({ alert, isActive = false }) => {
    const Icon = getAlertIcon(alert.level)
    const colorClass = getAlertColor(alert.level)

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <Card className={cn(
          "glass-card p-4 border-2 transition-all",
          colorClass,
          isActive && alert.level === 'emergency' && "animate-pulse"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              alert.level === 'emergency' ? 'bg-red-100 dark:bg-red-900/50' :
              alert.level === 'critical' ? 'bg-orange-100 dark:bg-orange-900/50' :
              alert.level === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
              'bg-blue-100 dark:bg-blue-900/50'
            )}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{alert.title}</h3>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                  )}
                </div>
                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-2 -mr-2 -mt-1 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(alert.timestamp)}</span>
                </div>
                {alert.deviceId && (
                  <span className="text-xs text-muted-foreground">
                    Device: {alert.deviceId}
                  </span>
                )}
              </div>
            </div>

            {!isActive && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alerts</h2>
          <p className="text-sm text-muted-foreground">
            {activeAlerts.length} active, {acknowledgedAlerts.length} acknowledged
          </p>
        </div>
        {alerts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAlerts}
            className="haptic-light"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Alert Status Card */}
      {activeAlerts.length > 0 && (
        <Card className={cn(
          "glass-card p-4 border-2",
          activeAlerts.some(a => a.level === 'emergency') 
            ? "border-red-500 bg-red-50/50 dark:bg-red-900/20" 
            : activeAlerts.some(a => a.level === 'critical')
            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/20"
            : "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20"
        )}>
          <div className="flex items-center gap-3">
            <Bell className={cn(
              "w-5 h-5",
              activeAlerts.some(a => a.level === 'emergency') 
                ? "text-red-600 animate-pulse" 
                : activeAlerts.some(a => a.level === 'critical')
                ? "text-orange-600"
                : "text-yellow-600"
            )} />
            <div>
              <p className="font-semibold text-sm">
                {activeAlerts.some(a => a.level === 'emergency') 
                  ? "Emergency Alert Active" 
                  : activeAlerts.some(a => a.level === 'critical')
                  ? "Critical Alert Active"
                  : "Warning Alert Active"}
              </p>
              <p className="text-xs text-muted-foreground">
                Tap alerts below to acknowledge
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Alerts
          </h3>
          <AnimatePresence>
            {activeAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} isActive />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            History
          </h3>
          <AnimatePresence>
            {acknowledgedAlerts.slice(0, 10).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All Clear</h3>
          <p className="text-sm text-muted-foreground text-center">
            No alerts at this time. Your environment is safe.
          </p>
        </motion.div>
      )}

      {/* Alert Settings Card */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BellOff className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Alert Preferences</p>
              <p className="text-xs text-muted-foreground">
                Configure in Settings
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
    </div>
  )
}