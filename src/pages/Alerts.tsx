import React, { useCallback, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import type { COAlert } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SeverityMeta {
  label: string
  icon: string
  accentBg: string
  accentColor: string
  accentBgDark: string
}

const severityMeta: Record<string, SeverityMeta> = {
  emergency: {
    label: 'Emergency',
    icon: 'mdi:alarm-light-outline',
    accentBg: 'bg-red-50',
    accentColor: '#EF4444', // Lighter red for both modes
    accentBgDark: 'dark:bg-red-950/30',
  },
  critical: {
    label: 'Critical',
    icon: 'mdi:alert-octagon-outline',
    accentBg: 'bg-red-50',
    accentColor: '#EF4444',
    accentBgDark: 'dark:bg-red-950/30',
  },
  warning: {
    label: 'Warning',
    icon: 'mdi:alert-circle-outline',
    accentBg: 'bg-amber-50',
    accentColor: '#F59E0B', // Brighter amber
    accentBgDark: 'dark:bg-amber-950/30',
  },
  info: {
    label: 'Information',
    icon: 'mdi:information-outline',
    accentBg: 'bg-blue-50',
    accentColor: '#3B82F6', // Brighter blue
    accentBgDark: 'dark:bg-blue-950/30',
  },
  default: {
    label: 'Status',
    icon: 'mdi:help-circle-outline',
    accentBg: 'bg-slate-50',
    accentColor: '#64748B', // Brighter slate
    accentBgDark: 'dark:bg-slate-800/30',
  },
}

const getSeverityMeta = (level: string): SeverityMeta => {
  return severityMeta[level] ?? severityMeta.default
}

const Alerts: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlerts, settings } = useAppStore()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' })

  const activeAlerts = useMemo(() => alerts.filter(alert => !alert.acknowledged), [alerts])
  const acknowledgedAlerts = useMemo(() => alerts.filter(alert => alert.acknowledged), [alerts])

  const [activeTab, setActiveTab] = useState<'active' | 'history'>(
    activeAlerts.length > 0 ? 'active' : 'history'
  )

  const showNotification = (title: string, description: string) => {
    setToastMessage({ title, description })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleConfirmClear = useCallback(() => {
    clearAlerts()
    setIsConfirmOpen(false)
    showNotification(
      'Alerts cleared',
      'We removed all alert history. New events will appear here as soon as they arrive.'
    )
  }, [clearAlerts])

  const handleAcknowledge = useCallback(
    (alertId: string, alertTitle: string) => {
      acknowledgeAlert(alertId)
      showNotification('Alert archived', `${alertTitle} moved to history.`)
    },
    [acknowledgeAlert]
  )

  const renderAlertCard = useCallback(
    (alert: COAlert, isActive: boolean) => {
      const severity = getSeverityMeta(alert.level)
      const timestamp = format(new Date(alert.timestamp), 'MMM d, h:mm a')

      return (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-3 items-start flex-1">
              <div
                className={`${severity.accentBg} ${severity.accentBgDark} rounded-2xl p-3 flex items-center justify-center min-w-[52px] min-h-[52px]`}
              >
                <Icon icon={severity.icon} width={26} height={26} color={severity.accentColor} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {alert.title}
                </h3>
                {alert.message && (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {alert.message}
                  </p>
                )}
              </div>
            </div>
            {isActive ? (
              <button
                onClick={() => handleAcknowledge(alert.id, alert.title)}
                className="flex items-center gap-1.5 px-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
              >
                <Icon icon="solar:check-square-linear" width={18} height={18} />
                <span>Archive</span>
              </button>
            ) : (
              <span className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-200 bg-transparent border border-slate-200 dark:border-slate-500 dark:bg-slate-800 rounded-full">
                Acknowledged
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-600 dark:text-slate-200 bg-transparent border border-slate-200 dark:border-slate-500 dark:bg-slate-800 rounded-full">
              <Icon icon="solar:clock-circle-linear" width={16} height={16} />
              <span>Updated {timestamp}</span>
            </div>
            {!isActive && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Closed</span>
            )}
          </div>
        </motion.div>
      )
    },
    [handleAcknowledge]
  )

  // Empty state when no alerts at all
  if (alerts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-green-50 dark:bg-green-950/30">
              <Icon icon="mdi:check-decagram" width={32} height={32} color="#34D399" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              All systems are clear
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-[280px] mx-auto">
              Sensor readings are within your configured thresholds. We'll notify you the moment
              anything changes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Alerts</h1>
          {alerts.length > 0 && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="solar:trash-bin-2-linear" width={18} height={18} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-1 flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'active'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'bg-transparent text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="font-medium">Active</span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                activeTab === 'active'
                  ? 'bg-red-500 dark:bg-red-600 text-white'
                  : 'bg-transparent border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {activeAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'bg-transparent text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="font-medium">History</span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                activeTab === 'history'
                  ? 'bg-slate-600 dark:bg-slate-700 text-white'
                  : 'bg-transparent border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {acknowledgedAlerts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-3 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {activeAlerts.length > 0 ? (
                activeAlerts.map(alert => renderAlertCard(alert, true))
              ) : (
                <div className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-5 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    No active alerts
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Everything looks steady right now. If air quality drifts past your thresholds we
                    will surface it here instantly.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {acknowledgedAlerts.length > 0 ? (
                acknowledgedAlerts.map(alert => renderAlertCard(alert, false))
              ) : (
                <div className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-5 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    History is empty
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    As alerts are acknowledged they'll be archived here automatically for quick
                    reference.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Clear all alerts?
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              This will permanently remove your alert history. We recommend exporting a report if
              you need to keep a record before clearing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                className="border-slate-200 dark:border-slate-600"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmClear}>
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:delete" width={16} height={16} />
                  <span>Clear history</span>
                </div>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-auto px-4"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {toastMessage.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {toastMessage.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Alerts
