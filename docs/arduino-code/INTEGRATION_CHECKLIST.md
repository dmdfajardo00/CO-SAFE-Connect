# WebSocket Handler Integration Checklist

## ✅ Pre-Integration Checklist

### Hardware Setup
- [ ] ESP8266 NodeMCU board connected
- [ ] MQ7 CO sensor wired to A0
- [ ] MOSFET (IRLZ44N) wired to D1
- [ ] OLED display (I2C) connected
- [ ] Power supply stable (5V USB)

### Software Prerequisites
- [ ] Arduino IDE 2.x installed
- [ ] ESP8266 board package installed
- [ ] ESPSupabaseRealtime library installed
- [ ] ArduinoJson library (v7+) installed
- [ ] Adafruit_SSD1306 library installed
- [ ] Adafruit_GFX library installed

### Supabase Configuration
- [ ] Supabase project created (free tier OK)
- [ ] Database schema deployed (see `/docs/migrations/initial-set-up.sql`)
- [ ] Device entry exists in `devices` table (`CO-SAFE-001`)
- [ ] RLS policies allow anonymous INSERT on `co_readings`
- [ ] RLS policies allow anonymous INSERT/UPDATE on `device_commands`
- [ ] Anon key copied from Supabase dashboard

## 📝 Integration Steps

### Step 1: File Setup
- [ ] Create new Arduino sketch folder
- [ ] Copy `websocket_handler.ino` to sketch folder
- [ ] Create main sketch file (e.g., `CO_SAFE_Monitor.ino`)
- [ ] Both files in same directory

**File Structure:**
```
my_sketch/
├── CO_SAFE_Monitor.ino
└── websocket_handler.ino
```

### Step 2: Configure Main Sketch

- [ ] Add required includes:
```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
```

- [ ] Define global variables (required by websocket_handler.ino):
```cpp
const char* SUPABASE_URL = "https://xxx.supabase.co/rest/v1/co_readings";
const char* SUPABASE_API_KEY = "your_anon_key_here";
const char* DEVICE_ID = "CO-SAFE-001";
WiFiClient client;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
```

- [ ] Add WiFi credentials:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### Step 3: Modify setup()

- [ ] Initialize Serial at 115200 baud
- [ ] Initialize OLED display
- [ ] Connect to WiFi (wait for connection)
- [ ] **Call `initializeRealtime()` AFTER WiFi connects**

```cpp
void setup() {
  Serial.begin(115200);
  
  // OLED init
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  
  // WiFi connection
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // ✅ Initialize WebSocket handler
  initializeRealtime();
}
```

### Step 4: Modify loop()

- [ ] **Call `loopRealtime()` as FIRST line in loop()**
- [ ] Read sensor data
- [ ] Check `isMonitoring` before sending data
- [ ] Include `currentSessionId` in payload

```cpp
void loop() {
  // ✅ Process WebSocket messages first
  loopRealtime();
  
  // Read sensor
  float co = readSensor();
  
  // Send data if monitoring
  if (isMonitoring && currentSessionId != "") {
    sendToSupabase(co);
  }
  
  delay(1000);
}
```

### Step 5: Update sendToSupabase()

- [ ] Check `isMonitoring` flag before sending
- [ ] Include `session_id` field in JSON payload

```cpp
void sendToSupabase(float co) {
  // ✅ Check monitoring state
  if (!isMonitoring || currentSessionId == "") {
    Serial.println("Not monitoring - skipping");
    return;
  }
  
  // Build payload with session_id
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                   "\",\"co_level\":" + String(co) +
                   "\",\"session_id\":\"" + currentSessionId + "\"}";
  
  // Send POST request...
}
```

## 🧪 Testing Checklist

### Compile & Upload
- [ ] Code compiles without errors
- [ ] Code compiles without warnings
- [ ] Upload successful (verify in Arduino IDE)
- [ ] Serial Monitor opens at 115200 baud

### Boot Sequence
- [ ] WiFi connects successfully
- [ ] Serial shows: "=== Initializing Supabase Realtime ==="
- [ ] Serial shows: "✅ Realtime WebSocket initialized"
- [ ] OLED displays: "WebSocket Ready"
- [ ] No error messages in Serial Monitor

### WebSocket Connection
- [ ] Check Supabase dashboard → Realtime → Connections
- [ ] Should see active WebSocket connection
- [ ] Connection shows correct project
- [ ] No authentication errors

### Command Reception - START_SESSION
- [ ] Insert test command in Supabase SQL Editor:
```sql
INSERT INTO device_commands (device_id, command)
VALUES ('CO-SAFE-001', 'START_SESSION:550e8400-e29b-41d4-a716-446655440000');
```
- [ ] Serial shows: "=== Command Received ==="
- [ ] Serial shows: "✅ START_SESSION command accepted"
- [ ] Serial shows: "Session ID: 550e8400-e29b-41d4-a716-446655440000"
- [ ] OLED displays: "Session Started!"
- [ ] Database: `executed` column becomes `true`

### Data Transmission
- [ ] Wait 15 seconds after START_SESSION
- [ ] Serial shows: "Sending: {device_id:...}"
- [ ] Serial shows: "HTTP Response: 201"
- [ ] Check Supabase dashboard → Table Editor → co_readings
- [ ] New row appears with correct session_id
- [ ] `co_level`, `status`, `mosfet_status` fields populated

### Command Reception - STOP_SESSION
- [ ] Insert stop command in Supabase SQL Editor:
```sql
INSERT INTO device_commands (device_id, command)
VALUES ('CO-SAFE-001', 'STOP_SESSION');
```
- [ ] Serial shows: "✅ STOP_SESSION command accepted"
- [ ] Serial shows: "Monitoring: INACTIVE"
- [ ] OLED displays: "Session Stopped"
- [ ] Database: `executed` column becomes `true`
- [ ] Wait 15 seconds
- [ ] Serial shows: "Not monitoring - skipping send"
- [ ] No new rows in `co_readings` table

### Reconnection Logic
- [ ] Disconnect WiFi router temporarily
- [ ] Serial shows: "⚠️ WebSocket disconnected"
- [ ] Reconnect WiFi router
- [ ] Serial shows: "✅ WebSocket reconnected"
- [ ] Send START_SESSION command
- [ ] Command received and processed correctly

## 🐛 Troubleshooting Guide

### Issue: WebSocket Not Connecting

**Symptoms:**
- No "Realtime initialized" message
- No WebSocket connection in Supabase dashboard

**Checks:**
- [ ] WiFi connected before calling `initializeRealtime()`?
- [ ] Check Serial Monitor for error messages
- [ ] Verify SUPABASE_URL format: `https://xxx.supabase.co` (no `/rest/v1`)
- [ ] Verify SUPABASE_API_KEY is correct anon key
- [ ] Check Supabase project is active (not paused)

**Debug:**
```cpp
void setup() {
  // After WiFi connects
  Serial.print("WiFi Status: ");
  Serial.println(WiFi.status());
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  initializeRealtime();
  delay(5000); // Wait and check output
}
```

---

### Issue: Commands Not Received

**Symptoms:**
- INSERT into device_commands but Arduino shows nothing
- No "Command Received" in Serial

**Checks:**
- [ ] `loopRealtime()` called in main loop?
- [ ] Device ID matches: `CO-SAFE-001`?
- [ ] Check Supabase Realtime logs for errors
- [ ] Verify RLS policies allow INSERT on device_commands

**Debug:**
```cpp
void loop() {
  Serial.println("loopRealtime() called");
  loopRealtime();
  delay(5000);
}
```

---

### Issue: Commands Received But Not Acknowledged

**Symptoms:**
- Arduino shows "Command Received"
- But `executed` stays `false` in database

**Checks:**
- [ ] RLS policy allows UPDATE on device_commands?
- [ ] Check HTTP response code in Serial (should be 200-299)
- [ ] Verify Supabase URL is correct

**Debug:**
Add to `markCommandExecuted()` in websocket_handler.ino:
```cpp
Serial.print("PATCH URL: ");
Serial.println(url);
Serial.print("HTTP Response: ");
Serial.println(httpResponseCode);
Serial.println(http.getString());
```

---

### Issue: Session Not Starting

**Symptoms:**
- Command received
- But `isMonitoring` stays `false`

**Checks:**
- [ ] UUID format correct? (36 characters: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- [ ] Command format: `START_SESSION:uuid` (case-sensitive)?
- [ ] Check Serial for validation errors

**Debug:**
```cpp
void handleDeviceCommand(String payload) {
  // Add after parsing command
  Serial.print("Command: ");
  Serial.println(command);
  Serial.print("Command length: ");
  Serial.println(command.length());
  if (command.startsWith("START_SESSION:")) {
    String uuid = command.substring(14);
    Serial.print("UUID: ");
    Serial.println(uuid);
    Serial.print("UUID length: ");
    Serial.println(uuid.length());
  }
}
```

---

### Issue: Data Not Sending

**Symptoms:**
- `isMonitoring = true`
- But no POST requests in Serial

**Checks:**
- [ ] `currentSessionId` is not empty?
- [ ] Check `sendInterval` hasn't passed?
- [ ] WiFi still connected?

**Debug:**
```cpp
void loop() {
  loopRealtime();
  
  if (millis() - lastSend > sendInterval) {
    Serial.println("--- Send Check ---");
    Serial.print("isMonitoring: ");
    Serial.println(isMonitoring);
    Serial.print("currentSessionId: ");
    Serial.println(currentSessionId);
    Serial.print("currentSessionId.length(): ");
    Serial.println(currentSessionId.length());
    
    sendToSupabase(co);
    lastSend = millis();
  }
}
```

---

### Issue: Compilation Errors

**Error:** `'initializeRealtime' was not declared in this scope`

**Solution:**
- [ ] Ensure `websocket_handler.ino` is in same folder as main sketch
- [ ] Restart Arduino IDE (to detect new file)

**Error:** `ESPSupabaseRealtime.h: No such file or directory`

**Solution:**
- [ ] Install library: Tools → Manage Libraries → Search "ESPSupabaseRealtime"

**Error:** `'class Adafruit_SSD1306' has no member named 'display'`

**Solution:**
- [ ] Update Adafruit_SSD1306 library to latest version

---

### Issue: Memory/Crash Issues

**Symptoms:**
- ESP8266 resets randomly
- Serial shows "Exception" or "Soft WDT reset"

**Checks:**
- [ ] Check free heap: `Serial.println(ESP.getFreeHeap());`
- [ ] Should be > 20000 bytes
- [ ] Reduce JSON document size if needed

**Debug:**
```cpp
void loop() {
  Serial.print("Free heap: ");
  Serial.println(ESP.getFreeHeap());
  loopRealtime();
  delay(5000);
}
```

## 📊 Expected Serial Output

### Successful Boot
```
Connecting WiFi...
.....
WiFi connected!
IP: 192.168.1.100
=== Initializing Supabase Realtime ===
Supabase URL: https://xxx.supabase.co
Device ID: CO-SAFE-001
Registered listener: device_commands [INSERT] with filter: device_id=eq.CO-SAFE-001
✅ Realtime WebSocket initialized
Waiting for commands from PWA app...
```

### Successful START_SESSION
```
=== Command Received ===
Raw payload: {"table":"device_commands","type":"INSERT","record":{...}}
Command ID: 123
Device ID: CO-SAFE-001
Command: START_SESSION:550e8400-e29b-41d4-a716-446655440000
✅ START_SESSION command accepted
Session ID: 550e8400-e29b-41d4-a716-446655440000
Monitoring: ACTIVE
Marking command 123 as executed...
✅ Command 123 marked executed (HTTP 204)
=== End Command Handler ===
```

### Successful Data Send
```
Sending: {"device_id":"CO-SAFE-001","co_level":42.5,"status":"warning","mosfet_status":false,"session_id":"550e8400-e29b-41d4-a716-446655440000"}
HTTP Response: 201
```

### Successful STOP_SESSION
```
=== Command Received ===
Command: STOP_SESSION
✅ STOP_SESSION command accepted
Stopping session: 550e8400-e29b-41d4-a716-446655440000
Monitoring: INACTIVE
✅ Command 456 marked executed (HTTP 204)
=== End Command Handler ===
Not monitoring - skipping send
```

## 🎯 Final Validation

### Complete System Test
- [ ] Flash Arduino with integrated code
- [ ] Boot sequence shows no errors
- [ ] WebSocket connects successfully
- [ ] PWA app can start monitoring session
- [ ] Arduino receives START_SESSION command
- [ ] Arduino sends data with session_id
- [ ] Data appears in PWA dashboard
- [ ] PWA app can stop monitoring session
- [ ] Arduino receives STOP_SESSION command
- [ ] Arduino stops sending data
- [ ] Commands marked as executed in database

### Production Readiness
- [ ] All debug Serial.println() statements removed (or commented)
- [ ] WiFi credentials match production network
- [ ] Device ID matches production database
- [ ] Supabase URL/key match production project
- [ ] Sensor calibration completed
- [ ] MOSFET alarm tested
- [ ] OLED display readable
- [ ] Power supply stable under load
- [ ] Enclosure protects hardware

## 📚 Documentation References

- **Quick Reference:** `/docs/arduino-code/QUICK_REFERENCE.md`
- **Integration Guide:** `/docs/arduino-code/WEBSOCKET_INTEGRATION_GUIDE.md`
- **Hardware Setup:** `/docs/arduino-code/arduino-code-final.md`
- **Database Schema:** `/docs/migrations/initial-set-up.sql`

## ✅ Completion

Once all items are checked:
- [ ] Take backup of working code
- [ ] Document any custom modifications
- [ ] Update version number in comments
- [ ] Commit to repository (if using version control)

**Integration completed successfully!** 🎉

---

**Last Updated:** 2025-11-11
**Version:** 2.0
