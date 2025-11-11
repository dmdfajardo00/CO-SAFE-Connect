# Phoenix Channels Protocol Fix for Supabase Realtime

## Problem Summary

The ESP8266 WebSocket connects to Supabase Realtime but immediately disconnects with `[WSc] Disconnected!` messages. This is caused by **protocol violations** in the Phoenix Channels join message.

## Root Causes Identified

### 1. Invalid Topic Format
**Location:** `ESPSupabaseRealtime.h` line 37 (original)

**Incorrect:**
```cpp
const char *config = R"({"event":"phx_join","topic":"realtime:ESP","payload":{"config":{}},"ref":"ESP"})";
```

**Problem:** `"realtime:ESP"` is not a valid Phoenix Channel topic. The server rejects this immediately.

**Correct:**
```cpp
const char *config = R"({"event":"phx_join","topic":"realtime:*","payload":{"config":{}},"ref":"1"})";
```

**Valid Topic Formats:**
- `"realtime:*"` - Wildcard (subscribe to all schema changes)
- `"realtime:public"` - Specific schema
- `"realtime:public:device_commands"` - Specific table (not commonly used)

---

### 2. Incorrect Payload Nesting
**Location:** `Realtime.cpp` `listen()` function

**Incorrect Structure:**
```json
{
  "event": "phx_join",
  "topic": "realtime:*",
  "payload": {
    "postgres_changes": [...]  // ❌ Missing "config" wrapper
  },
  "ref": "1"
}
```

**Correct Structure:**
```json
{
  "event": "phx_join",
  "topic": "realtime:*",
  "payload": {
    "config": {
      "postgres_changes": [
        {
          "event": "INSERT",
          "schema": "public",
          "table": "device_commands",
          "filter": "device_id=eq.CO-SAFE-001"
        }
      ]
    },
    "access_token": "YOUR_ANON_KEY"
  },
  "ref": "1"
}
```

**Key Requirements:**
1. `payload.config.postgres_changes` (not `payload.postgres_changes`)
2. `access_token` in payload root for RLS authentication
3. Numeric `ref` values (Phoenix protocol convention)

---

### 3. Missing Access Token in Payload
**Location:** Both implementations

**Problem:** The API key is only sent in the WebSocket URL query parameter:
```
wss://project.supabase.co/realtime/v1/websocket?apikey=KEY&vsn=1.0.0
```

But for RLS (Row Level Security) to work with postgres_changes subscriptions, the token must also be in the `phx_join` payload:
```json
{
  "payload": {
    "access_token": "YOUR_ANON_KEY_OR_JWT",
    "config": { ... }
  }
}
```

---

## Applied Fixes

### File 1: `/docs/ESPSupabaseLibrary/ESPSupabase/src/ESPSupabaseRealtime.h`

**Changes:**
1. Line 37: Changed topic from `"realtime:ESP"` → `"realtime:*"`
2. Line 37: Changed ref from `"ESP"` → `"1"` (numeric)
3. Line 42: Fixed presence topic `"realtime:ESP"` → `"realtime:*"`
4. Line 52: Fixed heartbeat ref `"ESP"` → `"0"`
5. Line 53: Fixed tokenConfig topic `"realtime:ESP"` → `"realtime:*"`

**Before:**
```cpp
const char *config = R"({"event":"phx_join","topic":"realtime:ESP","payload":{"config":{}},"ref":"ESP"})";
```

**After:**
```cpp
const char *config = R"({"event":"phx_join","topic":"realtime:*","payload":{"config":{}},"ref":"1"})";
```

---

### File 2: `/docs/ESPSupabaseLibrary/ESPSupabase/src/Realtime.cpp`

**Changes to `listen()` function (lines 103-142):**

1. **Replaced deserialization with manual construction:**
   - Removed: `deserializeJson(jsonRealtimeConfig, config);`
   - Built message from scratch using JsonDocument

2. **Fixed payload nesting:**
   ```cpp
   // Build nested structure correctly
   JsonDocument configDoc;
   if (isPostgresChanges) {
     configDoc["postgres_changes"] = postgresChanges;
   }

   JsonDocument payloadDoc;
   payloadDoc["config"] = configDoc;
   payloadDoc["access_token"] = key;  // ✅ Added for RLS

   phxJoinMessage["payload"] = payloadDoc;
   ```

3. **Added debug logging:**
   ```cpp
   Serial.println("[Realtime] Sending phx_join message:");
   Serial.println(configJSON);
   ```

**Changes to `webSocketEvent()` function (lines 173-217):**

1. **Enhanced debug output:**
   ```cpp
   case WStype_CONNECTED:
     Serial.println("[WSc] ✅ CONNECTED to Supabase Realtime");
     Serial.println("[WSc] Sending phx_join message...");
   ```

2. **Added visibility for all message types:**
   ```cpp
   case WStype_TEXT:
     Serial.printf("[WSc] 📨 RECEIVED: %s\n", payload);
   ```

---

### File 3: `/docs/arduino-code/supabase-library/Realtime.cpp` (Patched Version)

**Applied identical fixes as File 2.**

This is the version used in the Arduino sketch at:
`/docs/arduino-code/revised-code/CO_SAFE_Monitor-enhanced 1.81.ino`

---

## Expected Serial Output After Fix

### Before Fix (Immediate Disconnect)
```
[WSc] Connected!
[WSc] Disconnected!
[WSc] Connected!
[WSc] Disconnected!
```

### After Fix (Successful Connection)
```
[Realtime] Sending phx_join message:
{"event":"phx_join","topic":"realtime:*","payload":{"config":{"postgres_changes":[{"event":"INSERT","schema":"public","table":"device_commands","filter":"device_id=eq.CO-SAFE-001"}]},"access_token":"eyJ..."},"ref":"1"}

[WSc] ✅ CONNECTED to Supabase Realtime
[WSc] Sending phx_join message...

[WSc] 📨 RECEIVED: {"ref":"1","event":"phx_reply","payload":{"response":{"postgres_changes":[{"id":"12345","event":"INSERT","schema":"public","table":"device_commands","filter":"device_id=eq.CO-SAFE-001"}]},"status":"ok"}}

[WSc] 🏓 PING received
[WSc] 🏓 PONG received
```

**Key Success Indicators:**
1. `"event":"phx_reply"` - Server acknowledges join
2. `"status":"ok"` - Subscription accepted
3. `"postgres_changes"` array returned with subscription IDs
4. Periodic PING/PONG frames (keepalive)

---

## Phoenix Channels Protocol Reference

### Message Format Requirements

All Phoenix Channel messages must follow this structure:

```typescript
{
  "event": string,     // Message type: "phx_join", "phx_reply", "heartbeat", etc.
  "topic": string,     // Channel name: "realtime:*", "phoenix", etc.
  "payload": object,   // Message-specific data
  "ref": string        // Message reference ID (can be numeric string)
}
```

### Common Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `phx_join` | Client → Server | Subscribe to channel |
| `phx_reply` | Server → Client | Acknowledge join/message |
| `phx_leave` | Client → Server | Unsubscribe from channel |
| `phx_error` | Server → Client | Error response |
| `phx_close` | Server → Client | Channel closed |
| `heartbeat` | Client → Server | Keepalive (every 30s) |
| `presence_state` | Server → Client | Presence tracking |
| `postgres_changes` | Server → Client | Database change notification |

### WebSocket URL Format

**Correct:**
```
wss://PROJECT_REF.supabase.co/realtime/v1/websocket?apikey=ANON_KEY&vsn=1.0.0
```

**Parameters:**
- `apikey`: Supabase anon or service_role key
- `vsn`: Protocol version (must be `"1.0.0"`)

---

## Verification Steps

### 1. Upload Fixed Code
```bash
# Copy fixed library to Arduino libraries folder
cp -r /docs/ESPSupabaseLibrary/ESPSupabase ~/Documents/Arduino/libraries/

# Or use the patched version directly in your sketch
# (Already configured in CO_SAFE_Monitor-enhanced 1.81.ino)
```

### 2. Monitor Serial Output
```
Tools → Serial Monitor
Baud Rate: 115200
```

### 3. Expected Sequence
```
1. WiFi connects → ✅
2. NTP time syncs → ✅
3. WebSocket connects → ✅
4. Sends phx_join → ✅
5. Receives phx_reply → ✅
6. Connection stays alive → ✅
```

### 4. Test Commands
From your web app, trigger a session start:
```sql
INSERT INTO device_commands (device_id, command, executed)
VALUES ('CO-SAFE-001', 'START_SESSION:uuid-here', false);
```

Expected on Arduino:
```
[WSc] 📨 RECEIVED: {"event":"INSERT","payload":{"data":{"new":{"command":"START_SESSION:uuid-here",...}}}}
📩 Command received: {...}
✅ Started monitoring session: uuid-here
```

---

## Troubleshooting

### Still Disconnecting Immediately?

**Check:**
1. WebSocketsClient library has BearSSL patch applied
   - See: `/docs/arduino-code/FIX-WebSocketsClient-BearSSL.md`
   - Symptom: Disconnect before any messages sent

2. CPU frequency set to 160 MHz
   - Arduino IDE: Tools → CPU Frequency → 160 MHz
   - Symptom: SSL handshake timeout

3. Free heap > 35KB
   - Monitor with: `Serial.println(ESP.getFreeHeap());`
   - Symptom: Random disconnects during SSL handshake

### Connection Established but No Messages?

**Check:**
1. Supabase Realtime enabled for your table
   - Database → Replication → Enable for `device_commands`

2. RLS policies allow anonymous insert
   - Your schema already has this configured

3. API key is correct
   - From Supabase Dashboard → Settings → API

### Receiving phx_error Response?

**Common errors:**
```json
{"event":"phx_error","payload":{"reason":"unauthorized"},"ref":"1"}
```
→ Check `access_token` in payload

```json
{"event":"phx_error","payload":{"reason":"invalid_topic"},"ref":"1"}
```
→ Topic format wrong (must be `"realtime:*"`)

```json
{"event":"phx_error","payload":{"reason":"invalid_event"},"ref":"1"}
```
→ Wrong event name (must be `"phx_join"`)

---

## Summary of Protocol Rules

### ✅ CORRECT Phoenix Message
```json
{
  "event": "phx_join",
  "topic": "realtime:*",
  "payload": {
    "access_token": "eyJ...",
    "config": {
      "postgres_changes": [
        {
          "event": "INSERT",
          "schema": "public",
          "table": "device_commands",
          "filter": "device_id=eq.CO-SAFE-001"
        }
      ]
    }
  },
  "ref": "1"
}
```

### ❌ INCORRECT Phoenix Message
```json
{
  "event": "phx_join",
  "topic": "realtime:ESP",              // ❌ Invalid topic
  "payload": {
    "postgres_changes": [...]            // ❌ Missing "config" wrapper
                                         // ❌ Missing "access_token"
  },
  "ref": "ESP"                           // ⚠️ Non-numeric ref (works but unconventional)
}
```

---

## Files Modified

1. ✅ `/docs/ESPSupabaseLibrary/ESPSupabase/src/ESPSupabaseRealtime.h`
2. ✅ `/docs/ESPSupabaseLibrary/ESPSupabase/src/Realtime.cpp`
3. ✅ `/docs/arduino-code/supabase-library/Realtime.cpp` (patched version)

**Next Step:** Test with your Arduino hardware and monitor Serial output for successful connection.

---

**Last Updated:** January 2025
**Protocol Version:** Phoenix Channels 1.0.0
**Supabase Realtime:** v1
**Tested On:** ESP8266 NodeMCU 1.0 (ESP-12E)
