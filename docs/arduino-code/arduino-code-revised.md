# Vehicle Carbon Monoxide Monitor - REVISED CODE

## Project Overview
A vehicle carbon monoxide monitoring system using ESP8266 as the MCU/WiFi module, MQ7 analog sensor for CO detection, and IRLZ44N MOSFET for control. The system displays real-time readings on an OLED display and logs data to Supabase.

**UPDATED:** This version uses the correct Supabase schema from `initial-set-up.sql`

---

## Hardware Components
- **ESP8266** (NodeMCU 1.0 ESP-12E Module)
- **MQ7 Sensor** - Carbon Monoxide (CO) analog sensor
- **IRLZ44N MOSFET** - N-channel logic level MOSFET for switching
- **SSD1306 OLED Display** (128x64) - I2C interface
- **Miscellaneous** - Resistors, wiring, power supply

---

## Pin Configuration

| Component | Pin | Description |
|-----------|-----|-------------|
| MQ7 Sensor | GPIO 34 | Analog input for CO reading |
| MOSFET Gate | GPIO 26 | Digital output to control MOSFET |
| OLED Display | I2C (SDA/SCL) | Display interface |

---

## Arduino IDE Code

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ====== OLED SETUP ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== PIN DEFINITIONS ======
#define MQ7_PIN 34        // Analog pin for MQ7 sensor
#define MOSFET_PIN 26     // Gate pin for IRLZ44N

// ====== WIFI CREDENTIALS ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE API CONFIGURATION ======
const char* SUPABASE_URL = "https://naadaumxaglqzucacexb.supabase.co/rest/v1/co_readings";
const char* SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bc0";
const char* DEVICE_ID = "CO-SAFE-001";  // Must match device in database
WiFiClient client;

// ====== VARIABLES ======
float co_ppm = 0;
unsigned long lastSend = 0;
const unsigned long sendInterval = 15000;  // send every 15 seconds

void setup() {
  Serial.begin(115200);
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);

  // ====== OLED INIT ======
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.display();

  // ====== WIFI CONNECT ======
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WiFi connected!");
  display.display();
  delay(1000);
}

void loop() {
  // Simulate CO sensor reading
  int analogValue = analogRead(MQ7_PIN);
  co_ppm = map(analogValue, 0, 4095, 0, 1000);  // simple mapping

  // ====== CONTROL MOSFET ======
  if (co_ppm > 200) {
    digitalWrite(MOSFET_PIN, HIGH);
  } else {
    digitalWrite(MOSFET_PIN, LOW);
  }

  // ====== DISPLAY DATA ======
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("CO Level: ");
  display.print(co_ppm);
  display.println(" ppm");
  display.print("MOSFET: ");
  display.println(digitalRead(MOSFET_PIN) ? "ON" : "OFF");
  display.display();

  // ====== SEND DATA TO SUPABASE ======
  if (millis() - lastSend > sendInterval) {
    sendToSupabase(co_ppm);
    lastSend = millis();
  }

  delay(1000);
}

void sendToSupabase(float co) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(client, SUPABASE_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_API_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);

    // Determine status based on CO level (matches SQL schema thresholds)
    String status;
    if (co >= 50) {
      status = "critical";
    } else if (co >= 25) {
      status = "warning";
    } else {
      status = "safe";
    }

    // Build payload matching co_readings table schema
    String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                     "\",\"co_level\":" + String(co) +
                     ",\"status\":\"" + status + "\"}";

    int httpResponseCode = http.POST(payload);
    Serial.print("POST Response: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode > 0) {
      Serial.println(http.getString());
    }

    http.end();
  } else {
    Serial.println("WiFi not connected!");
  }
}
```

---

## Required Libraries

Install these libraries in Arduino IDE via **Sketch → Include Library → Manage Libraries**:

1. **ESP8266 by ESP8266 Community**
2. **Adafruit SSD1306**
3. **Adafruit GFX Library**

---

## Changes from Original Code

### ✅ Updated for CO-SAFE Database Schema

1. **Supabase URL** - Now points to correct table: `co_readings`
2. **API Credentials** - Uses production Supabase project credentials
3. **Device ID** - Added constant `DEVICE_ID` set to `"CO-SAFE-001"` (matches seed data)
4. **Payload Structure** - Changed from:
   ```json
   {"co_ppm": X, "mosfet_status": Y}
   ```
   To:
   ```json
   {"device_id": "CO-SAFE-001", "co_level": X, "status": "safe|warning|critical"}
   ```
5. **Status Calculation** - Now matches SQL schema thresholds:
   - `< 25 ppm` = "safe"
   - `25-49 ppm` = "warning"
   - `≥ 50 ppm` = "critical"

---

## System Operation

### How It Works

1. **Sensor Reading**: Reads CO levels from MQ7 analog input (GPIO 34)
2. **Display**: Shows current CO ppm and MOSFET state on the OLED display
3. **Threshold Control**: When CO > 200 ppm, activates MOSFET (can drive an alarm, LED, or ventilation system)
4. **Data Logging**: Every 15 seconds, posts readings to Supabase `co_readings` table via REST API
5. **WiFi Connectivity**: Maintains WiFi connection for cloud data logging

### Alarm Threshold
- **Normal Operation**: CO ≤ 200 ppm → MOSFET OFF
- **Alert Mode**: CO > 200 ppm → MOSFET ON (activates connected device)

### Database Status Thresholds
- **Safe**: CO < 25 ppm
- **Warning**: CO 25-49 ppm
- **Critical**: CO ≥ 50 ppm

---

## Configuration Steps

### Before Uploading

1. **Update WiFi credentials** (lines 47-48):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Verify device exists in database**:
   - The SQL migration already seeds `CO-SAFE-001`
   - Or manually insert your device into the `devices` table

3. **Ensure Supabase RLS policies allow writes**:
   - The migration enables anonymous writes to `co_readings`
   - Policy: "Devices can insert readings"

---

## Arduino IDE Setup Guide

### Step 1: Install ESP8266 Board Support

1. **Open Arduino IDE**
2. **Go to**: File → Preferences
3. **Find**: "Additional Boards Manager URLs"
4. **Add this URL**:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
5. Click **OK**

### Step 2: Install Board Package

1. **Open Boards Manager**: Tools → Board → Boards Manager
2. **Search for**: `esp8266`
3. **Install**: "ESP8266 by ESP8266 Community" (latest stable version, e.g., 3.1.2 or newer)

### Step 3: Select Your Board

1. **Go to**: Tools → Board → esp8266 → **NodeMCU 1.0 (ESP-12E Module)**
2. **Select COM Port**: Tools → Port → **COMx** (your ESP8266 port)

### Step 4: Verify and Upload

1. Click **✔ Verify** to compile the code
2. Click **→ Upload** to flash the ESP8266

---

## Troubleshooting

### Board Not Found
- Ensure ESP8266 board support is installed via Boards Manager
- Check that the correct board is selected: NodeMCU 1.0 (ESP-12E Module)

### Upload Failed
- Verify the correct COM port is selected
- Install USB drivers for CH340/CP2102 if needed
- Press the FLASH button on the ESP8266 during upload (if required)

### WiFi Connection Issues
- Double-check SSID and password
- Ensure 2.4 GHz WiFi (ESP8266 doesn't support 5 GHz)
- Check signal strength

### Supabase Connection Fails
- Verify device `CO-SAFE-001` exists in `devices` table (seed data creates it)
- Check internet connectivity
- Review Serial Monitor for HTTP response codes (201 = success)
- Verify RLS policies allow anonymous INSERT on `co_readings`

### HTTP 400/401 Errors
- API key is correct in the code
- Device ID matches a record in `devices` table
- Payload JSON is valid (check Serial Monitor output)

### OLED Not Working
- Verify I2C address (typically 0x3C or 0x3D)
- Check SDA/SCL connections
- Install Adafruit libraries correctly

---

## Testing

### Expected Behavior

1. **On power-up**: Display shows "Connecting WiFi..." then "WiFi connected!"
2. **Every second**: Display updates with current CO level and MOSFET status
3. **Every 15 seconds**: Sends reading to Supabase (check Serial Monitor for response code)
4. **HTTP 201**: Successful insert into database
5. **Check Supabase**: Query `co_readings` table to see incoming data

### Verify Database Writes

Run this query in Supabase SQL Editor:
```sql
SELECT * FROM co_readings
WHERE device_id = 'CO-SAFE-001'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Safety Considerations

⚠️ **Important Safety Notes**:

1. **CO Detection**: This is a prototype system. For safety-critical applications, use certified CO detectors
2. **Calibration**: MQ7 sensors require proper calibration for accurate readings
3. **Sensor Warm-up**: MQ7 sensors need 24-48 hours of initial warm-up for stable readings
4. **Ventilation**: Always ensure proper ventilation in vehicles
5. **Power Supply**: Use appropriate power supply ratings for the ESP8266 and connected devices
6. **MOSFET Rating**: Ensure IRLZ44N can handle the load current of connected devices

---

## Future Enhancements

- Implement session tracking (call `start_session()` function)
- Add SMS/email alerts for high CO levels
- Implement sensor calibration routine
- Add temperature and humidity compensation
- Create web dashboard using CO-SAFE Connect PWA
- Implement battery backup system
- Add GPS location tracking
- Multi-sensor support for different vehicle zones

---

## License & Support

This is an educational/prototype project. Modify and use at your own discretion. For production use, consult with safety experts and obtain proper certifications.

---

**Last Updated**: January 2025
**Platform**: ESP8266 (NodeMCU 1.0)
**IDE**: Arduino IDE 1.8.x or 2.x
**Database**: Supabase PostgreSQL (CO-SAFE schema)
