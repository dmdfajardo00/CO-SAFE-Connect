import React, { useState } from 'react'
import { 
  TrendingUp, TrendingDown,
  Download, Share2,
  Activity, Target
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts'

export const ModernAnalytics: React.FC = () => {
  const { history, settings } = useAppStore()
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Process data for charts
  const getFilteredData = () => {
    const now = Date.now()
    const ranges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    }
    
    const cutoff = now - ranges[timeRange]
    return history.filter(h => h.timestamp > cutoff)
  }

  const filteredData = getFilteredData()

  // Calculate statistics
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

  // Prepare chart data
  const chartData = filteredData.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    value: h.value,
    timestamp: h.timestamp
  }))

  const distributionData = [
    { name: 'Safe', value: stats.safeTime, color: '#10b981' },
    { name: 'Warning', value: stats.warningTime, color: '#f59e0b' },
    { name: 'Critical', value: stats.criticalTime, color: '#ef4444' }
  ]

  // Hourly average data
  const hourlyData = () => {
    const hours: { [key: string]: number[] } = {}
    filteredData.forEach(h => {
      const hour = new Date(h.timestamp).getHours()
      if (!hours[hour]) hours[hour] = []
      hours[hour].push(h.value)
    })
    
    return Object.keys(hours).map(hour => ({
      hour: `${hour}:00`,
      average: Math.round(hours[hour].reduce((a, b) => a + b, 0) / hours[hour].length)
    }))
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{payload[0].payload.time}</p>
          <p className="text-sm font-semibold">{payload[0].value} ppm</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            CO level insights and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="haptic-light">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="haptic-light">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['1h', '24h', '7d', '30d'] as const).map(range => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(range)}
            className="haptic-light"
          >
            {range === '1h' ? 'Hour' : 
             range === '24h' ? 'Day' : 
             range === '7d' ? 'Week' : 'Month'}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Average</span>
          </div>
          <p className="text-xl font-bold">{stats.average}</p>
          <p className="text-xs text-muted-foreground">ppm</p>
        </Card>

        <Card className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Maximum</span>
          </div>
          <p className="text-xl font-bold">{stats.max}</p>
          <p className="text-xs text-muted-foreground">ppm</p>
        </Card>

        <Card className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Minimum</span>
          </div>
          <p className="text-xl font-bold">{stats.min}</p>
          <p className="text-xs text-muted-foreground">ppm</p>
        </Card>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="hourly">Hourly</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4">CO Levels Over Time</h3>
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
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Threshold Lines Indicator */}
          <Card className="glass-card p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Safe: &lt;{settings.thresholds.warning} ppm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Warning: {settings.thresholds.warning} ppm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Critical: {settings.thresholds.critical} ppm</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4">Status Distribution</h3>
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
                    {((item.value / filteredData.length) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <Card className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4">Hourly Averages</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="average" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights Card */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">AI Insights</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Peak Hours</p>
              <p className="text-xs text-muted-foreground">
                CO levels tend to be highest between 6-8 PM
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Improving Trend</p>
              <p className="text-xs text-muted-foreground">
                Average levels have decreased by 15% this week
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}