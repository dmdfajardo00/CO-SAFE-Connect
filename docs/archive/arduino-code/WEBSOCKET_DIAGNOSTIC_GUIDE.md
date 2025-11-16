# WebSocket Diagnostic Guide for ESP8266

## Overview
This guide helps diagnose WebSocket connectivity issues between ESP8266 and Supabase Realtime using a minimal test approach.

**Problem:** ESP8266 connects to WiFi successfully but WebSocket to Supabase disconnects immediately.

**Goal:** Isolate whether the issue is:
- A) WebSocketsClient library configuration
- B) ESP8266 SSL/BearSSL setup
- C) Supabase endpoint configuration
- D) ESPSupabase library wrapper

---

## Prerequisites

### Hardware
- ESP8266 NodeMCU 1.0 (ESP-12E Module)
- USB cable for programming

### Software
- Arduino IDE 1.8.x or 2.x
- ESP8266 Board Support (v3.0.0+)
- WebSocketsClient library by Markus Sattler (v2.3.6+)

### Arduino IDE Settings
```
Board: NodeMCU 1.0 (ESP-12E Module)
CPU Frequency: 160 MHz ← CRITICAL FOR SSL
Upload Speed: 115200
Flash Size: 4MB (FS:2MB OTA:~1019KB)
```

---

## Test Files

### 1. Minimal WebSocket Test
**Location:** `/docs/arduino-code/WebSocket_Minimal_Test.ino`

**Purpose:** Test WebSocketsClient directly without ESPSupabase wrapper

**What it does:**
- Connects to Supabase Realtime WebSocket
- Sends initial join message (required by Phoenix protocol)
- Logs all WebSocket events with timestamps
- Monitors connection health
- Auto-reconnects on failure

**Configuration required:**
```cpp
// Line 27-28
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Line 31-32 (already set for your project)
const char* SUPABASE_PROJECT_REF = "naadaumxaglqzucacexb";
const char* SUPABASE_ANON_KEY = "eyJ..."; // Your anon key
```

---

## Running the Test

### Step 1: Upload Test Code
1. Open `WebSocket_Minimal_Test.ino` in Arduino IDE
2. Update WiFi credentials (lines 27-28)
3. Verify CPU is set to 160 MHz: **Tools → CPU Frequency → 160 MHz**
4. Click **Verify** to compile
5. Click **Upload** to flash ESP8266

### Step 2: Monitor Output
1. Open Serial Monitor: **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. Watch for connection sequence

### Step 3: Interpret Results

---

## Expected Output Scenarios

### ✅ Scenario A: SUCCESS (Library Patched Correctly)

```
========================================
CONNECTING TO SUPABASE WEBSOCKET
========================================
MODE: WSS (SSL/TLS)
Host: naadaumxaglqzucacexb.supabase.co
Port: 443
Path: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
Free Heap Before: 41232 bytes

🔐 Attempting SSL/TLS connection...
Free Heap After: 38456 bytes

⏳ Waiting for connection response...

[WS] ✅ CONNECTED
[WS] URL: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
[WS] Sending join message: {"event":"phx_join","topic":"realtime:*","payload":{},"ref":"1"}

[WS] 📨 RECEIVED TEXT: {"event":"phx_reply","payload":{"response":{},"status":"ok"},"ref":"1"}
[WS] ✅ Received join acknowledgment from Supabase

----------------------------------------
WiFi: ✅ Connected | WebSocket: ✅ Connected | Uptime: 15 s
Reconnect Attempts: 0
----------------------------------------
```

**Diagnosis:**
- ✅ WebSocketsClient library is properly configured
- ✅ BearSSL `setInsecure()` is being called
- ✅ SSL handshake succeeded
- ✅ Supabase Realtime accepted connection

**Next Steps:**
- ESPSupabase library should work with same configuration
- If ESPSupabase still fails, issue is in library wrapper code
- Proceed to integrate session management with ESPSupabase

---

### ❌ Scenario B: IMMEDIATE DISCONNECT (Library Not Patched)

```
========================================
CONNECTING TO SUPABASE WEBSOCKET
========================================
MODE: WSS (SSL/TLS)
Host: naadaumxaglqzucacexb.supabase.co
Port: 443
Path: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
Free Heap Before: 41232 bytes

🔐 Attempting SSL/TLS connection...
Free Heap After: 38456 bytes

⏳ Waiting for connection response...

[WS] ❌ DISCONNECTED
[WS] Connection lasted: 0 ms

[WS] ❌ DISCONNECTED
[WS] Connection lasted: 0 ms

[WS] ❌ DISCONNECTED
[WS] Connection lasted: 0 ms
```

**Diagnosis:**
- ❌ Connection duration = 0 ms (immediate disconnect)
- ❌ SSL handshake failed before WebSocket upgrade
- ❌ BearSSL rejected connection (no certificate validation method configured)

**Root Cause:**
WebSocketsClient library's `beginSSL()` creates `WiFiClientSecure` object but does NOT call `setInsecure()` when fingerprint is NULL. BearSSL requires one of:
1. `setTrustAnchors()` with valid CA certificate
2. `setFingerprint()` with certificate fingerprint
3. `setInsecure()` to skip validation

**Solution:**
Apply the library patch from `/docs/arduino-code/FIX-WebSocketsClient-BearSSL.md`

---

### ⚠️ Scenario C: DELAYED DISCONNECT (SSL Negotiation Issue)

```
🔐 Attempting SSL/TLS connection...

[WS] ✅ CONNECTED
[WS] URL: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
[WS] Sending join message: {"event":"phx_join","topic":"realtime:*","payload":{},"ref":"1"}

[WS] ⚠️ ERROR: SSL handshake timed out

[WS] ❌ DISCONNECTED
[WS] Connection lasted: 3420 ms
```

**Diagnosis:**
- ⚠️ Initial connection succeeded (TCP handshake)
- ⚠️ Disconnect after 1-5 seconds (during SSL negotiation)
- ⚠️ Free heap may be too low for SSL operations

**Possible Causes:**
1. CPU frequency set to 80 MHz (needs 160 MHz)
2. Low free heap (<30KB before connection)
3. WiFi signal too weak causing timeouts

**Solution:**
```cpp
// Check these in Serial output:
CPU Frequency: 160 MHz  ← Must be 160, not 80
Free Heap Before: 41232 bytes  ← Must be >35KB
Signal Strength: -45 dBm  ← Should be >-70 dBm
```

---

### ❌ Scenario D: NO CONNECTION ATTEMPT (WiFi Issue)

```
========================================
CONNECTING TO WIFI
========================================
SSID: YourNetwork
....................
❌ WiFi Connection Failed!

❌ Cannot proceed without WiFi. Halting.
```

**Diagnosis:**
- ❌ WiFi credentials incorrect or network unreachable
- ❌ ESP8266 not getting IP address

**Solution:**
1. Verify WiFi credentials (case-sensitive)
2. Ensure 2.4GHz network (ESP8266 doesn't support 5GHz)
3. Check router MAC filtering / security settings
4. Try different WiFi network for testing

---

## Diagnostic Decision Tree

```
┌─────────────────────────────────────┐
│  Does WiFi connect successfully?    │
└──────────┬────────────────────┬─────┘
           │ NO                 │ YES
           │                    │
           ▼                    ▼
  Fix WiFi credentials    Does WS connect
  or network settings     and stay connected?
                                │
                    ┌───────────┴───────────┐
                    │ NO                    │ YES
                    │                       │
                    ▼                       ▼
         How long does it last?      ✅ SUCCESS
                    │                Library is OK
         ┌──────────┴──────────┐    Use with ESPSupabase
         │                     │
         ▼                     ▼
    0 milliseconds     1-5 seconds
    (immediate)        (delayed)
         │                     │
         ▼                     ▼
  SSL handshake       SSL negotiation
  never started       timeout/failure
         │                     │
         ▼                     ▼
  Library needs       Check CPU freq
  BearSSL patch       (must be 160MHz)
  (setInsecure)       and free heap
```

---

## Comparison: Direct vs ESPSupabase

### Architecture Differences

#### Direct WebSocketsClient (This Test)
```cpp
#include <WebSocketsClient.h>

WebSocketsClient webSocket;

void setup() {
  webSocket.onEvent(webSocketEvent);
  webSocket.beginSSL(host, port, path, NULL);
}

void loop() {
  webSocket.loop();
}
```

#### ESPSupabase Wrapper
```cpp
#include <ESP_Supabase.h>

Supabase db;

void setup() {
  db.begin(SUPABASE_URL, SUPABASE_KEY);
  db.realtime.onMessage(onSupabaseMessage);
  db.realtime.begin();
}

void loop() {
  db.realtime.loop();
}
```

### What ESPSupabase Adds
1. **Simplified API:** Hides WebSocket implementation details
2. **Message Parsing:** Automatically parses Phoenix protocol JSON
3. **Channel Management:** Handles topic subscriptions
4. **Error Handling:** Abstracts WebSocket events into callbacks

### When to Use Each Approach

**Use Direct WebSocketsClient When:**
- Debugging connection issues (isolates library layer)
- Custom protocol requirements (non-Supabase WebSocket)
- Memory constraints (smaller code footprint)

**Use ESPSupabase When:**
- Production code (cleaner API)
- Working with Supabase database (integrated queries)
- Need automatic reconnection and error recovery

---

## Troubleshooting Guide

### Issue: "Connection lasted: 0 ms"

**Symptom:** WebSocket disconnects immediately after beginSSL() call

**Cause:** BearSSL library requires explicit instruction to skip certificate validation

**Fix:**
1. Locate WebSocketsClient.cpp library file:
   ```
   Windows: C:\Users\<username>\Documents\Arduino\libraries\arduinoWebSockets\src\WebSocketsClient.cpp
   Mac: ~/Documents/Arduino/libraries/arduinoWebSockets/src/WebSocketsClient.cpp
   Linux: ~/Arduino/libraries/arduinoWebSockets/src/WebSocketsClient.cpp
   ```

2. Find `beginSSL()` function (around line 150-200)

3. Add this code block:
   ```cpp
   _client.ssl = new WiFiClientSecure();

   if(_CA_cert) {
       #if defined(ESP8266)
           _client.ssl->setTrustAnchors(new X509List(_CA_cert));
       #elif defined(ESP32)
           _client.ssl->setCACert(_CA_cert);
       #endif
   } else {
       // ✅ FIX: BearSSL requires explicit instruction
       #ifdef ESP8266
       _client.ssl->setInsecure();
       Serial.println("[WSc-DEBUG] Using setInsecure() for ESP8266 BearSSL");
       #endif
   }

   _client.tcp = _client.ssl;
   ```

4. Save file and restart Arduino IDE

5. Re-upload test code

**Verification:** Serial Monitor should show:
```
[WSc-DEBUG] Using setInsecure() for ESP8266 BearSSL
[WS] ✅ CONNECTED
```

---

### Issue: "Free Heap: <30000 bytes"

**Symptom:** Low memory before SSL connection attempt

**Cause:** SSL operations require significant RAM (typically 15-20KB during handshake)

**Fix:**
1. Reduce Serial.print statements (each uses RAM)
2. Avoid large String concatenations
3. Use F() macro for string literals:
   ```cpp
   Serial.println(F("This string stays in flash memory"));
   ```

**Verification:** Free heap should be >35KB before `beginSSL()`

---

### Issue: "CPU Frequency: 80 MHz"

**Symptom:** SSL connections unstable or fail intermittently

**Cause:** ESP8266 crypto operations need faster clock for timing requirements

**Fix:**
1. Open Arduino IDE
2. Go to **Tools → CPU Frequency**
3. Select **160 MHz** (not 80 MHz)
4. Re-upload code

**Verification:** Serial Monitor should show:
```
CPU Frequency: 160 MHz
```

---

### Issue: WebSocket connects but no messages received

**Symptom:**
```
[WS] ✅ CONNECTED
[WS] Sending join message: {"event":"phx_join"...}
(no response from Supabase)
```

**Cause:** Phoenix protocol requires specific message format

**Debug:**
1. Check API key is correct (from Supabase dashboard)
2. Verify WebSocket URL format:
   ```
   wss://<project-ref>.supabase.co/realtime/v1/websocket?apikey=<anon-key>&vsn=1.0.0
   ```
3. Ensure join message JSON is valid
4. Check Supabase Realtime is enabled (Database → Replication → Enable Realtime)

---

## Next Steps After Successful Test

### If Test Succeeds (WebSocket Connected)

1. **Verify ESPSupabase works with same configuration:**
   ```cpp
   #include <ESP_Supabase.h>

   Supabase db;

   void setup() {
     db.begin("https://naadaumxaglqzucacexb.supabase.co", "eyJ...");
     db.realtime.begin();
   }
   ```

2. **If ESPSupabase fails but this test succeeds:**
   - Issue is in ESPSupabase library wrapper
   - Check `ESPSupabase/Realtime.cpp` event handling
   - May need to patch ESPSupabase library similarly

3. **Integrate session management:**
   - Subscribe to `device_commands` table
   - Listen for `START_SESSION` / `STOP_SESSION` commands
   - Send readings only when session active

### If Test Fails (WebSocket Disconnects)

1. **Apply library fix** (see FIX-WebSocketsClient-BearSSL.md)
2. **Verify CPU frequency** (must be 160 MHz)
3. **Check free heap** (must be >35KB)
4. **Test with different WiFi network** (rule out network issues)
5. **Consider ESP32 upgrade** (has 520KB RAM vs 40KB, better SSL support)

---

## Alternative Test: Non-SSL Mode

If SSL continues to fail, test basic WebSocket functionality without encryption:

### Modify Test Code
```cpp
// Line 37-38
#define TEST_SSL false       // Disable SSL
#define TEST_NO_SSL true     // Enable non-SSL test
```

### Expected Result
⚠️ **Note:** Supabase REQUIRES SSL, so this will fail at protocol level, but it isolates whether issue is SSL-specific or broader WebSocket problem.

**If non-SSL connects but SSL fails:**
- Confirms issue is BearSSL/SSL configuration
- Apply library fix from FIX-WebSocketsClient-BearSSL.md

**If both SSL and non-SSL fail:**
- Issue is in basic WebSocket implementation
- Check WebSocketsClient library version (must be v2.3.6+)
- Verify ESP8266 board support is v3.0.0+

---

## Reference: WebSocket Event Types

Understanding `webSocketEvent()` callback parameter `WStype_t type`:

| Event | Value | Meaning | Expected Frequency |
|-------|-------|---------|-------------------|
| `WStype_DISCONNECTED` | 0 | Connection lost | On disconnect only |
| `WStype_CONNECTED` | 1 | Connection established | Once per connection |
| `WStype_TEXT` | 2 | Text message received | Variable (commands, heartbeats) |
| `WStype_BIN` | 3 | Binary data received | Rare with Supabase |
| `WStype_ERROR` | 4 | WebSocket error | On protocol errors |
| `WStype_PING` | 9 | Ping frame received | Every ~30s (keepalive) |
| `WStype_PONG` | 10 | Pong frame received | Response to ping |

### Healthy Connection Pattern
```
[WS] ✅ CONNECTED
[WS] 📨 RECEIVED TEXT: {"event":"phx_reply"...}
[WS] 🏓 PING received
[WS] 🏓 PONG received
[WS] 📨 RECEIVED TEXT: {"event":"heartbeat"...}
[WS] 🏓 PING received
[WS] 🏓 PONG received
```

### Unhealthy Connection Pattern
```
[WS] ✅ CONNECTED
[WS] ❌ DISCONNECTED  ← Immediate, no messages
```

---

## Memory Management Tips

### ESP8266 RAM Constraints
- **Total RAM:** 80KB
- **Available after WiFi:** ~40KB
- **Required for SSL:** 15-20KB during handshake
- **Available for code:** ~20-25KB

### Optimization Strategies

1. **Use Flash Storage (PROGMEM):**
   ```cpp
   const char MESSAGE[] PROGMEM = "Long string here";
   Serial.println(FPSTR(MESSAGE));
   ```

2. **Avoid String Class:**
   ```cpp
   // BAD (heap fragmentation)
   String message = "Hello " + userName + "!";

   // GOOD (stack allocation)
   char message[64];
   snprintf(message, 64, "Hello %s!", userName);
   ```

3. **Minimize Serial Output:**
   ```cpp
   // Disable verbose logs in production
   #define DEBUG_MODE false

   #if DEBUG_MODE
   Serial.println("Debug info");
   #endif
   ```

4. **Monitor Heap:**
   ```cpp
   Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
   ```

---

## Summary

This minimal test isolates WebSocket connectivity issues by:

1. ✅ **Removing ESPSupabase wrapper** - Tests WebSocketsClient directly
2. ✅ **Extensive logging** - Every connection event visible
3. ✅ **Diagnostic output** - System info, heap usage, connection duration
4. ✅ **Simple configuration** - Only WiFi credentials and Supabase URL needed

**Key Success Indicator:** Connection stays alive >30 seconds with successful message exchange

**Most Common Issue:** BearSSL `setInsecure()` not called → Apply library fix

**If successful:** Proceed to integrate ESPSupabase with confidence that underlying WebSocket works

---

**Last Updated:** January 2025
**Test Code:** `/docs/arduino-code/WebSocket_Minimal_Test.ino`
**Library Fix:** `/docs/arduino-code/FIX-WebSocketsClient-BearSSL.md`
**Platform:** ESP8266 NodeMCU 1.0 (ESP-12E)
**Supabase Project:** naadaumxaglqzucacexb.supabase.co
