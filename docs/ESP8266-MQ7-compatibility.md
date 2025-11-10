# ESP8266 + MQ7 Compatibility Guide

## Critical ESP8266 Limitations

### 1. Analog Input Voltage Range ⚠️
**CRITICAL:** ESP8266 A0 pin accepts **0-1V only** (not 0-3.3V like Arduino!)

**MQ7 Output:** Typically 0-5V with load resistor
**Problem:** Direct connection will damage ESP8266

**Solution:** Voltage divider required

```
MQ7 Analog Out ──┬─── [R1: 220kΩ] ─── A0 (ESP8266)
                 │
                 └─── [R2: 100kΩ] ─── GND

Voltage at A0 = V_out × (R2 / (R1 + R2))
              = V_out × (100k / 320k)
              = V_out × 0.3125

Max input: 5V × 0.3125 = 1.56V → Use 270kΩ + 100kΩ for safety
Final: 5V × (100k/370k) = 1.35V (safe)
```

**Recommended Resistor Values:**
- R1 = 270kΩ (or 220kΩ + 47kΩ in series)
- R2 = 100kΩ
- Ratio: 0.27 (ensures 5V → 1.35V max)

### 2. Memory Constraints
**ESP8266 RAM:** 80KB available (out of 160KB total)

**Library Memory Usage (Approximate):**
- ESP8266WiFi: ~25KB
- ESPSupabase: ~10KB
- ArduinoJson: ~8KB
- NTPClient: ~2KB
- Adafruit_SSD1306: ~5KB
- **Total:** ~50KB (62% usage)

**Optimization Tips:**
```cpp
// Use F() macro for strings in flash memory (saves RAM)
Serial.println(F("WiFi connected"));  // ✅ Good
Serial.println("WiFi connected");     // ❌ Wastes RAM

// Limit String concatenation (heap fragmentation)
String payload = String(DEVICE_ID);   // ❌ Creates heap objects
// Better: Use char buffers
char payload[256];
snprintf(payload, sizeof(payload), "{\"device_id\":\"%s\"}", DEVICE_ID);
```

### 3. Deep Sleep Wiring
**REQUIRED:** Connect D0 (GPIO16) to RST pin

```
NodeMCU Pin Layout:
                    ┌─────────────┐
         RST ───────┤1          30├─── D0 (GPIO16)
          A0 ───────┤2          29├─── (Must connect
          D0 ───────┤3          28├───  D0 to RST for
          D5 ───────┤...      ...├───  deep sleep wake)
                    └─────────────┘

Physical connection:
D0 pin ────[wire]──── RST pin
```

**Why:** ESP8266 uses GPIO16 to trigger wake pulse to RST
**Without this:** Device will NOT wake from deep sleep (stuck forever!)

**Alternative:** Use external timer/watchdog for wake

### 4. Deep Sleep Duration Limit
**Maximum:** ~71 minutes (4,294,967,295 microseconds)
**Reason:** 32-bit timer overflow

```cpp
// ❌ BAD: Will overflow
ESP.deepSleep(120 * 60 * 1000000);  // 120 minutes → overflow!

// ✅ GOOD: 60 minutes max
ESP.deepSleep(60 * 60 * 1000000);   // 60 minutes = 3,600,000,000 µs

// For longer sleep, use wake cycles:
void longSleep(int hours) {
  int cycles = hours;  // 1 hour per cycle
  for (int i = 0; i < cycles; i++) {
    ESP.deepSleep(60 * 60 * 1000000);  // 60 min each
  }
}
```

---

## MQ7 Sensor Calibration

### MQ7 Specifications
- **Heater Voltage:** 5V (DC)
- **Heater Current:** ~150mA
- **Detection Range:** 20-2000 ppm CO
- **Analog Output:** 0-5V (via load resistor)
- **Preheat Time:** 24-48 hours for stable readings
- **Response Time:** <150 seconds

### Heating Cycle (Advanced Usage)
MQ7 requires alternating voltage for best accuracy:
- **High:** 5V for 60 seconds (cleaning phase)
- **Low:** 1.4V for 90 seconds (detection phase)

**Simple Mode:** Constant 5V (acceptable for most use cases)
**Advanced Mode:** PWM control for heating cycle

### Proper Calibration Algorithm

**Step 1: Clean Air Calibration (R0)**
```cpp
// In clean air (outdoor or CO-free environment)
float calibrateR0() {
  const int SAMPLES = 50;
  float sum = 0;

  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(MQ7_PIN);
    float voltage = rawValue * (1.0 / 1023.0);  // ESP8266: 0-1V range

    // Account for voltage divider (0.27 ratio)
    float actualVoltage = voltage / 0.27;

    // Calculate sensor resistance
    // Rs = [(Vc × RL) / Vout] - RL
    // Assuming RL = 10kΩ load resistor
    float RL = 10000.0;  // 10kΩ
    float Vc = 5.0;       // Circuit voltage
    float Rs = ((Vc * RL) / actualVoltage) - RL;

    sum += Rs;
    delay(100);
  }

  float avgRs = sum / SAMPLES;
  float R0 = avgRs / 27.5;  // Rs/R0 ratio = 27.5 in clean air (from datasheet)

  Serial.print("Calibrated R0: ");
  Serial.println(R0);

  return R0;
}
```

**Step 2: Calculate CO PPM**
```cpp
float calculateCO_PPM(float R0) {
  int rawValue = analogRead(MQ7_PIN);
  float voltage = rawValue * (1.0 / 1023.0);  // 0-1V
  float actualVoltage = voltage / 0.27;        // Compensate divider

  // Calculate Rs (sensor resistance)
  float RL = 10000.0;
  float Vc = 5.0;
  float Rs = ((Vc * RL) / actualVoltage) - RL;

  // Calculate Rs/R0 ratio
  float ratio = Rs / R0;

  // MQ7 datasheet curve approximation (log-log fit)
  // CO_ppm = 10^[(log10(ratio) - b) / m]
  // Where m = -0.64, b = 1.28 (from MQ7 datasheet curve)
  float ppm = pow(10, ((log10(ratio) - 1.28) / -0.64));

  return ppm;
}
```

**Step 3: Simplified Linear Approximation (Acceptable for Demo)**
```cpp
// Simpler version if you don't need lab-grade accuracy
float co_ppm = map(analogValue, 0, 1023, 0, 500);  // 0-500 ppm range

// Add safety cap
if (co_ppm > 1000) co_ppm = 1000;
if (co_ppm < 0) co_ppm = 0;
```

### Wiring Diagram

```
MQ7 Sensor Connections:
┌─────────────────┐
│      MQ7        │
│   [  ]  [  ]    │
│    H    H       │  ← Heater pins
│   [  ]  [  ]    │
│    A    B       │  ← Signal pins (A = VCC, B = Ground/Output)
└─────────────────┘

Wiring:
H pins   → 5V power supply (needs ~150mA)
A pin    → 5V (VCC)
B pin    → 10kΩ resistor → GND
         └─ To voltage divider → A0

Full Circuit:
5V ────┬──── MQ7 (A pin)
       │
       └──── MQ7 (Heater)

MQ7 (B pin) ────┬──── [10kΩ RL] ──── GND
                │
                └──── [270kΩ] ──┬── A0 (ESP8266)
                                 │
                                [100kΩ]
                                 │
                                GND

Power Requirements:
- ESP8266: ~70mA @ 3.3V (active), 0.02mA (sleep)
- MQ7: ~150mA @ 5V (heater)
- OLED: ~20mA @ 3.3V
- Total: ~240mA @ 5V or 3.3V mixed

Recommended Power: 5V 500mA USB adapter
```

---

## Code Corrections for ESP8266 + MQ7

### Issue 1: Analog Reading
**Original (WRONG for ESP8266):**
```cpp
co_ppm = map(analogValue, 0, 1023, 0, 1000);  // Assumes 0-5V input
```

**Corrected:**
```cpp
// ESP8266 A0 is 0-1V with voltage divider compensating 5V → 1.35V
int rawValue = analogRead(MQ7_PIN);  // 0-1023

// Convert to actual MQ7 output voltage
float measuredV = rawValue * (1.0 / 1023.0);  // 0-1V at A0
float actualV = measuredV / 0.27;              // Reverse voltage divider

// Linear approximation (0-5V MQ7 output → 0-500 ppm)
co_ppm = (actualV / 5.0) * 500.0;

// Safety bounds
if (co_ppm < 0) co_ppm = 0;
if (co_ppm > 1000) co_ppm = 1000;
```

### Issue 2: Memory Optimization
```cpp
// Replace String concatenation with snprintf
// ❌ OLD (uses heap, fragments memory)
String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                 "\",\"co_level\":" + String(co) + "}";

// ✅ NEW (uses stack, efficient)
char payload[256];
snprintf(payload, sizeof(payload),
  "{\"device_id\":\"%s\",\"co_level\":%.1f,\"status\":\"%s\",\"mosfet_status\":%s,\"session_id\":\"%s\"}",
  DEVICE_ID, co, status.c_str(), mosfetBool.c_str(), currentSessionId.c_str()
);
```

### Issue 3: Deep Sleep Check
```cpp
void enterDeepSleep() {
  // IMPORTANT: Check if D0 is connected to RST
  Serial.println(F("⚠️ ENSURE D0 IS CONNECTED TO RST!"));
  Serial.println(F("Without this connection, device will not wake!"));
  delay(2000);

  // Turn off peripherals
  display.clearDisplay();
  display.display();

  // Enter deep sleep (max 60 minutes due to timer limit)
  uint64_t sleepMicros = min(DEEP_SLEEP_SECONDS, 3600) * 1000000ULL;
  ESP.deepSleep(sleepMicros);
}
```

---

## Testing Checklist

### Hardware Verification
- [ ] Voltage divider installed (270kΩ + 100kΩ)
- [ ] MQ7 heater powered with 5V
- [ ] MQ7 preheated for 24-48 hours
- [ ] D0 connected to RST (if using deep sleep)
- [ ] OLED on I2C (SDA=D2, SCL=D1)
- [ ] MOSFET gate connected to D1

### Software Verification
```cpp
// Test 1: Analog reading voltage check
void testAnalogReading() {
  int raw = analogRead(A0);
  float voltage = raw * (1.0 / 1023.0);
  float actual = voltage / 0.27;

  Serial.print("Raw: "); Serial.print(raw);
  Serial.print(" | A0 Voltage: "); Serial.print(voltage);
  Serial.print("V | Actual: "); Serial.print(actual);
  Serial.println("V");
}

// Test 2: Memory usage
void checkMemory() {
  Serial.print("Free heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
}

// Test 3: Deep sleep wake
void testDeepSleep() {
  Serial.println("Entering 10-second test sleep...");
  delay(1000);
  ESP.deepSleep(10e6);  // 10 seconds
  // Should wake and restart
}
```

### Calibration Steps
1. **Clean Air Test:** Place sensor outdoors or in ventilated area
2. **Record R0:** Run calibration function, save R0 value
3. **Known CO Test:** Use calibration gas (50 ppm, 100 ppm) if available
4. **Adjust Algorithm:** Tune formula coefficients if needed
5. **Production:** Store R0 in EEPROM for persistence

---

## Common Issues & Solutions

### Issue: Analog readings always 1023 or 0
**Cause:** Voltage divider missing or wrong ratio
**Fix:** Check resistor values, verify connections

### Issue: Device won't wake from deep sleep
**Cause:** D0 not connected to RST
**Fix:** Wire GPIO16 (D0) to RST pin physically

### Issue: WiFi connection unstable
**Cause:** Insufficient power supply
**Fix:** Use 5V 1A supply, add 100µF capacitor near ESP8266

### Issue: Out of memory crash
**Cause:** String operations fragmenting heap
**Fix:** Replace String with char arrays, use F() macro

### Issue: MQ7 readings wildly fluctuate
**Cause:** Sensor not preheated or bad power supply
**Fix:** Wait 24-48 hours, check 5V stability, add capacitors

### Issue: NTP sync fails
**Cause:** Firewall blocking UDP port 123
**Fix:** Allow NTP traffic or use HTTP time API fallback

---

## Performance Benchmarks (ESP8266 + MQ7)

| Metric | Value |
|--------|-------|
| Boot time | 2-3 seconds |
| WiFi connect | 3-5 seconds |
| NTP sync | 1-2 seconds |
| HTTP POST | 200-500 ms |
| MQ7 response time | <150 seconds |
| Memory usage (idle) | ~50KB / 80KB (62%) |
| Memory usage (peak) | ~65KB / 80KB (81%) |
| Power (active, WiFi) | ~240mA @ 5V |
| Power (deep sleep) | ~0.02mA @ 3.3V |

---

## Recommended Hardware

### Minimum Setup
- ESP8266 NodeMCU 1.0 (ESP-12E)
- MQ7 CO sensor module
- Voltage divider resistors (270kΩ, 100kΩ)
- 5V 500mA power supply
- OLED display (SSD1306, I2C)
- IRLZ44N MOSFET

### Production Setup
- Add 100µF capacitor near ESP8266 VIN
- Add 470µF capacitor for MQ7 heater
- Use regulated 5V supply (not USB)
- PCB with proper voltage divider
- Enclosure with ventilation holes
- Status LED (optional)

### Development Setup
- USB serial adapter for debugging
- Multimeter for voltage verification
- Breadboard or protoboard
- Jumper wires (male-to-male, male-to-female)
- 5V calibration gas (optional, for precision)

---

## Library Compatibility Matrix

| Library | Version Tested | ESP8266 Compatible | Notes |
|---------|---------------|-------------------|--------|
| ESP8266WiFi | (Core) | ✅ Yes | Built-in |
| ESP8266HTTPClient | (Core) | ✅ Yes | Built-in |
| ESPSupabase | Latest | ✅ Yes | Install via Library Manager |
| ArduinoJson | 6.x | ✅ Yes | Use v6, not v7 |
| NTPClient | 3.2.1+ | ✅ Yes | Arduino library |
| Adafruit_SSD1306 | 2.5.x | ✅ Yes | I2C mode |
| Adafruit_GFX | 1.11.x | ✅ Yes | Required by SSD1306 |

**Installation:**
```bash
# Arduino IDE → Library Manager → Install:
- ArduinoJson (v6.21.4)
- NTPClient (v3.2.1)
- Adafruit SSD1306 (v2.5.7)
- Adafruit GFX Library (v1.11.9)
- ESPSupabase (latest)
```

---

## Next Steps
1. Install voltage divider circuit
2. Verify analog input voltage (should be <1V)
3. Preheat MQ7 for 24-48 hours
4. Run calibration in clean air
5. Test with known CO source (or breath test ~10-20 ppm)
6. Deploy and monitor Serial output for 1 hour
7. Fine-tune calibration coefficients
