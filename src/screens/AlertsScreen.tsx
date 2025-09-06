import React from 'react'
import { AlertCard } from '@/components/alerts/AlertCard'
import { useAppStore } from '@/store/useAppStore'

export const AlertsScreen: React.FC = () => {
  const { alerts } = useAppStore()

  if (alerts.length === 0) {
    return (
      <section className="active" role="tabpanel" aria-labelledby="nav-alerts">
        <div className="card text-center">
          <div style={{ color: 'var(--muted)' }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>No alerts</div>
            <div style={{ fontSize: '14px' }}>
              All CO levels are within safe ranges
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section 
      className="active" 
      role="tabpanel" 
      aria-labelledby="nav-alerts"
      aria-live="polite" 
      aria-relevant="additions text"
    >
      <div className="card">
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((alert) => (
            <AlertCard 
              key={alert.id} 
              alert={alert}
            />
          ))}
        </div>
      </div>
    </section>
  )
}