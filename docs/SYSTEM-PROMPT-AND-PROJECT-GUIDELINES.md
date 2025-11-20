# CO-SAFE Connect – System Prompt & Project Guidelines

**For: Developers, AI Assistants, & Development Teams**

---

## System Prompt Reference

This document contains the official project guidelines and constraints that guide all development work on CO-SAFE Connect. All developers and AI assistants working on this project should follow these guidelines.

---

## Product Snapshot

- **PWA** for real-time vehicle CO monitoring in cars; works offline and is installable.
- **Fast mobile UX** with tab navigation (no traditional routing) and haptic feedback hooks.
- **Safety-first**: Alerts, analytics, and emergency actions revolve around configurable thresholds.

---

## Core Technology Stack

### Frontend
- **Framework:** React 19, TypeScript, Vite 7
- **State Management:** Zustand with `persist` middleware (storage key: `co-safe-storage`)
- **UI Framework:** Tailwind CSS + Radix UI primitives + class-variance-authority (CVA)
- **Animations:** Framer Motion
- **Icons:** lucide-react
- **Data Visualization:**
  - Canvas-based custom chart components (COChart.tsx for 24h history)
  - Recharts for analytics dashboard
  - react-gauge-component for gauges
- **PWA:** vite-plugin-pwa + Workbox (register mode: `prompt`, assets cached for fonts/images)
- **Tooling:** ESLint 9, PostCSS/Tailwind pipeline

### Backend
- **Database:** Supabase (PostgreSQL)
- **API:** Supabase REST API
- **Real-time Updates:** HTTP polling (not WebSocket)
- **Deployment:** Netlify via `netlify.toml`

### Hardware Integration
- **Microcontroller:** ESP8266 (NodeMCU 1.0)
- **Sensor:** MQ7 CO sensor
- **Controller:** IRLZ44N MOSFET transistor
- **Protocol:** HTTP POST (every 15 seconds) + HTTP GET polling (every 5 seconds)
- **Code:** Arduino sketch in `final-arduino-code/CO_SAFE_Monitor_MERGED_1.0.ino`

---

## Development Workflow

### Setup & Running
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (DO NOT RUN without explicit permission)
npm run build           # Production build (DO NOT RUN without explicit permission)
npm run preview         # Preview build output
npm run lint            # ESLint check
```

### Key Constraints
- **⛔ Never run `npm` commands** without explicit user permission
- **⛔ Never commit or push** without explicit user permission
- **⛔ Never create `.md` documents** without explicit order in request
- **✅ Always ask for clarification** if requirements are unclear
- **✅ Always pause for confirmation** before:
  - Important architectural changes
  - Irreversible refactors
  - Dependency upgrades
- **✅ Always include next steps/feedback options** after every response
- **✅ Always request context** (logs, repro steps, recent changes) before proposing solutions

---

## Source Code Layout

```
src/
├── main.tsx              # React 19 entry point, bootstraps app
├── App.tsx              # Root component, tab switching (4 main screens)
├── index.css            # Global styles
├── components/          # Reusable UI components
│   ├── layout/          # TopBar.tsx, TabBar.tsx (app chrome)
│   ├── alerts/          # AlertBanner.tsx, AlertCard.tsx
│   ├── charts/          # COChart.tsx (canvas), COGauge.tsx, Speedometer.tsx
│   └── ui/              # Radix UI primitives (button, dialog, input, switch, etc.)
├── pages/               # Full-screen tab views
│   ├── Dashboard.tsx    # Current CO reading, device status, emergency button
│   ├── Alerts.tsx       # Active/acknowledged alerts with actions
│   ├── Analytics.tsx    # Historical charts (1h/24h/7d), stats, trends
│   └── Settings.tsx     # Thresholds, contact, notifications, dark mode, clear data
├── store/
│   └── useAppStore.ts   # Zustand store (device state, readings, alerts, settings)
├── types/
│   └── index.ts         # TypeScript interfaces (COReading, COAlert, DeviceStatus, etc.)
├── services/
│   └── supabase.ts      # Supabase client & API calls
├── utils/
│   └── pwa.ts           # Service worker manager, usePWA hook
└── hooks/
    └── useDocumentTitle.ts  # Page title management

public/
├── manifest.json        # PWA manifest
├── _redirects           # Netlify SPA routing
└── icons/              # App icons (32x32, 192x192, 512x512)
```

---

## Architecture Highlights

### Navigation
- **Tab-based, not route-based:** Local state in `App.tsx` switches between 4 screens
- **No React Router:** Uses tab navigation for instant switching with haptic feedback
- **Instant UX:** No page reloads, snappy mobile experience

### State Management
- **Zustand store** holds: device state, readings history, alerts, settings, UI flags
- **Persisted data:** readings (capped ~1000), alerts (capped 100), settings, last session
- **Auto-alerts:** Store auto-raises alerts when CO crosses warning/critical thresholds
- **Offline-first:** localStorage persists state; app works without internet

### PWA Implementation
- **Installation:** Manifest prompts "Add to home screen"
- **Service Worker:** Generated by vite-plugin-pwa, cached assets (JS, CSS, images)
- **Offline:** Works completely offline with cached data and localStorage
- **Updates:** PWA reload prompt (not forced skipWaiting)

### Data Visualization
- **COChart.tsx:** Canvas-based 24-hour history with pan/zoom
- **Speedometer.tsx:** Large animated gauge for dashboard
- **Recharts:** Area chart + pie chart for analytics
- **Responsive:** Adapts to mobile/tablet screens

### Theming
- **Tailwind CSS** with dark mode via CSS variables
- **Toggle:** `settings.darkMode` switches theme
- **Applied:** useEffect in `App.tsx` updates document class

---

## Screen Specifications

| Screen | Component | Purpose |
|--------|-----------|---------|
| **Dashboard** | `Dashboard.tsx` | Current CO gauge, device status, emergency button, session controls |
| **Alerts** | `Alerts.tsx` | Active vs. acknowledged alerts, acknowledge/clear actions |
| **Analytics** | `Analytics.tsx` | Time range selector, trends chart, stats (avg/max/min), pie chart |
| **Settings** | `Settings.tsx` | Threshold sliders, emergency contact, notifications, dark mode, clear data |

---

## Hardware Integration & Database Schema

### Arduino Communication
- **Device:** ESP8266 (NodeMCU 1.0) + MQ7 sensor + IRLZ44N MOSFET
- **Protocol:** HTTP (not WebSocket) over WiFi
- **Timing:**
  - SEND every 15 seconds: POST CO reading to `/rest/v1/co_readings`
  - POLL every 5 seconds: GET commands from `/rest/v1/device_commands`

### Arduino Payload
```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "safe|warning|critical",
  "mosfet_status": true|false
}
```

### Supabase Database
- **Project URL:** https://naadaumxaglqzucacexb.supabase.co
- **Tables:**
  1. `devices` – Hardware registry (device_id, device_name, vehicle_model)
  2. `co_readings` – Sensor data (id, device_id, co_level, status, mosfet_status, created_at)
  3. `sessions` – Monitoring sessions (session_id, device_id, started_at, ended_at, ai_analysis)
  4. `device_commands` – App → Hardware control (id, device_id, command, executed)
  5. `users` – User accounts (id, email, name) [future multi-user]

### Key Indexes
- `idx_co_readings_device_created` (device_id, created_at DESC) – Fast "latest readings" queries
- `idx_co_readings_mosfet_status` (mosfet_status, created_at DESC) – Fast "alarm events" queries
- `idx_device_commands_pending` (device_id, executed, created_at) – Arduino polling queries

### Status Thresholds (IMMUTABLE)
- **Safe:** CO < 25 ppm 🟢
- **Warning:** CO 25-49 ppm 🟡
- **Critical:** CO ≥ 50 ppm 🔴
- **MOSFET Alarm:** CO > 200 ppm 🚨

### Row Level Security (RLS)
- All tables have RLS enabled
- Anonymous users can INSERT/SELECT on `co_readings` (Arduino writes without auth)
- **⚠️ Production:** Should restrict to authenticated users only

---

## AI Integration (OpenRouter)

CO-SAFE uses **OpenRouter API** to power AI analysis of CO trends using Grok model:

### TypeScript Implementation (`src/services/openrouter.ts`)

```typescript
/**
 * OpenRouter API Service for AI Analysis
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

Output format (use markdown):
1. One summary paragraph (2-3 sentences): session duration, average/max CO levels, overall safety status
2. Key findings as bullet points (3-4 bullets max):
   - Notable trends or patterns
   - Critical events or MOSFET activations
   - Specific recommendations

Write in a professional but accessible tone. Be concise and actionable.`

/**
 * Format session data for AI analysis using smart sampling
 * Sends: stats + first 5 + last 5 + all critical events
 */
export function formatSessionForAnalysis(
  session: Database['public']['Tables']['sessions']['Row'],
  stats: SessionStats,
  readings: Database['public']['Tables']['co_readings']['Row'][]
): SessionAnalysisPayload {
  // Smart sampling: first 5 readings, last 5 readings, all critical events (≥50 ppm)
  const formattedReadings: SessionReading[] = readings.map(r => ({
    id: r.id,
    session_id: r.session_id || '',
    device_id: r.device_id,
    co_level: r.co_level,
    status: r.status || 'safe',
    mosfet_status: r.mosfet_status || false,
    created_at: r.created_at!
  }))

  const firstReadings = formattedReadings.slice(0, 5)
  const lastReadings = formattedReadings.slice(-5)
  const criticalEvents = formattedReadings.filter(r => r.co_level >= 50)

  // Calculate session duration
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
 * @param session - Monitoring session from database
 * @param stats - Computed statistics for session
 * @param readings - All CO readings in session
 * @returns Generated analysis text from AI
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

  // Format session data with smart sampling
  const payload = formatSessionForAnalysis(session, stats, readings)

  // Create formatted user message with session data
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

**Sample Readings (first 5 and last 5):**
First 5: ${payload.sample_readings.first_readings.map(r =>
  `${r.co_level.toFixed(1)} ppm (${r.status})`
).join(', ')}

Last 5: ${payload.sample_readings.last_readings.map(r =>
  `${r.co_level.toFixed(1)} ppm (${r.status})`
).join(', ')}

${payload.sample_readings.critical_events.length > 0 ? `
Critical Events (≥ 50 ppm): ${payload.sample_readings.critical_events.map(r =>
  `${r.co_level.toFixed(1)} ppm${r.mosfet_status ? ' [MOSFET]' : ''}`
).join(', ')}
` : 'No critical events recorded.'}

Generate your analysis now.`

  // Prepare OpenRouter API request
  const request = {
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

  const data = await response.json()
  const analysisText = data.choices[0]?.message?.content

  if (!analysisText) {
    throw new Error('No analysis generated by AI')
  }

  return analysisText.trim()
}
```

### Environment Configuration
```bash
# .env file
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### How It Works
1. **Data Collection:** Zustand store accumulates readings during monitoring session
2. **Session End:** When session ends, `generateSessionAnalysis()` is called with:
   - Session metadata (device_id, duration, timestamps)
   - Statistics (avg/max/min CO, counts by status, MOSFET alarms)
   - Smart sampling: first 5 readings, last 5 readings, all critical events
3. **AI Analysis:** OpenRouter processes data via Grok model with custom system prompt
4. **Report Generation:** AI generates professional analysis in markdown format
5. **Storage:** Report saved to `sessions.ai_analysis` database field
6. **Display:** UI shows analysis to users in session review screen

### AI Insights Provided
- **Summary:** Session duration, average/max CO levels, overall safety status (1 paragraph)
- **Key Findings:** 3-4 actionable bullet points covering:
  - Notable trends or patterns (increasing/stable/decreasing)
  - Critical events or MOSFET activations with timestamps
  - Specific maintenance/inspection recommendations
  - Root cause hypotheses (cold-start issue, exhaust leak, ventilation problem, etc.)

### Smart Data Sampling Strategy
To minimize API costs and token usage while preserving context:
- **First 5 readings** – Shows how session started (baseline CO levels)
- **Last 5 readings** – Shows how session ended (trend direction)
- **All critical events** – Shows dangerous moments regardless of position in session
- **Full statistics** – Avg/max/min for overall context
- **Station duration** – For understanding exposure risk

This sampling captures ~99% of important information while using ~30% of tokens vs. sending all readings.

---

## ⚠️ CRITICAL: DO NOT MODIFY (Without Explicit Approval)

The following are production-ready and schema-aligned. **Breaking changes require: user approval, migration script, Arduino update, schema version bump, and testing plan.**

### Database Schema
- ❌ DO NOT alter `co_readings` table structure
- ❌ DO NOT change column names or data types
- ❌ DO NOT remove indexes (`idx_co_readings_device_created`, `idx_co_readings_mosfet_status`)
- ❌ DO NOT modify RLS policies without understanding Arduino permissions

### Arduino Integration
- ❌ DO NOT change payload structure in `CO_SAFE_Monitor_MERGED_1.0.ino`
- ❌ DO NOT modify Supabase endpoint (`/rest/v1/co_readings`)
- ❌ DO NOT alter threshold calculations (25/50 ppm safe/warning/critical)
- ❌ DO NOT change MOSFET alarm threshold (200 ppm)

### Migration Files
- ❌ DO NOT edit existing migrations in `docs/migrations/`
- ✅ DO create NEW versioned migration files for schema changes
- ✅ DO test migrations on development branch before production

### Type Definitions
- Ensure compatibility with:
  - Database column types (co_level = number, status = enum, mosfet_status = boolean)
  - Arduino payload structure
  - Zustand store schema

---

## Important Notes

### Persistence & Offline
- Zustand persistence omits transient UI state (active tab, modals)
- Keeps critical data: readings, alerts, settings, device status
- localStorage enables offline viewing without cloud sync

### Demo Mode
- `startSimulation()` / `stopSimulation()` actions in store
- Produces synthetic readings for testing without hardware
- Used for app testing when hardware unavailable

### Service Worker
- Generated at build time by vite-plugin-pwa
- **⚠️ Do NOT manually edit `sw.js`**
- Rebuild PWA config after changing PWA settings

### Netlify Routing
- SPA routing via `public/_redirects`
- All routes serve `index.html` for React Router to handle
- **⚠️ Avoid manual edits to generated files**

### Commit Guidelines
- **Omit `Co-authored-by` footers** (no Claude/assistant attribution)
- Group related changes into focused commits (not omnibus commits)
- Match commit patterns in git log history
- Use clear, descriptive commit messages

---

## Quick Decision Matrix

| Situation | Action | Notes |
|-----------|--------|-------|
| Bug report | Request logs, repro steps, recent changes | Diagnose before proposing |
| Feature request | Pause for approval + architecture discussion | Don't assume approach |
| Dependency upgrade | Pause for approval | May affect build/runtime |
| Schema change | Pause + migration + Arduino update required | Breaking change protocol |
| npm command | **Always ask first** | Never run without permission |
| New `.md` file | **Only if explicitly ordered** | System constraint |
| Settings/thresholds | **Hardcoded, don't change** | Production-ready, immutable |

---

## Key Contacts & Resources

- **Project URL:** https://github.com/anthropics/CO-SAFE-Connect
- **Supabase Project:** https://naadaumxaglqzucacexb.supabase.co
- **Arduino Code:** `final-arduino-code/CO_SAFE_Monitor_MERGED_1.0.ino`
- **Database Migrations:** `docs/migrations/`
- **Technical Docs:** `docs/CO-SAFE-CONNECT-COMPLETE-DOCUMENTATION.md`
- **User Manual:** `docs/CO-MONITOR-APP-MANUAL-CONCISE.md`

---

**Last Updated:** November 16, 2025
**System Prompt Version:** 1.0
**Applies To:** All development work on CO-SAFE Connect

