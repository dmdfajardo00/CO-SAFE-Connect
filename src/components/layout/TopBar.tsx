import React from 'react'
import { cn } from '@/lib/utils'
import { StatusPill } from '../ui/StatusPill'

interface TopBarProps {
  className?: string
}

export const TopBar: React.FC<TopBarProps> = ({ className }) => {
  return (
    <header className="topbar" role="banner">
      <div className="brand" aria-label="CO-SAFE brand">
        <div className="logo" aria-hidden="true"></div>
        <div className="title">CO‑SAFE Connect</div>
      </div>
      
      <StatusPill 
        connected={false}
        status="Disconnected"
        className="status-pill"
      />
    </header>
  )
}