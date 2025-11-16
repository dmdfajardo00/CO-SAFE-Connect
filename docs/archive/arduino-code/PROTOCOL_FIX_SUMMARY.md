# Phoenix Protocol Fix - Quick Summary

## What Was Wrong

Your WebSocket disconnected immediately because the Phoenix Channels join message had **3 critical protocol violations**:

### 1. Invalid Topic
```diff
- "topic": "realtime:ESP"     // ❌ Server rejects unknown schema "ESP"
+ "topic": "realtime:*"        // ✅ Wildcard subscribes to all changes
```

### 2. Wrong Payload Structure
```diff
{
  "payload": {
-   "postgres_changes": [...]  // ❌ Missing "config" wrapper
+   "config": {
+     "postgres_changes": [...] // ✅ Correct nesting
+   }
  }
}
```

### 3. Missing Access Token
```diff
{
  "payload": {
+   "access_token": "YOUR_KEY",  // ✅ Required for RLS
    "config": { ... }
  }
}
```

---

## Complete Before/After

### BEFORE (Fails Immediately)
```json
{
  "event": "phx_join",
  "topic": "realtime:ESP",
  "payload": {
    "postgres_changes": [
      {
        "event": "INSERT",
        "schema": "public",
        "table": "device_commands",
        "filter": "device_id=eq.CO-SAFE-001"
      }
    ]
  },
  "ref": "ESP"
}
```

**Server Response:** Immediate disconnect (invalid topic)

---

### AFTER (Works Correctly)
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

**Server Response:**
```json
{
  "ref": "1",
  "event": "phx_reply",
  "payload": {
    "response": {
      "postgres_changes": [
        {
          "id": "12345",
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

---

## Files Fixed

| File | Lines Changed | Status |
|------|---------------|--------|
| `ESPSupabaseRealtime.h` | 37, 42, 52, 53 | ✅ Fixed topics and refs |
| `Realtime.cpp` (both versions) | 103-142, 173-217 | ✅ Fixed structure + debug |

---

## Expected Serial Output

### Before Fix
```
[WSc] Connected!
[WSc] Disconnected!
[WSc] Connected!
[WSc] Disconnected!
```

### After Fix
```
[Realtime] Sending phx_join message:
{"event":"phx_join","topic":"realtime:*","payload":{"config":{"postgres_changes":[...]},"access_token":"eyJ..."},"ref":"1"}

[WSc] ✅ CONNECTED to Supabase Realtime
[WSc] Sending phx_join message...
[WSc] 📨 RECEIVED: {"ref":"1","event":"phx_reply","payload":{"response":{...},"status":"ok"}}
[WSc] 🏓 PING received
[WSc] 🏓 PONG received
```

---

## Quick Test

1. **Upload fixed code to ESP8266**
2. **Open Serial Monitor** (115200 baud)
3. **Look for:** `"status":"ok"` in phx_reply message
4. **Trigger command from web app:**
   ```sql
   INSERT INTO device_commands (device_id, command)
   VALUES ('CO-SAFE-001', 'START_SESSION:test-uuid');
   ```
5. **Arduino receives:** `📩 Command received: START_SESSION:test-uuid`

---

## Key Takeaways

✅ **Topic must be `"realtime:*"` not `"realtime:ESP"`**
✅ **Payload structure: `payload.config.postgres_changes`**
✅ **Include `access_token` in payload for RLS**
✅ **Use numeric ref values** (Phoenix convention)
✅ **WebSocket URL must have `vsn=1.0.0`** (already correct)

---

**Full Details:** See `PHOENIX_PROTOCOL_FIX.md`
