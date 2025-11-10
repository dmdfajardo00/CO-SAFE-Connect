# Vehicle Carbon Monoxide Monitor - Enhanced Production Code

## Project Overview
A vehicle carbon monoxide monitoring system using ESP8266 as the MCU/WiFi module, MQ7 analog sensor for CO detection, and IRLZ44N MOSFET for control. The system displays real-time readings on an OLED display and sends data to Supabase.

**PRODUCTION VERSION:** Session-aware, connection-resilient, with NTP time sync and power management

---

## What's New - Enhanced Resilient Version

### Key Features
- **Session Management**: Arduino only sends data when PWA starts a monitoring session
- **WiFi Reconnection**: Automatically reconnects with exponential backoff (max 5 retries)
- **HTTP Retry Logic**: Retries failed POST requests up to 3 times with backoff
- **WebSocket Recovery**: Automatically reconnects Supabase Realtime if connection drops
- **NTP Time Sync**: Fetches accurate timestamps from NTP servers for ISO8601 format
- **Session Timeout**: Auto-stops monitoring after 60 minutes of inactivity
- **Deep Sleep Mode**: Optional power-saving mode for battery operation (disabled by default)
- **Comprehensive Logging**: Serial debug output with emoji status indicators
- **Connection Health Checks**: Monitors WiFi every 10s, WebSocket every 30s

### How It Works
The Arduino listens for commands from your PWA via WebSocket. When you click "Start" in the dashboard, the PWA creates a session and sends a `START_SESSION:uuid` command. The Arduino receives this command, stores the session ID, and begins sending readings every 15 seconds. Each reading links to the session ID in the database.

---

## Hardware Components
- **ESP8266** (NodeMCU 1.0 ESP-12E Module)
- **MQ7 Sensor** - Carbon Monoxide (CO) analog sensor
- **IRLZ44N MOSFET** - N-channel logic level MOSFET for switching
- **SSD1306 OLED Display** (128x64) - I2C interface
- **Miscellaneous** - Resistors, wiring, power supply

---

## Pin Configuration (ESP8266 NodeMCU)

**✅ Verified with actual hardware circuit:**

| Component | Pin | Description |
|-----------|-----|-------------|
| MQ7 Sensor | A0 | Analog input for CO reading (10-bit ADC) |
| MOSFET Gate | D5 (GPIO14) | Digital output to control MOSFET |
| OLED Display | I2C (D2=SDA, D1=SCL) | Display interface (0x3C address) |

### ⚠️ VOLTAGE SAFETY WARNING

**ESP8266 A0 accepts 0-1V maximum.** Hardware verification confirmed no external voltage divider is used. The Flying Fish MQ7 module may have onboard voltage regulation, but **we recommend:**

1. **Before first power-up:** Measure MQ7 A_OUT voltage with multimeter (should be < 1V)
2. **If voltage > 1V:** Add voltage divider:
   ```
   MQ7 A_OUT ─┬─── [270kΩ] ─── A0 (ESP8266)
              └─── [100kΩ] ─── GND
   ```
3. **Monitor Serial output** for unusual readings (all zeros or max values indicate pin damage)

**Hardware used:** Flying Fish MQ7 module (blue PCB, 4-pin) with VCC/GND/D_OUT/A_OUT

---

## Arduino Code

**Full code available at:** `docs/arduino-code/CO_SAFE_Monitor-enhanced.ino`

This enhanced version includes session management, connection recovery, NTP time sync, and power management features. The code is production-ready and fully compatible with your Supabase schema.

### Key Configuration (Update Before Flashing)

```cpp
// Lines 46-47: WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";        // ← Update with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // ← Update with your WiFi password

// Lines 28-33: Optional Power Settings
#define ENABLE_DEEP_SLEEP false    // Keep false for vehicle use
#define SESSION_TIMEOUT_MINUTES 60 // Auto-stop after 60 minutes
```

---

## Session Architecture Flow

This diagram shows how the PWA, Supabase, and Arduino communicate:

```
  ┌─────────────────────────────────────────────────────────┐
  │ 1. User Clicks "Start Monitoring" in Dashboard         │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 2. PWA → POST /sessions                                 │
  │    Creates: { device_id, started_at, ended_at: null }  │
  │    Returns: session_id (UUID)                           │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 3. PWA → POST /device_commands                          │
  │    { device_id, command: "START_SESSION:uuid" }         │
  └────────────────┬────────────────────────────────────────┘
                   │
                   │ WebSocket Push (Realtime)
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 4. ESP8266 receives command via WebSocket (<1s)        │
  │    onCommandReceived() → Sets currentSessionId          │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 5. ESP8266 → POST /co_readings every 15s               │
  │    { device_id, co_level, status, mosfet_status,       │
  │      session_id: "uuid" } ← LINKED TO SESSION!         │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 6. PWA displays live data in real-time                 │
  │    Dashboard updates every second via Supabase          │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ 7. User Clicks "Stop Monitoring"                        │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 8. PWA → PATCH /sessions/:id { ended_at: NOW() }       │
  │    PWA → POST /device_commands { command: "STOP" }     │
  └────────────────┬────────────────────────────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 9. ESP8266 receives STOP via WebSocket                 │
  │    Clears currentSessionId, stops sending readings      │
  └─────────────────────────────────────────────────────────┘
```

---

## Required Libraries

Install these libraries in Arduino IDE via **Sketch → Include Library → Manage Libraries**:

1. **ESP8266WiFi** (built-in with ESP8266 core)
2. **ESP8266HTTPClient** (built-in with ESP8266 core)
3. **Adafruit SSD1306** - OLED display driver
4. **Adafruit GFX Library** - Graphics library
5. **ESPSupabase** - Supabase Realtime WebSocket client
6. **ArduinoJson** (v7 or later) - JSON parsing
7. **NTPClient** - Network Time Protocol for accurate timestamps
8. **WiFiUdp** (built-in with ESP8266 core)

---

## Payload Schema Mapping

### Arduino Sends (Session-Aware):
```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "warning",
  "mosfet_status": true,
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2025-01-09T12:34:56Z"
}
```

### Supabase `co_readings` Table Schema:
| Column | Type | Nullable | Default | Arduino Value | Notes |
|--------|------|----------|---------|---------------|-------|
| `id` | BIGINT | NO | auto-increment | (auto) | Primary key |
| `session_id` | UUID | YES | null | "uuid" | Links to sessions table |
| `device_id` | TEXT | NO | - | "CO-SAFE-001" | Foreign key to devices |
| `co_level` | DOUBLE PRECISION | NO | - | 45.2 | CO concentration in ppm |
| `status` | TEXT | YES | null | "warning" | safe/warning/critical |
| `mosfet_status` | BOOLEAN | YES | false | true | Alarm activation state |
| `created_at` | TIMESTAMPTZ | YES | now() | ISO8601 | NTP-synced timestamp |

---

## Status Thresholds

### Database Classification:
- **Safe**: CO < 25 ppm
- **Warning**: CO 25-49 ppm
- **Critical**: CO ≥ 50 ppm

### MOSFET Activation:
- **OFF**: CO ≤ 200 ppm
- **ON**: CO > 200 ppm (activates alarm/ventilation)

---

## Configuration Steps

### Before Uploading Code

1. **Update WiFi credentials** (lines 46-47 in Arduino code):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";        // Replace with your network name
   const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your password
   ```

2. **Verify device exists in Supabase** (already seeded):
   - Your migrations already created device `CO-SAFE-001`
   - Check in Supabase SQL Editor:
   ```sql
   SELECT * FROM devices WHERE device_id = 'CO-SAFE-001';
   ```

3. **Confirm RLS policies are active** (already configured):
   - Anonymous users can INSERT into `co_readings` and `device_commands`
   - This allows Arduino to write without authentication
   - Your schema migrations set this up automatically

---

## Arduino IDE Setup Guide

### Step 1: Install ESP8266 Board Support

1. **Open Arduino IDE**
2. **Go to**: File → Preferences
3. **Find**: "Additional Boards Manager URLs"
4. **Add this URL**:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
5. Click **OK**

### Step 2: Install Board Package

1. **Open Boards Manager**: Tools → Board → Boards Manager
2. **Search for**: `esp8266`
3. **Install**: "ESP8266 by ESP8266 Community" (latest stable version)

### Step 3: Select Your Board

1. **Go to**: Tools → Board → esp8266 → **NodeMCU 1.0 (ESP-12E Module)**
2. **Select COM Port**: Tools → Port → **COMx** (your ESP8266 port)

### Step 4: Verify and Upload

1. Click **✔ Verify** to compile the code
2. Click **→ Upload** to flash the ESP8266

---

## Testing

### Expected Behavior After Flashing

1. **Power-up sequence**:
   - Display shows "Connecting WiFi..."
   - WiFi connects and shows IP address
   - NTP time syncs (or uses fallback)
   - Supabase WebSocket connects
   - Display shows "System Ready, Waiting for session..."

2. **While waiting (IDLE state)**:
   - Display updates CO reading and MOSFET status every second
   - **No data is sent to Supabase** (waiting for START command)
   - Serial Monitor shows connection health checks

3. **When you click "Start" in PWA**:
   - Arduino receives `START_SESSION:uuid` via WebSocket
   - Display shows "Session Started!" with session ID
   - Arduino sends readings every 15 seconds with session_id attached
   - Serial Monitor shows "✅ Data sent successfully: 201"

4. **When you click "Stop" in PWA**:
   - Arduino receives `STOP_SESSION` command
   - Display shows "Session Stopped"
   - Stops sending readings, returns to IDLE state

### Verify Database Writes

Check that readings are linked to sessions:
```sql
SELECT
  r.id,
  r.session_id,
  r.device_id,
  r.co_level,
  r.status,
  r.mosfet_status,
  r.created_at,
  s.started_at AS session_started
FROM co_readings r
LEFT JOIN sessions s ON r.session_id = s.session_id
WHERE r.device_id = 'CO-SAFE-001'
ORDER BY r.created_at DESC
LIMIT 10;
```

### Expected Response Codes

- **201 Created**: Reading successfully saved to database
- **400 Bad Request**: Invalid JSON or missing required field (device_id, co_level)
- **401 Unauthorized**: Wrong API key
- **500 Server Error**: Retries automatically (check Serial Monitor)

---

## Troubleshooting

### Arduino Not Sending Data
**Symptom**: Display shows readings but nothing in database
**Solution**: You must click "Start" in the PWA first! Arduino only sends data when a session is active.

### WebSocket Connection Failed
**Symptom**: Serial Monitor shows "⚠️ WebSocket disconnected"
**Solution**:
- Check WiFi connection stability
- Verify Supabase project is active
- Arduino auto-reconnects every 30 seconds

### WiFi Keeps Reconnecting
**Symptom**: Display shows "WiFi Failed! Retrying..."
**Solution**:
- Check WiFi credentials (ssid/password)
- Ensure 2.4GHz network (ESP8266 doesn't support 5GHz)
- Move closer to router during initial testing
- After 5 failed attempts, Arduino restarts automatically

### NTP Sync Failed
**Symptom**: Serial Monitor shows "⚠️ NTP sync failed"
**Solution**:
- Not critical - Arduino uses millis() fallback
- Check firewall allows UDP port 123
- Arduino retries every 60 seconds

### HTTP 400/401/500 Errors
**Symptom**: Serial Monitor shows "❌ Request failed"
**Solution**:
- **400**: Check JSON payload format, ensure session_id is valid UUID
- **401**: Verify SUPABASE_API_KEY matches your project
- **500**: Arduino retries automatically (up to 3 attempts)

### Session Timeout
**Symptom**: Display shows "Session Timeout Auto-stopped"
**Solution**: Normal behavior after 60 minutes of inactivity. Click "Start" again.

### MOSFET Not Activating
**Symptom**: MOSFET shows OFF when CO > 200 ppm
**Solution**:
- Verify pin D5 (GPIO14) connection
- Check MOSFET wiring (Gate → D5, Source → GND, Drain → Load)
- Test with multimeter

### OLED Display Blank
**Symptom**: Nothing appears on display
**Solution**:
- Verify I2C address 0x3C (scan with I2C scanner sketch)
- Check SDA → D2, SCL → D1 connections
- Ensure 3.3V power supply is stable

---

## What Changed - Enhanced Resilient Version

### New Features vs. Basic Version

1. ✅ **Session Management**
   - Listens for `START_SESSION` / `STOP_SESSION` commands via WebSocket
   - Only sends data when session is active
   - Includes `session_id` in every reading

2. ✅ **Connection Resilience**
   - WiFi reconnection with exponential backoff (max 5 retries)
   - HTTP retry logic (3 attempts) for failed POST requests
   - WebSocket auto-reconnect every 30 seconds if disconnected
   - Auto-restart after max retry failures

3. ✅ **Time Synchronization**
   - NTP client syncs time from `pool.ntp.org`
   - Sends ISO8601 timestamps (`created_at`) with readings
   - Falls back to `millis()` if NTP unavailable

4. ✅ **Power Management**
   - Optional deep sleep mode (configurable, disabled by default)
   - Session timeout (60 minutes) to prevent battery drain
   - Heartbeat monitoring to detect inactive sessions

5. ✅ **Production Reliability**
   - Comprehensive error handling and logging
   - Serial Monitor shows emoji status indicators (✅, ⚠️, ❌)
   - Connection health checks (WiFi every 10s, WebSocket every 30s)
   - Command acknowledgment with retry logic

6. ✅ **Schema Compliance**
   - Payload matches `co_readings` table exactly
   - Includes all optional fields (`session_id`, `created_at`, `mosfet_status`)
   - Compatible with PWA session tracking

### Core Hardware Logic Unchanged
- Pin assignments (A0, D5, I2C) match verified hardware
- CO thresholds (25/50/200 ppm) unchanged
- MOSFET control logic identical
- OLED display code unchanged

---

## Hardware Verification Details

### Confirmed Components
1. **Microcontroller:** ESP8266 NodeMCU 1.0 (ESP-12E module)
2. **CO Sensor:** Flying Fish MQ7 module (blue PCB, 4-pin: VCC/GND/D_OUT/A_OUT)
3. **MOSFET:** IRLZ44N N-channel logic-level MOSFET
4. **Display:** SSD1306 OLED 128x64, I2C address 0x3C
5. **Power:** USB 5V recommended

### Flying Fish MQ7 Module Specifications

**Model:** Blue PCB breakout board with 4-pin configuration
**Pins:** VCC, GND, D_OUT, A_OUT
**Variants:** Some versions include onboard 5V→3.3V level shifter on A_OUT

**Specifications:**
- Operating voltage: 5V
- Heater resistance: 33Ω ± 5%
- Detection range: 20-2000 ppm CO
- Warm-up time: 24-48 hours for stable readings

**⚠️ Important:** Not all Flying Fish modules include voltage dividers. Always measure A_OUT voltage before connecting to ESP8266.

### Pre-Deployment Voltage Safety Test

**CRITICAL: Perform BEFORE first power-up**

1. **Measure MQ7 A_OUT voltage:**
   - Set multimeter to DC voltage mode
   - Probe: MQ7 A_OUT pin to GND
   - Expected safe range: 0-1V
   - **If > 1V:** See voltage divider instructions below

2. **Monitor for voltage damage symptoms:**
   - All zero readings from A0
   - Maximum value readings (1023) constantly
   - Erratic sensor behavior

3. **If voltage exceeds 1V**, add voltage divider:
   ```
   MQ7 A_OUT ──┬─── [R1: 270kΩ] ─── A0 (ESP8266)
               │
               └─── [R2: 100kΩ] ─── GND

   Output voltage = V_in × (R2 / (R1 + R2))
                  = 5V × (100k / 370k)
                  = 1.35V (safe for ESP8266)
   ```

4. **If voltage divider is added**, update ADC mapping in code:
   ```cpp
   // WITHOUT divider (current code):
   co_ppm = map(analogValue, 0, 1023, 0, 1000);

   // WITH divider (if added):
   // Compensate for voltage division ratio (0.27)
   float voltage = analogValue * (1.0 / 1023.0);  // 0-1V
   float original_voltage = voltage / 0.27;        // Scale back to 0-5V equivalent
   co_ppm = map(original_voltage * 1023, 0, 1023, 0, 1000);
   ```

### MOSFET Activation Test

1. Breathe gently on MQ7 sensor (increases CO reading)
2. Watch Serial Monitor for CO level increase
3. MOSFET should activate (D5 goes HIGH) when CO > 200 ppm
4. Verify alarm/ventilation device triggers
5. MOSFET should deactivate when CO drops below threshold

### Pin Migration History

**Legacy ESP32 Code (Incorrect for ESP8266):**
```cpp
#define MQ7_PIN 34        // ❌ ESP32 pin (doesn't exist on ESP8266)
#define MOSFET_PIN 26     // ❌ ESP32 pin (doesn't exist on ESP8266)
```

**Current ESP8266 Code (Correct):**
```cpp
#define MQ7_PIN A0        // ✅ ESP8266 analog pin (verified)
#define MOSFET_PIN D5     // ✅ GPIO14 (verified with hardware)
```

---

## Safety Considerations

⚠️ **Important Safety Notes**:

1. **CO Detection**: This is a prototype system. For safety-critical applications, use certified CO detectors
2. **Calibration**: MQ7 sensors require proper calibration for accurate readings
3. **Sensor Warm-up**: MQ7 sensors need 24-48 hours of initial warm-up for stable readings
4. **Ventilation**: Always ensure proper ventilation in vehicles
5. **Power Supply**: Use appropriate power supply ratings for the ESP8266 and connected devices
6. **MOSFET Rating**: Ensure IRLZ44N can handle the load current of connected devices
7. **Flammable Gas Testing**: Test in well-ventilated areas only. MQ7 sensors can heat up during operation.

---

## Quick Start Checklist

- [ ] Install all required libraries in Arduino IDE
- [ ] Update WiFi credentials in code (lines 46-47)
- [ ] Verify device `CO-SAFE-001` exists in Supabase
- [ ] Flash code to ESP8266 NodeMCU
- [ ] Open Serial Monitor (115200 baud) to watch connection
- [ ] Wait for "System Ready" message on OLED
- [ ] Click green "Start" button in PWA Dashboard
- [ ] Watch Serial Monitor for "✅ Data sent successfully: 201"
- [ ] Check Supabase table for new readings with `session_id`

---

**Last Updated**: January 2025
**Code Version**: Enhanced Resilient v2.0
**Platform**: ESP8266 (NodeMCU 1.0 ESP-12E)
**IDE**: Arduino IDE 1.8.x or 2.x
**Database**: Supabase PostgreSQL
**Schema**: Session-aware with `co_readings`, `sessions`, `device_commands`
**Realtime**: Supabase WebSocket (ESPSupabase library)
