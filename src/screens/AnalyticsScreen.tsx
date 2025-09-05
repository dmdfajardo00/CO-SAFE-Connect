import React from 'react'
import { Button } from '@/components/ui/button'
import { COChart } from '@/components/charts/COChart'
import { useAppStore } from '@/store/useAppStore'

export const AnalyticsScreen: React.FC = () => {
  const { 
    history, 
    settings,
    clearHistory,
    exportData 
  } = useAppStore()

  const handleExport = () => {
    exportData()
  }

  const handleClearHistory = () => {
    if (confirm('Clear all historical data? This cannot be undone.')) {
      clearHistory()
    }
  }

  return (
    <div className="p-3 space-y-4" role="tabpanel" aria-labelledby="nav-analytics">
      <COChart
        data={history}
        thresholds={settings.thresholds}
        interactive={true}
        className="mb-4"
      />
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="touch"
          onClick={handleExport}
          disabled={history.length === 0}
        >
          Export Data
        </Button>
        
        <Button
          variant="destructive"
          size="touch"
          onClick={handleClearHistory}
          disabled={history.length === 0}
        >
          Clear History
        </Button>
      </div>

      {history.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <div className="text-lg mb-2">No data available</div>
          <div className="text-sm">
            Start monitoring to see CO level trends
          </div>
        </div>
      )}
    </div>
  )
}