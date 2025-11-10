# Vehicle Carbon Monoxide Monitor - FINAL SCHEMA-MATCHED CODE

## Project Overview
A vehicle carbon monoxide monitoring system using ESP8266 as the MCU/WiFi module, MQ7 analog sensor for CO detection, and IRLZ44N MOSFET for control. The system displays real-time readings on an OLED display and logs data to Supabase.

**FINAL VERSION:** Fully matched to CO-SAFE Supabase schema with `mosfet_status` column

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
  // Read CO sensor
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
    sendToSupabase(co_ppm, digitalRead(MOSFET_PIN));
    lastSend = millis();
  }

  delay(1000);
}

void sendToSupabase(float co, int mosfetStatus) {
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

    // Convert mosfet status to boolean string
    String mosfetBool = (mosfetStatus == 1) ? "true" : "false";

    // Build payload matching co_readings table schema
    // Required: device_id, co_level
    // Optional: status, mosfet_status
    String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                     "\",\"co_level\":" + String(co) +
                     ",\"status\":\"" + status +
                     "\",\"mosfet_status\":" + mosfetBool + "}";

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

## Payload Schema Mapping

### Arduino Sends:
```json
{
  "device_id": "CO-SAFE-001",
  "co_level": 45.2,
  "status": "warning",
  "mosfet_status": true
}
```

### Supabase `co_readings` Table:
| Column | Type | Nullable | Default | Arduino Value |
|--------|------|----------|---------|---------------|
| `id` | BIGINT | NO | auto-increment | (auto) |
| `session_id` | UUID | YES | null | (null) |
| `device_id` | TEXT | NO | - | "CO-SAFE-001" |
| `co_level` | FLOAT | NO | - | 45.2 |
| `status` | TEXT | YES | null | "warning" |
| `created_at` | TIMESTAMPTZ | YES | now() | (auto) |
| `mosfet_status` | BOOLEAN | YES | false | true |

---

## Status Thresholds

### Database Classification:
- **Safe**: CO < 25 ppm
- **Warning**: CO 25-49 ppm
- **Critical**: CO ≥ 50 ppm

### MOSFET Activation:
- **OFF**: CO ≤ 200 ppm
- **ON**: CO > 200 ppm (activates alarm/ventilation)

---

## Configuration Steps

### Before Uploading

1. **Update WiFi credentials** (lines 23-24):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Verify device exists in database**:
   - The SQL migration seeds `CO-SAFE-001`
   - Or manually insert your device into the `devices` table:
   ```sql
   INSERT INTO devices (device_id, device_name, vehicle_model)
   VALUES ('CO-SAFE-001', 'Main Sensor', 'Your Vehicle Model');
   ```

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
3. **Install**: "ESP8266 by ESP8266 Community" (latest stable version)

### Step 3: Select Your Board

1. **Go to**: Tools → Board → esp8266 → **NodeMCU 1.0 (ESP-12E Module)**
2. **Select COM Port**: Tools → Port → **COMx** (your ESP8266 port)

### Step 4: Verify and Upload

1. Click **✔ Verify** to compile the code
2. Click **→ Upload** to flash the ESP8266

---

## Testing

### Expected Behavior

1. **On power-up**: Display shows "Connecting WiFi..." then "WiFi connected!"
2. **Every second**: Display updates with current CO level and MOSFET status
3. **Every 15 seconds**: Sends reading to Supabase (check Serial Monitor)
4. **HTTP 201**: Successful insert into database

### Verify Database Writes

Run this query in Supabase SQL Editor:
```sql
SELECT
  id,
  device_id,
  co_level,
  status,
  mosfet_status,
  created_at
FROM co_readings
WHERE device_id = 'CO-SAFE-001'
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Response Codes

- **201 Created**: Data successfully inserted
- **400 Bad Request**: JSON payload error or missing required field
- **401 Unauthorized**: API key incorrect
- **409 Conflict**: Device ID not found in `devices` table

---

## Troubleshooting

### HTTP 400 Error
- Check JSON payload format in Serial Monitor
- Ensure `device_id` exists in `devices` table
- Verify `co_level` is a valid number

### HTTP 401 Error
- Verify `SUPABASE_API_KEY` is correct
- Check RLS policies allow anonymous INSERT

### HTTP 409 Error
- Insert device into `devices` table first
- Check foreign key constraint on `device_id`

### MOSFET Not Activating
- Verify pin connection (GPIO 26)
- Test with Serial Monitor: check if CO > 200
- Ensure MOSFET gate resistor is correct

### OLED Not Working
- Verify I2C address (typically 0x3C)
- Check SDA/SCL connections
- Test with I2C scanner sketch

---

## Changes from Original Sir Francis Code

1. ✅ **Table name**: `your_table_name` → `co_readings`
2. ✅ **URL**: Updated to production Supabase endpoint
3. ✅ **Payload**:
   - Added `device_id` field (required)
   - Changed `co_ppm` → `co_level`
   - Added `status` field (safe/warning/critical)
   - Kept `mosfet_status` (now as boolean)
4. ✅ **Schema compliance**: All fields match `co_readings` table structure
5. ✅ **Zero breaking changes**: Core logic (pins, thresholds, display) unchanged

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

**Last Updated**: January 2025
**Platform**: ESP8266 (NodeMCU 1.0)
**IDE**: Arduino IDE 1.8.x or 2.x
**Database**: Supabase PostgreSQL (CO-SAFE schema with mosfet_status)
**Schema Version**: v2 (includes mosfet_status column)
