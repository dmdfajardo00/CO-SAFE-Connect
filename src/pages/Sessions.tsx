import React, { useState, useEffect, useMemo } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { format, differenceInMinutes } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getSessions, getSessionReadings, getSessionStats, updateSessionAnalysis, type Database } from '@/services/supabase'
import { generateSessionAnalysis } from '@/services/openrouter'
import type { Session, SessionStats, SessionReading } from '@/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

interface SessionWithStats extends Session {
  stats?: SessionStats
  device_name?: string
  vehicle_model?: string
}

const Sessions: React.FC = () => {
  return (
    <Routes>
      <Route index element={<SessionsListPage />} />
      <Route path=":sessionId" element={<SessionDetailPage />} />
    </Routes>
  )
}

// Helper functions (shared across components)
const hapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}

const getSessionDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const minutes = differenceInMinutes(end, start)

    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

const getStatusBadge = (session: SessionWithStats) => {
  if (!session.ended_at) {
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
        <Icon icon="mdi:circle" className="w-2 h-2 animate-pulse" />
        Active
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
      Completed
    </Badge>
  )
}

// SessionsListPage Component
const SessionsListPage: React.FC = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle('Sessions - CO-SAFE Connect')

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getSessions()
      setSessions(data || [])
    } catch (err) {
      setError('Failed to load sessions. Please try again.')
      console.error('Error loading sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionClick = (session: SessionWithStats) => {
    hapticFeedback()
    navigate(`/sessions/${session.session_id}`)
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 pb-24">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !sessions.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-red-50 dark:bg-red-950/30">
            <Icon icon="mdi:alert-circle" width={32} height={32} color="#EF4444" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Error Loading Sessions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            {error}
          </p>
          <Button onClick={loadSessions}>Try Again</Button>
        </div>
      </div>
    )
  }

  // Render empty state
  if (!sessions.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-blue-50 dark:bg-blue-950/30">
            <Icon icon="mdi:history" width={32} height={32} color="#3B82F6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            No Sessions Yet
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            Start monitoring to create your first session. All your monitoring history will appear
            here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <SessionsList
        sessions={sessions}
        onSessionClick={handleSessionClick}
        getStatusBadge={getStatusBadge}
        getSessionDuration={getSessionDuration}
      />
    </div>
  )
}

// SessionDetailPage Component
const SessionDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionWithStats | null>(null)
  const [sessionReadings, setSessionReadings] = useState<SessionReading[]>([])
  const [rawReadings, setRawReadings] = useState<Database['public']['Tables']['co_readings']['Row'][]>([])
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dynamic document title
  const documentTitle = useMemo(() => {
    if (session) {
      const sessionDate = format(new Date(session.started_at), 'MMM d, yyyy h:mm a')
      return `Session ${sessionDate} - CO-SAFE Connect`
    }
    return 'Session Detail - CO-SAFE Connect'
  }, [session])

  useDocumentTitle(documentTitle)

  // Load session detail when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      navigate('/sessions')
      return
    }
    loadSessionDetail(sessionId)
  }, [sessionId])

  const loadSessionDetail = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Load session metadata first
      const sessions = await getSessions()
      const foundSession = sessions?.find((s) => s.session_id === id)

      if (!foundSession) {
        setError('Session not found')
        setTimeout(() => navigate('/sessions'), 2000)
        return
      }

      setSession(foundSession)

      // Load readings and stats in parallel
      const [readings, stats] = await Promise.all([
        getSessionReadings(id),
        getSessionStats(id),
      ])

      console.log('📊 Session stats loaded:', stats)
      console.log('📈 Session readings count:', readings?.length)

      setRawReadings(readings || [])
      setSessionReadings(readings || [])
      setSessionStats(stats || null)
    } catch (err) {
      console.error('Error loading session detail:', err)
      setError('Failed to load session details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    hapticFeedback()
    navigate('/sessions')
  }

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!sessionReadings.length) return []

    return sessionReadings.map((reading) => ({
      time: format(new Date(reading.created_at), 'HH:mm'),
      value: reading.co_level,
      status: reading.status,
    }))
  }, [sessionReadings])

  // Status distribution data
  const distributionData = useMemo(() => {
    if (!sessionStats) return []

    return [
      { name: 'Safe', value: sessionStats.safe_count, color: '#10B981' },
      { name: 'Warning', value: sessionStats.warning_count, color: '#F59E0B' },
      { name: 'Critical', value: sessionStats.critical_count, color: '#EF4444' },
    ].filter((item) => item.value > 0)
  }, [sessionStats])

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-red-50 dark:bg-red-950/30">
            <Icon icon="mdi:alert-circle" width={32} height={32} color="#EF4444" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {error}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            Redirecting to sessions list...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <SessionDetail
        session={session}
        rawReadings={rawReadings}
        stats={sessionStats}
        chartData={chartData}
        distributionData={distributionData}
        isLoading={isLoading}
        onBack={handleBack}
        getSessionDuration={getSessionDuration}
      />
    </div>
  )
}

// Sessions List Component
interface SessionsListProps {
  sessions: SessionWithStats[]
  onSessionClick: (session: SessionWithStats) => void
  getStatusBadge: (session: SessionWithStats) => React.ReactNode
  getSessionDuration: (startedAt: string, endedAt: string | null) => string
}

const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  onSessionClick,
  getStatusBadge,
  getSessionDuration,
}) => {
  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sessions</h1>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Icon icon="mdi:database" className="w-4 h-4" />
          <span>{sessions.length} total</span>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <motion.button
            key={session.session_id}
            onClick={() => onSessionClick(session)}
            className="w-full text-left"
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon="mdi:clock-outline"
                        className="w-4 h-4 text-slate-500 dark:text-slate-400"
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {format(new Date(session.started_at), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      {session.device_name && (
                        <div className="flex items-center gap-1">
                          <Icon icon="mdi:car" className="w-3 h-3" />
                          <span>{session.device_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Icon icon="mdi:timer-outline" className="w-3 h-3" />
                        <span>{getSessionDuration(session.started_at, session.ended_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(session)}
                    <Icon
                      icon="mdi:chevron-right"
                      className="w-5 h-5 text-slate-400 dark:text-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Session Detail Component
interface SessionDetailProps {
  session: SessionWithStats | null
  rawReadings: Database['public']['Tables']['co_readings']['Row'][] // For AI analysis
  stats: SessionStats | null
  chartData: any[]
  distributionData: any[]
  isLoading: boolean
  onBack: () => void
  getSessionDuration: (startedAt: string, endedAt: string | null) => string
}

const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  rawReadings,
  stats,
  chartData,
  distributionData,
  isLoading,
  onBack,
  getSessionDuration,
}) => {
  const [analysisText, setAnalysisText] = useState<string>('')
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false)

  // Load existing AI analysis when session changes
  React.useEffect(() => {
    if (session?.ai_analysis) {
      setAnalysisText(session.ai_analysis)
    } else {
      setAnalysisText('')
    }
  }, [session?.session_id])

  // Haptic feedback helper
  const hapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  // Mock AI Analysis Generator
  const generateAIAnalysis = (
    session: SessionWithStats,
    stats: SessionStats | null
  ): string => {
    if (!stats) return ''

    const duration = getSessionDuration(session.started_at, session.ended_at)
    const totalReadings = stats.total_readings || 0
    const avgCO = stats.avg_co_level?.toFixed(1) ?? '0.0'
    const maxCO = stats.max_co_level?.toFixed(1) ?? '0.0'
    const safeCount = stats.safe_count || 0
    const warningCount = stats.warning_count || 0
    const criticalCount = stats.critical_count || 0
    const alarmCount = stats.mosfet_alarm_count || 0

    // Determine overall assessment
    let assessment = 'predominantly safe conditions'
    if (criticalCount > totalReadings * 0.3) {
      assessment = 'concerning elevated CO levels'
    } else if (warningCount > totalReadings * 0.5) {
      assessment = 'moderately elevated CO levels requiring attention'
    }

    // Determine recommendation
    let recommendation = 'the vehicle appears to be operating within safe parameters'
    if (criticalCount > 0) {
      recommendation = 'immediate inspection of the exhaust system is recommended'
    } else if (warningCount > totalReadings * 0.2) {
      recommendation = 'a routine maintenance check of the emission system is advised'
    }

    // MOSFET interpretation
    let mosfetInterpretation = ''
    if (alarmCount > 0) {
      if (alarmCount > 5) {
        mosfetInterpretation = `The MOSFET alarm was triggered ${alarmCount} times, suggesting frequent exposure to hazardous CO concentrations. This indicates a potential exhaust leak or ventilation issue that requires immediate attention.`
      } else {
        mosfetInterpretation = `The MOSFET alarm was triggered ${alarmCount} time${alarmCount !== 1 ? 's' : ''}, indicating brief periods of elevated CO exposure. While not continuous, these spikes warrant monitoring and potential vehicle inspection.`
      }
    } else {
      mosfetInterpretation =
        'No MOSFET alarm activations were recorded, confirming that CO levels remained below critical thresholds throughout the session.'
    }

    // Overall conclusion
    let conclusion = 'within acceptable limits'
    let actionRecommendation = 'no immediate action is required'
    if (criticalCount > 0) {
      conclusion = 'exceeding safe thresholds'
      actionRecommendation = 'professional inspection should be scheduled promptly'
    } else if (warningCount > totalReadings * 0.3) {
      conclusion = 'approaching concerning levels'
      actionRecommendation = 'continued monitoring and preventive maintenance is recommended'
    }

    // Safe percentage
    const safePercentage = totalReadings > 0 ? ((safeCount / totalReadings) * 100).toFixed(1) : '0'

    return `This monitoring session lasted ${duration} and recorded ${totalReadings} CO measurements. The average CO level was ${avgCO} ppm with a maximum of ${maxCO} ppm, indicating ${assessment}. The sensor remained in safe range for ${safeCount} readings (${safePercentage}%), with ${warningCount} warnings and ${criticalCount} critical alerts.

Based on the data, ${recommendation}. ${mosfetInterpretation} Overall, the vehicle's emission levels are ${conclusion} and ${actionRecommendation}`
  }

  // Handle Generate/Regenerate Analysis
  const handleGenerateAnalysis = async () => {
    if (!session || !stats) return

    hapticFeedback()
    setIsGeneratingAnalysis(true)

    try {
      // Call OpenRouter API for real AI analysis
      const analysis = await generateSessionAnalysis(session, stats, rawReadings)
      setAnalysisText(analysis)

      // Save analysis to database
      await updateSessionAnalysis(session.session_id, analysis)
      console.log('AI analysis saved to database')
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error)

      // Fallback to mock analysis if API fails
      const mockAnalysis = generateAIAnalysis(session, stats)
      setAnalysisText(mockAnalysis)

      // Try to save mock analysis to database
      try {
        await updateSessionAnalysis(session.session_id, mockAnalysis)
      } catch (dbError) {
        console.error('Failed to save analysis to database:', dbError)
      }
    } finally {
      setIsGeneratingAnalysis(false)
    }
  }

  if (!session) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-6 py-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Session Detail</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Session Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Started</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {format(new Date(session.started_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                {session.ended_at && (
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ended</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {format(new Date(session.ended_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Duration</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {getSessionDuration(session.started_at, session.ended_at)}
                  </p>
                </div>
                {session.device_name && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Device</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {session.device_name}
                    </p>
                  </div>
                )}
              </div>

              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    AI Analysis
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateAnalysis}
                    disabled={isGeneratingAnalysis}
                    className="h-7 px-3 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20 dark:border-purple-500/20"
                  >
                    <Icon
                      icon="mdi:sparkles"
                      className={`w-3.5 h-3.5 mr-1.5 ${isGeneratingAnalysis ? 'animate-spin' : ''}`}
                    />
                    {analysisText && !isGeneratingAnalysis
                      ? 'Regenerate'
                      : isGeneratingAnalysis
                        ? 'Generating...'
                        : 'Generate Analysis'}
                  </Button>
                </div>

                {isGeneratingAnalysis ? (
                  <div className="space-y-2">
                    <div className="relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded w-11/12">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded w-10/12">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                    <div className="mt-4 relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded w-full">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 bg-slate-200 dark:bg-slate-800 rounded w-9/12">
                      <div className="absolute inset-0 shimmer-animation bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent" />
                    </div>
                  </div>
                ) : analysisText ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-ul:my-2 prose-li:my-0.5"
                  >
                    <ReactMarkdown>{analysisText}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    No analysis generated yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CO Level Metrics */}
          {stats && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mdi:chart-line" className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Average</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {stats?.avg_co_level?.toFixed(1) ?? '0.0'}
                    </p>
                    <p className="text-xs text-slate-400">ppm</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mdi:arrow-up" className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Maximum</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {stats?.max_co_level?.toFixed(1) ?? '0.0'}
                    </p>
                    <p className="text-xs text-slate-400">ppm</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mdi:arrow-down" className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Minimum</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {stats?.min_co_level?.toFixed(1) ?? '0.0'}
                    </p>
                    <p className="text-xs text-slate-400">ppm</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alarm Count */}
              {(stats?.mosfet_alarm_count ?? 0) > 0 && (
                <Card className="border-red-200 dark:border-red-900/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                        <Icon icon="mdi:alarm-light" className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {stats?.mosfet_alarm_count ?? 0} Alarm{(stats?.mosfet_alarm_count ?? 0) !== 1 ? 's' : ''}{' '}
                          Triggered
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          MOSFET sensor activated during this session
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CO Levels Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sessionColorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: any) => [`${Number(value).toFixed(2)} ppm`, 'CO Level']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#sessionColorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Status Distribution */}
          {distributionData.length > 0 && stats && (
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
                    <Tooltip formatter={(value: any) => [`${Number(value)} readings`, 'Count']} />
                  </RePieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {distributionData.map((item) => (
                    <div key={item.name} className="text-center">
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: item.color }}
                      />
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {stats.total_readings > 0
                          ? `${((item.value / stats.total_readings) * 100).toFixed(0)}%`
                          : '0%'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.value} readings
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  )
}

export default Sessions
