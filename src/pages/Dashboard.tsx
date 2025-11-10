import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore, useSimulation, useSupabaseRealtime } from '@/store/useAppStore'
import Speedometer from '@/components/charts/Speedometer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { startMonitoringSession, stopMonitoringSession, getActiveSession, updateSessionHeartbeat } from '@/services/supabase'
import type { Database } from '@/services/supabase'

const Dashboard: React.FC = () => {
  useDocumentTitle('Dashboard - CO-SAFE Connect')

  const [useRealData, setUseRealData] = React.useState(false)
  const [activeSession, setActiveSession] = React.useState<Database['public']['Tables']['sessions']['Row'] | null>(null)
  const [isStartingSession, setIsStartingSession] = React.useState(false)

  const {
    currentReading,
    device,
    settings,
    isSimulating,
  } = useAppStore()

  const { startSimulation, stopSimulation } = useSimulation()
  const { isLoading: loadingSupabase } = useSupabaseRealtime('CO-SAFE-001', useRealData)

  // Check for active session on mount
  React.useEffect(() => {
    checkActiveSession()
  }, [])

  // Heartbeat: Send periodic updates to keep session alive
  React.useEffect(() => {
    if (!activeSession) return;

    // Send initial heartbeat
    updateSessionHeartbeat(activeSession.session_id);

    // Set up interval to send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      updateSessionHeartbeat(activeSession.session_id);
      console.log('💓 Session heartbeat sent');
    }, 30000); // 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [activeSession?.session_id])

  const checkActiveSession = async () => {
    try {
      const session = await getActiveSession('CO-SAFE-001')
      if (session) {
        setActiveSession(session)
        setUseRealData(true)
      }
    } catch (error) {
      console.error('Error checking active session:', error)
    }
  }

  const handleStartMonitoring = async () => {
    try {
      setIsStartingSession(true)
      const session = await startMonitoringSession('CO-SAFE-001')
      setActiveSession(session)
      setUseRealData(true)
      console.log('Monitoring session started:', session)
    } catch (error: any) {
      console.error('Failed to start monitoring:', error)

      // Parse error type and show specific message
      const errorMessage = error.message || 'Unknown error'

      if (errorMessage.includes('DEVICE_IN_USE')) {
        alert('⚠️ Device is already monitoring.\n\nAnother session is active. Please stop it first or wait for it to time out.')
      } else if (errorMessage.includes('COMMAND_FAILED')) {
        alert('❌ Failed to connect to hardware.\n\nCould not send start command. Please check:\n• Hardware is powered on\n• WiFi connection is stable\n• Try again in a moment')
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        alert('🌐 Network error.\n\nPlease check your internet connection and try again.')
      } else {
        alert(`❌ Failed to start monitoring\n\n${errorMessage}`)
      }
    } finally {
      setIsStartingSession(false)
    }
  }

  const handleStopMonitoring = async () => {
    if (!activeSession) return

    try {
      setIsStartingSession(true)
      await stopMonitoringSession(activeSession.session_id, 'CO-SAFE-001')
      setActiveSession(null)
      setUseRealData(false)
      console.log('Monitoring session stopped')
    } catch (error: any) {
      console.error('Failed to stop monitoring:', error)

      const errorMessage = error.message || 'Unknown error'

      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        alert('🌐 Network error while stopping session.\n\nThe session may still be active. Refresh the page to check.')
      } else {
        alert(`❌ Failed to stop monitoring\n\n${errorMessage}`)
      }
    } finally {
      setIsStartingSession(false)
    }
  }

  const getStatusColor = (value: number | undefined) => {
    if (!value) return 'text-gray-400'
    if (value < settings.thresholds.warning) return 'text-safe'
    if (value < settings.thresholds.critical) return 'text-caution'
    return 'text-danger'
  }

  const getStatusBg = (value: number | undefined) => {
    if (!value) return 'bg-gray-100 dark:bg-gray-800'
    if (value < settings.thresholds.warning) return 'bg-safe/10'
    if (value < settings.thresholds.critical) return 'bg-caution/10'
    return 'bg-danger/10'
  }

  const getStatusText = (value: number | undefined) => {
    if (!value) return 'No Reading'
    if (value < settings.thresholds.warning) return 'Safe'
    if (value < settings.thresholds.critical) return 'Warning'
    return 'Critical'
  }

  return (
    <div className="p-4 space-y-4">
      {/* Main CO Reading Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:gas-cylinder" className={`w-5 h-5 ${getStatusColor(currentReading?.value)}`} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Carbon Monoxide Level
                </span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBg(currentReading?.value)} ${getStatusColor(currentReading?.value)}`}>
                {getStatusText(currentReading?.value)}
              </div>
            </div>

            <div className="py-4">
              <Speedometer
                value={currentReading?.value || 0}
                max={100}
                warningThreshold={settings.thresholds.warning}
                criticalThreshold={settings.thresholds.critical}
                unit="ppm"
              />
              
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${device.connected ? 'bg-safe/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Icon 
                  icon={device.connected ? 'mdi:wifi' : 'mdi:wifi-off'} 
                  className={`w-5 h-5 ${device.connected ? 'text-safe' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Device</p>
                <p className="text-sm font-semibold">
                  {device.connected ? 'Connected' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${device.battery && device.battery > 20 ? 'bg-safe/10' : 'bg-caution/10'}`}>
                <Icon 
                  icon="mdi:battery" 
                  className={`w-5 h-5 ${device.battery && device.battery > 20 ? 'text-safe' : 'text-caution'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Battery</p>
                <p className="text-sm font-semibold">
                  {device.battery ? `${device.battery}%` : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isSimulating ? "default" : "outline"}
            onClick={isSimulating ? stopSimulation : startSimulation}
            disabled={useRealData}
            className="text-xs"
          >
            {isSimulating ? "Stop Demo" : "Demo"}
          </Button>

          {activeSession ? (
            <Button
              onClick={handleStopMonitoring}
              disabled={isStartingSession}
              className="text-xs bg-red-500 hover:bg-red-600"
            >
              {isStartingSession ? "Stopping..." : "Stop"}
            </Button>
          ) : (
            <Button
              onClick={handleStartMonitoring}
              disabled={isStartingSession}
              className="text-xs bg-green-500 hover:bg-green-600"
            >
              {isStartingSession ? "Starting..." : "Start"}
            </Button>
          )}
        </div>

        {useRealData && !loadingSupabase && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            <Icon icon="mdi:database-sync" className="inline w-4 h-4 mr-1" />
            Connected to Arduino device CO-SAFE-001
          </p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
