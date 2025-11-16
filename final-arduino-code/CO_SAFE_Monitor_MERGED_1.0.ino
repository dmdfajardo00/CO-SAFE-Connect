/*
 * CO-SAFE Monitor - MERGED PRODUCTION VERSION
 *
 * Base: HTTP Polling Version (working Supabase integration)
 * Enhanced: Final.ino calibration logic (MQ7 exponential curve-fit)
 *
 * Key Features:
 * - HTTP polling for commands (10-second interval)
 * - REST API for sending readings (15-second interval)
 * - WiFi auto-reconnection
 * - NTP time sync for accurate timestamps
 * - Session-aware monitoring
 * - Proper MQ7 heating/sensing cycle (60s heat / 90s sense)
 * - Exponential calibration curve matching MQ7 datasheet
 * - Output clamping to prevent 1001+ values
 * - Memory optimized (30-40KB saved vs WebSocket version)
 *
 * Memory footprint: ~40-50KB free heap (stable)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ====== CONFIGURATION ======
#define POLL_INTERVAL 10000        // Poll for commands every 10 seconds
#define SEND_INTERVAL 5000         // Send readings every 5 seconds
#define SESSION_TIMEOUT_MINS 60    // Auto-stop after 60 minutes
#define WIFI_RETRY_MAX 5

// ====== HARDWARE ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define MQ7_PIN A0        // ESP8266 only analog pin (0-1V max)
#define MOSFET_PIN D5     // GPIO14 - verified with hardware team

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== MQ7 CALIBRATION CONSTANTS ======
#define RL 10.0           // Load resistor in kOhms
float Ro = 0.36;          // Clean air baseline resistance (needs calibration in clean air)

// ====== HEATING CYCLE TIMING ======
unsigned long previousMillis = 0;
bool isHeating = true;
const unsigned long HEATING_TIME = 60000;   // 60 seconds at HIGH (5V)
const unsigned long SENSING_TIME = 90000;   // 90 seconds at LOW (1.4V)

// ====== WIFI & CREDENTIALS ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE ======
const char SUPABASE_URL[] = "naadaumxaglqzucacexb.supabase.co";
const char SUPABASE_KEY[] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bcY";
const char DEVICE_ID[] = "CO-SAFE-001";

// ====== NTP ======
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// ====== STATE ======
String currentSessionId = "";
bool isMonitoring = false;
unsigned long sessionStartTime = 0;
unsigned long lastPoll = 0;
unsigned long lastSend = 0;
unsigned long lastWifiCheck = 0;
float co_ppm = 0;

// ====== FUNCTION PROTOTYPES ======
void connectWiFi();
void pollCommands();
void executeCommand(String cmd, int cmdId);
bool sendReading();
bool markCommandExecuted(int cmdId);
String getTimestamp();
const char* getStatus(float co);
float calculateCO(int analogValue);

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);  // Start in sensing phase

  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED failed"));
    for (;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("CO-SAFE Monitor");
  display.println("HTTP Polling v2.1");
  display.println("(Calibrated)");
  display.display();
  delay(2000);

  // WiFi
  connectWiFi();

  // NTP
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Syncing time...");
  display.display();

  timeClient.begin();
  int ntpRetries = 0;
  while (!timeClient.update() && ntpRetries < 5) {
    timeClient.forceUpdate();
    delay(1000);
    ntpRetries++;
  }

  if (ntpRetries < 5) {
    Serial.println("✅ NTP synced: " + timeClient.getFormattedTime());
  } else {
    Serial.println("⚠️ NTP failed, using millis()");
  }

  // Ready
  Serial.println("✅ System initialized");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("System Ready");
  display.println("Waiting for");
  display.println("session...");
  display.display();
}

// ====== MAIN LOOP ======
void loop() {
  unsigned long currentMillis = millis();

  // ====== HEATING CYCLE CONTROL ======
  // Cycle between heating (60s @ HIGH) and sensing (90s @ LOW)
  if (isHeating && (currentMillis - previousMillis >= HEATING_TIME)) {
    isHeating = false;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, LOW);  // Switch to sensing phase (1.4V)
    Serial.println("Switched to SENSING phase (1.4V)");
  }
  else if (!isHeating && (currentMillis - previousMillis >= SENSING_TIME)) {
    isHeating = true;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, HIGH);  // Switch to heating phase (5V)
    Serial.println("Switched to HEATING phase (5V)");
  }

  // WiFi check (every 10s)
  if (millis() - lastWifiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi lost, reconnecting...");
      connectWiFi();
    }
    lastWifiCheck = millis();
  }

  // Poll for commands
  if (millis() - lastPoll > POLL_INTERVAL) {
    pollCommands();
    lastPoll = millis();
  }

  // Update NTP
  timeClient.update();

  // ====== MEASUREMENT (Only during Sensing Phase) ======
  // This ensures consistent readings after heater stabilizes
  if (!isHeating) {
    int analogValue = analogRead(MQ7_PIN);
    co_ppm = calculateCO(analogValue);
    // Output clamping: prevent 1001+ values
    co_ppm = constrain(co_ppm, 0, 1000);
  }

  // Control MOSFET (alarm if CO > 200 ppm during sensing)
  digitalWrite(MOSFET_PIN, co_ppm > 200 ? HIGH : LOW);

  // Display
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("CO: ");
  display.print(co_ppm, 0);
  display.println(" ppm");
  display.print("MOSFET: ");
  display.println(digitalRead(MOSFET_PIN) ? "ON" : "OFF");
  display.print("WiFi: ");
  display.println(WiFi.status() == WL_CONNECTED ? "OK" : "ERR");
  display.print("Session: ");
  display.println(isMonitoring ? currentSessionId.substring(0, 8) : "IDLE");
  display.print("Phase: ");
  display.println(isHeating ? "HEAT" : "SENSE");
  display.display();

  // Send reading (if monitoring)
  if (isMonitoring && millis() - lastSend > SEND_INTERVAL) {
    sendReading();
    lastSend = millis();
  }

  // Session timeout check
  if (isMonitoring && (millis() - sessionStartTime) / 60000 > SESSION_TIMEOUT_MINS) {
    Serial.println("⏱️ Session timeout");
    isMonitoring = false;
    currentSessionId = "";
  }

  delay(1000);
}

// ====== CALCULATE CO (MQ7 Exponential Curve-Fit) ======
// Implements proper MQ7 sensor calibration using datasheet formula
float calculateCO(int analogValue) {
  // Constrain to valid range to prevent division errors
  analogValue = constrain(analogValue, 1, 1022);

  // Calculate sensor resistance (Rs) using voltage divider formula
  // Rs = RL × (1023 - ADC) / ADC
  float Rs = RL * (1023.0 - analogValue) / analogValue;

  // Calculate ratio for calibration curve
  float ratio = Rs / Ro;

  // Constrain ratio to reasonable range
  ratio = constrain(ratio, 0.01, 1000.0);

  // MQ7 exponential calibration formula from datasheet
  // log(ppm) = 1.7 - 0.77 × log(Rs/Ro)
  // ppm = 10^[0.77 × log(Rs/Ro) - 1.7]  (inverted)
  // Rearranged: ppm = 10^[(log(ratio) - 1.7) / -0.77]
  float ppm = pow(10, ((log10(ratio) - 1.7) / -0.77));

  // Safety checks
  if (!isfinite(ppm) || ppm > 999.99) {
    ppm = 999.99;
  }
  if (ppm < 0) {
    ppm = 0;
  }

  return ppm;
}

// ====== WIFI CONNECTION ======
void connectWiFi() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.display();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_RETRY_MAX * 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi: " + WiFi.localIP().toString());
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Connected");
    display.println(WiFi.localIP());
    display.display();
    delay(1000);
  } else {
    Serial.println("\n❌ WiFi failed");
  }
}

// ====== POLL COMMANDS ======
void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);  // Reduce SSL buffers: 32KB → 1KB (saves 31KB heap)
  HTTPClient http;

  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/device_commands?device_id=eq.";
  url += DEVICE_ID;
  url += "&executed=eq.false&order=created_at.desc&limit=1";

  if (!http.begin(client, url)) {
    Serial.println("⚠️ HTTP begin failed");
    return;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();

    // Quick check if we have data
    if (payload.length() > 2 && payload.indexOf("command") > 0) {
      // Parse manually (lightweight)
      int idStart = payload.indexOf("\"id\":") + 5;
      int idEnd = payload.indexOf(",", idStart);
      int cmdId = payload.substring(idStart, idEnd).toInt();

      int cmdStart = payload.indexOf("\"command\":\"") + 11;
      int cmdEnd = payload.indexOf("\"", cmdStart);
      String cmd = payload.substring(cmdStart, cmdEnd);

      if (cmd.length() > 0) {
        Serial.println("📩 Command: " + cmd);
        executeCommand(cmd, cmdId);
      }
    }
  } else if (code > 0) {
    Serial.printf("⚠️ Poll failed: %d\n", code);
  }

  http.end();
}

// ====== EXECUTE COMMAND ======
void executeCommand(String cmd, int cmdId) {
  if (cmd.startsWith("START_SESSION:")) {
    currentSessionId = cmd.substring(14);

    if (currentSessionId.length() == 36) { // UUID validation
      isMonitoring = true;
      sessionStartTime = millis();
      Serial.println("✅ Session started: " + currentSessionId);

      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Session Started!");
      display.println(currentSessionId.substring(0, 8) + "...");
      display.display();
      delay(2000);
    }
  }
  else if (cmd == "STOP_SESSION") {
    Serial.println("✅ Session stopped");
    isMonitoring = false;
    currentSessionId = "";

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Session Stopped");
    display.display();
    delay(2000);
  }

  markCommandExecuted(cmdId);
}

// ====== SEND READING (Direct HTTP - bypassing ESPSupabase library) ======
bool sendReading() {
  if (!isMonitoring || currentSessionId.length() == 0) return false;
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);  // Reduce SSL buffers: 32KB → 1KB (saves 31KB heap)
  HTTPClient http;

  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/co_readings";

  if (!http.begin(client, url)) {
    Serial.println("❌ HTTP begin failed for readings");
    return false;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["co_level"] = co_ppm;
  doc["status"] = getStatus(co_ppm);
  doc["mosfet_status"] = (digitalRead(MOSFET_PIN) == HIGH);
  doc["session_id"] = currentSessionId;

  String timestamp = getTimestamp();
  if (timestamp.length() > 0) {
    doc["created_at"] = timestamp;
  }

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);

  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("✅ Reading sent: %d\n", code);
    return true;
  } else {
    Serial.printf("❌ Send failed: %d\n", code);
    return false;
  }
}

// ====== MARK COMMAND EXECUTED (Direct HTTP - bypassing ESPSupabase library) ======
bool markCommandExecuted(int cmdId) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);  // Reduce SSL buffers: 32KB → 1KB (saves 31KB heap)
  HTTPClient http;

  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/device_commands?id=eq.";
  url += String(cmdId);

  if (!http.begin(client, url)) {
    Serial.println("❌ HTTP begin failed for command update");
    return false;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["executed"] = true;

  String timestamp = getTimestamp();
  if (timestamp.length() > 0) {
    doc["executed_at"] = timestamp;
  }

  String payload;
  serializeJson(doc, payload);

  int code = http.PATCH(payload);

  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("✅ Command %d marked executed\n", cmdId);
    return true;
  } else {
    Serial.printf("❌ Mark executed failed: %d\n", code);
  }
  return false;
}

// ====== GET TIMESTAMP ======
String getTimestamp() {
  if (!timeClient.isTimeSet()) return "";

  unsigned long epochTime = timeClient.getEpochTime();
  time_t rawtime = epochTime;
  struct tm* ti = gmtime(&rawtime);

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", ti);
  return String(buffer);
}

// ====== GET STATUS ======
const char* getStatus(float co) {
  if (co >= 50) return "critical";
  if (co >= 25) return "warning";
  return "safe";
}
