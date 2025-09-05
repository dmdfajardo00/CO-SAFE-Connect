import React from 'react'
import { cn } from '@/lib/utils'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { AlertBanner } from '../alerts/AlertBanner'
import { Toast } from '../ui/Toast'
import { OfflineIndicator } from '../ui/OfflineIndicator'
import { PWAPrompt } from '../ui/PWAPrompt'
import { type TabName } from '@/types'

interface AppLayoutProps {
  children: React.ReactNode
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  className?: string
  showAlertBanner?: boolean
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  className,
  showAlertBanner = false,
}) => {
  return (
    <div className="app" aria-live="polite">
      <OfflineIndicator />
      
      <TopBar />
      
      {showAlertBanner && (
        <AlertBanner 
          alert={null} 
          visible={showAlertBanner}
          onMute={() => {}}
          onCall={() => {}}
        />
      )}
      
      <main role="main">
        {children}
      </main>
      
      <TabBar 
        activeTab={activeTab} 
        onTabChange={onTabChange}
      />
      
      <PWAPrompt />
      <Toast />
    </div>
  )
}