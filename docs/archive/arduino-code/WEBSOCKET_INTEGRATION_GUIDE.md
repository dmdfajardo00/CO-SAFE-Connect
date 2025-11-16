# WebSocket Handler Integration Guide

## Overview

The `websocket_handler.ino` module provides complete WebSocket/Realtime functionality for the CO-SAFE Monitor using the ESPSupabaseRealtime library. This guide shows how to integrate it into your main Arduino sketch.

## Prerequisites

### Required Libraries
Install these libraries via Arduino Library Manager:

1. **ESPSupabaseRealtime** (by RoboKoding)
   - `Sketch → Include Library → Manage Libraries → Search "ESPSupabaseRealtime"`

2. **ArduinoJson** (v7.0+)
   - `Sketch → Include Library → Manage Libraries → Search "ArduinoJson"`

3. **ESP8266WiFi** (built-in with ESP8266 board package)

4. **ESP8266HTTPClient** (built-in with ESP8266 board package)

5. **Adafruit_SSD1306** (for OLED display)

## Integration Steps

### Step 1: File Structure

Place files in the same directory:
```
arduino-code/
├── CO_SAFE_Monitor.ino           ← Your main sketch
└── websocket_handler.ino          ← WebSocket module (auto-included)
```

**Note:** Arduino IDE automatically includes all `.ino` files in the same folder.

### Step 2: Main Sketch Setup

Here's a complete example integrating the WebSocket handler:

```cpp
/*
 * CO-SAFE Monitor - Main Sketch with WebSocket Support
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ====== OLED SETUP ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== PIN DEFINITIONS ======
#define MQ7_PIN A0        // ESP8266 analog pin
#define MOSFET_PIN D1     // GPIO5

// ====== WIFI CREDENTIALS ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE CONFIGURATION ======
// IMPORTANT: These must be global for websocket_handler.ino to access
const char* SUPABASE_URL = "https://naadaumxaglqzucacexb.supabase.co/rest/v1/co_readings";
const char* SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Your anon key
const char* DEVICE_ID = "CO-SAFE-001";
WiFiClient client;  // Global WiFi client for HTTP requests

// ====== SENSOR VARIABLES ======
float co_ppm = 0;
unsigned long lastSend = 0;
const unsigned long sendInterval = 15000;  // 15 seconds

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);

  // Initialize OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.display();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WiFi Connected!");
  display.print("IP: ");
  display.println(WiFi.localIP());
  display.display();
  delay(2000);

  // ====== INITIALIZE WEBSOCKET HANDLER ======
  // This function is defined in websocket_handler.ino
  initializeRealtime();
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  // ====== PROCESS WEBSOCKET MESSAGES ======
  // This maintains WebSocket connection and triggers callbacks
  loopRealtime();

  // ====== READ CO SENSOR ======
  int analogValue = analogRead(MQ7_PIN);
  co_ppm = map(analogValue, 0, 1023, 0, 1000);  // ESP8266 uses 10-bit ADC

  // ====== CONTROL MOSFET ALARM ======
  if (co_ppm > 200) {
    digitalWrite(MOSFET_PIN, HIGH);  // Activate alarm
  } else {
    digitalWrite(MOSFET_PIN, LOW);   // Deactivate alarm
  }

  // ====== UPDATE OLED DISPLAY ======
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("CO: ");
  display.print(co_ppm);
  display.println(" ppm");

  display.print("MOSFET: ");
  display.println(digitalRead(MOSFET_PIN) ? "ON" : "OFF");

  // Show session status (variables from websocket_handler.ino)
  display.print("Session: ");
  if (isMonitoring && currentSessionId != "") {
    display.println(currentSessionId.substring(0, 8) + "...");
  } else {
    display.println("IDLE");
  }

  display.display();

  // ====== SEND DATA TO SUPABASE ======
  // Only sends if actively monitoring a session
  if (millis() - lastSend > sendInterval) {
    sendToSupabase(co_ppm, digitalRead(MOSFET_PIN));
    lastSend = millis();
  }

  delay(1000);
}

// ============================================================================
// SUPABASE DATA TRANSMISSION
// ============================================================================

void sendToSupabase(float co, int mosfetStatus) {
  // Check if monitoring is active (variable from websocket_handler.ino)
  if (!isMonitoring || currentSessionId == "") {
    Serial.println("Not monitoring - skipping send");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  HTTPClient http;
  http.begin(client, SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_API_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);

  // Determine status based on CO level
  String status;
  if (co >= 50) {
    status = "critical";
  } else if (co >= 25) {
    status = "warning";
  } else {
    status = "safe";
  }

  // Build JSON payload with session_id
  String mosfetBool = (mosfetStatus == 1) ? "true" : "false";
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                   "\",\"co_level\":" + String(co) +
                   ",\"status\":\"" + status +
                   "\",\"mosfet_status\":" + mosfetBool +
                   ",\"session_id\":\"" + currentSessionId + "\"}";

  Serial.print("Sending: ");
  Serial.println(payload);

  int httpResponseCode = http.POST(payload);
  Serial.print("HTTP Response: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
}
```

## Module API Reference

### Functions Available from websocket_handler.ino

#### `void initializeRealtime()`
**Must be called in `setup()` after WiFi is connected.**

Initializes the WebSocket connection to Supabase Realtime and registers a listener for the `device_commands` table.

**Example:**
```cpp
void setup() {
  // ... WiFi setup ...
  initializeRealtime();
}
```

---

#### `void loopRealtime()`
**Must be called in `loop()` to maintain WebSocket connection.**

Processes incoming WebSocket messages and handles automatic reconnection.

**Example:**
```cpp
void loop() {
  loopRealtime();  // Call first in loop
  // ... your other code ...
}
```

---

#### `bool isCurrentlyMonitoring()`
**Returns:** `true` if device is actively monitoring a session.

**Example:**
```cpp
if (isCurrentlyMonitoring()) {
  Serial.println("Monitoring active!");
}
```

---

#### `String getCurrentSessionId()`
**Returns:** Current session UUID or empty string if not monitoring.

**Example:**
```cpp
String sessionId = getCurrentSessionId();
if (sessionId.length() > 0) {
  Serial.println("Session: " + sessionId);
}
```

---

#### `bool isRealtimeConnected()`
**Returns:** `true` if WebSocket connection is active.

**Example:**
```cpp
if (isRealtimeConnected()) {
  Serial.println("WebSocket connected");
}
```

---

### Global Variables Available

These variables are defined in `websocket_handler.ino` and accessible from your main sketch:

```cpp
extern String currentSessionId;  // Current session UUID
extern bool isMonitoring;        // Monitoring state flag
extern bool realtimeConnected;   // WebSocket connection status
```

**Example:**
```cpp
void loop() {
  if (isMonitoring) {
    Serial.println("Active session: " + currentSessionId);
  }
}
```

## Command Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PWA APP                                  │
│  User clicks "Start Monitoring" → Generates UUID                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    INSERT INTO device_commands
                    {
                      device_id: "CO-SAFE-001",
                      command: "START_SESSION:uuid",
                      executed: false
                    }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE REALTIME                              │
│  Postgres Changes → WebSocket Broadcast                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ESP8266 ARDUINO                              │
│  realtime.loop() triggers handleDeviceCommand()                  │
│  ├─ Parse command: "START_SESSION:uuid"                          │
│  ├─ Set isMonitoring = true                                      │
│  ├─ Set currentSessionId = "uuid"                                │
│  └─ Call markCommandExecuted(commandId)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    PATCH /device_commands?id=eq.123
                    {
                      executed: true,
                      executed_at: "timestamp"
                    }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN LOOP                                   │
│  sendToSupabase() checks isMonitoring                            │
│  ├─ If true: POST to /co_readings with session_id               │
│  └─ If false: Skip sending                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Payload Examples

### Incoming WebSocket Payload (from Supabase Realtime)

When a command is inserted into `device_commands`, the Arduino receives:

```json
{
  "table": "device_commands",
  "type": "INSERT",
  "record": {
    "id": 123,
    "device_id": "CO-SAFE-001",
    "command": "START_SESSION:550e8400-e29b-41d4-a716-446655440000",
    "executed": false,
    "executed_at": null,
    "created_at": "2025-11-11T12:00:00Z"
  }
}
```

### Outgoing Data Payload (to Supabase REST API)

When monitoring is active, the Arduino sends:

```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "warning",
  "mosfet_status": false,
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Troubleshooting

### WebSocket Not Connecting

**Symptoms:**
- No "WebSocket Ready" message
- Commands not received

**Solutions:**
1. Check Supabase URL format (should be `https://xxx.supabase.co` without `/rest/v1`)
2. Verify anon key is correct
3. Ensure WiFi is connected before calling `initializeRealtime()`
4. Check Serial Monitor for error messages

**Debug Code:**
```cpp
void setup() {
  // ... after WiFi connected ...
  Serial.print("WiFi Status: ");
  Serial.println(WiFi.status());
  initializeRealtime();
  delay(5000); // Wait and check Serial Monitor
}
```

---

### Commands Not Acknowledged

**Symptoms:**
- Commands received but `executed` stays `false` in database

**Solutions:**
1. Check `markCommandExecuted()` HTTP response code
2. Verify RLS policies allow anonymous UPDATE on `device_commands`
3. Ensure `SUPABASE_URL` is correct (module extracts base URL)

**Debug Code:**
```cpp
void markCommandExecuted(int commandId) {
  Serial.println("=== Marking Command Executed ===");
  Serial.print("Command ID: ");
  Serial.println(commandId);
  // ... rest of function ...
}
```

---

### Session Not Starting

**Symptoms:**
- Command received but `isMonitoring` stays `false`

**Solutions:**
1. Check UUID length (must be exactly 36 characters)
2. Verify command format: `START_SESSION:uuid` (case-sensitive)
3. Check Serial Monitor for validation errors

**Debug Code:**
```cpp
void handleDeviceCommand(String payload) {
  Serial.println("Raw payload: " + payload);
  // ... parse command ...
  Serial.println("Command: " + command);
  Serial.println("Command length: " + String(command.length()));
}
```

---

### Data Not Sending

**Symptoms:**
- `isMonitoring = true` but no POST requests

**Solutions:**
1. Verify `sendInterval` hasn't passed
2. Check `sendToSupabase()` is being called
3. Ensure `currentSessionId` is not empty

**Debug Code:**
```cpp
void loop() {
  if (millis() - lastSend > sendInterval) {
    Serial.print("Monitoring: ");
    Serial.println(isMonitoring ? "true" : "false");
    Serial.print("Session ID: ");
    Serial.println(currentSessionId);
    sendToSupabase(co_ppm, digitalRead(MOSFET_PIN));
    lastSend = millis();
  }
}
```

## Best Practices

### 1. Error Handling
Always check connection status before operations:

```cpp
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("WiFi disconnected!");
  // Attempt reconnection
  WiFi.begin(ssid, password);
  return;
}
```

### 2. Watchdog Timer
For production, add a watchdog timer to reset if frozen:

```cpp
#include <Ticker.h>
Ticker watchdog;

void resetDevice() {
  ESP.restart();
}

void setup() {
  watchdog.attach(60, resetDevice);  // Reset after 60s without feed
}

void loop() {
  watchdog.detach();
  watchdog.attach(60, resetDevice);  // Feed watchdog
  // ... rest of code ...
}
```

### 3. Memory Management
Monitor heap to prevent crashes:

```cpp
void loop() {
  Serial.print("Free heap: ");
  Serial.println(ESP.getFreeHeap());
  // ... rest of code ...
}
```

### 4. Command Queue
For high-frequency commands, implement a queue:

```cpp
#include <vector>
std::vector<String> commandQueue;

void handleDeviceCommand(String payload) {
  commandQueue.push_back(payload);
}

void loop() {
  if (!commandQueue.empty()) {
    processCommand(commandQueue.front());
    commandQueue.erase(commandQueue.begin());
  }
}
```

## Testing Checklist

- [ ] WiFi connects successfully
- [ ] WebSocket connection established (check Serial Monitor)
- [ ] OLED shows "WebSocket Ready"
- [ ] PWA can send `START_SESSION` command
- [ ] Arduino receives and parses command correctly
- [ ] `isMonitoring` flag set to `true`
- [ ] `currentSessionId` contains valid UUID
- [ ] Command marked as `executed` in database
- [ ] POST requests include `session_id` in payload
- [ ] PWA can send `STOP_SESSION` command
- [ ] Arduino stops sending data after stop
- [ ] WebSocket reconnects after disconnection

## Next Steps

1. **Flash the integrated code to your ESP8266**
2. **Monitor Serial output** to verify WebSocket connection
3. **Test with PWA app** to confirm command execution
4. **Monitor Supabase dashboard** to verify data flow

## Support

For issues or questions:
- Check Serial Monitor for debug output
- Review Supabase Realtime logs in dashboard
- Verify database RLS policies allow Arduino access
- Ensure all required libraries are installed

## Version History

- **v1.0** - Initial WebSocket handler module
  - ESPSupabaseRealtime integration
  - Session management (START/STOP)
  - Command acknowledgment
  - Auto-reconnection logic
