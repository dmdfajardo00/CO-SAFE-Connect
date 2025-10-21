import React from 'react'
import { motion } from 'framer-motion'
import { 
  Eclipse, Sun, Shield,
  ChevronRight, HelpCircle, LogOut,
  WifiIcon, Battery, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/useAppStore'

export const ModernSettings: React.FC = () => {
  const { settings, updateSettings, device } = useAppStore()

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

      {/* Appearance */}
      <Card className="glass-card divide-y divide-border overflow-hidden">
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1">Appearance</h3>
          <p className="text-xs text-muted-foreground">
            Customize the app appearance
          </p>
        </div>
        
        <SettingItem
          icon={settings.darkMode ? Eclipse : Sun}
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
    </div>
  )
}
