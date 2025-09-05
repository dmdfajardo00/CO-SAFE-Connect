import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/useAppStore'
import { CO_THRESHOLDS } from '@/types'

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  
  // Local state for form inputs
  const [warningThreshold, setWarningThreshold] = useState(settings.thresholds.warning)
  const [criticalThreshold, setCriticalThreshold] = useState(settings.thresholds.critical)
  const [emergencyContact, setEmergencyContact] = useState(settings.emergencyContact)
  const [audibleAlarms, setAudibleAlarms] = useState(settings.audibleAlarms)
  
  const handleSave = () => {
    updateSettings({
      thresholds: {
        warning: warningThreshold,
        critical: criticalThreshold,
      },
      emergencyContact,
      audibleAlarms,
    })
    
    // Show success feedback (in real app, would use toast)
    alert('Settings saved successfully!')
  }

  const handleReset = () => {
    const defaults = {
      warning: CO_THRESHOLDS.DEFAULT_WARNING,
      critical: CO_THRESHOLDS.DEFAULT_CRITICAL,
      contact: '911',
      audible: true,
    }
    
    setWarningThreshold(defaults.warning)
    setCriticalThreshold(defaults.critical)
    setEmergencyContact(defaults.contact)
    setAudibleAlarms(defaults.audible)
    
    updateSettings({
      thresholds: {
        warning: defaults.warning,
        critical: defaults.critical,
      },
      emergencyContact: defaults.contact,
      audibleAlarms: defaults.audible,
    })
  }

  return (
    <div className="p-3 space-y-4" role="tabpanel" aria-labelledby="nav-settings">
      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="warnThreshold" className="text-sm font-medium">
              Warning threshold (ppm)
            </label>
            <input
              id="warnThreshold"
              type="range"
              min={CO_THRESHOLDS.MIN_WARNING}
              max={CO_THRESHOLDS.MAX_WARNING}
              step="1"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(Number(e.target.value))}
              className="w-full"
              aria-valuemin={CO_THRESHOLDS.MIN_WARNING}
              aria-valuemax={CO_THRESHOLDS.MAX_WARNING}
              aria-valuenow={warningThreshold}
            />
            <div className="text-xs text-muted-foreground" aria-live="polite">
              Current: <strong>{warningThreshold}</strong> ppm
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="critThreshold" className="text-sm font-medium">
              Critical threshold (ppm)
            </label>
            <input
              id="critThreshold"
              type="range"
              min={CO_THRESHOLDS.MIN_CRITICAL}
              max={CO_THRESHOLDS.MAX_CRITICAL}
              step="1"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(Number(e.target.value))}
              className="w-full"
              aria-valuemin={CO_THRESHOLDS.MIN_CRITICAL}
              aria-valuemax={CO_THRESHOLDS.MAX_CRITICAL}
              aria-valuenow={criticalThreshold}
            />
            <div className="text-xs text-muted-foreground" aria-live="polite">
              Current: <strong>{criticalThreshold}</strong> ppm
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <label htmlFor="audible" className="text-sm font-medium">
              Audible alarms
            </label>
            <Switch
              id="audible"
              checked={audibleAlarms}
              onCheckedChange={setAudibleAlarms}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact" className="text-sm font-medium">
              Emergency contact
            </label>
            <Input
              id="contact"
              type="tel"
              placeholder="e.g., 911 or +1 234 567 8900"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              aria-describedby="contactHelp"
            />
            <div id="contactHelp" className="text-xs text-muted-foreground">
              Uses tel: dialing. Default is 911.
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="units" className="text-sm font-medium">
              Units
            </label>
            <select 
              id="units" 
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                font: 'inherit'
              }}
              disabled
            >
              <option value="ppm">ppm (parts per million)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSave}
              className="flex-1"
              size="touch"
            >
              Save Settings
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleReset}
              className="flex-1"
              size="touch"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Device Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No devices configured. Connect a CO sensor to manage device settings.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}