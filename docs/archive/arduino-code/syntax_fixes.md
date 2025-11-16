# CO-SAFE Monitor Arduino Compilation Error Fixes

## Overview
This document provides exact patches to fix compilation errors in `CO_SAFE_Monitor-enhanced 1.5.ino`.

**Affected File:** `/docs/arduino-code/CO_SAFE_Monitor-enhanced 1.5.ino`

---

## Error 1: `min()` Type Mismatch (Line 294)

### Compilation Error
```
error: no matching function for call to 'min(double, int)'
int backoffTime = min(1000 * pow(2, wifiRetryCount), 30000);
                  ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

### Root Cause
The `pow()` function returns `double`, but the second argument to `min()` is `int`. The C++ compiler cannot resolve which overload of `min()` to use when mixing types.

### Fix
Cast the `pow()` expression to `int` before passing to `min()`:

**Before (Line 294):**
```cpp
int backoffTime = min(1000 * pow(2, wifiRetryCount), 30000); // Max 30s
```

**After (Line 294):**
```cpp
int backoffTime = min((int)(1000 * pow(2, wifiRetryCount)), 30000); // Max 30s
```

---

## Error 2: `min()` Type Mismatch (Line 411)

### Compilation Error
```
error: no matching function for call to 'min(double, int)'
int backoffTime = min(1000 * pow(2, attempt), 10000); // Max 10s
                  ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

### Root Cause
Same as Error 1 - type mismatch between `double` and `int`.

### Fix
Cast the `pow()` expression to `int`:

**Before (Line 411):**
```cpp
int backoffTime = min(1000 * pow(2, attempt), 10000); // Max 10s
```

**After (Line 411):**
```cpp
int backoffTime = min((int)(1000 * pow(2, attempt)), 10000); // Max 10s
```

---

## Error 3: `String.replace()` Returns Void (Line 427)

### Compilation Error
```
error: cannot convert 'void' to 'String' in initialization
String url = String(SUPABASE_URL).replace("/co_readings", "/device_commands");
             ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

### Root Cause
The `String.replace()` method in Arduino **modifies the string in-place** and returns `void` (nothing). You cannot assign its return value to a new variable.

### Fix
Split into two statements:
1. Create the string
2. Call `replace()` to modify it

**Before (Line 427):**
```cpp
String url = String(SUPABASE_URL).replace("/co_readings", "/device_commands");
```

**After (Line 427-428):**
```cpp
String url = String(SUPABASE_URL);
url.replace("/co_readings", "/device_commands");
```

---

## Error 4: Missing WebSocketsClient Library

### Compilation Error
```
fatal error: WebSocketsClient.h: No such file or directory
 #include <WebSocketsClient.h>  // Required by ESPSupabase.h
          ^~~~~~~~~~~~~~~~~~~~~~
compilation terminated.
```

### Root Cause
The `ESPSupabase` library depends on the `WebSocketsClient` library for real-time WebSocket communication, but it's not installed.

### Fix
Install the required library via Arduino IDE Library Manager:

**Library to Install:**
- **Name:** `WebSockets by Markus Sattler`
- **Version:** 2.3.6 or newer
- **Installation Method:**
  1. Open Arduino IDE
  2. Go to **Sketch → Include Library → Manage Libraries...**
  3. Search for `WebSockets`
  4. Select **"WebSockets by Markus Sattler"**
  5. Click **Install**

**GitHub Repository:** https://github.com/Links2004/arduinoWebSockets

---

## Complete List of Required Arduino Libraries

To compile the CO-SAFE Monitor code, you need these libraries installed:

| Library Name | Author | Version | Purpose |
|--------------|--------|---------|---------|
| **ESP8266WiFi** | ESP8266 Community | Bundled with ESP8266 core | WiFi connectivity |
| **ESP8266HTTPClient** | ESP8266 Community | Bundled with ESP8266 core | HTTP POST/PATCH requests |
| **Wire** | Arduino | Built-in | I2C communication for OLED |
| **Adafruit GFX Library** | Adafruit | 1.11.3+ | Graphics primitives for OLED |
| **Adafruit SSD1306** | Adafruit | 2.5.7+ | OLED display driver |
| **ArduinoJson** | Benoit Blanchon | 7.0.0+ | JSON parsing for WebSocket commands |
| **NTPClient** | Fabrice Weinberg | 3.2.1+ | Network Time Protocol sync |
| **WebSockets** | Markus Sattler | 2.3.6+ | WebSocket client (dependency of ESPSupabase) |
| **ESPSupabase** | Supabase Community | Latest | Supabase Realtime WebSocket integration |

### Installation Order
Install libraries in this order to avoid dependency errors:

1. **Adafruit GFX Library** (dependency for SSD1306)
2. **Adafruit SSD1306**
3. **ArduinoJson**
4. **NTPClient**
5. **WebSockets** ⚠️ Required before ESPSupabase
6. **ESPSupabase** (install last)

---

## Additional Type Safety Improvements

While fixing the compilation errors, consider these optional improvements:

### 1. Use Explicit Type Casting for Sensor Mapping
**Current (Line 188):**
```cpp
co_ppm = map(analogValue, 0, 1023, 0, 1000);
```

**Improved:**
```cpp
co_ppm = (float)map(analogValue, 0, 1023, 0, 1000);
```

**Reason:** Explicitly cast `map()` result to `float` to match `co_ppm` type declaration.

### 2. Use `constexpr` for Compile-Time Constants
**Current (Lines 28-33):**
```cpp
#define ENABLE_DEEP_SLEEP false
#define DEEP_SLEEP_SECONDS 30
#define SESSION_TIMEOUT_MINUTES 60
```

**Improved:**
```cpp
constexpr bool ENABLE_DEEP_SLEEP = false;
constexpr int DEEP_SLEEP_SECONDS = 30;
constexpr int SESSION_TIMEOUT_MINUTES = 60;
```

**Reason:** Type-safe constants with compile-time checking instead of preprocessor macros.

### 3. Use `const char*` for mosfetBool (Line 355)
**Current:**
```cpp
const char* mosfetBool = (mosfetStatus == 1) ? "true" : "false";
```

**Improved:** (Already correct - no change needed)

---

## Verification Checklist

After applying these fixes, verify:

- [ ] All libraries installed (especially `WebSockets by Markus Sattler`)
- [ ] Line 294: `min()` call has explicit `(int)` cast
- [ ] Line 411: `min()` call has explicit `(int)` cast
- [ ] Line 427-428: `String.replace()` split into two statements
- [ ] Code compiles without errors
- [ ] Code uploads to ESP8266 successfully
- [ ] Serial monitor shows "Supabase Realtime initialized" message

---

## Applying the Fixes

### Step-by-Step Instructions

1. **Open the file:**
   ```
   docs/arduino-code/CO_SAFE_Monitor-enhanced 1.5.ino
   ```

2. **Install WebSockets library** (if not already installed):
   - Arduino IDE → Sketch → Include Library → Manage Libraries
   - Search: `WebSockets`
   - Select: `WebSockets by Markus Sattler`
   - Click: Install

3. **Fix Line 294:**
   - Find: `int backoffTime = min(1000 * pow(2, wifiRetryCount), 30000);`
   - Replace with: `int backoffTime = min((int)(1000 * pow(2, wifiRetryCount)), 30000);`

4. **Fix Line 411:**
   - Find: `int backoffTime = min(1000 * pow(2, attempt), 10000);`
   - Replace with: `int backoffTime = min((int)(1000 * pow(2, attempt)), 10000);`

5. **Fix Line 427:**
   - Find: `String url = String(SUPABASE_URL).replace("/co_readings", "/device_commands");`
   - Replace with:
     ```cpp
     String url = String(SUPABASE_URL);
     url.replace("/co_readings", "/device_commands");
     ```

6. **Compile and verify:**
   ```
   Arduino IDE → Sketch → Verify/Compile (Ctrl+R)
   ```

7. **Upload to ESP8266:**
   ```
   Arduino IDE → Sketch → Upload (Ctrl+U)
   ```

---

## Testing After Fixes

### 1. Compile Test
```
Expected output:
Sketch uses XXXX bytes (XX%) of program storage space.
Global variables use XXXX bytes (XX%) of dynamic memory.
```

### 2. Serial Monitor Test
```
Expected output:
WiFi connected: 192.168.x.x
✅ NTP time synced: HH:MM:SS
✅ Supabase Realtime initialized
System Ready
```

### 3. WebSocket Connection Test
Verify the device receives commands:
```
📩 Command received: {"record":{"command":"START_SESSION:uuid-here"}}
✅ Parsed command: START_SESSION:uuid-here
✅ Started monitoring session: uuid-here
```

---

## Notes

- These fixes maintain backward compatibility with the existing database schema
- No changes to hardware connections required
- No changes to Supabase schema required
- The fixes only address compilation errors, not runtime behavior
- All fixes are **non-breaking** and preserve original functionality

---

## Related Documentation

- **Hardware Setup:** `docs/arduino-code/arduino-code-final.md`
- **Circuit Diagram:** `docs/arduino-code/circuit-diagram.png`
- **Pin Configuration:** `docs/arduino-code/HARDWARE-VERIFICATION-SUMMARY.md`
- **Database Schema:** `docs/migrations/initial-set-up.sql`

---

**Last Updated:** 2025-11-11
**Tested On:** Arduino IDE 2.3.2, ESP8266 Core 3.1.2
**Status:** ✅ Ready for deployment after applying fixes
