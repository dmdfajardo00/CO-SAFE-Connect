/*
 * CO-SAFE Monitor - FINAL (Heater-only MOSFET, uses working logic)
 *
 * - MOSFET_PIN is HEATER ONLY (HIGH = HEAT (5V), LOW = SENSE (~1.4V))
 * - Timing: 60s HEAT, 90s SENSE
 * - Ro fixed to calibrated value (2.879 kΩ)
 * - ADC averaging + EMA smoothing + 2-cycle preheat
 * - OLED, NTP, Supabase polling & REST send preserved
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
#define MQ7_PIN A0        // ESP8266 NodeMCU A0
#define MQ7_DOUT D6       // module digital output (optional)
#define MOSFET_PIN D1     // Heater control — MATCHING YOUR WORKING CODE (D1)

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== MQ7 CALIBRATION CONSTANTS ======
#define RL 10.0                 // Load resistor in kOhms
const float Ro = 2.879;        // Fixed clean-air baseline from your calibration (kΩ)

// ====== HEATING CYCLE TIMING ======
unsigned long previousMillis = 0;
bool isHeating = true;                     // start in heating phase (matches working code)
const unsigned long HEATING_TIME = 60000;  // 60 seconds (ms)
const unsigned long SENSING_TIME = 90000;  // 90 seconds (ms)

// ====== PREHEAT + SMOOTHING ======
bool preheatDone = false;
unsigned long preheatStart = 0;
float ema_co = 0.0;            // EMA smoothed CO value
const float EMA_ALPHA = 0.20;  // smoothing factor (0.1-0.3 recommended)

// ====== ADC AVERAGING ======
int readADCaveraged(int samples = 8, int delayMs = 6) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(MQ7_PIN);
    delay(delayMs);
  }
  int avg = (int)(sum / samples);
  return constrain(avg, 1, 1022);
}

// ====== WIFI & CREDENTIALS ======
const char* ssid = "Francisco";
const char* password = "DFh$E528*1tC";

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
unsigned long lastHeartbeat = 0;  // For periodic status logging
float co_ppm = 0.0;

// ====== FUNCTION PROTOTYPES ======
void connectWiFi();
void pollCommands();
void executeCommand(String cmd, int cmdId);
bool sendReading();
bool markCommandExecuted(int cmdId);
String getTimestamp();
const char* getStatus(float co);
float calculateCO(int analogValue);
bool testSupabaseConnection();

// ====== SETUP ======
void setup() {
  Serial.begin(115200);

  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);  // Start with heater OFF (sensing voltage) like your working code did
  pinMode(MQ7_DOUT, INPUT);

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
  display.println("Starting...");
  display.display();
  delay(1200);

  // WiFi
  connectWiFi();

  // Test Supabase connectivity
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n🔌 Testing Supabase connection...");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Testing Supabase...");
    display.display();

    if (testSupabaseConnection()) {
      Serial.println("✅ Supabase connection OK!");
      display.println("Supabase: OK");
    } else {
      Serial.println("❌ Supabase connection FAILED!");
      Serial.println("   Data will NOT be sent!");
      display.println("Supabase: FAIL");
    }
    display.display();
    delay(2000);
  }

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

  // Preheat start (start counting from boot)
  preheatStart = millis();

  // Ready
  Serial.println("✅ System initialized");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("System Ready");
  display.println("Waiting for session...");
  display.display();
}

// ====== MAIN LOOP ======
void loop() {
  unsigned long currentMillis = millis();

  // ====== HEATING CYCLE CONTROL ======
  if (isHeating && (currentMillis - previousMillis >= HEATING_TIME)) {
    isHeating = false;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, LOW);  // SENSING (1.4V)
    Serial.println("Switched to SENSING phase (1.4V)");
  }
  else if (!isHeating && (currentMillis - previousMillis >= SENSING_TIME)) {
    isHeating = true;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, HIGH); // HEATING (5V)
    Serial.println("Switched to HEATING phase (5V)");
  }

  // ====== PREHEAT: require 2 full cycles before measuring ======
  if (!preheatDone && (currentMillis - preheatStart >= (HEATING_TIME + SENSING_TIME) * 2UL)) {
    preheatDone = true;
    Serial.println("✅ Preheat complete - measurements enabled");
  }

  // ====== WIFI CHECK ======
  if (millis() - lastWifiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi lost, reconnecting...");
      connectWiFi();
    }
    lastWifiCheck = millis();
  }

  // ====== POLL COMMANDS ======
  if (millis() - lastPoll > POLL_INTERVAL) {
    pollCommands();
    lastPoll = millis();
  }

  // Update NTP time object
  timeClient.update();

  // ====== MEASUREMENT (Only during Sensing Phase and after preheat) ======
  if (!isHeating && preheatDone) {
    int analogValue = readADCaveraged(8, 6);
    float raw_ppm = calculateCO(analogValue);

    // EMA smoothing
    if (ema_co == 0.0) ema_co = raw_ppm;           // initialize with first valid reading
    else ema_co = EMA_ALPHA * raw_ppm + (1 - EMA_ALPHA) * ema_co;

    co_ppm = constrain(ema_co, 0.0, 1000.0);
  }

  // IMPORTANT: MOSFET is HEATER ONLY (Option A). No override based on ppm.

  // Optional: read DOUT for debugging
  bool doutHigh = digitalRead(MQ7_DOUT);

  // ====== DISPLAY ======
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("CO: ");
  display.print(co_ppm, 1);
  display.println(" ppm");
  display.print("Heater: ");
  display.println(isHeating ? "HEAT" : "SENSE");
  display.print("DOUT: ");
  display.println(doutHigh ? "ON" : "OFF");
  display.print("WiFi: ");
  display.println(WiFi.status() == WL_CONNECTED ? "OK" : "ERR");
  display.print("Session: ");
  display.println(isMonitoring ? currentSessionId.substring(0, 8) : "IDLE");
  display.display();

  // ====== SEND READING ======
  if (isMonitoring && millis() - lastSend > SEND_INTERVAL) {
    sendReading();
    lastSend = millis();
  }

  // ====== PERIODIC HEARTBEAT LOG (every 30 seconds) ======
  if (millis() - lastHeartbeat > 30000) {
    Serial.println("───────────────────────────────");
    Serial.printf("💓 HEARTBEAT | Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("   WiFi: %s | IP: %s\n",
      WiFi.status() == WL_CONNECTED ? "OK" : "DISCONNECTED",
      WiFi.localIP().toString().c_str());
    Serial.printf("   Monitoring: %s | Session: %s\n",
      isMonitoring ? "YES" : "NO",
      isMonitoring ? currentSessionId.substring(0, 8).c_str() : "none");
    Serial.printf("   Preheat: %s | Phase: %s\n",
      preheatDone ? "DONE" : "WAITING",
      isHeating ? "HEATING" : "SENSING");
    Serial.printf("   CO: %.2f ppm | Status: %s\n", co_ppm, getStatus(co_ppm));
    Serial.println("───────────────────────────────");
    lastHeartbeat = millis();
  }

  // ====== SESSION TIMEOUT ======
  if (isMonitoring && (millis() - sessionStartTime) / 60000 > SESSION_TIMEOUT_MINS) {
    Serial.println("⏱️ Session timeout");
    isMonitoring = false;
    currentSessionId = "";
  }

  delay(500);
}

// ====== CALCULATE CO (MQ7 Exponential curve) ======
float calculateCO(int analogValue) {
  analogValue = constrain(analogValue, 1, 1022);
  // Rs in kΩ
  float Rs = RL * (1023.0 - analogValue) / analogValue;
  float ratio = Rs / Ro;
  ratio = constrain(ratio, 0.01, 1000.0);

  // datasheet formula: log10(ppm) = 1.7 - 0.77 * log10(Rs/Ro)
  float logRatio = log10(ratio);
  float exponent = 1.7 - 0.77 * logRatio;
  float ppm = pow(10.0, exponent);

  if (!isfinite(ppm) || ppm > 999.99) ppm = 999.99;
  if (ppm < 0) ppm = 0;

  Serial.printf("ADC=%d Rs=%.3f kΩ Rs/Ro=%.3f CO=%.2f ppm\n", analogValue, Rs, ratio, ppm);
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
  Serial.println("🔍 Polling for commands...");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Poll aborted: WiFi not connected");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);
  HTTPClient http;

  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/device_commands?device_id=eq.";
  url += DEVICE_ID;
  url += "&executed=eq.false&order=created_at.desc&limit=1";

  if (!http.begin(client, url)) {
    Serial.println("❌ HTTP begin failed - check URL/SSL");
    return;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.setTimeout(10000);  // 10 second timeout

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    Serial.printf("📥 Response (%d bytes): %s\n", payload.length(),
      payload.length() > 100 ? (payload.substring(0, 100) + "...").c_str() : payload.c_str());

    if (payload.length() > 2 && payload.indexOf("command") > 0) {
      int idStart = payload.indexOf("\"id\":") + 5;
      int idEnd = payload.indexOf(",", idStart);
      int cmdId = payload.substring(idStart, idEnd).toInt();

      int cmdStart = payload.indexOf("\"command\":\"") + 11;
      int cmdEnd = payload.indexOf("\"", cmdStart);
      String cmd = payload.substring(cmdStart, cmdEnd);

      if (cmd.length() > 0) {
        Serial.println("📩 Command received: " + cmd);
        Serial.printf("   Command ID: %d\n", cmdId);
        executeCommand(cmd, cmdId);
      }
    } else {
      Serial.println("📭 No pending commands");
    }
  } else if (code > 0) {
    Serial.printf("⚠️ Poll failed with HTTP %d\n", code);
    String errorBody = http.getString();
    if (errorBody.length() > 0) {
      Serial.printf("   Error body: %s\n", errorBody.substring(0, 200).c_str());
    }
  } else {
    // code <= 0 means connection error
    Serial.printf("❌ Connection failed: %d\n", code);
    Serial.println("   Possible causes:");
    Serial.println("   - No internet access");
    Serial.println("   - DNS resolution failed");
    Serial.println("   - SSL handshake failed");
    Serial.println("   - Firewall blocking port 443");
  }

  http.end();
}

// ====== EXECUTE COMMAND ======
void executeCommand(String cmd, int cmdId) {
  if (cmd.startsWith("START_SESSION:")) {
    currentSessionId = cmd.substring(14);
    if (currentSessionId.length() == 36) {
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

// ====== SEND READING ======
bool sendReading() {
  Serial.println("📤 Sending reading...");

  if (!isMonitoring || currentSessionId.length() == 0) {
    Serial.println("❌ Send aborted: Not monitoring or no session");
    return false;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Send aborted: WiFi not connected");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);
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
  http.setTimeout(10000);  // 10 second timeout

  StaticJsonDocument<256> doc;
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

  Serial.printf("   Payload: %s\n", payload.c_str());

  int code = http.POST(payload);

  if (code >= 200 && code < 300) {
    Serial.printf("✅ Reading sent successfully! HTTP %d\n", code);
    Serial.printf("   CO: %.2f ppm | Status: %s | Session: %s\n",
      co_ppm, getStatus(co_ppm), currentSessionId.substring(0, 8).c_str());
    http.end();
    return true;
  } else if (code > 0) {
    Serial.printf("❌ Send failed: HTTP %d\n", code);
    String errorBody = http.getString();
    if (errorBody.length() > 0) {
      Serial.printf("   Error: %s\n", errorBody.substring(0, 200).c_str());
    }
    http.end();
    return false;
  } else {
    Serial.printf("❌ Connection failed: %d\n", code);
    Serial.println("   Check internet connectivity");
    http.end();
    return false;
  }
}

// ====== MARK COMMAND EXECUTED ======
bool markCommandExecuted(int cmdId) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);
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

  StaticJsonDocument<128> doc;
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

// ====== TEST SUPABASE CONNECTION ======
bool testSupabaseConnection() {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);
  HTTPClient http;

  // Try to GET the devices table (simple read test)
  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/devices?device_id=eq.";
  url += DEVICE_ID;
  url += "&limit=1";

  Serial.printf("   Testing URL: %s\n", url.c_str());

  if (!http.begin(client, url)) {
    Serial.println("   ❌ HTTP begin failed");
    return false;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.setTimeout(15000);  // 15 second timeout for initial test

  int code = http.GET();

  Serial.printf("   Response code: %d\n", code);

  if (code == 200) {
    String response = http.getString();
    Serial.printf("   Response: %s\n", response.substring(0, 100).c_str());
    http.end();
    return true;
  } else if (code > 0) {
    Serial.printf("   HTTP error: %d\n", code);
    String errorBody = http.getString();
    Serial.printf("   Body: %s\n", errorBody.substring(0, 100).c_str());
  } else {
    Serial.printf("   Connection error: %d\n", code);
    Serial.println("   Cannot reach Supabase!");
  }

  http.end();
  return false;
}
