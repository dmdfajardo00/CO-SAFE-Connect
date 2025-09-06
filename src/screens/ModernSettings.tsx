import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, Phone, Moon, Sun, Shield, 
  ChevronRight, HelpCircle, LogOut, 
  Sliders, WifiIcon, Battery, Info, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer'
import { useAppStore } from '@/store/useAppStore'

export const ModernSettings: React.FC = () => {
  const { settings, updateSettings, device } = useAppStore()
  const [showThresholdDrawer, setShowThresholdDrawer] = useState(false)
  const [showContactDrawer, setShowContactDrawer] = useState(false)
  const [warningThreshold, setWarningThreshold] = useState(settings.thresholds.warning)
  const [criticalThreshold, setCriticalThreshold] = useState(settings.thresholds.critical)
  const [emergencyContact, setEmergencyContact] = useState(settings.emergencyContact)

  const handleSaveThresholds = () => {
    updateSettings({
      thresholds: {
        warning: warningThreshold,
        critical: criticalThreshold
      }
    })
    setShowThresholdDrawer(false)
  }

  const handleSaveContact = () => {
    updateSettings({ emergencyContact })
    setShowContactDrawer(false)
  }

  const SettingItem: React.FC<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    description?: string
    action?: React.ReactNode
    onClick?: () => void
  }> = ({ icon: Icon, title, description, action, onClick }) => (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4",
        onClick && "cursor-pointer active:bg-accent/50 transition-colors"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action || (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
    </motion.div>
  )

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Customize your CO-SAFE experience
        </p>
      </div>

      {/* Device Info Card */}
      <Card className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Connected Device</p>
              <p className="font-semibold">{device.name || 'No Device'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ID: {device.deviceId || 'Not connected'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <Battery className={cn(
                  "w-5 h-5 mx-auto mb-1",
                  device.battery && device.battery > 20 ? "text-green-500" : "text-yellow-500"
                )} />
                <p className="text-xs font-medium">{device.battery || '--'}%</p>
              </div>
              <div className="text-center">
                <WifiIcon className={cn(
                  "w-5 h-5 mx-auto mb-1",
                  device.connected ? "text-green-500" : "text-gray-400"
                )} />
                <p className="text-xs font-medium">
                  {device.connected ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Alert Settings */}
      <Card className="glass-card divide-y divide-border overflow-hidden">
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1">Alert Settings</h3>
          <p className="text-xs text-muted-foreground">
            Configure how you receive alerts
          </p>
        </div>
        
        <SettingItem
          icon={Bell}
          title="Push Notifications"
          description="Receive alerts on your device"
          action={
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSettings({ notifications: checked })}
            />
          }
        />
        
        <SettingItem
          icon={Phone}
          title="Emergency Contact"
          description={settings.emergencyContact || 'Not set'}
          onClick={() => setShowContactDrawer(true)}
        />
        
        <SettingItem
          icon={Sliders}
          title="Alert Thresholds"
          description={`Warning: ${settings.thresholds.warning} ppm, Critical: ${settings.thresholds.critical} ppm`}
          onClick={() => setShowThresholdDrawer(true)}
        />
        
        <SettingItem
          icon={settings.audibleAlarms ? Bell : Bell}
          title="Audible Alarms"
          description="Play sound for critical alerts"
          action={
            <Switch
              checked={settings.audibleAlarms}
              onCheckedChange={(checked) => updateSettings({ audibleAlarms: checked })}
            />
          }
        />
      </Card>

      {/* Appearance */}
      <Card className="glass-card divide-y divide-border overflow-hidden">
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1">Appearance</h3>
          <p className="text-xs text-muted-foreground">
            Customize the app appearance
          </p>
        </div>
        
        <SettingItem
          icon={settings.darkMode ? Moon : Sun}
          title="Dark Mode"
          description="Toggle dark theme"
          action={
            <Switch
              checked={settings.darkMode || false}
              onCheckedChange={(checked) => updateSettings({ darkMode: checked })}
            />
          }
        />
      </Card>

      {/* About */}
      <Card className="glass-card divide-y divide-border overflow-hidden">
        <SettingItem
          icon={Info}
          title="About"
          description="Version 2.0.0"
        />
        
        <SettingItem
          icon={HelpCircle}
          title="Help & Support"
          description="Get help and report issues"
        />
        
        <SettingItem
          icon={Shield}
          title="Privacy Policy"
          description="Learn how we protect your data"
        />
      </Card>

      {/* Sign Out */}
      <Button 
        variant="outline" 
        className="w-full h-12 haptic-medium"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* Threshold Settings Drawer */}
      <Drawer open={showThresholdDrawer} onOpenChange={setShowThresholdDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Alert Thresholds</DrawerTitle>
            <DrawerDescription>
              Set CO level thresholds for warnings and critical alerts
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warning">Warning Level (ppm)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warning"
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  min={10}
                  max={50}
                />
                <span className="text-sm text-muted-foreground">10-50 ppm</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="critical">Critical Level (ppm)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="critical"
                  type="number"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  min={30}
                  max={100}
                />
                <span className="text-sm text-muted-foreground">30-100 ppm</span>
              </div>
            </div>
            
            <Card className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Safety Guidelines
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-200 mt-1">
                    • 0-9 ppm: Normal levels<br/>
                    • 10-35 ppm: Mild exposure<br/>
                    • 36-99 ppm: Dangerous exposure<br/>
                    • 100+ ppm: Life-threatening
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          <DrawerFooter>
            <Button onClick={handleSaveThresholds}>
              <Check className="w-4 h-4 mr-2" />
              Save Thresholds
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Emergency Contact Drawer */}
      <Drawer open={showContactDrawer} onOpenChange={setShowContactDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Emergency Contact</DrawerTitle>
            <DrawerDescription>
              Set the phone number to call in emergencies
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Phone Number</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="Enter emergency contact"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This number will be called when you tap the emergency button
              </p>
            </div>
          </div>
          
          <DrawerFooter>
            <Button onClick={handleSaveContact}>
              <Check className="w-4 h-4 mr-2" />
              Save Contact
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}