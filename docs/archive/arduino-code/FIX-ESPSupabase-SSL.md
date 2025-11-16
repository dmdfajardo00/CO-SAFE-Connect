# Fix ESPSupabase WebSocket SSL Certificate Issue

## Problem
ESP8266 fails to connect to Supabase WebSocket (WSS) because the ESPSupabase library doesn't pass the fingerprint parameter to `beginSSL()`.

## Solution
Pass `NULL` explicitly as the fingerprint parameter to let WebSocketsClient disable SSL verification automatically.

---

## Step-by-Step Fix (Windows)

### 1. Find the Library File
The library is located at:
```
C:\Users\Phoebe\Documents\Arduino\libraries\ESPSupabase\src\Realtime.cpp
```

### 2. Open in Text Editor
- Right-click `Realtime.cpp`
- Open with **Notepad** or **Notepad++**

### 3. Find Line ~128
Search for this code (around line 128):
```cpp
  webSocket.beginSSL(
      hostname.c_str(),
      443,
      slug.c_str());
```

### 4. Add NULL as 4th Parameter
Change it to:
```cpp
  // Pass NULL fingerprint to disable SSL certificate validation
  webSocket.beginSSL(
      hostname.c_str(),
      443,
      slug.c_str(),
      NULL);  // ← ADD THIS PARAMETER
```

### 5. Save the File
- Save and close the editor

### 6. Restart Arduino IDE
- Close Arduino IDE completely
- Reopen it

### 7. Re-upload Code
- Upload your CO_SAFE_Monitor code again
- Open Serial Monitor (115200 baud)

---

## Expected Result

### Before Fix:
```
✅ Supabase Realtime WebSocket initialized
[WSc] Disconnected!
[WSc] Disconnected!
```

### After Fix:
```
✅ Supabase Realtime WebSocket initialized
[WSc] Connected to url: /realtime/v1/websocket
[WSc] get pong
```

---

## Alternative: Complete Modified Section

If you want to see the complete modified code, here's the full `listen()` function:

```cpp
void SupabaseRealtime::listen()
{
  deserializeJson(jsonRealtimeConfig, config);
  if (isPostgresChanges)
  {
    jsonRealtimeConfig["payload"]["config"]["postgres_changes"] = postgresChanges;
  }
  if (isPresence)
  {
    jsonRealtimeConfig["payload"]["config"]["presence"]["key"] = "";
  }
  serializeJson(jsonRealtimeConfig, configJSON);

  String slug = "/realtime/v1/websocket?apikey=" + String(key) + "&vsn=1.0.0";

  // Server address, port and URL
  // Pass NULL fingerprint to disable SSL certificate validation
  webSocket.beginSSL(
      hostname.c_str(),
      443,
      slug.c_str(),
      NULL);  // ← NULL fingerprint = no SSL verification

  // event handler
  webSocket.onEvent(std::bind(&SupabaseRealtime::webSocketEvent, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
}
```

---

## Why This Works

WebSocketsClient's `beginSSL()` function signature for ESP8266 is:
```cpp
void beginSSL(const char* host, uint16_t port, const char* url = "/",
              const uint8_t* fingerprint = NULL, const char* protocol = "arduino");
```

When you pass `NULL` as the 4th parameter (fingerprint), the library internally calls:
```cpp
_client.ssl->setInsecure();
```

This disables SSL certificate verification, allowing the ESP8266 to connect without needing to store Supabase's root CA certificate.

---

## Security Note

⚠️ **For Production Use:**
In production environments, you should provide Supabase's SSL certificate fingerprint instead of using `setInsecure()`. However, for prototyping and testing, `setInsecure()` is acceptable.

---

## Troubleshooting

**Q: I can't find the file**
- Make sure you installed the library via Arduino Library Manager
- Check: `Documents\Arduino\libraries\ESPSupabase\src\`

**Q: Permission denied when saving**
- Close Arduino IDE first
- Run Notepad as Administrator
- Open the file again

**Q: Changes don't take effect**
- Make sure you saved the file
- Restart Arduino IDE completely
- Try "Clean" from Sketch menu before uploading
