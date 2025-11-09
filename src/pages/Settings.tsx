import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const Settings: React.FC = () => {
  useDocumentTitle('Settings - CO-SAFE Connect')

  const { device, updateDeviceStatus } = useAppStore()
  const [deviceName, setDeviceName] = useState(device.name || '')
  const [isEditingDevice, setIsEditingDevice] = useState(false)

  const handleSaveDeviceName = () => {
    updateDeviceStatus({ name: deviceName })
    setIsEditingDevice(false)
  }

  const openEditDialog = () => {
    setDeviceName(device.name || '')
    setIsEditingDevice(true)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Device Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Device Information</CardTitle>
          <Dialog open={isEditingDevice} onOpenChange={setIsEditingDevice}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openEditDialog}
                className="h-8 px-2"
              >
                <Icon icon="mdi:pencil" className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Device Name</DialogTitle>
                <DialogDescription>
                  Change the display name for your CO-SAFE monitor device.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="Enter device name (e.g., 2024 Tesla Model 3)"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveDeviceName}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Device ID</span>
            <span className="text-sm font-medium">{device.deviceId || 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Name</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{device.name || 'Not set'}</span>
              <Icon 
                icon="mdi:car" 
                className="w-4 h-4 text-primary"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Battery</span>
            <span className="text-sm font-medium">{device.battery || '--'}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Filter Health</span>
            <span className="text-sm font-medium">{device.filterHealth}%</span>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Version</span>
            <span className="text-sm font-medium">2.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Build</span>
            <span className="text-sm font-medium">PWA</span>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-sm text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full text-danger border-danger hover:bg-danger/10">
            <Icon icon="mdi:delete" className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
