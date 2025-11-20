# Database Schema & Supabase Integration

## What is Supabase?

Supabase is an open-source Firebase alternative that provides a complete backend infrastructure for modern web and mobile applications. At its core, Supabase uses **PostgreSQL**—the world's most popular open-source relational database—and wraps it with powerful tools for real-time data synchronization, authentication, and auto-generated APIs.

Think of Supabase as a **private cloud database that both your Arduino hardware and web app can write to and read from simultaneously**. The Arduino sensor uploads CO readings every 15 seconds via HTTPS, while the React app subscribes to these changes and updates the dashboard instantly—no manual refresh needed. Supabase runs in secure data centers with 99.9% uptime, accessible from anywhere with an internet connection.

## Database Tables (Schema)

CO-SAFE Connect uses **five core tables** organized in a relational structure. Each table serves a specific role in the data pipeline:

### 1. `devices` – Hardware Registry
Tracks registered CO-SAFE monitor units. Each device has a unique identifier (e.g., `CO-SAFE-001`) that the Arduino embeds in every API request. The table stores metadata like `device_name`, `vehicle_model`, and `last_active` (a timestamp automatically updated when new readings arrive). This allows the app to display "Last seen 2 minutes ago" messages and manage multiple sensors across different vehicles.

### 2. `co_readings` – Core Sensor Data
This is the **heart of the system**—where every CO measurement lives. Each row represents a single reading with seven critical fields:
- `id`: Auto-incrementing unique identifier (PostgreSQL `BIGSERIAL` data type)
- `device_id`: Which device sent the reading (TEXT, references `devices.device_id`)
- `co_level`: The actual CO concentration in parts-per-million (FLOAT, range 0-2000 ppm)
- `status`: Pre-computed safety level (`safe` | `warning` | `critical`, based on thresholds)
- `mosfet_status`: Boolean flag indicating whether the alarm/ventilation device activated (TRUE when CO > 200 ppm)
- `session_id`: Optional link to a monitoring session (UUID, nullable)
- `created_at`: Precise timestamp when the reading was captured (TIMESTAMPTZ with timezone)

With readings arriving every 15 seconds, this table accumulates **~5,760 rows per day per device**, reaching 150,000+ rows per month—making efficient indexing essential.

### 3. `sessions` – Monitoring Sessions
Tracks discrete monitoring periods (e.g., "Morning commute on 11/16/2025"). When users tap "Start Monitoring" in the app, a new session begins with a `started_at` timestamp. All subsequent readings link to this session via `session_id`, enabling grouped analytics like "average CO during yesterday's 30-minute trip." Sessions also store optional `notes` and AI-generated `ai_analysis` for post-drive insights.

### 4. `users` – User Accounts (Future Feature)
Prepared for multi-user authentication via Supabase Auth. Contains `email`, `name`, and a UUID `id` that ties to user-owned devices. Currently dormant—anonymous access handles demo usage—but the schema supports scaling to family accounts or fleet management.

### 5. `device_commands` – App → Hardware Control (Future Feature)
A command queue for sending instructions from the app to Arduino (e.g., `calibrate`, `reboot`, `set_threshold`). The app inserts commands with `executed = FALSE`; the Arduino polls this table every 10 seconds, processes commands, then marks them `executed = TRUE` with an `executed_at` timestamp. This creates bidirectional communication without WebSocket complexity.

### Table Relationships
Users own devices → Devices generate readings and sessions → Readings belong to sessions. Foreign keys enforce referential integrity with `ON DELETE CASCADE` (deleting a device removes all its readings) and `ON DELETE SET NULL` (deleting a user preserves session data for analytics).

## API Endpoints (How Data Moves)

Supabase auto-generates a **RESTful API** from the database schema—no custom backend code required. Endpoints return JSON data and accept standard HTTP methods (GET, POST, PATCH, DELETE).

### Arduino → Database (Writing Data)
Every 15 seconds, the Arduino executes:
```http
POST /rest/v1/co_readings
Content-Type: application/json
Authorization: Bearer <anon_key>

{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "warning",
  "mosfet_status": false
}
```
The `anon_key` (API key) grants write access via Row-Level Security policies. The server validates the payload, inserts the row, and returns `201 Created` with the generated `id`.

To poll for pending commands:
```http
GET /rest/v1/device_commands?device_id=eq.CO-SAFE-001&executed=eq.false&order=created_at.asc
```
The query parameters (`?field=eq.value`) use PostgREST syntax—`eq` = equals, `neq` = not equals, `gt` = greater than, etc. Results return as a JSON array.

### App → Database (Reading Data)
The React app fetches the latest 1,000 readings for charts:
```http
GET /rest/v1/co_readings?device_id=eq.CO-SAFE-001&order=created_at.desc&limit=1000&select=*
```
Additional filters enable analytics queries:
- Last 24 hours: `&created_at=gte.2025-11-15T00:00:00Z`
- Only alarms: `&mosfet_status=eq.true`

To create a new session:
```http
POST /rest/v1/sessions
Content-Type: application/json

{
  "device_id": "CO-SAFE-001",
  "notes": "Morning commute - highway route"
}
```
The database function `start_session()` auto-closes any prior open sessions and returns the new `session_id`.

## Indexes & Performance

**Indexes** act like a book's index—they allow PostgreSQL to locate matching rows in microseconds instead of scanning millions of entries. CO-SAFE Connect uses three critical indexes on `co_readings`:

1. **`idx_co_readings_device_created` (device_id, created_at DESC)**
   Optimizes: "Get last 1,000 readings for device X, sorted newest first"
   Without this index: Postgres scans 150,000 rows, taking ~800ms
   With index: Direct lookup returns results in <10ms

2. **`idx_co_readings_mosfet_status` (mosfet_status, created_at DESC)**
   Optimizes: "Find all alarm activation events"
   Uses a **partial index** (only rows where `mosfet_status = TRUE`), saving 95% storage space

3. **`idx_commands_device_pending` (device_id, executed) WHERE executed = FALSE**
   Optimizes: Arduino's 10-second command polling loop
   Conditional index = only unexecuted commands tracked, reducing overhead

With ~5,760 readings/day/device accumulating to 150,000+ rows/month, these indexes transform sluggish 5-second queries into instant <50ms responses—critical for real-time dashboards.

## Row-Level Security (RLS)

**Row-Level Security** controls who can view or modify specific rows. Unlike traditional permission systems that operate at the table level, RLS policies apply filters to each query based on the user's role.

**Current Configuration (Demo Mode):**
```sql
-- Allow anonymous Arduino writes
CREATE POLICY "Devices can insert readings"
  ON co_readings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public read access for transparency
CREATE POLICY "Anyone can view co_readings"
  ON co_readings FOR SELECT
  TO anon, authenticated
  USING (true);
```
This **permissive setup** enables the Arduino to upload readings without authentication and allows public dashboard access for demonstration purposes.

**Production Hardening (Recommended):**
Replace `USING (true)` with:
- `USING (device_id IN (SELECT device_id FROM user_devices WHERE user_id = auth.uid()))` — Users only see their own devices' data
- Require JWT tokens (Supabase Auth) for Arduino → Database writes via custom API keys per device
- Restrict session creation to authenticated users only

The trade-off: Demo accessibility vs. data privacy. Transition to production RLS before deploying beyond prototyping.

## Real-Time Subscriptions

**Realtime** uses WebSocket connections to push database changes to the app instantly—no polling required. When the Arduino inserts a new reading, Supabase broadcasts an event to all subscribed clients within <100ms.

The React app subscribes via:
```javascript
supabase
  .channel('co_readings_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'co_readings',
    filter: 'device_id=eq.CO-SAFE-001'
  }, (payload) => {
    // payload.new contains the fresh reading
    store.addReading(payload.new);
  })
  .subscribe();
```
Zustand's store receives the new data, triggers a React re-render, and updates the dashboard gauge—all without a page refresh.

**Fallback Strategy:** If the WebSocket disconnects (weak cellular signal), the app automatically switches to **REST API polling** (every 5 seconds) until reconnection. Supabase's client library handles this gracefully via exponential backoff.

## Data Persistence & Offline

**Cloud Storage:** All readings persist in Supabase indefinitely as an append-only log (no deletions). This supports historical analytics like "Show CO trends from last month."

**Local Storage:** The app mirrors the latest 1,000 readings in browser `localStorage` (Zustand `persist` middleware). If the internet drops:
- The app continues rendering charts from cached data
- An "Offline" banner appears in the top bar
- New readings queue in the Arduino's buffer (ESP8266 has ~20KB SRAM for temporary storage)

When connectivity returns:
- The Arduino flushes buffered readings in rapid succession (one POST per reading)
- The app syncs via Realtime subscription or REST polling
- Zustand reconciles duplicates using `created_at` timestamps

**FIFO Memory Cap:** To prevent browser memory overflow, the app enforces a **1,000-reading limit** in local storage. Older entries evict automatically (First-In, First-Out). The cloud database retains full history indefinitely.

## Migrations & Schema Evolution

**Migrations** are version-controlled SQL scripts that modify the database schema over time. Each file represents a timestamped change:
- `docs/migrations/initial-set-up.sql` — Base tables (v1.0)
- `docs/migrations/add-mosfet-status.sql` — Added `mosfet_status` column (v1.1)
- `docs/migrations/add-ai-analysis.sql` — Added AI fields to `sessions` (v1.2)

Migrations run **sequentially and idempotently** (safe to re-run without errors). The pattern:
1. Write new migration file: `20251116_add_battery_voltage.sql`
2. Test on development branch database
3. Deploy to production via Supabase CLI: `supabase db push`

**Data Types Reference:**
- `TEXT` = Variable-length strings (device IDs, status enums)
- `FLOAT` / `NUMERIC` = Decimal numbers (CO levels)
- `BOOLEAN` = True/false flags (mosfet status, command execution)
- `TIMESTAMPTZ` = Timestamps with timezone (UTC storage, local display)
- `UUID` = 128-bit unique identifiers (session IDs)
- `BIGINT` / `BIGSERIAL` = 64-bit integers (reading IDs, supports 9 quintillion rows)

Never modify existing migrations—always create **additive migrations** to preserve rollback capability and deployment history.

---

**Next Steps:** Review the [Arduino Integration Guide](./arduino-code-final.md) to understand hardware → database communication, or explore [API Query Examples](./api-examples.md) for advanced filtering patterns.
