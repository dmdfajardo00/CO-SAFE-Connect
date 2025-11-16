# Hardware Verification Summary - Sir Francis' Circuit

**Date:** January 2025
**Verified by:** Sir Francis (Hardware Owner)
**Status:** ✅ Ready for Deployment (with voltage monitoring)

---

## ✅ Confirmed Pin Mappings

| Component | Pin | GPIO | Verified |
|-----------|-----|------|----------|
| **MQ7 Sensor (A_OUT)** | A0 | ADC | ✅ Confirmed |
| **MOSFET Gate** | D5 | GPIO14 | ✅ Confirmed |
| **OLED Display (I2C)** | D2/D1 | GPIO4/GPIO5 | ✅ Confirmed (0x3C) |

---

## ✅ Hardware Components Confirmed

1. **Microcontroller:** ESP8266 NodeMCU 1.0 (ESP-12E module)
2. **CO Sensor:** Flying Fish MQ7 module (blue PCB, 4-pin: VCC/GND/D_OUT/A_OUT)
3. **MOSFET:** IRLZ44N N-channel logic-level MOSFET
4. **Display:** SSD1306 OLED 128x64, I2C address 0x3C
5. **Power:** USB 5V (assumed)

---

## ⚠️ CRITICAL: Voltage Divider Issue

### Sir Francis' Response:
- **Question:** "Is there a voltage divider between MQ7 and A0?"
- **Answer:** "No divider"

### Safety Concern:

**ESP8266 A0 Specification:** 0-1V maximum input
**MQ7 Analog Output:** Typically 0-5V range
**Risk:** Direct connection can damage ESP8266 A0 pin

### Possible Explanations:

1. **Flying Fish module has onboard voltage divider** (common on newer versions)
2. **MQ7 output voltage stays below 1V** during normal operation
3. **Circuit hasn't been fully tested yet** (voltage might exceed safe levels under high CO)

### Recommended Actions:

#### BEFORE FIRST DEPLOYMENT:

1. **Measure voltage at MQ7 A_OUT pin:**
   - Set multimeter to DC voltage mode
   - Probe: MQ7 A_OUT (blue wire) to GND
   - Expected safe range: 0-1V
   - **If > 1V:** Add external voltage divider immediately

2. **Add voltage divider if needed:**
   ```
   MQ7 A_OUT ──┬─── [R1: 270kΩ] ─── A0 (ESP8266)
               │
               └─── [R2: 100kΩ] ─── GND

   Output voltage = V_in × (R2 / (R1 + R2))
                  = 5V × (100k / 370k)
                  = 1.35V (safe for ESP8266)
   ```

3. **Update code ADC mapping if divider added:**
   ```cpp
   // WITHOUT divider (current code):
   co_ppm = map(analogValue, 0, 1023, 0, 1000);

   // WITH divider (if added):
   // Compensate for voltage division ratio (0.27)
   float voltage = analogValue * (1.0 / 1023.0);  // 0-1V
   float original_voltage = voltage / 0.27;        // Scale back to 0-5V equivalent
   co_ppm = map(original_voltage * 1023, 0, 1023, 0, 1000);
   ```

---

## 📋 Code Changes Made

### Original Sir Francis Code (INCORRECT):
```cpp
#define MQ7_PIN 34        // ❌ ESP32 pin (doesn't exist on ESP8266)
#define MOSFET_PIN 26     // ❌ ESP32 pin (doesn't exist on ESP8266)
```

### Updated to Match Actual Circuit:
```cpp
#define MQ7_PIN A0        // ✅ ESP8266 analog pin (verified)
#define MOSFET_PIN D5     // ✅ GPIO14 (verified with Sir Francis)
```

---

## 🎯 Deployment Checklist

- [x] Pin mappings verified with hardware owner
- [x] Code updated to match actual circuit
- [x] Documentation updated with correct pins
- [ ] **CRITICAL:** Measure MQ7 A_OUT voltage before power-up
- [ ] Add voltage divider if measurement > 1V
- [ ] Test MOSFET activation (should trigger at 200 ppm)
- [ ] Test OLED display output (verify 0x3C address works)
- [ ] Monitor Serial output for voltage damage symptoms
- [ ] Test session START/STOP via PWA

---

## 🔧 Testing Instructions

### 1. Voltage Safety Test (DO THIS FIRST!)
```
Power on circuit → Measure MQ7 A_OUT voltage → Confirm < 1V
```

### 2. Basic Hardware Test
```
Upload code → Open Serial Monitor (115200 baud) →
Watch for WiFi connection → Check OLED displays data →
Verify no "all zeros" or "max values" (signs of pin damage)
```

### 3. MOSFET Test
```
Breathe on MQ7 sensor (increases CO reading) →
Watch Serial Monitor →
MOSFET should activate when CO > 200 ppm
```

### 4. Session Integration Test
```
Open PWA Dashboard → Click "Start" button →
Check Serial Monitor shows "✅ Started monitoring session: [UUID]" →
Verify readings appear in Supabase co_readings table →
Click "Stop" → Verify session ends
```

---

## 📊 Flying Fish MQ7 Module Notes

**Model:** Blue PCB breakout board with "Flying Fish" logo
**Pins:** 4-pin configuration (VCC, GND, D_OUT, A_OUT)
**Known Variants:**
- Some versions include onboard 5V→3.3V level shifter on A_OUT
- Some require external voltage divider
- **Check module documentation or measure voltage to confirm**

**Common Specs:**
- Operating voltage: 5V
- Heater resistance: 33Ω ± 5%
- Detection range: 20-2000 ppm CO
- Warm-up time: 24-48 hours for stable readings

---

## ✅ Final Status

**Code Status:** ✅ Updated and ready
**Documentation Status:** ✅ Complete
**Hardware Status:** ⚠️ Voltage measurement required before deployment

**Next Step:** Measure MQ7 A_OUT voltage, then proceed with deployment

---

**Verified by:** Sir Francis
**Code updated by:** CO-SAFE Development Team
**Files Ready:**
- `docs/arduino-code/CO_SAFE_Monitor-enhanced.ino` ✅
- `docs/arduino-code/arduino-code-final.md` ✅
