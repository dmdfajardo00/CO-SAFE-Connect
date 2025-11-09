/**
 * OpenRouter API Service for AI Analysis
 *
 * Uses x-ai/grok-code-fast-1 model via OpenRouter to generate
 * intelligent CO monitoring session analysis
 */

import type { SessionStats, SessionReading } from '@/types'
import type { Database } from './supabase'

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const MODEL = 'x-ai/grok-code-fast-1'

// System prompt for CO monitoring analysis
const SYSTEM_PROMPT = `You are an expert CO (Carbon Monoxide) monitoring analyst for vehicle safety systems.

Analyze the provided monitoring session data and generate a concise professional report.

Context:
- Safe: < 25 ppm CO
- Warning: 25-49 ppm CO
- Critical: ≥ 50 ppm CO
- MOSFET alarm activates at > 200 ppm (emergency ventilation)

Output format: Exactly 2 paragraphs, 3-4 sentences each. Be concise and actionable.

Paragraph 1: Summarize session duration, average/max CO levels, and overall safety status.
Paragraph 2: Provide specific recommendations or notable observations (spikes, trends, MOSFET activations).

Write in a professional but accessible tone. Focus on safety and actionable insights.`

// Types
interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
}

interface OpenRouterResponse {
  id: string
  choices: {
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface SessionAnalysisPayload {
  session: {
    duration_minutes: number
    device_id: string
    started_at: string
    ended_at: string | null
  }
  statistics: {
    avg_co_level: number
    max_co_level: number
    min_co_level: number
    safe_count: number
    warning_count: number
    critical_count: number
    mosfet_alarm_count: number
    total_readings: number
  }
  sample_readings: {
    first_readings: SessionReading[]
    last_readings: SessionReading[]
    critical_events: SessionReading[]
  }
  thresholds: {
    safe: number
    warning: number
    critical: number
    mosfet: number
  }
}

/**
 * Format session data for AI analysis using smart sampling
 * Sends: stats + first 5 + last 5 + all critical events
 */
export function formatSessionForAnalysis(
  session: Database['public']['Tables']['sessions']['Row'],
  stats: SessionStats,
  readings: Database['public']['Tables']['co_readings']['Row'][]
): SessionAnalysisPayload {
  // Convert readings to simpler format
  const formattedReadings: SessionReading[] = readings.map(r => ({
    timestamp: r.created_at!,
    co_level: r.co_level,
    status: r.status || 'safe',
    mosfet_status: r.mosfet_status || false
  }))

  // Smart sampling
  const firstReadings = formattedReadings.slice(0, 5)
  const lastReadings = formattedReadings.slice(-5)
  const criticalEvents = formattedReadings.filter(r => r.co_level >= 50)

  // Calculate duration
  const startTime = new Date(session.started_at!).getTime()
  const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  const durationMinutes = Math.round((endTime - startTime) / (1000 * 60))

  return {
    session: {
      duration_minutes: durationMinutes,
      device_id: session.device_id,
      started_at: session.started_at!,
      ended_at: session.ended_at
    },
    statistics: {
      avg_co_level: stats.avg_co_level ?? 0,
      max_co_level: stats.max_co_level ?? 0,
      min_co_level: stats.min_co_level ?? 0,
      safe_count: stats.safe_count ?? 0,
      warning_count: stats.warning_count ?? 0,
      critical_count: stats.critical_count ?? 0,
      mosfet_alarm_count: stats.mosfet_alarm_count ?? 0,
      total_readings: stats.total_readings ?? 0
    },
    sample_readings: {
      first_readings: firstReadings,
      last_readings: lastReadings,
      critical_events: criticalEvents
    },
    thresholds: {
      safe: 25,
      warning: 50,
      critical: 50,
      mosfet: 200
    }
  }
}

/**
 * Call OpenRouter API to generate AI analysis
 */
export async function generateSessionAnalysis(
  session: Database['public']['Tables']['sessions']['Row'],
  stats: SessionStats,
  readings: Database['public']['Tables']['co_readings']['Row'][]
): Promise<string> {
  // Validate API key
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured')
  }

  // Format session data
  const payload = formatSessionForAnalysis(session, stats, readings)

  // Create user message with formatted data
  const userMessage = `Analyze this CO monitoring session:

**Session Info:**
- Duration: ${payload.session.duration_minutes} minutes
- Device: ${payload.session.device_id}
- Start: ${new Date(payload.session.started_at).toLocaleString()}
${payload.session.ended_at ? `- End: ${new Date(payload.session.ended_at).toLocaleString()}` : '- Status: Ongoing'}

**Statistics:**
- Total Readings: ${payload.statistics.total_readings}
- Average CO: ${payload.statistics.avg_co_level.toFixed(1)} ppm
- Maximum CO: ${payload.statistics.max_co_level.toFixed(1)} ppm
- Minimum CO: ${payload.statistics.min_co_level.toFixed(1)} ppm
- Safe Readings: ${payload.statistics.safe_count}
- Warning Readings: ${payload.statistics.warning_count}
- Critical Readings: ${payload.statistics.critical_count}
- MOSFET Alarms: ${payload.statistics.mosfet_alarm_count}

**Sample Readings:**
First 5 readings:
${payload.sample_readings.first_readings.map(r =>
  `- ${new Date(r.timestamp).toLocaleTimeString()}: ${r.co_level.toFixed(1)} ppm (${r.status})`
).join('\n')}

Last 5 readings:
${payload.sample_readings.last_readings.map(r =>
  `- ${new Date(r.timestamp).toLocaleTimeString()}: ${r.co_level.toFixed(1)} ppm (${r.status})`
).join('\n')}

${payload.sample_readings.critical_events.length > 0 ? `
Critical Events (≥ 50 ppm):
${payload.sample_readings.critical_events.map(r =>
  `- ${new Date(r.timestamp).toLocaleTimeString()}: ${r.co_level.toFixed(1)} ppm${r.mosfet_status ? ' [MOSFET ACTIVATED]' : ''}`
).join('\n')}
` : 'No critical events recorded.'}

Generate your analysis now.`

  // Prepare API request
  const request: OpenRouterRequest = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 400
  }

  // Call OpenRouter API
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'CO-SAFE Connect'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
  }

  const data: OpenRouterResponse = await response.json()

  // Extract analysis text
  const analysisText = data.choices[0]?.message?.content

  if (!analysisText) {
    throw new Error('No analysis generated by AI')
  }

  return analysisText.trim()
}
