import React from 'react'
import { StatusPill } from '../ui/StatusPill'

interface TopBarProps {
  className?: string
}

export const TopBar: React.FC<TopBarProps> = () => {
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