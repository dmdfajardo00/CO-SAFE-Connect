import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
    history
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

  const recentHistory = history.slice(-20)
  const trend = recentHistory.length > 1 
    ? recentHistory[recentHistory.length - 1].value - recentHistory[0].value
    : 0

  return (
    <div className="p-4 space-y-4">
      {/* Main CO Reading Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`${getStatusBg(currentReading?.value)} border-2`}>
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
              
              <div className="flex items-center justify-center gap-2 mt-4">
                <Icon 
                  icon={trend > 0 ? 'mdi:trending-up' : trend < 0 ? 'mdi:trending-down' : 'mdi:trending-neutral'} 
                  className={`w-4 h-4 ${trend > 2 ? 'text-danger' : trend < -2 ? 'text-safe' : 'text-gray-400'}`}
                />
                <span className="text-sm text-gray-500">
                  {trend > 0 ? '+' : ''}{trend.toFixed(2)} ppm/hr
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Safe</span>
                <span>Warning ({settings.thresholds.warning} ppm)</span>
                <span>Critical ({settings.thresholds.critical} ppm)</span>
              </div>
              <Progress 
                value={currentReading ? Math.min((currentReading.value / settings.thresholds.critical) * 100, 100) : 0}
                className="h-2"
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon icon="mdi:air-filter" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Filter</p>
                <p className="text-sm font-semibold">{device.filterHealth}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.audibleAlarms ? 'bg-safe/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Icon 
                  icon={settings.audibleAlarms ? 'mdi:volume-high' : 'mdi:volume-off'} 
                  className={`w-5 h-5 ${settings.audibleAlarms ? 'text-safe' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Alarms</p>
                <p className="text-sm font-semibold">
                  {settings.audibleAlarms ? 'On' : 'Muted'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Environmental Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:thermometer" className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Temperature</span>
            </div>
            <span className="text-sm font-medium">72°F</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:water-percent" className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Humidity</span>
            </div>
            <span className="text-sm font-medium">45%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:weather-windy" className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Air Quality</span>
            </div>
            <span className="text-sm font-medium">Good</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {currentReading?.status === 'critical' && (
          <Button
            className="w-full h-14 text-lg font-semibold"
            variant="destructive"
          >
            <Icon icon="mdi:phone" className="w-5 h-5 mr-2" />
            EMERGENCY CALL
          </Button>
        )}

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