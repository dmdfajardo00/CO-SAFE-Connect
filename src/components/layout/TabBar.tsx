import React from 'react'
import { Icon } from '@iconify/react'
import { type TabName } from '@/types'

interface TabBarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  className?: string
}

const tabs = [
  { id: 'dashboard' as TabName, icon: 'tabler:home', label: 'Dashboard' },
  { id: 'alerts' as TabName, icon: 'solar:danger-triangle-linear', label: 'Alerts' },
  { id: 'analytics' as TabName, icon: 'solar:chart-square-linear', label: 'Analytics' },
  { id: 'settings' as TabName, icon: 'solar:settings-minimalistic-linear', label: 'Settings' },
] as const

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50"
      role="tablist"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-4">
        {tabs.map(({ id, icon, label }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ease-in-out"
              role="tab"
              aria-controls={`tab-${id}`}
              aria-selected={isActive}
              onClick={() => onTabChange(id)}
            >
              <Icon
                icon={icon}
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
                width="24"
                height="24"
              />
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
