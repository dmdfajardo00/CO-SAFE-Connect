# CO-SAFE Connect – Complete System Documentation

**A Comprehensive Guide for Technical & Non-Technical Stakeholders**

---

## Table of Contents

1. [Introduction & Product Overview](#introduction--product-overview)
2. [Hardware & Arduino Integration](#hardware--arduino-integration)
3. [App Architecture & React Structure](#app-architecture--react-structure)
4. [Database Schema & Supabase Integration](#database-schema--supabase-integration)
5. [System Diagrams & Technical Details](#system-diagrams--technical-details)

---

## Introduction & Product Overview

### What is CO-SAFE Connect?

CO-SAFE Connect is a mobile safety application designed to protect you and your passengers from carbon monoxide (CO) poisoning while in your vehicle. Carbon monoxide is a silent killer—an invisible, odorless gas that can build up in cars from exhaust leaks, faulty ventilation, or prolonged idling. By the time symptoms appear (headache, dizziness, nausea), it may already be too late.

CO-SAFE Connect provides **real-time monitoring** of CO levels using a specialized hardware sensor (MQ7) connected to an ESP8266 microcontroller installed in your vehicle. The sensor continuously measures air quality and transmits data to your smartphone via WiFi and cloud infrastructure. Best of all, it works as a Progressive Web App (PWA)—meaning it installs like a native mobile app, functions offline, and doesn't require app store downloads.

### Key Features at a Glance

- **Live CO Monitoring** – Real-time readings displayed on an intuitive visual gauge with color-coded safety zones
- **Intelligent Alerts** – Instant notifications when CO levels exceed safe thresholds (configurable from 25-50 ppm)
- **Historical Analytics** – Interactive charts showing CO trends over 1 hour, 24 hours, or 7 days with average/max/min statistics
- **Offline Capability** – Monitor current readings even without internet; data syncs automatically when reconnected
- **Emergency Response** – Quick-dial emergency contact button and device alarm activation when CO reaches critical levels

### How It Works Simply

A compact sensor module installed in your vehicle continuously measures CO levels and sends data wirelessly to a cloud database (powered by Supabase). Your smartphone retrieves this data in real-time through the React-based mobile app, which processes readings, triggers alerts, and displays analytics—all while maintaining full functionality offline for uninterrupted safety monitoring.

### System Requirements

- Modern smartphone or tablet (iOS 12+ / Android 8+)
- WiFi connection for initial setup and cloud sync
- CO-SAFE hardware sensor kit (ESP8266 + MQ7 sensor)
- Works offline for continuous monitoring after setup

---

## Hardware & Arduino Integration

### Hardware Overview

The CO-SAFE monitoring system consists of a compact hardware package built around the ESP8266 microcontroller (NodeMCU 1.0 board). Inside the enclosure, you'll find four core components: the ESP8266 itself, an MQ7 carbon monoxide sensor, an IRLZ44N MOSFET transistor for controlling the sensor's heating cycle, and an optional OLED display for local readouts. The ESP8266 comes with built-in WiFi capability, eliminating the need for additional networking hardware. This design prioritizes simplicity—the entire system can be wired with just a handful of connections to power, ground, and sensor pins.

Think of the ESP8266 as the "brain" that continuously reads data from the MQ7 sensor (the "nose") and talks to the cloud via WiFi. The MOSFET acts as a smart switch, toggling the sensor's heating element on and off to keep readings accurate. The optional OLED display provides instant feedback without needing to open the app, showing live CO levels and connection status right on the device. All of this fits into a small, vehicle-friendly form factor that can be mounted on a dashboard or tucked under a seat.

From a wiring perspective, the setup is remarkably straightforward: connect the MQ7's analog output to the ESP8266's A0 pin, wire the MOSFET gate to GPIO pin D5 (GPIO14), and provide 5V power. The ESP8266 handles the rest—WiFi authentication, sensor timing, cloud uploads, and display updates—all through a single Arduino sketch uploaded once during initial setup.

### How the Sensor Works

The MQ7 is a chemical sensor that detects carbon monoxide by measuring resistance changes in a tin dioxide (SnO₂) sensing layer. When CO gas molecules contact the heated sensor surface, they react chemically, altering the material's electrical resistance. The higher the CO concentration, the lower the resistance—this inverse relationship forms the basis for all MQ7 measurements. The sensor outputs an analog voltage (0-5V) that the ESP8266 reads through its single analog pin and converts into a digital value (0-1023).

The MQ7 operates in a two-phase cycle to maintain accuracy. During the **heating phase** (60 seconds), the sensor is powered at 5V to burn off residual gases and reset the sensing layer—like clearing a smoke detector after cooking. Then, during the **sensing phase** (90 seconds), power drops to 1.4V, and the sensor stabilizes for accurate readings. This 150-second cycle (60s heat + 90s sense) repeats continuously. The Arduino sketch uses an exponential curve formula derived from the MQ7 datasheet to convert raw analog readings into parts-per-million (ppm). PPM represents how many CO molecules exist per million air molecules—for example, 50 ppm means 50 CO molecules in every million. Values are clamped to a maximum of 1000 ppm to prevent sensor saturation from producing invalid readings.

### HTTP Polling Architecture

CO-SAFE uses **HTTP polling** instead of WebSocket connections, a deliberate choice driven by the ESP8266's hardware constraints. The ESP8266 has only 40-50KB of free heap memory after loading WiFi and SSL libraries. WebSocket implementations require maintaining persistent connections, SSL certificate validation, and complex reconnection logic—all of which consume scarce memory and increase crash risk on unreliable vehicle WiFi. HTTP polling is simpler, more memory-efficient, and handles intermittent connectivity better by treating each request as independent.

The system runs two independent cycles. The **SEND cycle** executes every 15 seconds during the sensing phase: the Arduino POSTs a JSON payload to Supabase's REST API endpoint (`/rest/v1/co_readings`). A typical payload looks like this:

```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "warning",
  "mosfet_status": false
}
```

The **POLL cycle** runs every 5 seconds, checking Supabase's `device_commands` table for app-initiated instructions (calibration requests, alert threshold updates, etc.). This bidirectional communication—device pushing readings, app pushing commands—enables full remote control without requiring always-on connections. Future features will leverage the polling mechanism to trigger hardware actions like recalibration or display messages directly from the PWA.

### WiFi & Connectivity

The ESP8266 stores WiFi credentials in EEPROM (persistent memory), surviving power cycles and network outages without requiring reconfiguration. Auto-reconnection logic detects dropped connections and re-authenticates automatically, with exponential backoff to avoid overwhelming routers. On startup, the device syncs with NTP (Network Time Protocol) servers to obtain accurate timestamps for database entries. A software-based RTC (real-time clock) maintains time during brief offline periods, ensuring readings always carry valid timestamps even if cloud connectivity is temporarily lost.

### Safety & Calibration

Before deployment, the MQ7 must be calibrated in clean air (assumed 0 ppm CO) to establish a baseline resistance value. The sketch uses an exponential curve equation matching the official MQ7 datasheet—this curve maps analog readings (0-1023) to realistic CO concentrations. Values above 1000 ppm are clamped to prevent sensor saturation errors during extreme exposure. The MOSFET alarm threshold is hardcoded at 200 ppm: when CO exceeds this level, the system can trigger external alarms, ventilation systems, or emergency notifications through the `mosfet_status` flag sent with each reading.

---

## App Architecture & React Structure

### What is React?

React is a JavaScript framework for building interactive user interfaces. Think of it like a smart living room that automatically updates its displays when something changes—when new sensor data arrives, React instantly refreshes the relevant parts of the screen without requiring users to manually reload the page. Instead of writing code that explicitly manipulates each element on the screen, developers describe what the interface should look like for any given state, and React handles the updates automatically.

CO-SAFE Connect uses React 19, the latest version, to deliver a fast, responsive mobile experience. We've paired React with TypeScript, which adds type safety to catch bugs before the code even runs. For example, TypeScript ensures that a CO reading is always a number and prevents accidentally treating it as text, eliminating entire categories of runtime errors.

### Progressive Web App (PWA)

A Progressive Web App is an application that works like a native mobile app but runs in your browser. CO-SAFE Connect leverages PWA technology to deliver four key benefits: it's **installable** (users can add it to their home screen on iOS or Android just like an App Store app), **offline-capable** (continues working without internet via a service worker and localStorage), **fast** (instant startup from cached files), and **responsive** (optimized for touch and mobile screens).

When users first visit CO-SAFE Connect, they see a browser prompt asking if they want to install the app. Once installed, the PWA icon appears on their home screen alongside native apps. Behind the scenes, a service worker—a background script that runs separately from the web page—caches essential assets (JavaScript, CSS, images, fonts) so the app loads instantly even in airplane mode. Meanwhile, localStorage persists critical data like sensor readings, alerts, and user settings across sessions, ensuring continuity even when offline.

### State Management with Zustand

State is "the app's memory"—the current CO reading, active alerts, user settings, and device status. Without state management, components wouldn't know how to share data or stay synchronized. Zustand is our lightweight state management library that acts like a centralized bulletin board: all components read from and write to the same source of truth, eliminating inconsistencies.

Our Zustand store persists the most critical data: sensor readings (capped at 1,000 historical points), alerts (capped at 100), user settings, and the last active session. However, transient UI state—like which tab is active or whether a modal is open—resets on page refresh by design.

### Component Organization

Components are reusable pieces of UI that encapsulate both structure and behavior. CO-SAFE's codebase follows a modular folder structure:

- **`src/pages/`** contains full-screen views: Dashboard, Alerts, Analytics, and Settings
- **`src/components/`** houses reusable pieces:
  - `layout/` – Header, navigation bar, page scaffolding
  - `charts/` – Speedometer gauge, canvas-based history visualization
  - `alerts/` – Alert banners and cards
  - `ui/` – Foundational primitives (buttons, inputs, switches)
- **`src/store/`** – Zustand state management
- **`src/services/`** – Supabase API integration
- **`src/types/`** – TypeScript interfaces

Data flows unidirectionally: components read from the store to display information, users interact with the UI, those actions update the store, and React automatically re-renders affected components.

### Navigation & Routing

React Router v7.9 manages URL-based navigation across CO-SAFE's four main screens:
- **Dashboard** (`/`) – Current CO reading, device status, emergency button
- **Alerts** (`/alerts`) – Active and acknowledged warnings
- **Analytics** (`/analytics`) – Historical charts and statistics
- **Settings** (`/settings`) – Configuration and preferences

A persistent tab bar at the bottom enables instant screen switching, while URL-based routing allows users to bookmark specific views and use the browser's back button naturally.

### Real-Time Updates (HTTP Polling)

The app uses HTTP polling to fetch the latest readings from Supabase every 5 seconds. When the Arduino hardware sends a new CO reading, the app's next polling request retrieves it from the database. The app updates Zustand state, and React re-renders the UI—typically within 100-500 milliseconds depending on network latency. This polling approach is efficient and works reliably over unreliable WiFi connections. If the connection drops, the app gracefully falls back to localStorage, displaying cached data. When WiFi reconnects, it automatically syncs the latest readings from the cloud.

### Styling & Theme

CO-SAFE uses Tailwind CSS, a utility-first framework where every style is expressed as small, composable CSS classes applied directly to elements. Dark mode support relies on CSS variables and the `prefers-color-scheme` media query. We build on Radix UI primitives—accessible, unstyled components that follow web standards—and use Class Variance Authority (CVA) to define type-safe component variants, ensuring consistency across the interface.

---

## Database Schema & Supabase Integration

### What is Supabase?

Supabase is an open-source Firebase alternative that provides a PostgreSQL database (the most popular relational database in the world), a REST API (automatically generated from your schema), real-time subscriptions (WebSocket for live updates), and Row-Level Security (RLS) for controlling access. Think of it like a private cloud database that your Arduino and app can both write to and read from securely. It's hosted in data centers and accessible over HTTPS from anywhere.

### Database Tables (Schema)

CO-SAFE uses five core tables:

1. **devices** – Registered hardware units
   - `device_id`: "CO-SAFE-001" (unique identifier)
   - `device_name`, `vehicle_model`: Metadata
   - `last_active`: When the device last sent data

2. **co_readings** – The core table (Arduino writes every 15s)
   - `id`: Auto-incrementing identifier
   - `device_id`: Which device sent it
   - `co_level`: The CO measurement (0-2000 ppm)
   - `status`: "safe" | "warning" | "critical"
   - `mosfet_status`: Alarm flag (true if >200 ppm)
   - `created_at`: Timestamp

3. **sessions** – Monitoring sessions (future feature)
   - Tracks when monitoring started/ended
   - Supports notes and AI analysis

4. **users** – User accounts (future feature)
   - For multi-user support and device ownership

5. **device_commands** – Commands from app → Arduino (future)
   - Enables app to trigger hardware actions (calibration, reboot)

### API Endpoints (How Data Moves)

Arduino sends readings via REST API:
```
POST /rest/v1/co_readings
Body: {"device_id": "CO-SAFE-001", "co_level": 45.2, "status": "warning"}
```
Every 15 seconds during sensing phase.

Arduino polls for commands:
```
GET /rest/v1/device_commands?device_id=eq.CO-SAFE-001&executed=eq.false
```
Every 10 seconds.

The React app fetches historical readings:
```
GET /rest/v1/co_readings?device_id=eq.CO-SAFE-001&order=created_at.desc&limit=1000
```

### Indexes & Performance

Indexes are like a book's index—they help the database find data quickly without scanning every row. Critical indexes include:
- `idx_co_readings_device_created` on (device_id, created_at DESC) – Fast "latest readings" queries
- `idx_co_readings_mosfet_status` on (mosfet_status, created_at DESC) – Fast "alarm events" queries

With ~5,760 readings/day per device, indexes reduce query time from 800ms to <10ms.

### Row-Level Security (RLS)

RLS controls who can see and edit data at the row level. Currently, CO-SAFE is permissive for demo/prototype purposes:
- Anyone can INSERT readings (Arduino doesn't need a password)
- Anyone can SELECT all readings (transparent demo)

For production, RLS should be restricted:
- Only authenticated users can see their own devices' data
- Only devices with valid API keys can write readings
- Use Supabase JWT tokens for authentication

### HTTP Polling for Updates

The React app polls Supabase's REST API every 5 seconds to fetch the latest readings. This approach is memory-efficient, works reliably over unreliable WiFi, and eliminates the complexity of managing WebSocket connections. Each poll request retrieves the latest 1000 readings for the device, which are then processed and displayed in the UI.

### Data Persistence & Offline

- **Cloud**: Readings stored in Supabase forever (append-only log)
- **Local**: App stores 1,000 latest readings in localStorage (browser's local storage)
- **Offline**: If internet disconnects, app shows cached data. When WiFi returns, it syncs new readings automatically.

---

## System Diagrams & Technical Details

### Diagram 1: Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CO-SAFE CONNECT SYSTEM                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  VEHICLE INTERIOR    │
│  ┌────────────────┐  │
│  │   MQ7 Sensor   │  │     Measures CO in air
│  │   (Analog)     │  │     Range: 20-2000 ppm
│  └────────┬───────┘  │
│           │ A0       │
│  ┌────────▼───────┐  │
│  │   ESP8266      │  │     NodeMCU 1.0
│  │   (Arduino)    │  │     - Reads analog signal
│  │                │  │     - Converts to ppm
│  │   GPIO:        │  │     - Controls heating
│  │   D5 → MOSFET  │  │     - Sends to cloud
│  └────────┬───────┘  │
│           │ WiFi     │
└───────────┼──────────┘
            │
            │ HTTP POST every 15s (readings)
            │ HTTP GET every 5s (polling commands)
            ▼
┌───────────────────────────────────────────────────────────┐
│              SUPABASE CLOUD PLATFORM                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │ devices  │  │ sessions │  │   co_readings    │  │  │
│  │  │          │  │          │  │  ┌────────────┐  │  │  │
│  │  │ CO-SAFE- │  │ active   │  │  │ Latest:    │  │  │  │
│  │  │   001    │  │ session  │  │  │ co_level   │  │  │  │
│  │  └──────────┘  └──────────┘  │  │ status     │  │  │  │
│  │                               │  │ mosfet_on  │  │  │  │
│  │                               │  └────────────┘  │  │  │
│  │                               └──────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  REST API (HTTP Polling every 5 seconds)                 │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌────────────────────────────────────────────────────────────┐
│              USER DEVICE (Mobile/Desktop)                  │
│  CO-SAFE Connect PWA (React)                              │
│  • Dashboard, Alerts, Analytics, Settings                 │
│  • Zustand Store, localStorage, Service Worker            │
└────────────────────────────────────────────────────────────┘

Data flow: Sensor → Arduino → WiFi → Supabase → App → User
```

### Diagram 2: Data Flow - Reading Collection (Every 15 Seconds)

```
STEP 1: MQ7 Sensor reads CO level
        ↓
STEP 2: ESP8266 converts analog signal to ppm using exponential curve
        ↓
STEP 3: Status determined (safe/warning/critical)
        ↓
STEP 4: JSON payload formatted
        ↓
STEP 5: HTTP POST to Supabase REST API
        ↓
STEP 6: PostgreSQL INSERT into co_readings table
        ↓
STEP 7: Data persisted in Supabase database
        ↓
STEP 8: App polls REST API every 5 seconds and fetches latest readings
        ↓
STEP 9: Zustand store updates
        ↓
STEP 10: React re-renders Dashboard, Alerts, Analytics
        ↓
STEP 11: localStorage persisted for offline access

⏱️  TIMING: ~100-500ms from Arduino POST to app display (next poll cycle)
🔄 FREQUENCY: Hardware sends every 15s; App polls every 5s
🌐 NETWORK: Requires WiFi; offline fallback available via localStorage
```

### Diagram 3: HTTP Polling Cycles

```
SEND CYCLE (Every 15 seconds)
- Arduino reads sensor
- Calculates CO ppm
- POST to /rest/v1/co_readings
- Await 201 Created response

POLL CYCLE (Every 5 seconds) - BOTH HARDWARE AND APP
- Arduino: GET /rest/v1/device_commands
  Check for pending commands from app
  Execute if found
  PATCH to mark executed

- App: GET /rest/v1/co_readings?device_id=eq.CO-SAFE-001&limit=1000
  Fetch latest readings
  Update Zustand store
  React re-renders UI

Both cycles run independently on separate timers,
interleaving with each other naturally.
Typical latency: 100-500ms from Arduino POST to app display.
```

### Diagram 4: MQ7 Heating Cycle (150 Seconds Total)

```
Time:    0s ──────────────────────────────────────────────▶ 150s
         │                                                   │
PHASE 1: │ HEATING (60s) at 5V                              │
(0-60s)  │ ████████████████████████████ (no readings)       │
         │                                                   │
PHASE 2: │ SENSING (90s) at 1.4V                            │
(60-150s)│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │
         │ (6 readings every 15s, 6 uploads)                │
         │                                                   │
         └──► Repeat every 150 seconds                      │

Why two phases?
- Heat: Burn off residual CO from previous cycle
- Sense: Measure new CO while sensor is clean
```

### Diagram 5: User Interaction Flow

```
User opens app
  ↓
App loads from cache (instant)
  ↓
Restore localStorage (readings, settings, alerts)
  ↓
Subscribe to Supabase realtime
  ↓
Show Dashboard with last reading
  ↓
(Every 15s) New reading arrives via WebSocket
  ↓
Gauge updates, chart appends point
  ↓
(If threshold crossed) Alert banner appears
  ↓
User taps Alert
  ↓
Navigate to Alerts tab, view active/acknowledged
  ↓
User taps "Acknowledge"
  ↓
Alert moves to history
  ↓
User views Analytics
  ↓
Select time range (1h/24h/7d)
  ↓
See charts, stats, status distribution
  ↓
Adjust Settings (thresholds, audio, dark mode)
  ↓
Changes saved to localStorage instantly
  ↓
(If offline) App still shows cached data
  ↓
(When WiFi returns) Auto-sync latest readings
```

### Diagram 6: Database Relationships

```
devices (PK: device_id)
├─ device_id: "CO-SAFE-001"
├─ device_name: "CO-SAFE Monitor"
├─ vehicle_model: "Toyota Corolla"
└─ last_active: timestamp

                ↓ (1:N)

co_readings (PK: id, indexed by device_id + created_at)
├─ id: 1, 2, 3, ...
├─ device_id: "CO-SAFE-001"
├─ co_level: 45.2
├─ status: "warning"
├─ mosfet_status: false
└─ created_at: timestamp

                ↓ (optional 1:1)

sessions (PK: session_id)
├─ session_id: UUID
├─ device_id: "CO-SAFE-001"
├─ user_id: UUID (future)
├─ started_at: timestamp
├─ ended_at: timestamp (nullable)
└─ ai_analysis: text

Key Indexes:
- idx_co_readings_device_created (device_id, created_at DESC)
  → Fast query: "Get last 1000 readings for device X"
- idx_co_readings_mosfet_status (mosfet_status, created_at DESC)
  → Fast query: "Find all alarm events"
```

---

## Summary & Key Takeaways

**CO-SAFE Connect** is a complete vehicle safety monitoring system combining:

1. **Hardware** (ESP8266 + MQ7): Measures CO with 15-second polling, HTTP communication
2. **Cloud** (Supabase): PostgreSQL database with REST API
3. **App** (React PWA): Responsive UI with offline capability, polling-based updates
4. **Integration**: Arduino → Cloud → App via bidirectional HTTP polling (5-second app poll + 15-second Arduino send)

**Key Metrics:**
- Hardware readings: Every 15 seconds (during 90-second sensing phase)
- App polling: Every 5 seconds via REST API
- Network latency: 100-500ms sensor to app display
- Data persistence: 1,000 readings in memory, unlimited in cloud
- Offline capability: Full functionality without internet via localStorage
- Safety thresholds: 25 ppm (warning), 50 ppm (critical), 200 ppm (MOSFET alarm)

**Architecture Principles:**
- Memory-efficient (HTTP polling over WebSocket due to 40-50KB heap limit)
- Type-safe (TypeScript throughout, Zustand with interfaces)
- Offline-first (localStorage + service worker)
- Polling-based updates (REST API every 5s + React reactivity)
- Accessible (Radix UI, dark mode, responsive design)

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**Total Pages:** 5
**Word Count:** ~4,500 words

For implementation details, see:
- Arduino code: `final-arduino-code/CO_SAFE_Monitor_MERGED_1.0.ino`
- React source: `src/` directory
- Database migrations: `docs/migrations/`
- API documentation: Supabase REST API explorer

---

*Generated for CO-SAFE Connect stakeholders (technical & non-technical audiences)*
