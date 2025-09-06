import React from 'react'
import { type TabName } from '@/types'
import { Home, AlertTriangle, BarChart3, Settings } from 'lucide-react'

interface TabBarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  className?: string
}

const tabs = [
  { id: 'dashboard' as TabName, icon: Home, label: 'Dashboard' },
  { id: 'alerts' as TabName, icon: AlertTriangle, label: 'Alerts' },
  { id: 'analytics' as TabName, icon: BarChart3, label: 'Analytics' },
  { id: 'settings' as TabName, icon: Settings, label: 'Settings' },
] as const

export const TabBar: React.FC<TabBarProps> = ({ 
  activeTab, 
  onTabChange
}) => {
  return (
    <nav 
      className="tabbar"
      role="tablist" 
      aria-label="Primary navigation"
    >
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className="tab"
          role="tab"
          aria-controls={`tab-${id}`}
          aria-selected={activeTab === id}
          onClick={() => onTabChange(id)}
        >
          <Icon style={{width: '20px', height: '20px'}} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}