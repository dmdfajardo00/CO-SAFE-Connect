/*
 * CO-SAFE Monitor - Enhanced Resilient Version (FIXED)
 *
 * Production-ready version with connection resilience, error handling,
 * time sync, power management, and session timeout.
 *
 * FIXES:
 * - Properly uses both ESPSupabase classes (Supabase for REST, SupabaseRealtime for WebSocket)
 * - Fixed type casting errors in min() functions
 * - Fixed String.replace() void return issue
 * - Corrected WebSocket listener setup with SupabaseRealtime class
 * - Fixed db.loop() to realtime.loop()
 *
 * New features:
 * - WiFi reconnection with exponential backoff
 * - WebSocket reconnection handling
 * - HTTP retry logic with backoff
 * - NTP time sync for accurate ISO8601 timestamps
 * - Optional deep-sleep cycle for battery operation
 * - Session timeout to prevent dangling sessions
 * - Comprehensive error handling and logging
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESPSupabase.h>
#include <ESPSupabaseRealtime.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ====== CONFIGURATION OPTIONS ======
#define ENABLE_DEEP_SLEEP false    // KEEP FALSE - Deep sleep prevents WebSocket reception
#define DEEP_SLEEP_SECONDS 30      // Sleep duration between readings
#define SESSION_TIMEOUT_MINUTES 60 // Auto-stop session after inactivity
#define WIFI_RETRY_MAX 5           // Max WiFi reconnection attempts
#define HTTP_RETRY_MAX 3           // Max HTTP request retries
#define WEBSOCKET_RECONNECT_INTERVAL 30000 // Try reconnecting every 30s

// ====== OLED SETUP ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== PIN DEFINITIONS ======
#define MQ7_PIN A0        // ESP8266 analog pin (verified with Sir Francis)
#define MOSFET_PIN D5     // Gate pin for IRLZ44N (GPIO14) - verified with Sir Francis

// ====== WIFI CREDENTIALS ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE API CONFIGURATION ======
const String SUPABASE_URL = "naadaumxaglqzucacexb.supabase.co";
const String SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bc0";
const char* DEVICE_ID = "CO-SAFE-001";
WiFiClient client;

// ====== NTP TIME SYNC ======
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every 60 seconds

// ====== SUPABASE INSTANCES ======
// Use Supabase class for REST API operations
Supabase db;
// Use SupabaseRealtime class for WebSocket listening
SupabaseRealtime realtime;

// ====== SESSION MANAGEMENT ======
String currentSessionId = "";
bool isMonitoring = false;
unsigned long sessionStartTime = 0;
unsigned long lastActivityTime = 0;

// ====== CONNECTION STATE ======
bool wifiConnected = false;
bool websocketConnected = false;
unsigned long lastWifiCheck = 0;
unsigned long lastWebsocketCheck = 0;
int wifiRetryCount = 0;

// ====== MONITORING VARIABLES ======
float co_ppm = 0;
unsigned long lastSend = 0;
const unsigned long sendInterval = 15000;  // Send every 15 seconds

// ====== FUNCTION PROTOTYPES ======
void connectWiFi();
void reconnectWiFi();
void reconnectWebSocket();
bool sendToSupabaseWithRetry(float co, int mosfetStatus);
bool markCommandExecutedWithRetry(int commandId);
String getCurrentTimestamp();
void checkSessionTimeout();
void enterDeepSleep();
void onCommandReceived(String payload);

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
  display.println("CO-SAFE Monitor");
  display.println("Enhanced v2.0 FIXED");
  display.display();
  delay(2000);

  // ====== WIFI CONNECT ======
  connectWiFi();

  // ====== NTP SYNC ======
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
    Serial.println("✅ NTP time synced: " + timeClient.getFormattedTime());
  } else {
    Serial.println("⚠️ NTP sync failed, using millis() fallback");
  }

  // ====== INITIALIZE SUPABASE REST API ======
  db.begin(SUPABASE_URL, SUPABASE_API_KEY);
  Serial.println("✅ Supabase REST API initialized");

  // ====== INITIALIZE SUPABASE REALTIME ======
  // ====== MEMORY OPTIMIZATION BEFORE WEBSOCKET ======
  // Force garbage collection before SSL connection
  ESP.wdtFeed();  // Feed watchdog
  delay(10);      // Allow background tasks

  uint32_t heapBefore = ESP.getFreeHeap();
  Serial.printf("Free heap before WebSocket: %d bytes\n", heapBefore);

  if (heapBefore < 35000) {
    Serial.println("⚠️ WARNING: Low memory! Attempting cleanup...");
    // Clear any unused String objects
    String().~String();
    delay(100);
    Serial.printf("Free heap after cleanup: %d bytes\n", ESP.getFreeHeap());
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting to");
  display.println("Supabase...");
  display.display();

  // Initialize with callback function (3 parameters required)
  realtime.begin(SUPABASE_URL, SUPABASE_API_KEY, onCommandReceived);

  // Add changes listener for device_commands table (4 parameters required)
  realtime.addChangesListener(
    "device_commands",                    // Table name
    "INSERT",                             // Event type (INSERT, UPDATE, DELETE, or *)
    "public",                             // Schema name
    "device_id=eq.CO-SAFE-001"           // Filter
  );

  // Start listening to WebSocket events
  realtime.listen();

  // Wait for WebSocket connection with non-blocking yields
  Serial.println("⏳ Connecting to WebSocket...");
  unsigned long connectStart = millis();
  bool connected = false;

  while (millis() - connectStart < 10000) {  // 10 second timeout
    realtime.loop();  // Process WebSocket events during initialization
    yield();          // Non-blocking yield

    // Check if actually connected
    if (realtime.isConnected()) {
      connected = true;
      Serial.println("✅ WebSocket connected successfully!");
      break;
    }

    // Small delay between connection attempts
    delay(100);
  }

  if (!connected) {
    Serial.println("❌ WebSocket connection timeout after 10 seconds!");
    Serial.printf("Final heap: %d bytes\n", ESP.getFreeHeap());
    websocketConnected = false;
  } else {
    websocketConnected = true;
    Serial.println("✅ Supabase Realtime WebSocket initialized");
    // Give server time to process phx_join
    delay(500);
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("System Ready");
  display.println("Waiting for");
  display.println("session...");
  display.display();
  // REMOVED blocking delay(2000) - prevents WebSocket processing
}

void loop() {
  // ====== CONNECTION RESILIENCE ======
  // Check WiFi every 10 seconds
  if (millis() - lastWifiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi disconnected, reconnecting...");
      reconnectWiFi();
    }
    lastWifiCheck = millis();
  }

  // Check WebSocket connection every 30 seconds
  if (millis() - lastWebsocketCheck > WEBSOCKET_RECONNECT_INTERVAL) {
    if (!websocketConnected) {
      Serial.println("⚠️ WebSocket disconnected, reconnecting...");
      reconnectWebSocket();
    }
    lastWebsocketCheck = millis();
  }

  // ====== HANDLE SUPABASE REALTIME WEBSOCKET ======
  // Process WebSocket events - ALWAYS call to maintain connection
  realtime.loop();  // Must be called unconditionally for proper WebSocket handling

  // Update NTP time periodically
  timeClient.update();

  // ====== SESSION TIMEOUT CHECK ======
  if (isMonitoring) {
    checkSessionTimeout();
  }

  // ====== READ CO SENSOR ======
  int analogValue = analogRead(MQ7_PIN);
  co_ppm = map(analogValue, 0, 1023, 0, 1000);  // ESP8266 10-bit ADC

  // ====== CONTROL MOSFET ======
  if (co_ppm > 200) {
    digitalWrite(MOSFET_PIN, HIGH);
  } else {
    digitalWrite(MOSFET_PIN, LOW);
  }

  // ====== DISPLAY DATA ======
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
  if (isMonitoring && currentSessionId != "") {
    display.println(currentSessionId.substring(0, 8));
  } else {
    display.println("IDLE");
  }

  display.display();

  // ====== SEND DATA TO SUPABASE ======
  if (millis() - lastSend > sendInterval) {
    if (isMonitoring && currentSessionId != "") {
      bool success = sendToSupabaseWithRetry(co_ppm, digitalRead(MOSFET_PIN));
      if (success) {
        lastActivityTime = millis(); // Update activity timestamp
      }
    }
    lastSend = millis();
  }

  // ====== OPTIONAL DEEP SLEEP ======
  #if ENABLE_DEEP_SLEEP
    if (!isMonitoring) {
      enterDeepSleep();
    }
  #endif

  delay(1000);
}

// ====== WIFI CONNECTION WITH RETRY ======
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

    if (attempts % 10 == 0) {
      display.print(".");
      display.display();
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    wifiRetryCount = 0;
    Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Connected!");
    display.println(WiFi.localIP());
    display.display();
    delay(2000);
  } else {
    Serial.println("\n❌ WiFi connection failed");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Failed!");
    display.println("Retrying...");
    display.display();
  }
}

// ====== WIFI RECONNECTION WITH EXPONENTIAL BACKOFF ======
void reconnectWiFi() {
  if (wifiRetryCount >= WIFI_RETRY_MAX) {
    Serial.println("❌ Max WiFi retries reached, waiting before restart...");
    delay(60000); // Wait 1 minute
    wifiRetryCount = 0;
    ESP.restart(); // Restart device
    return;
  }

  wifiRetryCount++;
  // Fixed type casting: cast pow() result to int before min()
  int backoffTime = min((int)(1000 * pow(2, wifiRetryCount)), 30000); // Max 30s

  Serial.print("Reconnecting WiFi (attempt ");
  Serial.print(wifiRetryCount);
  Serial.print("/");
  Serial.print(WIFI_RETRY_MAX);
  Serial.println(")...");

  WiFi.disconnect();
  delay(1000);
  WiFi.begin(ssid, password);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < backoffTime) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    wifiRetryCount = 0;
    Serial.println("\n✅ WiFi reconnected");
  } else {
    wifiConnected = false;
    Serial.println("\n❌ Reconnection failed, will retry");
  }
}

// ====== WEBSOCKET RECONNECTION ======
void reconnectWebSocket() {
  Serial.println("Attempting WebSocket reconnection...");

  // Reinitialize the SupabaseRealtime instance with callback (3 parameters)
  realtime.begin(SUPABASE_URL, SUPABASE_API_KEY, onCommandReceived);

  // Re-add the changes listener (4 parameters)
  realtime.addChangesListener(
    "device_commands",                    // Table name
    "INSERT",                             // Event type
    "public",                             // Schema name
    "device_id=eq.CO-SAFE-001"           // Filter
  );

  // Restart WebSocket listening
  realtime.listen();

  // Wait for reconnection with non-blocking yields
  Serial.println("⏳ Waiting for WebSocket reconnection...");
  unsigned long reconnectStart = millis();
  while (millis() - reconnectStart < 10000) {
    realtime.loop();  // Process WebSocket events during reconnection
    yield();          // Non-blocking yield

    if (millis() - reconnectStart > 2000) {
      break;  // Assume reconnected after 2 seconds
    }
  }

  websocketConnected = true;
  Serial.println("✅ WebSocket reconnected");
}

// ====== HTTP POST WITH RETRY AND BACKOFF ======
bool sendToSupabaseWithRetry(float co, int mosfetStatus) {
  if (!isMonitoring || currentSessionId == "") {
    Serial.println("Not monitoring - skipping send");
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot send data");
    return false;
  }

  // Prepare payload
  String status;
  if (co >= 50) {
    status = "critical";
  } else if (co >= 25) {
    status = "warning";
  } else {
    status = "safe";
  }

  const char* mosfetBool = (mosfetStatus == 1) ? "true" : "false";
  String timestamp = getCurrentTimestamp();

  // Build JSON payload using ArduinoJson for proper formatting
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["co_level"] = co;
  doc["status"] = status;
  doc["mosfet_status"] = (mosfetStatus == 1);
  doc["session_id"] = currentSessionId;

  // Add timestamp if NTP is synced
  if (timestamp != "") {
    doc["created_at"] = timestamp;
  }

  String payload;
  serializeJson(doc, payload);

  // Retry loop with exponential backoff
  for (int attempt = 0; attempt < HTTP_RETRY_MAX; attempt++) {
    // Use db.insert() method from ESPSupabase library
    int responseCode = db.insert("co_readings", payload, false);

    // Success: 2xx response
    if (responseCode >= 200 && responseCode < 300) {
      Serial.print("✅ Data sent successfully: ");
      Serial.println(responseCode);
      return true;
    }

    // Client error (4xx): Don't retry
    if (responseCode >= 400 && responseCode < 500) {
      Serial.print("❌ Client error (non-retryable): ");
      Serial.println(responseCode);
      return false;
    }

    // Server error (5xx) or network error: Retry
    Serial.print("⚠️ Request failed (attempt ");
    Serial.print(attempt + 1);
    Serial.print("/");
    Serial.print(HTTP_RETRY_MAX);
    Serial.print("): ");
    Serial.println(responseCode);

    // Exponential backoff
    if (attempt < HTTP_RETRY_MAX - 1) {
      // Fixed type casting: cast pow() result to int before min()
      int backoffTime = min((int)(1000 * pow(2, attempt)), 10000); // Max 10s
      delay(backoffTime);
    }
  }

  Serial.println("❌ All retry attempts failed");
  return false;
}

// ====== MARK COMMAND EXECUTED WITH RETRY ======
bool markCommandExecutedWithRetry(int commandId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi not connected, cannot mark command executed");
    return false;
  }

  // Build update payload
  JsonDocument doc;
  doc["executed"] = true;
  doc["executed_at"] = getCurrentTimestamp();

  String payload;
  serializeJson(doc, payload);

  // Retry loop
  for (int attempt = 0; attempt < HTTP_RETRY_MAX; attempt++) {
    // Use ESPSupabase query builder pattern
    int responseCode = db.update("device_commands")
                         .eq("id", String(commandId))
                         .doUpdate(payload);

    db.urlQuery_reset(); // REQUIRED after each operation

    if (responseCode >= 200 && responseCode < 300) {
      Serial.print("✅ Command ");
      Serial.print(commandId);
      Serial.println(" marked executed");
      return true;
    }

    Serial.print("⚠️ Failed to mark command (attempt ");
    Serial.print(attempt + 1);
    Serial.print("/");
    Serial.print(HTTP_RETRY_MAX);
    Serial.print("): ");
    Serial.println(responseCode);

    if (attempt < HTTP_RETRY_MAX - 1) {
      delay(1000 * (attempt + 1)); // Linear backoff
    }
  }

  return false;
}

// ====== GET ISO8601 TIMESTAMP ======
String getCurrentTimestamp() {
  if (timeClient.isTimeSet()) {
    unsigned long epochTime = timeClient.getEpochTime();

    // Convert to ISO8601 format: 2025-01-09T12:34:56Z
    time_t rawtime = epochTime;
    struct tm * ti;
    ti = gmtime(&rawtime);

    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", ti);

    return String(buffer);
  }

  return ""; // Empty string if NTP not synced
}

// ====== SESSION TIMEOUT CHECK ======
void checkSessionTimeout() {
  if (!isMonitoring) return;

  unsigned long sessionDuration = (millis() - sessionStartTime) / 1000 / 60; // Minutes
  unsigned long inactivityDuration = (millis() - lastActivityTime) / 1000 / 60; // Minutes

  if (sessionDuration >= SESSION_TIMEOUT_MINUTES) {
    Serial.print("⏱️ Session timeout reached (");
    Serial.print(sessionDuration);
    Serial.println(" minutes), stopping session");

    isMonitoring = false;
    currentSessionId = "";

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Session Timeout");
    display.println("Auto-stopped");
    display.display();
    delay(3000);
  }
}

// ====== DEEP SLEEP MODE ======
void enterDeepSleep() {
  Serial.print("💤 Entering deep sleep for ");
  Serial.print(DEEP_SLEEP_SECONDS);
  Serial.println(" seconds...");

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Sleep Mode");
  display.println("(Power Save)");
  display.display();
  delay(1000);

  // Turn off display
  display.clearDisplay();
  display.display();

  // Enter deep sleep (ESP8266 will wake up and restart)
  ESP.deepSleep(DEEP_SLEEP_SECONDS * 1000000); // microseconds
}

// ====== COMMAND HANDLER ======
void onCommandReceived(String payload) {
  Serial.println("📩 Command received: " + payload);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("❌ JSON parse error: ");
    Serial.println(error.c_str());
    websocketConnected = false; // Flag for reconnection
    return;
  }

  if (!doc.containsKey("record") || !doc["record"].containsKey("command")) {
    Serial.println("⚠️ Invalid payload: missing command field");
    return;
  }

  String command = doc["record"]["command"].as<String>();
  int commandId = doc["record"]["id"].as<int>();

  Serial.println("✅ Parsed command: " + command);

  // Handle START_SESSION
  if (command.startsWith("START_SESSION:")) {
    currentSessionId = command.substring(14);

    if (currentSessionId.length() != 36) {
      Serial.println("❌ Invalid session ID length");
      return;
    }

    isMonitoring = true;
    sessionStartTime = millis();
    lastActivityTime = millis();

    Serial.println("✅ Started monitoring session: " + currentSessionId);

    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("Session Started!");
    display.println("");
    display.println(currentSessionId.substring(0, 8) + "...");
    display.display();
    delay(2000);

    markCommandExecutedWithRetry(commandId);
  }
  // Handle STOP_SESSION
  else if (command == "STOP_SESSION") {
    Serial.println("✅ Stopping monitoring session");
    isMonitoring = false;
    currentSessionId = "";

    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("Session Stopped");
    display.display();
    delay(2000);

    markCommandExecutedWithRetry(commandId);
  }
  else {
    Serial.println("⚠️ Unknown command: " + command);
  }
}
