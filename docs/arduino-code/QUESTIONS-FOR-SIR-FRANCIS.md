# Questions for Sir Francis - Hardware Verification

**Context:** We're preparing to deploy the enhanced Arduino code with session management. Your original code has ESP32 pin numbers (GPIO 34, 26) but we're using ESP8266 NodeMCU. We need hardware clarification before sending code to the team.

---

## 🔴 CRITICAL - Pin Connections (MUST ANSWER)

### Question 1: MQ7 Sensor Pin
**Q:** Which ESP8266 pin is the MQ7 sensor's analog output (A_OUT) connected to?

- [ ] **A0** (the only analog pin on ESP8266) ← Most likely
- [ ] Other: _____________

**Why this matters:** Your code says GPIO 34, but that's an ESP32 pin. ESP8266 only has one analog pin: A0.

---

### Question 2: MOSFET Gate Pin
**Q:** Which ESP8266 pin is the IRLZ44N MOSFET gate connected to?

- [ ] **D1** (GPIO5) ← Common choice
- [ ] **D2** (GPIO4)
- [ ] **D5** (GPIO14)
- [ ] **D6** (GPIO12)
- [ ] Other: _____________

**Why this matters:** Your code says GPIO 26, but that's an ESP32 pin. ESP8266 NodeMCU uses D0-D8 pin labels.

---

## ⚠️ HIGH PRIORITY - Voltage Protection

### Question 3: Voltage Divider for MQ7
**Q:** Is there a voltage divider between the MQ7 analog output and ESP8266 A0 pin?

- [ ] **YES** - There are resistors (specify values): R1 = _____ kΩ, R2 = _____ kΩ
- [ ] **NO** - Direct connection from MQ7 to A0
- [ ] **NOT SURE** - Need to check

**Why this matters:**
- **MQ7 outputs 0-5V** with load resistor
- **ESP8266 A0 accepts 0-1V max** (will be damaged by 5V!)
- **Requires voltage divider:** 270kΩ + 100kΩ to drop 5V → 1.35V

**If NO divider exists:** We need to add one or adjust the code mapping calculations.

---

## 🔧 IMPORTANT - Hardware Verification

### Question 4: Board Type Confirmation
**Q:** Which microcontroller board are you actually using?

- [ ] **ESP8266 NodeMCU 1.0** (ESP-12E module) ← Circuit diagram shows this
- [ ] **ESP32 DevKit** (different board)
- [ ] Other: _____________

**Why this matters:** Your code libraries say ESP8266 but pin numbers say ESP32.

---

### Question 5: MQ7 Sensor Module Details
**Q:** Which MQ7 sensor module are you using?

- [ ] **Breakout board with A_OUT pin** (blue PCB, 4 pins: VCC/GND/D_OUT/A_OUT)
- [ ] **Bare MQ7 sensor** (with external load resistor: _____ kΩ)
- [ ] Module model number: _____________

**Why this matters:** Different modules have different output voltages and may include built-in voltage dividers.

---

### Question 6: OLED Display I2C Address
**Q:** What I2C address is your SSD1306 OLED display using?

- [ ] **0x3C** ← Most common (code currently uses this)
- [ ] **0x3D**
- [ ] Other: _____________

**Why this matters:** Code won't display anything if address is wrong.

---

## 📊 RECOMMENDED - Calibration & Testing

### Question 7: Was This Circuit Tested?
**Q:** Have you already built and tested this exact circuit with ESP8266?

- [ ] **YES** - It worked with the original code (GPIO 34/26)
- [ ] **YES** - But I changed pins to match ESP8266 (specify which pins)
- [ ] **NO** - This is a design/plan, not tested yet
- [ ] **PARTIALLY** - Some parts work, others don't

**If YES, please share:**
- Which pins actually worked: MQ7 = _____, MOSFET = _____
- Any code changes you made: _________________________________

---

### Question 8: MQ7 Calibration Values
**Q:** Do you have calibration values for the MQ7 sensor?

- [ ] **YES** - Clean air baseline: _____ ppm, Scale factor: _____
- [ ] **NO** - Using default linear mapping (0-1023 → 0-1000 ppm)

**Why this matters:** Current code uses simple linear mapping. Real MQ7 needs logarithmic calibration for accuracy.

---

### Question 9: Power Supply Details
**Q:** What power supply are you using?

- [ ] **USB 5V** (from computer/phone charger)
- [ ] **Battery pack:** _____ V, _____ mAh
- [ ] **Vehicle 12V** (with buck converter to 5V)
- [ ] Other: _____________

**Why this matters:** Affects deep-sleep mode configuration and battery optimization.

---

## 🔌 OPTIONAL - Library Versions

### Question 10: Library Versions That Worked
**Q:** Which library versions did you test with?

- ESP8266 Core version: _____________
- Adafruit SSD1306 version: _____________
- Adafruit GFX version: _____________

**Why this matters:** Helps avoid compatibility issues during deployment.

---

## 📝 Summary - What We Changed

**We fixed your original code:**

| Original (Your Code) | Our Fixed Version | Reason |
|---------------------|-------------------|---------|
| `MQ7_PIN = 34` | `MQ7_PIN = A0` | GPIO 34 is ESP32-only |
| `MOSFET_PIN = 26` | `MOSFET_PIN = D1` | GPIO 26 is ESP32-only |
| `map(val, 0, 4095, ...)` | `map(val, 0, 1023, ...)` | ESP8266 = 10-bit ADC |

**We also added:**
- ✅ Session management (START/STOP commands via WebSocket)
- ✅ WiFi reconnection with exponential backoff
- ✅ HTTP retry logic for failed requests
- ✅ NTP time sync for accurate timestamps
- ✅ Session timeout (60 minutes auto-stop)

---

## 🚀 Next Steps

**After you answer these questions:**
1. We'll update the pin definitions to match your circuit
2. Add voltage divider compensation if needed
3. Send final code to team for deployment

**Most critical:** Questions 1, 2, and 3 (pins and voltage divider)

---

**Date:** January 2025
**Prepared by:** CO-SAFE Development Team
**Circuit Reference:** docs/arduino-code/circuit-diagram.png
