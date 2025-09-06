import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { format } from 'date-fns'

const Alerts: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlerts } = useAppStore()
  
  const activeAlerts = alerts.filter(a => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged)

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'emergency':
      case 'critical':
        return 'mdi:alert-circle'
      case 'warning':
        return 'mdi:alert'
      default:
        return 'mdi:information'
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'emergency':
      case 'critical':
        return 'text-danger'
      case 'warning':
        return 'text-caution'
      default:
        return 'text-primary'
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Alerts</h2>
        {alerts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAlerts}
          >
            Clear All
          </Button>
        )}
      </div>

      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Active Alerts</h3>
          {activeAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border-l-4 border-danger">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon 
                      icon={getAlertIcon(alert.level)} 
                      className={`w-5 h-5 mt-0.5 ${getAlertColor(alert.level)}`}
                    />
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm ${getAlertColor(alert.level)}`}>
                        {alert.title}
                      </h4>
                      {alert.message && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {alert.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(alert.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <Icon icon="mdi:check" className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">History</h3>
          {acknowledgedAlerts.slice(0, 10).map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon 
                      icon={getAlertIcon(alert.level)} 
                      className={`w-5 h-5 mt-0.5 text-gray-400`}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                        {alert.title}
                      </h4>
                      {alert.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {alert.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(alert.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="p-4 rounded-full bg-safe/10 mb-4">
            <Icon icon="mdi:check-circle" className="w-12 h-12 text-safe" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All Clear</h3>
          <p className="text-sm text-gray-500 text-center">
            No alerts at this time. Your environment is safe.
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default Alerts