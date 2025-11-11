# CO-SAFE Connect – Quick Reference

## Product Snapshot
- PWA for real-time vehicle CO monitoring in cars; works offline and is installable.
- Prioritizes fast mobile UX with tab navigation instead of routing and haptic feedback hooks.
- Alerts, analytics, and emergency actions revolve around configurable thresholds.

## Core Stack
- App: React 19, TypeScript, Vite 7.
- State: Zustand with `persist` middleware (storage key `co-safe-storage`).
- UI: Tailwind CSS, Radix UI primitives, class-variance-authority, Framer Motion, lucide icons.
- Data viz: Canvas-based chart components, Recharts for analytics, `react-gauge-component` for gauges.
- PWA: `vite-plugin-pwa` + Workbox (register mode `prompt`, assets cached for fonts/images).
- Tooling: ESLint 9, PostCSS/Tailwind pipeline, Netlify deploy via `netlify.toml`.

## Workflow
- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build production bundle: `npm run build`
- Preview build output: `npm run preview`

## Workflow Restrictions
- Never run npm commands (e.g., npm run dev, npm run build) without explicit permission.
- Do not commit or push without explicit permission.
- When asked to commit, ensure the message omits any Co-authored-by: Claude trailer.
- When asked to open a PR, do not auto-merge into main and exclude any Co-authored-by: Claude trailers.
- When explicitly told to "Commit all", review the staged history and create a sequence of focused commits that group related changes, rather than one omnibus commit, matching the batches observed in git log.
- **ABSOLUTE RULE:** Never create new `.md`/Markdown documents (notes, drafts, logs, etc.) unless the user explicitly orders it in that request.
- Pause for explicit user confirmation before making important architectural choices, irreversible refactors, or dependency upgrades.
- After every response, include succinct feedback options or recommended next steps so the user can react quickly.
- If any requirement or prompt is unclear, immediately ask the user for clarification instead of assuming.
- When diagnosing or fixing bugs, request additional context (logs, repro steps, recent changes) before proposing a solution.

## Source Layout
- `src/main.tsx` bootstraps React and mounts the app.
- `src/App.tsx` switches between four tabs (`home`, `alerts`, `analytics`, `settings`) without React Router.
- `src/components/` reusable pieces: `alerts/`, `charts/`, `layout/`, `ui/`, plus `Speedometer.tsx` and `PWAReloadPrompt.tsx`.
- `src/pages/` tab screens `Dashboard`, `Alerts`, `Analytics`, `Settings`.
- `src/store/useAppStore.ts` Zustand store holding device state, readings history, alerts, settings, UI flags.
- `src/types/index.ts` TypeScript interfaces and constants (thresholds, device config, chart limits).
- `src/utils/pwa.ts` service worker manager and `usePWA` hook.
- `src/screens/` legacy/alternate layouts retained for experiments.
- `public/` manifest, icons, Netlify `_redirects`; service worker output is generated at build time.

## Architecture Highlights
- **Navigation:** Local tab state in `App.tsx` for instant screen swaps and vibration feedback on supported devices.
- **State model:** Persisted readings (capped ~1000) and alerts (capped 100); store auto-raises alerts when values cross warning/critical thresholds and exposes computed helpers (status, latest reading, counts).
- **PWA flow:** `vite-plugin-pwa` registers on load; `PWAReloadPrompt` invites users to refresh when a new service worker is ready rather than forcing `skipWaiting`.
- **Data visualization:** `components/charts/COChart.tsx` uses Canvas for 24h history with pan/zoom; `COGauge` and `Speedometer` cover gauge-style displays.
- **Theming:** Tailwind + CSS variables toggled by `settings.darkMode`; applied via `useEffect` in `App.tsx`.

## Screen Summaries
- **Dashboard (`src/pages/Dashboard.tsx`):** Current reading gauge, device status cards, environmental info, emergency call action, and demo mode toggle.
- **Alerts (`src/pages/Alerts.tsx`):** Active vs acknowledged lists with acknowledge/clear actions using `AlertBanner` and `AlertCard`.
- **Analytics (`src/pages/Analytics.tsx`):** Range selector (1h/24h/7d), average/max/min stats, Recharts area + pie charts for status distribution.
- **Settings (`src/pages/Settings.tsx`):** Threshold sliders, emergency contact, notification/audio/dark-mode toggles, device metadata, clear-data dialog.

## Key Components & Utilities
- `components/layout/TopBar.tsx` and `TabBar.tsx` supply the app chrome and navigation controls.
- `components/ui/` exports Radix-based primitives (button, dialog, drawer, input, switch, tabs, toast, etc.) styled through CVA.
- `components/alerts/AlertBanner.tsx` and `AlertCard.tsx` standardize alert presentation across screens.
- `components/PWAReloadPrompt.tsx` surfaces service worker updates; `components/ui/OfflineIndicator.tsx` reflects connectivity.

## Types & Constants
- `COReading`, `HistoryDataPoint`, `COAlert`, `DeviceStatus`, `AppSettings`, `ChartViewport`, and `TabName` live in `src/types/index.ts`.
- Threshold/config constants (`CO_THRESHOLDS`, `DEVICE_CONFIG`, `TIME_RANGES`, `CHART_CONFIG`) are colocated there for reuse by store, charts, and settings UI.

## Hardware Integration & Database Schema

### Arduino Hardware
- **Device:** ESP8266 (NodeMCU 1.0) with MQ7 CO sensor and IRLZ44N MOSFET
- **Code Location:** `docs/CO_SAFE_Monitor.ino` (production-ready Arduino sketch)
- **Documentation:** See `docs/arduino-code-final.md` for full setup guide
- **Data Flow:** Arduino → WiFi → Supabase REST API → `co_readings` table (every 15 seconds)

### Supabase Database Schema
- **Project:** https://naadaumxaglqzucacexb.supabase.co
- **API Key:** anon key stored in Arduino code (public read/write allowed via RLS)
- **Migrations:** Located in `docs/migrations/`
  - `initial-set-up.sql` - Base schema (users, devices, sessions, co_readings, device_commands)
  - `add-mosfet-status.sql` - Adds MOSFET alarm tracking column

### Core Tables
1. **`devices`** - Hardware registry (device_id, device_name, vehicle_model)
   - Seed device: `CO-SAFE-001`
2. **`co_readings`** - Main sensor data table (receives Arduino POST requests)
   - Columns: `id`, `session_id`, `device_id`, `co_level`, `status`, `mosfet_status`, `created_at`
   - Indexed by: device_id, created_at, mosfet_status
3. **`sessions`** - Monitoring sessions (optional, not used by Arduino yet)
4. **`device_commands`** - App → Hardware control (future feature)
5. **`users`** - Multi-user support (future feature)

### Arduino Payload Schema
```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "safe|warning|critical",
  "mosfet_status": true|false
}
```

### Status Thresholds (Aligned Across Arduino & Database)
- **Safe:** CO < 25 ppm
- **Warning:** CO 25-49 ppm
- **Critical:** CO ≥ 50 ppm
- **MOSFET Alarm:** Activates when CO > 200 ppm

### Row Level Security (RLS)
- All tables have RLS enabled
- Anonymous users can INSERT/SELECT on `co_readings` (Arduino writes without auth)
- Public read access for demo purposes (production should restrict)

## Additional Notes
- Zustand persistence omits transient UI state but keeps critical device/reading data for offline continuity.
- `startSimulation` / `stopSimulation` actions produce demo readings when hardware is absent.
- Offline + update prompts rely on `usePWA`; rebuild the service worker after changing PWA settings.
- Netlify SPA routing depends on `public/_redirects`; avoid manual edits to generated `sw.js`.
- Do not run `npm run dev`, other `npm run *`, or any `npm` command without an explicit go-ahead from the user.
- When preparing commits, omit any autogenerated footers such as `Co-authored-by` entries for Claude or other assistants.

## ⚠️ CRITICAL: DO NOT MODIFY
The following components are production-ready and schema-aligned. DO NOT make destructive changes without explicit user approval:

### Database Schema
- **DO NOT** alter `co_readings` table structure (columns: device_id, co_level, status, mosfet_status, created_at)
- **DO NOT** change column names or data types in production tables
- **DO NOT** remove indexes: `idx_co_readings_device_created`, `idx_co_readings_mosfet_status`
- **DO NOT** modify RLS policies without understanding Arduino write permissions

### Arduino Integration
- **DO NOT** change payload structure in `docs/CO_SAFE_Monitor.ino` (matches schema exactly)
- **DO NOT** modify Supabase URL endpoint: `/rest/v1/co_readings`
- **DO NOT** alter status threshold calculations (safe/warning/critical at 25/50 ppm)
- **DO NOT** change MOSFET activation threshold (200 ppm)

### Migration Files
- **DO NOT** edit existing migration files in `docs/migrations/`
- **Create NEW** migration files for schema changes (versioned, sequential)
- **Test migrations** on development branch before applying to production

### Type Definitions
- If modifying `src/types/index.ts`, ensure compatibility with:
  - Database column types (co_level = number, status = string enum, mosfet_status = boolean)
  - Arduino payload structure
  - Zustand store schema

### Breaking Changes Require
1. User approval
2. Migration script
3. Arduino code update
4. Schema version bump
5. Testing plan
