# WebSocket Protocol Debugging Checklist

Use this checklist when diagnosing Supabase Realtime WebSocket issues.

---

## ✅ Pre-Flight Checks

### Hardware Configuration
- [ ] ESP8266 CPU frequency set to **160 MHz** (not 80 MHz)
- [ ] Free heap > **35KB** before connection
- [ ] WiFi signal strength > **-70 dBm**
- [ ] Power supply stable (500mA+ for WiFi operations)

### Library Configuration
- [ ] WebSocketsClient library installed (v2.3.6+)
- [ ] ArduinoJson library installed (v6.x or v7.x)
- [ ] BearSSL patch applied (see FIX-WebSocketsClient-BearSSL.md)
- [ ] ESP8266 board support v3.0.0+

### Supabase Configuration
- [ ] Realtime enabled for target table (Database → Replication)
- [ ] RLS policies allow anonymous access for testing
- [ ] API key copied correctly (no extra spaces)
- [ ] Project URL format: `project-ref.supabase.co` (no https://)

---

## 🔍 Protocol Validation

### WebSocket URL Format
**Check your code has:**
```cpp
String slug = "/realtime/v1/websocket?apikey=" + String(key) + "&vsn=1.0.0";
```

**Required components:**
- [ ] Path: `/realtime/v1/websocket`
- [ ] Query param: `apikey=YOUR_ANON_KEY`
- [ ] Query param: `vsn=1.0.0` (protocol version)

**Common mistakes:**
❌ `/realtime/websocket` (missing `/v1/`)
❌ `vsn=1` (needs `"1.0.0"`)
❌ Missing `&` between parameters

---

### Phoenix phx_join Message

**Print your configJSON and verify it matches this structure:**

```json
{
  "event": "phx_join",
  "topic": "realtime:*",
  "payload": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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

**Field-by-field checklist:**

#### event
- [ ] Value is exactly `"phx_join"` (lowercase, underscore)
- [ ] NOT `"join"`, `"phx-join"`, or `"PHX_JOIN"`

#### topic
- [ ] Starts with `"realtime:"`
- [ ] Uses `*` wildcard OR schema name (`public`)
- [ ] NOT `"realtime:ESP"` or any custom identifier

**Valid topics:**
✅ `"realtime:*"` - Subscribe to all changes
✅ `"realtime:public"` - Subscribe to public schema
❌ `"realtime:ESP"` - Invalid (not a schema name)
❌ `"realtime"` - Invalid (missing colon)

#### payload
- [ ] Contains `"access_token"` field
- [ ] Contains `"config"` object
- [ ] NOT a flat structure with postgres_changes at root

**Nesting must be:**
```
payload
├── access_token (string)
└── config (object)
    ├── postgres_changes (array)
    ├── presence (optional object)
    └── broadcast (optional object)
```

#### payload.access_token
- [ ] Set to your Supabase anon key or JWT
- [ ] Matches the key in URL query parameter
- [ ] Full token (starts with `eyJ...`)

#### payload.config.postgres_changes
- [ ] Is an array `[...]` not object `{...}`
- [ ] Each item has `event`, `schema`, `table` fields
- [ ] Filter syntax: `column=eq.value` (no spaces)

**Valid events:**
- `"*"` - All changes
- `"INSERT"` - Only inserts
- `"UPDATE"` - Only updates
- `"DELETE"` - Only deletes

#### ref
- [ ] Numeric string (e.g., `"1"`, `"2"`)
- [ ] Increments for each message
- [ ] NOT `"ESP"` or other identifiers

---

## 📊 Serial Monitor Diagnostics

### Expected Connection Sequence

**Step 1: Join Message Sent**
```
[Realtime] Sending phx_join message:
{"event":"phx_join","topic":"realtime:*","payload":{...},"ref":"1"}
```
✅ Verify JSON is valid (use jsonlint.com if needed)

**Step 2: WebSocket Connected**
```
[WSc] ✅ CONNECTED to Supabase Realtime
[WSc] Sending phx_join message...
```
✅ SSL handshake succeeded

**Step 3: Server Acknowledges**
```
[WSc] 📨 RECEIVED: {"ref":"1","event":"phx_reply","payload":{"response":{...},"status":"ok"}}
```
✅ Check `"status":"ok"` (not `"error"`)

**Step 4: Subscription Confirmed**
```json
{
  "payload": {
    "response": {
      "postgres_changes": [
        {
          "id": "12345",  // ← Subscription ID assigned by server
          "event": "INSERT",
          "schema": "public",
          "table": "device_commands",
          "filter": "device_id=eq.CO-SAFE-001"
        }
      ]
    },
    "status": "ok"
  }
}
```
✅ Check subscription has an `id` field

**Step 5: Heartbeats**
```
[WSc] 🏓 PING received
[WSc] 🏓 PONG received
```
✅ Occurs every 30 seconds

---

## ❌ Common Error Responses

### Error: "unauthorized"
```json
{
  "event": "phx_error",
  "payload": {"reason": "unauthorized"},
  "ref": "1"
}
```

**Causes:**
- [ ] `access_token` missing from payload
- [ ] Wrong API key (check Supabase dashboard)
- [ ] RLS policy blocks anonymous access

**Fix:** Add `payloadDoc["access_token"] = key;` in `listen()`

---

### Error: "invalid_topic"
```json
{
  "event": "phx_error",
  "payload": {"reason": "invalid_topic"},
  "ref": "1"
}
```

**Causes:**
- [ ] Topic is `"realtime:ESP"` instead of `"realtime:*"`
- [ ] Topic doesn't start with `"realtime:"`

**Fix:** Change topic to `"realtime:*"` in all config strings

---

### Error: "invalid_event"
```json
{
  "event": "phx_error",
  "payload": {"reason": "invalid_event"},
  "ref": "1"
}
```

**Causes:**
- [ ] Event is `"join"` instead of `"phx_join"`
- [ ] Misspelled event name

**Fix:** Ensure event is exactly `"phx_join"`

---

### Disconnect with No Message

**Symptom:**
```
[WSc] ✅ CONNECTED
[WSc] ❌ DISCONNECTED!
```
(No phx_reply received)

**Causes:**
1. SSL handshake failed after connection
   - [ ] CPU frequency not 160 MHz
   - [ ] BearSSL not configured (`setInsecure()` not called)

2. Message sent but malformed JSON
   - [ ] Print `configJSON` before sending
   - [ ] Validate JSON syntax

3. Server closed connection due to protocol violation
   - [ ] Check payload structure matches spec exactly

---

## 🧪 Testing Your Message

### Method 1: Print Before Send
```cpp
void SupabaseRealtime::listen() {
  // ... build message ...

  serializeJson(phxJoinMessage, configJSON);

  // ✅ ADD THIS DEBUG OUTPUT
  Serial.println("==== DEBUG: phx_join message ====");
  Serial.println(configJSON);
  Serial.println("=================================");

  webSocket.beginSSL(...);
}
```

### Method 2: Manual JSON Validation
1. Copy the printed JSON from Serial Monitor
2. Go to https://jsonlint.com
3. Paste and click "Validate JSON"
4. Check for syntax errors

### Method 3: Manual Structure Check
Paste your JSON here and verify each field:

```
event: __________________ (must be "phx_join")
topic: __________________ (must start with "realtime:")
ref: ____________________ (numeric string recommended)

payload:
  access_token: _________ (present? starts with "eyJ"?)
  config:
    postgres_changes: ____ (is array? has schema/table/event?)
```

---

## 🔧 Quick Fixes

### If disconnecting immediately:
```cpp
// In WebSocketsClient.cpp beginSSL() method
#ifdef ESP8266
_client.ssl->setInsecure();  // ← Add this line
#endif
```

### If "invalid_topic" error:
```cpp
// In ESPSupabaseRealtime.h line 37
const char *config = R"({"event":"phx_join","topic":"realtime:*", ...})";
//                                                           ^ Change ESP to *
```

### If no phx_reply received:
```cpp
// In Realtime.cpp listen() method
JsonDocument payloadDoc;
payloadDoc["config"] = configDoc;
payloadDoc["access_token"] = key;  // ← Add this line
```

---

## 📝 Debug Output Template

**Copy this to track your debugging session:**

```
Date: __________
ESP8266 Board: NodeMCU 1.0 (ESP-12E)
CPU Frequency: ______ MHz
Free Heap: ______ bytes

WebSocket URL:
_________________________________________________________________

Join Message (configJSON):
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

Serial Output:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

Server Response:
_________________________________________________________________
_________________________________________________________________

Error (if any):
_________________________________________________________________

Resolution:
_________________________________________________________________
```

---

## ✅ Success Criteria

Your connection is **fully working** when you see ALL of these:

1. ✅ `[WSc] ✅ CONNECTED to Supabase Realtime`
2. ✅ `[WSc] 📨 RECEIVED: {"ref":"1","event":"phx_reply",...}`
3. ✅ `"status":"ok"` in phx_reply payload
4. ✅ Subscription ID returned in response
5. ✅ Periodic PING/PONG messages (every 30s)
6. ✅ Connection stays alive >5 minutes
7. ✅ Database changes trigger messages on Arduino

---

## 📚 Reference Links

- **Phoenix Channels Protocol:** https://hexdocs.pm/phoenix/channels.html
- **Supabase Realtime Docs:** https://supabase.com/docs/guides/realtime
- **WebSocketsClient Library:** https://github.com/Links2004/arduinoWebSockets
- **BearSSL Fix:** `/docs/arduino-code/FIX-WebSocketsClient-BearSSL.md`
- **Protocol Fix:** `/docs/arduino-code/PHOENIX_PROTOCOL_FIX.md`

---

**Last Updated:** January 2025
**Protocol Version:** Phoenix Channels 1.0.0
**Tested On:** ESP8266 NodeMCU 1.0
