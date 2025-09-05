import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { type TabName } from '@/types'

// Map routes to tab names
const routeToTab: Record<string, TabName> = {
  '/dashboard': 'dashboard',
  '/alerts': 'alerts',
  '/analytics': 'analytics',
  '/settings': 'settings',
}

export const NavigationHandler: React.FC = () => {
  const location = useLocation()
  const { activeTab, setActiveTab } = useAppStore()

  // Only sync activeTab with current route - let tabChange handle navigation
  useEffect(() => {
    const currentTab = routeToTab[location.pathname]
    if (currentTab && currentTab !== activeTab) {
      console.log('NavigationHandler: syncing activeTab from', activeTab, 'to', currentTab, 'for route', location.pathname)
      setActiveTab(currentTab)
    }
  }, [location.pathname]) // Remove activeTab dependency to prevent circular updates

  return null // This component doesn't render anything
}