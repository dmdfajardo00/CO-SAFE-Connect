/*
 * CO-SAFE Monitor - HTTP Polling Version
 *
 * Based on last known good config with added debug logging
 * Simple direct sensor reading (no heating cycles)
 *
 * Key Features:
 * - HTTP polling for commands (10-second interval)
 * - REST API for sending readings (15-second interval)
 * - WiFi auto-reconnection
 * - NTP time sync for accurate timestamps
 * - Session-aware monitoring
 * - Comprehensive debug logging
 * - Startup Supabase connectivity test
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
#define SEND_INTERVAL 15000        // Send readings every 15 seconds
#define SESSION_TIMEOUT_MINS 60    // Auto-stop after 60 minutes
#define WIFI_RETRY_MAX 5

// ====== HARDWARE ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define MQ7_PIN A0        // ESP8266 only analog pin (0-1V max)
#define MOSFET_PIN D5     // GPIO14 - verified with hardware team

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

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
unsigned long lastHeartbeat = 0;
float co_ppm = 0;

// ====== FUNCTION PROTOTYPES ======
void connectWiFi();
void pollCommands();
void executeCommand(String cmd, int cmdId);
bool sendReading();
bool markCommandExecuted(int cmdId);
String getTimestamp();
const char* getStatus(float co);
bool testSupabaseConnection();

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=============================");
  Serial.println("CO-SAFE Monitor v2.1");
  Serial.println("Simple Direct Reading Mode");
  Serial.println("=============================\n");

  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);

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
  display.println("v2.1 Direct Mode");
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
    Serial.println("NTP synced: " + timeClient.getFormattedTime());
  } else {
    Serial.println("NTP failed, using millis()");
  }

  // Test Supabase connectivity
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n Testing Supabase connection...");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Testing Supabase...");
    display.display();

    if (testSupabaseConnection()) {
      Serial.println("Supabase connection OK!");
      display.println("Supabase: OK");
    } else {
      Serial.println("Supabase connection FAILED!");
      Serial.println("   Data will NOT be sent!");
      display.println("Supabase: FAIL");
    }
    display.display();
    delay(2000);
  }

  // Ready
  Serial.println("\n System initialized");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("WiFi SSID: %s\n", ssid);
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.println("Waiting for START command from app...\n");

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("System Ready");
  display.println("Waiting for");
  display.println("session...");
  display.display();
}

// ====== MAIN LOOP ======
void loop() {
  // WiFi check (every 10s)
  if (millis() - lastWifiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost, reconnecting...");
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

  // Read sensor (Flying Fish MQ7 module - blue PCB with onboard regulation)
  // Note: ESP8266 A0 accepts 0-1V max. Module outputs regulated voltage.
  int analogValue = analogRead(MQ7_PIN);
  co_ppm = map(analogValue, 0, 1023, 0, 1000);

  // Control MOSFET (alarm only - activates above 200 ppm)
  digitalWrite(MOSFET_PIN, co_ppm > 200 ? HIGH : LOW);

  // Display
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("CO: ");
  display.print(co_ppm, 1);
  display.println(" ppm");
  display.print("Status: ");
  display.println(getStatus(co_ppm));
  display.print("MOSFET: ");
  display.println(digitalRead(MOSFET_PIN) ? "ALARM" : "OFF");
  display.print("WiFi: ");
  display.println(WiFi.status() == WL_CONNECTED ? "OK" : "ERR");
  display.print("Session: ");
  display.println(isMonitoring ? currentSessionId.substring(0, 8) : "IDLE");
  display.display();

  // Send reading (if monitoring)
  if (isMonitoring && millis() - lastSend > SEND_INTERVAL) {
    sendReading();
    lastSend = millis();
  }

  // Session timeout check
  if (isMonitoring && (millis() - sessionStartTime) / 60000 > SESSION_TIMEOUT_MINS) {
    Serial.println("Session timeout - auto stopping");
    isMonitoring = false;
    currentSessionId = "";
  }

  // Periodic heartbeat log (every 30 seconds)
  if (millis() - lastHeartbeat > 30000) {
    Serial.println("-----------------------------------");
    Serial.printf("HEARTBEAT | Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("   WiFi: %s | IP: %s\n",
      WiFi.status() == WL_CONNECTED ? "OK" : "DISCONNECTED",
      WiFi.localIP().toString().c_str());
    Serial.printf("   Monitoring: %s | Session: %s\n",
      isMonitoring ? "YES" : "NO",
      isMonitoring ? currentSessionId.substring(0, 8).c_str() : "none");
    Serial.printf("   CO: %.1f ppm | Status: %s | MOSFET: %s\n",
      co_ppm, getStatus(co_ppm),
      digitalRead(MOSFET_PIN) ? "ON" : "OFF");
    Serial.println("-----------------------------------");
    lastHeartbeat = millis();
  }

  delay(1000);
}

// ====== WIFI CONNECTION ======
void connectWiFi() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.println(ssid);
  display.display();

  Serial.printf("Connecting to WiFi: %s\n", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_RETRY_MAX * 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.println("IP: " + WiFi.localIP().toString());
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Connected");
    display.println(WiFi.localIP());
    display.display();
    delay(1000);
  } else {
    Serial.println("\nWiFi FAILED!");
    Serial.println("Check SSID/password");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi FAILED!");
    display.println("Check credentials");
    display.display();
  }
}

// ====== TEST SUPABASE CONNECTION ======
bool testSupabaseConnection() {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(512, 512);
  HTTPClient http;

  String url = "https://";
  url += SUPABASE_URL;
  url += "/rest/v1/devices?device_id=eq.";
  url += DEVICE_ID;
  url += "&limit=1";

  Serial.printf("   Testing URL: %s\n", url.c_str());

  if (!http.begin(client, url)) {
    Serial.println("   HTTP begin failed");
    return false;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.setTimeout(15000);

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

// ====== POLL COMMANDS ======
void pollCommands() {
  Serial.println("Polling for commands...");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Poll aborted: WiFi not connected");
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
    Serial.println("HTTP begin failed");
    return;
  }

  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.setTimeout(10000);

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    Serial.printf("Response (%d bytes)\n", payload.length());

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
        Serial.println("Command received: " + cmd);
        executeCommand(cmd, cmdId);
      }
    } else {
      Serial.println("No pending commands");
    }
  } else if (code > 0) {
    Serial.printf("Poll failed: HTTP %d\n", code);
    String errorBody = http.getString();
    if (errorBody.length() > 0) {
      Serial.printf("   Error: %s\n", errorBody.substring(0, 200).c_str());
    }
  } else {
    Serial.printf("Connection failed: %d\n", code);
    Serial.println("   Possible causes:");
    Serial.println("   - No internet access");
    Serial.println("   - DNS resolution failed");
    Serial.println("   - SSL handshake failed");
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
      Serial.println("Session started: " + currentSessionId);

      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Session Started!");
      display.println(currentSessionId.substring(0, 8) + "...");
      display.display();
      delay(2000);
    }
  }
  else if (cmd == "STOP_SESSION") {
    Serial.println("Session stopped");
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
  Serial.println("Sending reading...");

  if (!isMonitoring || currentSessionId.length() == 0) {
    Serial.println("Send aborted: Not monitoring or no session");
    return false;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Send aborted: WiFi not connected");
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
    Serial.println("HTTP begin failed for readings");
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

  Serial.printf("   Payload: %s\n", payload.c_str());

  int code = http.POST(payload);

  if (code >= 200 && code < 300) {
    Serial.printf("Reading sent! HTTP %d\n", code);
    Serial.printf("   CO: %.1f ppm | Status: %s\n", co_ppm, getStatus(co_ppm));
    http.end();
    return true;
  } else if (code > 0) {
    Serial.printf("Send failed: HTTP %d\n", code);
    String errorBody = http.getString();
    if (errorBody.length() > 0) {
      Serial.printf("   Error: %s\n", errorBody.substring(0, 200).c_str());
    }
  } else {
    Serial.printf("Connection failed: %d\n", code);
    Serial.println("   Check internet connectivity");
  }

  http.end();
  return false;
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
    Serial.println("HTTP begin failed for command update");
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
    Serial.printf("Command %d marked executed\n", cmdId);
    return true;
  } else {
    Serial.printf("Mark executed failed: %d\n", code);
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
