import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts'

const Analytics: React.FC = () => {
  const { history, settings } = useAppStore()
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  const getFilteredData = () => {
    const now = Date.now()
    const ranges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000
    }
    
    const cutoff = now - ranges[timeRange]
    return history.filter(h => h.timestamp > cutoff)
  }

  const filteredData = getFilteredData()

  const stats = {
    average: filteredData.length > 0 
      ? Math.round(filteredData.reduce((a, b) => a + b.value, 0) / filteredData.length)
      : 0,
    max: filteredData.length > 0 
      ? Math.round(Math.max(...filteredData.map(h => h.value)))
      : 0,
    min: filteredData.length > 0 
      ? Math.round(Math.min(...filteredData.map(h => h.value)))
      : 0,
    safeTime: filteredData.filter(h => h.value < settings.thresholds.warning).length,
    warningTime: filteredData.filter(h => h.value >= settings.thresholds.warning && h.value < settings.thresholds.critical).length,
    criticalTime: filteredData.filter(h => h.value >= settings.thresholds.critical).length,
  }

  const chartData = filteredData.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    value: h.value,
  }))

  const distributionData = [
    { name: 'Safe', value: stats.safeTime, color: '#10B981' },
    { name: 'Warning', value: stats.warningTime, color: '#F59E0B' },
    { name: 'Critical', value: stats.criticalTime, color: '#EF4444' }
  ]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Analytics</h2>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['1h', '24h', '7d'] as const).map(range => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '1h' ? 'Hour' : range === '24h' ? 'Day' : 'Week'}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="mdi:chart-line" className="w-4 h-4 text-primary" />
              <span className="text-xs text-gray-500">Average</span>
            </div>
            <p className="text-xl font-bold">{stats.average}</p>
            <p className="text-xs text-gray-400">ppm</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="mdi:arrow-up" className="w-4 h-4 text-danger" />
              <span className="text-xs text-gray-500">Maximum</span>
            </div>
            <p className="text-xl font-bold">{stats.max}</p>
            <p className="text-xs text-gray-400">ppm</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="mdi:arrow-down" className="w-4 h-4 text-safe" />
              <span className="text-xs text-gray-500">Minimum</span>
            </div>
            <p className="text-xl font-bold">{stats.min}</p>
            <p className="text-xs text-gray-400">ppm</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">CO Levels Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                {distributionData.map(item => (
                  <div key={item.name} className="text-center">
                    <div 
                      className="w-3 h-3 rounded-full mx-auto mb-1" 
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-sm font-bold">
                      {filteredData.length > 0 
                        ? `${((item.value / filteredData.length) * 100).toFixed(0)}%`
                        : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Analytics