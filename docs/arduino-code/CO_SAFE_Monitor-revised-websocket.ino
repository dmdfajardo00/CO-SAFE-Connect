/*
 * CO-SAFE Monitor - WebSocket-Enabled Version
 *
 * This version adds Supabase Realtime WebSocket support for session management.
 * The device listens for START_SESSION and STOP_SESSION commands from the app
 * and only sends readings when actively monitoring a session.
 *
 * Changes from original:
 * - Added ESPSupabase library for WebSocket communication
 * - Added session_id tracking and isMonitoring flag
 * - Modified sendToSupabase() to include session_id in payload
 * - Added onCommandReceived() callback for remote control
 * - Fixed MQ7_PIN to use A0 (correct ESP8266 analog pin)
 * - Added db.loop() in main loop for WebSocket heartbeat
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESPSupabase.h>  // NEW: WebSocket support for Realtime
#include <ArduinoJson.h>  // NEW: Robust JSON parsing for commands

// ====== OLED SETUP ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ====== PIN DEFINITIONS ======
#define MQ7_PIN A0        // FIXED: ESP8266 analog pin (was 34)
#define MOSFET_PIN D1     // Gate pin for IRLZ44N (GPIO5)

// ====== WIFI CREDENTIALS ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE API CONFIGURATION ======
const char* SUPABASE_URL = "https://naadaumxaglqzucacexb.supabase.co/rest/v1/co_readings";
const char* SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bc0";
const char* DEVICE_ID = "CO-SAFE-001";  // Must match device in database
WiFiClient client;

// ====== SESSION MANAGEMENT (NEW) ======
Supabase db;                    // WebSocket client for Realtime
String currentSessionId = "";   // Active session UUID from app
bool isMonitoring = false;      // Only send data when true

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

  // ====== INITIALIZE SUPABASE REALTIME (NEW) ======
  // Connect to WebSocket and listen for commands from device_commands table
  db.begin(SUPABASE_URL, SUPABASE_API_KEY);
  db.listen_device_commands("device_id=eq.CO-SAFE-001", onCommandReceived);
  Serial.println("Supabase Realtime initialized");

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WebSocket Ready");
  display.println("Waiting for");
  display.println("session...");
  display.display();
  delay(2000);
}

void loop() {
  // ====== HANDLE SUPABASE REALTIME WEBSOCKET (NEW) ======
  // This maintains the WebSocket connection and triggers onCommandReceived()
  db.loop();

  // Read CO sensor
  int analogValue = analogRead(MQ7_PIN);
  co_ppm = map(analogValue, 0, 1023, 0, 1000);  // ESP8266 uses 10-bit ADC (0-1023)

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

  // NEW: Show monitoring status
  display.print("Session: ");
  if (isMonitoring && currentSessionId != "") {
    display.println(currentSessionId.substring(0, 8) + "...");
  } else {
    display.println("IDLE");
  }

  display.display();

  // ====== SEND DATA TO SUPABASE ======
  // NEW: Only sends if actively monitoring a session
  if (millis() - lastSend > sendInterval) {
    sendToSupabase(co_ppm, digitalRead(MOSFET_PIN));
    lastSend = millis();
  }

  delay(1000);
}

/*
 * MODIFIED: Now includes session_id and only sends when monitoring
 */
void sendToSupabase(float co, int mosfetStatus) {
  // NEW: Only send if monitoring is active
  if (!isMonitoring || currentSessionId == "") {
    Serial.println("Not monitoring - skipping send");
    return;
  }

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

    // NEW: Include session_id in payload
    String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                     "\",\"co_level\":" + String(co) +
                     ",\"status\":\"" + status +
                     "\",\"mosfet_status\":" + mosfetBool +
                     ",\"session_id\":\"" + currentSessionId + "\"}";

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

// ====== COMMAND EXECUTION CONFIRMATION ======
// Sends PATCH request to mark command as executed in device_commands table
/**
 * Mark a command as executed in the database
 * Called after successfully processing a command from device_commands table
 */
void markCommandExecuted(int commandId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi not connected, cannot mark command executed");
    return;
  }

  HTTPClient http;

  // Build URL: /rest/v1/device_commands?id=eq.{commandId}
  String url = String(SUPABASE_URL).replace("/co_readings", "/device_commands");
  url += "?id=eq." + String(commandId);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_API_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);
  http.addHeader("Prefer", "return=minimal");  // Don't return data, just confirm

  // Get current timestamp
  unsigned long currentMillis = millis();
  String timestamp = String(currentMillis);

  // Build JSON payload
  String payload = "{\"executed\":true,\"executed_at\":\"" +
                   String(millis()) + "\"}";

  // Send PATCH request
  int httpResponseCode = http.PATCH(payload);

  if (httpResponseCode > 0) {
    Serial.print("✅ Command ");
    Serial.print(commandId);
    Serial.print(" marked executed, response: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("❌ Failed to mark command executed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

/*
 * NEW: WebSocket callback - handles commands from app
 *
 * FIXED: Robust JSON parsing using ArduinoJson library
 * Supabase Realtime payload format: {"record": {"id": 1, "command": "START_SESSION:uuid", ...}}
 *
 * Expected commands from device_commands table:
 * - START_SESSION:uuid-here  -> Begin monitoring and attach to session
 * - STOP_SESSION             -> Stop monitoring
 *
 * The app inserts commands into device_commands table with:
 * {
 *   "device_id": "CO-SAFE-001",
 *   "command": "START_SESSION:550e8400-e29b-41d4-a716-446655440000",
 *   "status": "pending"
 * }
 */
void onCommandReceived(String payload) {
  Serial.println("Command received: " + payload);

  // Parse JSON payload using ArduinoJson library
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract command from record.command field
  // Supabase Realtime sends: {"record": {"command": "START_SESSION:uuid", ...}}
  if (!doc.containsKey("record") || !doc["record"].containsKey("command")) {
    Serial.println("Invalid payload: missing command field");
    return;
  }

  String command = doc["record"]["command"].as<String>();
  int commandId = doc["record"]["id"].as<int>();  // For acknowledgment

  Serial.println("Parsed command: " + command);

  // Handle START_SESSION command
  if (command.startsWith("START_SESSION:")) {
    // Extract session_id after "START_SESSION:" prefix
    currentSessionId = command.substring(14);  // Length of "START_SESSION:"

    // Validate UUID format (should be 36 characters with hyphens)
    if (currentSessionId.length() != 36) {
      Serial.println("ERROR: Invalid session ID length: " + String(currentSessionId.length()));
      return;
    }

    isMonitoring = true;
    Serial.println("✅ Started monitoring session: " + currentSessionId);

    // Display confirmation on OLED
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("Session Started!");
    display.println("");
    display.println(currentSessionId.substring(0, 8) + "...");
    display.display();
    delay(2000);

    // Mark command as executed
    markCommandExecuted(commandId);
  }
  // Handle STOP_SESSION command
  else if (command == "STOP_SESSION") {
    Serial.println("✅ Stopping monitoring session");
    isMonitoring = false;
    currentSessionId = "";

    // Display confirmation on OLED
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("Session Stopped");
    display.display();
    delay(2000);

    // Mark command as executed
    markCommandExecuted(commandId);
  }
  // Unknown command
  else {
    Serial.println("⚠️ Unknown command: " + command);
  }
}
