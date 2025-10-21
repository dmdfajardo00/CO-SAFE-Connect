import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore, useSimulation } from '@/store/useAppStore'
import Speedometer from '@/components/Speedometer'

const Dashboard: React.FC = () => {
  const {
    currentReading,
    device,
    settings,
    isSimulating,
    updateDeviceStatus,
    addAlert,
  } = useAppStore()

  const { startSimulation, stopSimulation } = useSimulation()

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

  const handleConnect = () => {
    updateDeviceStatus({ 
      connected: true,
      battery: Math.round(80 + Math.random() * 20),
      deviceId: 'CO-SAFE-001',
      name: '2024 Honda Civic'
    })
    
    addAlert({
      level: 'info',
      title: 'Device Connected',
      message: 'CO-SAFE Monitor connected successfully'
    })
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
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={device.connected ? "secondary" : "default"}
            onClick={handleConnect}
            disabled={device.connected}
          >
            {device.connected ? "Connected" : "Connect Device"}
          </Button>
          
          <Button
            variant="outline"
            onClick={isSimulating ? stopSimulation : startSimulation}
          >
            {isSimulating ? "Stop Demo" : "Start Demo"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
