# Fix WebSocketsClient for ESP8266 BearSSL

## Problem
ESP8266 WebSocket SSL connections fail with `[WSc] Disconnected!` because the WebSocketsClient library doesn't call `setInsecure()` on the underlying WiFiClientSecure when using BearSSL.

## Solution
Modify the **WebSocketsClient.cpp** library file to automatically call `setInsecure()` when no fingerprint is provided.

---

## Step-by-Step Fix (Windows)

### 1. Find the Library File
The library is located at:
```
C:\Users\Phoebe\Documents\Arduino\libraries\arduinoWebSockets\src\WebSocketsClient.cpp
```

### 2. Open in Text Editor
- Right-click `WebSocketsClient.cpp`
- Open with **Notepad** or **Notepad++**

### 3. Find the beginSSL Function
Search for this function (around line 150-200):
```cpp
void WebSocketsClient::beginSSL
```

### 4. Locate the WiFiClientSecure Initialization
Find this code block:
```cpp
_client.ssl = new WiFiClientSecure();

if(_CA_cert) {
    // CA certificate handling...
}

_client.tcp = _client.ssl;
```

### 5. Add setInsecure() Call
Change it to:
```cpp
_client.ssl = new WiFiClientSecure();

if(_CA_cert) {
    // CA certificate handling...
    #if defined(ESP8266)
        _client.ssl->setTrustAnchors(new X509List(_CA_cert));
    #elif defined(ESP32)
        _client.ssl->setCACert(_CA_cert);
    #endif
} else {
    // ✅ FIX: BearSSL requires explicit instruction to skip cert validation
    #ifdef ESP8266
    _client.ssl->setInsecure();
    Serial.println("[WSc-DEBUG] Using setInsecure() for ESP8266 BearSSL");
    #endif
}

_client.tcp = _client.ssl;
```

### 6. Save the File
- Save and close the editor

### 7. Set CPU to 160 MHz
**CRITICAL**: ESP8266 SSL operations require faster CPU speed:
1. Open Arduino IDE
2. Go to **Tools → CPU Frequency**
3. Select **160 MHz** (not 80 MHz)

### 8. Restart Arduino IDE
- Close Arduino IDE completely
- Reopen it

### 9. Re-upload Code
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
[WSc-DEBUG] Using setInsecure() for ESP8266 BearSSL
[WSc] Connected to url: /realtime/v1/websocket
```

---

## Why This Works

**ESP8266 Arduino Core 2.5.0+ uses BearSSL instead of axTLS:**
- BearSSL **requires** one of:
  1. Valid CA certificate via `setTrustAnchors()`
  2. Certificate fingerprint via `setFingerprint()`
  3. Explicit opt-out via `setInsecure()`

**Without calling `setInsecure()`, BearSSL attempts certificate validation, fails (no cert configured), and closes the connection.**

The `NULL` fingerprint parameter in ESPSupabase's `Realtime.cpp` tells WebSocketsClient "don't use fingerprint", but WebSocketsClient also needs to tell BearSSL "don't validate certs at all" by calling `setInsecure()`.

---

## Troubleshooting

**Q: I can't find WebSocketsClient.cpp**
- Make sure you installed "WebSockets by Markus Sattler" via Arduino Library Manager
- Check: `Documents\Arduino\libraries\arduinoWebSockets\src\`

**Q: Permission denied when saving**
- Close Arduino IDE first
- Run Notepad as Administrator
- Open the file again

**Q: Changes don't take effect**
- Make sure you saved the file
- Restart Arduino IDE completely
- Clear build cache: Delete `C:\Users\Phoebe\AppData\Local\Temp\arduino_build_*`
- Try "Verify/Compile" first to see if it recompiles

**Q: Still getting disconnections**
- Verify CPU is set to 160 MHz (Tools menu)
- Add this debug code to verify free heap:
  ```cpp
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  ```
  Should show >15KB before SSL connection

---

## Security Note

⚠️ **For Production Use:**
In production environments, you should provide Supabase's SSL certificate instead of using `setInsecure()`. However, for prototyping and testing, `setInsecure()` is acceptable.

---

## Alternative: If You Can't Modify WebSocketsClient

If you cannot modify the arduinoWebSockets library, consider:

1. **Use HTTP polling instead of WebSocket:**
   ```cpp
   // Poll device_commands table every 5 seconds
   String commands = db.from("device_commands")
     .select("*")
     .eq("device_id", "CO-SAFE-001")
     .eq("executed", "false")
     .limit(1)
     .doSelect();
   ```

2. **Upgrade to ESP32:**
   - 520KB RAM (vs 40KB on ESP8266)
   - Hardware crypto acceleration
   - Better SSL/TLS support

---

## Summary

This is a **library-level issue**, not an application code issue. The WebSocketsClient library needs to be patched to properly support ESP8266's BearSSL implementation.

**Two fixes required:**
1. ✅ Modify `WebSocketsClient.cpp` to call `setInsecure()`
2. ✅ Set CPU frequency to 160 MHz

Without both fixes, SSL handshake will fail due to BearSSL requirements and ESP8266 memory constraints.
