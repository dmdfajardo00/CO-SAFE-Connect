import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, Battery, Wifi, WifiOff, 
  Shield, Wind, Droplets, ThermometerSun, AlertCircle,
  TrendingUp, TrendingDown, Minus, Phone, Volume2, VolumeX
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAppStore, useSimulation } from '@/store/useAppStore'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer'

export const ModernDashboard: React.FC = () => {
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
  const [showEmergencyDrawer, setShowEmergencyDrawer] = useState(false)

  // Calculate trend
  const getTrend = () => {
    if (history.length < 2) return 'stable'
    const recent = history.slice(-10)
    const avg = recent.reduce((a, b) => a + b.value, 0) / recent.length
    const lastValue = recent[recent.length - 1]?.value || 0
    if (lastValue > avg * 1.1) return 'rising'
    if (lastValue < avg * 0.9) return 'falling'
    return 'stable'
  }

  const trend = getTrend()
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'safe': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500/10 border-green-500/20'
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'critical': return 'bg-red-500/10 border-red-500/20 animate-pulse'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  const handleEmergency = () => {
    setShowEmergencyDrawer(true)
    addAlert({
      level: 'emergency',
      title: 'Emergency SOS Activated',
      message: 'Emergency services have been notified'
    })
  }

  const handleCallEmergency = () => {
    const contact = settings.emergencyContact || '911'
    window.location.href = `tel:${contact}`
  }

  const handleConnect = () => {
    updateDeviceStatus({ 
      connected: true,
      battery: Math.round(80 + Math.random() * 20),
      deviceId: 'CO-SAFE-X1',
      name: 'CO‑SAFE Pro X1'
    })
    
    addAlert({
      level: 'info',
      title: 'Device Connected',
      message: 'CO‑SAFE Pro X1 connected successfully'
    })
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Main CO Reading Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(
          "glass-card p-6 border-2 transition-all duration-300",
          getStatusBg(currentReading?.status)
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className={cn("w-5 h-5", getStatusColor(currentReading?.status))} />
              <span className="text-sm font-medium text-muted-foreground">
                CO Level Monitor
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TrendIcon className={cn(
                "w-4 h-4",
                trend === 'rising' ? 'text-red-500' : 
                trend === 'falling' ? 'text-green-500' : 
                'text-gray-400'
              )} />
              <span className="text-xs text-muted-foreground capitalize">{trend}</span>
            </div>
          </div>

          <div className="text-center py-8">
            <motion.div
              animate={{ 
                scale: currentReading?.status === 'critical' ? [1, 1.05, 1] : 1 
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative inline-block"
            >
              <div className="text-6xl font-bold number-transition">
                {currentReading?.value || '--'}
              </div>
              <div className="text-lg text-muted-foreground">ppm</div>
            </motion.div>

            <div className={cn(
              "mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
              currentReading?.status === 'safe' ? 'bg-green-500/20 text-green-600' :
              currentReading?.status === 'warning' ? 'bg-yellow-500/20 text-yellow-600' :
              currentReading?.status === 'critical' ? 'bg-red-500/20 text-red-600' :
              'bg-gray-500/20 text-gray-600'
            )}>
              {currentReading?.status === 'safe' ? 'Safe' :
               currentReading?.status === 'warning' ? 'Warning' :
               currentReading?.status === 'critical' ? 'Critical' :
               'No Reading'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 ppm</span>
              <span>{settings.thresholds.warning} ppm</span>
              <span>{settings.thresholds.critical} ppm</span>
            </div>
            <Progress 
              value={currentReading ? (currentReading.value / settings.thresholds.critical) * 100 : 0}
              className={cn(
                "h-2",
                currentReading?.status === 'critical' && "animate-pulse"
              )}
            />
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              device.connected ? "bg-green-500/10" : "bg-gray-500/10"
            )}>
              {device.connected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Device</p>
              <p className="text-sm font-semibold">
                {device.connected ? 'Connected' : 'Offline'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              device.battery && device.battery > 20 ? "bg-green-500/10" : "bg-yellow-500/10"
            )}>
              <Battery className={cn(
                "w-5 h-5",
                device.battery && device.battery > 20 ? "text-green-500" : "text-yellow-500"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Battery</p>
              <p className="text-sm font-semibold">
                {device.battery ? `${device.battery}%` : '--'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Wind className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Filter</p>
              <p className="text-sm font-semibold">{device.filterHealth}%</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              settings.audibleAlarms ? "bg-green-500/10" : "bg-gray-500/10"
            )}>
              {settings.audibleAlarms ? (
                <Volume2 className="w-5 h-5 text-green-500" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alarms</p>
              <p className="text-sm font-semibold">
                {settings.audibleAlarms ? 'On' : 'Muted'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Environmental Conditions */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">Environmental Conditions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Temperature</span>
            </div>
            <span className="text-sm font-medium">72°F</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Humidity</span>
            </div>
            <span className="text-sm font-medium">45%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Air Quality</span>
            </div>
            <span className="text-sm font-medium">Good</span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {currentReading?.status === 'critical' && (
          <Button
            onClick={handleEmergency}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg haptic-heavy"
          >
            <Phone className="w-5 h-5 mr-2" />
            EMERGENCY SOS
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={device.connected ? "secondary" : "default"}
            onClick={handleConnect}
            disabled={device.connected}
            className="h-12 haptic-medium"
          >
            {device.connected ? "Connected" : "Connect Device"}
          </Button>
          
          <Button
            variant="outline"
            onClick={isSimulating ? stopSimulation : startSimulation}
            className="h-12 haptic-medium"
          >
            {isSimulating ? "Stop Demo" : "Start Demo"}
          </Button>
        </div>
      </div>

      {/* Emergency Drawer */}
      <Drawer open={showEmergencyDrawer} onOpenChange={setShowEmergencyDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-red-600">Emergency Alert</DrawerTitle>
            <DrawerDescription>
              High CO levels detected. Take immediate action.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Immediate Actions:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Move to fresh air immediately</li>
                    <li>• Open all windows and doors</li>
                    <li>• Turn off all gas appliances</li>
                    <li>• Evacuate the premises</li>
                    <li>• Call emergency services</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button 
              onClick={handleCallEmergency}
              className="bg-red-600 hover:bg-red-700"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Emergency Services
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">I'm Safe Now</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}