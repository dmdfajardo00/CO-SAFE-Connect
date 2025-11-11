# WebSocket Handler Module Architecture

## 📦 Module Structure

```
websocket_handler.ino
│
├─ EXTERNAL DEPENDENCIES (must be defined in main sketch)
│  ├─ const char* SUPABASE_URL
│  ├─ const char* SUPABASE_API_KEY
│  ├─ const char* DEVICE_ID
│  ├─ WiFiClient client
│  └─ Adafruit_SSD1306 display
│
├─ MODULE GLOBALS (accessible from main sketch)
│  ├─ SupabaseRealtime realtime
│  ├─ String currentSessionId
│  ├─ bool isMonitoring
│  ├─ bool realtimeConnected
│  ├─ unsigned long lastReconnectAttempt
│  └─ const unsigned long RECONNECT_INTERVAL
│
├─ PUBLIC API FUNCTIONS
│  ├─ initializeRealtime()        → Call in setup()
│  ├─ loopRealtime()              → Call in loop()
│  ├─ isCurrentlyMonitoring()     → Status check
│  ├─ getCurrentSessionId()       → Get session UUID
│  └─ isRealtimeConnected()       → Connection status
│
└─ INTERNAL FUNCTIONS (private)
   ├─ handleDeviceCommand()       → WebSocket callback
   ├─ markCommandExecuted()       → REST API acknowledgment
   ├─ reconnectRealtime()         → Auto-reconnection logic
   └─ displaySessionStatus()      → OLED display helper
```

## 🔄 Function Call Flow

### Initialization Flow (setup)

```
main sketch setup()
    ↓
WiFi.begin()
    ↓
while (WiFi.status() != WL_CONNECTED)
    ↓
initializeRealtime()
    ├─ Extract base URL from SUPABASE_URL
    ├─ realtime.begin(url, key, handleDeviceCommand)
    ├─ Build filter: "device_id=eq.CO-SAFE-001"
    ├─ realtime.addChangesListener("device_commands", "INSERT", "public", filter)
    ├─ realtime.listen()  ← Start WebSocket
    ├─ Set realtimeConnected = true
    └─ displaySessionStatus("WebSocket Ready")
```

### Main Loop Flow (loop)

```
main sketch loop()
    ↓
loopRealtime()
    ├─ realtime.loop()  ← Process WebSocket messages
    │  └─ Triggers handleDeviceCommand() when command received
    └─ Check reconnection timer
       └─ reconnectRealtime() if disconnected
    ↓
readSensor()
    ↓
if (isMonitoring && currentSessionId != "")
    ↓
sendToSupabase()
```

### Command Handling Flow (callback)

```
Supabase INSERT → WebSocket Event → handleDeviceCommand(payload)
    ↓
deserializeJson(doc, payload)
    ↓
Extract: record.command, record.id
    ↓
if (command.startsWith("START_SESSION:"))
    ├─ Extract UUID: command.substring(14)
    ├─ Validate UUID length == 36
    ├─ Set isMonitoring = true
    ├─ Set currentSessionId = uuid
    ├─ displaySessionStatus("Session Started!")
    └─ markCommandExecuted(commandId)
        └─ PATCH /device_commands?id=eq.{commandId}
            └─ {executed: true, executed_at: timestamp}
    ↓
else if (command == "STOP_SESSION")
    ├─ Set isMonitoring = false
    ├─ Clear currentSessionId = ""
    ├─ displaySessionStatus("Session Stopped")
    └─ markCommandExecuted(commandId)
```

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                            │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Table: device_commands                     │  │
│  │  ┌─────┬────────────┬─────────────────────┬──────────┐ │  │
│  │  │ id  │ device_id  │ command             │ executed │ │  │
│  │  ├─────┼────────────┼─────────────────────┼──────────┤ │  │
│  │  │ 123 │ CO-SAFE-001│ START_SESSION:uuid  │ false    │ │  │
│  │  └─────┴────────────┴─────────────────────┴──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ INSERT detected                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Realtime Server (WebSocket)                           │  │
│  │  Broadcasts to subscribed clients                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ WebSocket message
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   ESP8266 ARDUINO                            │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  websocket_handler.ino                                 │  │
│  │                                                         │  │
│  │  SupabaseRealtime.loop()                               │  │
│  │         │                                               │  │
│  │         ▼                                               │  │
│  │  handleDeviceCommand(payload)                          │  │
│  │         │                                               │  │
│  │         ├─ Parse JSON                                   │  │
│  │         ├─ Extract command & id                         │  │
│  │         ├─ Validate command                             │  │
│  │         │                                               │  │
│  │         ├─ if START_SESSION:                            │  │
│  │         │     ├─ currentSessionId = uuid                │  │
│  │         │     └─ isMonitoring = true                    │  │
│  │         │                                               │  │
│  │         └─ markCommandExecuted(id)                      │  │
│  │                  │                                      │  │
│  └──────────────────┼──────────────────────────────────────┘  │
│                     │                                         │
│                     │ PATCH request                           │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  main sketch (CO_SAFE_Monitor.ino)                     │  │
│  │                                                         │  │
│  │  if (isMonitoring && currentSessionId != "")           │  │
│  │      sendToSupabase(co, session_id)                    │  │
│  │                                                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────────┘
                      │
                      │ POST request
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                            │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  REST API: /rest/v1/device_commands?id=eq.123          │  │
│  │  PATCH {executed: true, executed_at: timestamp}        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  REST API: /rest/v1/co_readings                        │  │
│  │  POST {device_id, co_level, status, session_id}       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Integration Points

### Point 1: Global Variables (Compile-Time)

The module needs these variables to be defined **before** inclusion:

```cpp
// In main sketch (before websocket_handler.ino is included)
const char* SUPABASE_URL = "https://xxx.supabase.co/rest/v1/co_readings";
const char* SUPABASE_API_KEY = "your_anon_key";
const char* DEVICE_ID = "CO-SAFE-001";
WiFiClient client;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
```

### Point 2: Initialization (setup)

The module provides `initializeRealtime()` which must be called **after WiFi connects**:

```cpp
void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  // ✅ Integration Point 2
  initializeRealtime();
}
```

### Point 3: Message Processing (loop)

The module provides `loopRealtime()` which must be called **first in loop**:

```cpp
void loop() {
  // ✅ Integration Point 3
  loopRealtime();
  
  // ... rest of your code ...
}
```

### Point 4: State Access (runtime)

The module exposes these variables for runtime access:

```cpp
void loop() {
  loopRealtime();
  
  // ✅ Integration Point 4
  if (isMonitoring && currentSessionId != "") {
    sendData();
  }
}
```

### Point 5: Helper Functions (runtime)

The module provides utility functions:

```cpp
void displayStatus() {
  // ✅ Integration Point 5
  bool monitoring = isCurrentlyMonitoring();
  String sessionId = getCurrentSessionId();
  bool connected = isRealtimeConnected();
  
  Serial.print("Monitoring: ");
  Serial.println(monitoring);
  Serial.print("Session: ");
  Serial.println(sessionId);
  Serial.print("Connected: ");
  Serial.println(connected);
}
```

## 🧩 Module Dependencies

### Arduino Core Libraries
```
ESP8266WiFi.h          ← WiFi connectivity
ESP8266HTTPClient.h    ← REST API calls
Wire.h                 ← I2C communication (OLED)
```

### External Libraries (must install)
```
ESPSupabaseRealtime.h  ← WebSocket client
ArduinoJson.h          ← JSON parsing
Adafruit_GFX.h         ← Graphics library
Adafruit_SSD1306.h     ← OLED display driver
```

### Module-Provided Exports
```
// Global variables
extern String currentSessionId;
extern bool isMonitoring;
extern bool realtimeConnected;

// Public functions
void initializeRealtime();
void loopRealtime();
bool isCurrentlyMonitoring();
String getCurrentSessionId();
bool isRealtimeConnected();
```

## 📏 Memory Footprint

### Stack Usage (approximate)
- `SupabaseRealtime` object: ~200 bytes
- `currentSessionId` (String): ~50 bytes (36 chars + overhead)
- WebSocket buffer: ~2 KB (managed by library)
- JSON parsing buffer: ~512 bytes (JsonDocument)

**Total:** ~3 KB (safe for ESP8266's 80 KB RAM)

### Heap Usage (runtime)
- WebSocket connection: ~4 KB
- HTTP client (temporary): ~2 KB during requests
- JSON deserialization: ~512 bytes during parsing

**Peak:** ~7 KB (leaves ~20 KB for main sketch)

## 🔒 Thread Safety

**Note:** ESP8266 is single-threaded, but these considerations apply:

1. **No Blocking in Callbacks**
   - `handleDeviceCommand()` runs synchronously
   - Keep processing fast (<100ms)
   - Don't call `delay()` in callback

2. **State Variables**
   - `isMonitoring` and `currentSessionId` are shared
   - Modified by callback, read by main loop
   - No mutex needed (single-threaded)

3. **HTTP Requests**
   - `markCommandExecuted()` blocks during HTTP call
   - WebSocket messages queued during blocking
   - Consider async HTTP for production

## 🛡️ Error Handling

### Module Error States

| Error Condition | Handler | Recovery |
|----------------|---------|----------|
| WiFi disconnected | `loopRealtime()` | Waits for WiFi reconnect |
| WebSocket closed | `reconnectRealtime()` | Auto-reconnects every 5s |
| Invalid JSON | `handleDeviceCommand()` | Logs error, continues |
| Invalid UUID | `handleDeviceCommand()` | Rejects command, continues |
| HTTP failure | `markCommandExecuted()` | Logs error, continues |
| Unknown command | `handleDeviceCommand()` | Logs warning, continues |

### Error Propagation

The module **does not propagate errors** to the main sketch. All errors are:
1. Logged to Serial
2. Handled internally
3. Recovered automatically (where possible)

### Manual Error Checking

```cpp
void loop() {
  loopRealtime();
  
  // Check connection status
  if (!isRealtimeConnected()) {
    Serial.println("⚠️ WebSocket disconnected");
    // Optionally notify user via OLED
  }
  
  // Check monitoring status
  if (isMonitoring && currentSessionId.length() != 36) {
    Serial.println("⚠️ Invalid session ID");
    isMonitoring = false;
  }
}
```

## 📈 Performance Characteristics

### WebSocket Latency
- **Command delivery:** <500ms (typical)
- **Acknowledgment:** <1s (HTTP PATCH)
- **Data send:** 15s interval (configurable)

### CPU Usage
- **Idle:** <1% (WebSocket keep-alive)
- **Processing command:** <10% (<100ms burst)
- **Sending data:** <5% (HTTP POST ~200ms)

### Network Traffic
- **WebSocket:** ~1 KB/min (keep-alive)
- **Command received:** ~500 bytes
- **Data sent:** ~300 bytes every 15s
- **Command ack:** ~200 bytes

**Monthly estimate:** ~1 MB/month (well within ESP8266 limits)

## 🔄 State Machine

```
┌─────────────┐
│   STARTUP   │
└──────┬──────┘
       │ initializeRealtime()
       ▼
┌─────────────┐
│   IDLE      │ ← isMonitoring = false
│ (Listening) │    currentSessionId = ""
└──────┬──────┘
       │ START_SESSION received
       ▼
┌─────────────┐
│ MONITORING  │ ← isMonitoring = true
│  (Active)   │    currentSessionId = "uuid"
└──────┬──────┘
       │ STOP_SESSION received
       ▼
┌─────────────┐
│   IDLE      │
│ (Listening) │
└─────────────┘

   At any point:
   WebSocket disconnect → RECONNECTING state
   WiFi disconnect → Wait for reconnect
```

## 🎯 Design Decisions

### Why Module Pattern?
- **Separation of concerns:** WebSocket logic isolated
- **Reusability:** Can be used in other ESP8266 projects
- **Testability:** Module can be tested independently
- **Maintainability:** Changes don't affect main sketch

### Why Global Variables?
- **Arduino limitations:** No true module system
- **Performance:** Direct access, no function call overhead
- **Simplicity:** Easier for Arduino developers to understand

### Why Callback Pattern?
- **Library requirement:** ESPSupabaseRealtime uses callbacks
- **Async design:** Don't block main loop waiting for commands
- **Event-driven:** Natural fit for WebSocket messages

### Why Auto-Reconnection?
- **Robustness:** WiFi/WebSocket drops are common
- **User experience:** Device shouldn't require manual reset
- **Reliability:** Production devices need self-healing

## 📚 Related Documentation

- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - API quick reference
- [WEBSOCKET_INTEGRATION_GUIDE.md](./WEBSOCKET_INTEGRATION_GUIDE.md) - Full integration guide
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - Step-by-step checklist
- [README.md](./README.md) - Overview and getting started

---

**Last Updated:** 2025-11-11
**Module Version:** 1.0
**Compatible With:** ESP8266 Arduino Core 3.x
