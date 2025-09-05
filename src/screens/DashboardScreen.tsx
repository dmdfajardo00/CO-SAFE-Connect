import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { COGauge } from '@/components/charts/COGauge'
import { useAppStore, useSimulation } from '@/store/useAppStore'

export const DashboardScreen: React.FC = () => {
  const {
    currentReading,
    device,
    settings,
    isSimulating,
    updateDeviceStatus,
    addAlert,
  } = useAppStore()

  const { startSimulation, stopSimulation } = useSimulation()

  const handleConnectDevice = async () => {
    // Simulate device connection
    updateDeviceStatus({ 
      connected: true,
      battery: Math.round(80 + Math.random() * 20),
      deviceId: 'CO-SAFE-A1',
      name: 'CO‑SAFE Sensor A1'
    })
    
    // Add connection alert
    addAlert({
      level: 'info',
      title: 'Device Connected',
      message: 'CO‑SAFE Sensor A1 connected successfully'
    })
  }

  const handleEmergencyCall = () => {
    const contact = settings.emergencyContact || '911'
    addAlert({
      level: 'emergency',
      title: 'SOS Triggered',
      message: 'Emergency alert sent'
    })
    window.location.href = `tel:${contact.replace(/\s+/g, '')}`
  }

  const handleSimulateToggle = () => {
    if (isSimulating) {
      stopSimulation()
    } else {
      startSimulation()
    }
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '—'
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="p-3 space-y-3" role="tabpanel" aria-labelledby="nav-dashboard">
      {/* Main Gauge */}
      <COGauge 
        reading={currentReading}
        thresholds={settings.thresholds}
        className="mb-4"
      />
      
      {/* Device Status Grid */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Device</div>
            <div className="font-bold text-sm">
              {device.connected ? device.name || 'Connected' : 'Not connected'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Battery</div>
            <div className="font-bold text-sm">
              {device.battery ? `${device.battery}%` : '—'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Filter health</div>
            <div className="font-bold text-sm">
              {device.filterHealth}%
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Last update</div>
            <div className="font-bold text-sm">
              {formatTime(device.lastUpdate)}
            </div>
          </div>
        </div>

        {/* Emergency SOS Button */}
        <Button
          variant="emergency"
          size="touch-lg"
          className="w-full font-bold text-lg"
          onClick={handleEmergencyCall}
          aria-label="Send emergency alert"
        >
          EMERGENCY SOS
        </Button>
      </Card>

      {/* Action Buttons */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={device.connected ? "secondary" : "default"}
            size="touch"
            onClick={handleConnectDevice}
            disabled={device.connected}
          >
            {device.connected ? "Connected" : "Connect Device"}
          </Button>
          
          <Button
            variant="outline"
            size="touch"
            onClick={handleSimulateToggle}
          >
            {isSimulating ? "Stop Simulation" : "Simulate Data"}
          </Button>
        </div>
      </Card>
    </div>
  )
}