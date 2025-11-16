/*
 * MINIMAL WEBSOCKET TEST FOR SUPABASE REALTIME
 *
 * PURPOSE: Isolate WebSocket connectivity issues by bypassing ESPSupabase library
 * TESTS: Direct WebSocketsClient connection with extensive debug output
 *
 * This test helps identify if the issue is:
 * A) WebSocketsClient library configuration
 * B) ESP8266 SSL/BearSSL setup
 * C) Supabase endpoint configuration
 * D) ESPSupabase library wrapper
 *
 * HARDWARE: ESP8266 NodeMCU 1.0 (ESP-12E Module)
 * LIBRARIES REQUIRED:
 * - ESP8266WiFi (built-in)
 * - WebSocketsClient by Markus Sattler (v2.3.6+)
 *
 * CONFIGURATION:
 * - CPU Frequency: 160 MHz (CRITICAL for SSL)
 * - Upload Speed: 115200
 * - Flash Size: 4MB (FS:2MB OTA:~1019KB)
 */

#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Supabase Configuration
const char* SUPABASE_PROJECT_REF = "naadaumxaglqzucacexb";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMjk4MzcsImV4cCI6MjA1MTYwNTgzN30.w2WZ-Py8Np8xBabjCL_gJwH2d-C2Vn6k6YWZ5nzG3Ss";

// Test Modes (enable ONE at a time)
#define TEST_SSL true        // Test with WSS (SSL) - production Supabase requires this
#define TEST_NO_SSL false    // Test with WS (no SSL) - will fail with Supabase but tests library

// ========================================
// GLOBAL OBJECTS
// ========================================

WebSocketsClient webSocket;

// Connection state tracking
bool wifiConnected = false;
bool wsConnected = false;
unsigned long lastReconnectAttempt = 0;
unsigned long wsConnectTime = 0;
int reconnectAttempts = 0;

// ========================================
// WEBSOCKET EVENT HANDLER
// ========================================

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("\n[WS] ❌ DISCONNECTED");
      Serial.printf("[WS] Connection lasted: %lu ms\n", millis() - wsConnectTime);
      wsConnected = false;
      reconnectAttempts++;
      break;

    case WStype_CONNECTED:
      Serial.println("\n[WS] ✅ CONNECTED");
      Serial.printf("[WS] URL: %s\n", payload);
      wsConnected = true;
      wsConnectTime = millis();
      reconnectAttempts = 0;

      // Supabase Realtime requires sending initial message
      // Format: {"event":"phx_join","topic":"realtime:*","payload":{},"ref":null}
      String joinMessage = "{\"event\":\"phx_join\",\"topic\":\"realtime:*\",\"payload\":{},\"ref\":\"1\"}";
      Serial.printf("[WS] Sending join message: %s\n", joinMessage.c_str());
      webSocket.sendTXT(joinMessage);
      break;

    case WStype_TEXT:
      Serial.printf("\n[WS] 📨 RECEIVED TEXT: %s\n", payload);

      // Check for Supabase Realtime responses
      String message = String((char*)payload);
      if (message.indexOf("phx_reply") >= 0) {
        Serial.println("[WS] ✅ Received join acknowledgment from Supabase");
      }
      if (message.indexOf("heartbeat") >= 0) {
        Serial.println("[WS] ❤️ Heartbeat received");
      }
      break;

    case WStype_BIN:
      Serial.printf("[WS] 📦 RECEIVED BINARY: %u bytes\n", length);
      break;

    case WStype_ERROR:
      Serial.printf("[WS] ⚠️ ERROR: %s\n", payload);
      break;

    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      Serial.println("[WS] 📋 Fragment received (large message)");
      break;

    case WStype_PING:
      Serial.println("[WS] 🏓 PING received");
      break;

    case WStype_PONG:
      Serial.println("[WS] 🏓 PONG received");
      break;
  }
}

// ========================================
// WIFI CONNECTION
// ========================================

void connectWiFi() {
  Serial.println("\n========================================");
  Serial.println("CONNECTING TO WIFI");
  Serial.println("========================================");
  Serial.printf("SSID: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi Connected!");
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
    Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    wifiConnected = false;
  }
}

// ========================================
// WEBSOCKET CONNECTION
// ========================================

void connectWebSocket() {
  Serial.println("\n========================================");
  Serial.println("CONNECTING TO SUPABASE WEBSOCKET");
  Serial.println("========================================");

  // Build WebSocket URL components
  String host = String(SUPABASE_PROJECT_REF) + ".supabase.co";
  String path = "/realtime/v1/websocket?apikey=" + String(SUPABASE_ANON_KEY) + "&vsn=1.0.0";
  uint16_t port;

  #if TEST_SSL
    port = 443;
    Serial.println("MODE: WSS (SSL/TLS)");
  #else
    port = 80;
    Serial.println("MODE: WS (No SSL) - Will fail with Supabase");
  #endif

  Serial.printf("Host: %s\n", host.c_str());
  Serial.printf("Port: %u\n", port);
  Serial.printf("Path: %s\n", path.c_str());
  Serial.printf("Free Heap Before: %d bytes\n", ESP.getFreeHeap());

  // Register event handler
  webSocket.onEvent(webSocketEvent);

  // Connect
  #if TEST_SSL
    Serial.println("\n🔐 Attempting SSL/TLS connection...");
    Serial.println("Note: This requires WebSocketsClient library fix for BearSSL");
    Serial.println("See: docs/arduino-code/FIX-WebSocketsClient-BearSSL.md");

    // CRITICAL: beginSSL with NULL fingerprint should trigger setInsecure()
    // If library is not patched, this will fail with immediate disconnect
    webSocket.beginSSL(host, port, path, NULL);

  #else
    Serial.println("\n🔓 Attempting non-SSL connection...");
    webSocket.begin(host, port, path);
  #endif

  Serial.printf("Free Heap After: %d bytes\n", ESP.getFreeHeap());
  Serial.println("\n⏳ Waiting for connection response...");
}

// ========================================
// DIAGNOSTIC FUNCTIONS
// ========================================

void printSystemInfo() {
  Serial.println("\n========================================");
  Serial.println("ESP8266 SYSTEM INFORMATION");
  Serial.println("========================================");
  Serial.printf("Chip ID: %08X\n", ESP.getChipId());
  Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("Flash Size: %d bytes\n", ESP.getFlashChipSize());
  Serial.printf("SDK Version: %s\n", ESP.getSdkVersion());
  Serial.printf("Core Version: %s\n", ESP.getCoreVersion().c_str());

  if (ESP.getCpuFreqMHz() != 160) {
    Serial.println("\n⚠️  WARNING: CPU is not set to 160 MHz!");
    Serial.println("SSL operations REQUIRE 160 MHz for stability");
    Serial.println("Go to Tools → CPU Frequency → 160 MHz");
  }
}

void printConnectionStatus() {
  Serial.println("\n----------------------------------------");
  Serial.printf("WiFi: %s | ", wifiConnected ? "✅ Connected" : "❌ Disconnected");
  Serial.printf("WebSocket: %s | ", wsConnected ? "✅ Connected" : "❌ Disconnected");
  Serial.printf("Uptime: %lu s\n", millis() / 1000);
  Serial.printf("Reconnect Attempts: %d\n", reconnectAttempts);
  Serial.println("----------------------------------------");
}

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n\n");
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║  MINIMAL WEBSOCKET TEST FOR ESP8266  ║");
  Serial.println("║  Supabase Realtime Connectivity      ║");
  Serial.println("╚══════════════════════════════════════╝");

  // Print system diagnostics
  printSystemInfo();

  // Check SSL support
  #if TEST_SSL
    Serial.println("\n🔐 SSL Test Mode: ENABLED");
    Serial.println("Testing: wss://naadaumxaglqzucacexb.supabase.co:443/realtime/v1/websocket");
    Serial.println("\nRequired Fix:");
    Serial.println("1. WebSocketsClient.cpp must call setInsecure() for ESP8266");
    Serial.println("2. CPU must be set to 160 MHz (check above)");
  #else
    Serial.println("\n🔓 Non-SSL Test Mode: ENABLED");
    Serial.println("Testing: ws://naadaumxaglqzucacexb.supabase.co:80/realtime/v1/websocket");
    Serial.println("⚠️  Note: Supabase REQUIRES SSL, this test will fail but isolates library");
  #endif

  // Connect WiFi
  connectWiFi();

  if (!wifiConnected) {
    Serial.println("\n❌ Cannot proceed without WiFi. Halting.");
    while(1) { delay(1000); }
  }

  // Connect WebSocket
  connectWebSocket();

  Serial.println("\n✅ Setup complete. Monitoring connection...\n");
}

// ========================================
// LOOP
// ========================================

void loop() {
  // Handle WebSocket events
  webSocket.loop();

  // Monitor connection every 10 seconds
  static unsigned long lastStatusPrint = 0;
  if (millis() - lastStatusPrint > 10000) {
    printConnectionStatus();
    lastStatusPrint = millis();

    // Send test message if connected
    if (wsConnected) {
      Serial.println("Sending heartbeat...");
      String heartbeat = "{\"event\":\"heartbeat\",\"topic\":\"phoenix\",\"payload\":{},\"ref\":\"2\"}";
      webSocket.sendTXT(heartbeat);
    }
  }

  // Auto-reconnect if disconnected for 30 seconds
  if (!wsConnected && wifiConnected && (millis() - lastReconnectAttempt > 30000)) {
    Serial.println("\n🔄 Attempting reconnection...");
    lastReconnectAttempt = millis();
    connectWebSocket();
  }

  // Check WiFi status
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi lost! Reconnecting...");
    wifiConnected = false;
    wsConnected = false;
    connectWiFi();
    if (wifiConnected) {
      connectWebSocket();
    }
  }

  delay(100); // Small delay to prevent tight loop
}

// ========================================
// EXPECTED OUTPUT - WORKING CORRECTLY
// ========================================

/*
✅ SUCCESSFUL CONNECTION OUTPUT:

========================================
CONNECTING TO SUPABASE WEBSOCKET
========================================
MODE: WSS (SSL/TLS)
Host: naadaumxaglqzucacexb.supabase.co
Port: 443
Path: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
Free Heap Before: 41232 bytes

🔐 Attempting SSL/TLS connection...
Free Heap After: 38456 bytes

⏳ Waiting for connection response...

[WS] ✅ CONNECTED
[WS] URL: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
[WS] Sending join message: {"event":"phx_join","topic":"realtime:*","payload":{},"ref":"1"}

[WS] 📨 RECEIVED TEXT: {"event":"phx_reply","payload":{"response":{},"status":"ok"},"ref":"1","topic":"realtime:*"}
[WS] ✅ Received join acknowledgment from Supabase

----------------------------------------
WiFi: ✅ Connected | WebSocket: ✅ Connected | Uptime: 15 s
Reconnect Attempts: 0
----------------------------------------
*/

// ========================================
// EXPECTED OUTPUT - FAILURE (UNPATCHED)
// ========================================

/*
❌ FAILED CONNECTION OUTPUT:

========================================
CONNECTING TO SUPABASE WEBSOCKET
========================================
MODE: WSS (SSL/TLS)
Host: naadaumxaglqzucacexb.supabase.co
Port: 443
Path: /realtime/v1/websocket?apikey=eyJ...&vsn=1.0.0
Free Heap Before: 41232 bytes

🔐 Attempting SSL/TLS connection...
Free Heap After: 38456 bytes

⏳ Waiting for connection response...

[WS] ❌ DISCONNECTED
[WS] Connection lasted: 0 ms

----------------------------------------
WiFi: ✅ Connected | WebSocket: ❌ Disconnected | Uptime: 5 s
Reconnect Attempts: 1
----------------------------------------

🔄 Attempting reconnection...
[WS] ❌ DISCONNECTED
[WS] Connection lasted: 0 ms

DIAGNOSIS:
- Immediate disconnect (0 ms) = SSL handshake failure
- BearSSL requires setInsecure() call in WebSocketsClient.cpp
- Follow fix guide: docs/arduino-code/FIX-WebSocketsClient-BearSSL.md
*/

// ========================================
// DIAGNOSTIC STEPS
// ========================================

/*
STEP 1: Check CPU Frequency
- Look for "CPU Frequency: 160 MHz" in serial output
- If showing 80 MHz, change in Tools menu and re-upload

STEP 2: Check Free Heap
- Should be >35KB before SSL connection
- If <30KB, remove debug Serial.print statements

STEP 3: Analyze Connection Duration
- 0 ms = SSL handshake failure (library not patched)
- 1-5 seconds then disconnect = SSL negotiation issue (possibly wrong endpoint)
- Stays connected >30 seconds = SUCCESS!

STEP 4: Test Without SSL (if available)
- Change TEST_SSL to false, TEST_NO_SSL to true
- If non-SSL connects but SSL fails = Confirms BearSSL issue
- If both fail = Network/firewall/endpoint issue

STEP 5: Compare with ESPSupabase Library
- If this test succeeds but ESPSupabase fails = Library wrapper issue
- If both fail = Underlying WebSocketsClient needs patching
*/

// ========================================
// COMPARISON WITH ESPSupabase
// ========================================

/*
ESPSupabase Library Approach:
- Uses Realtime.begin() wrapper
- Calls WebSocketsClient.beginSSL() internally
- Passes NULL fingerprint (expects library to handle)
- Code location: ESPSupabase/Realtime.cpp line ~45

This Test Approach:
- Directly calls WebSocketsClient.beginSSL()
- Same NULL fingerprint parameter
- No wrapper layer = isolates issue

Key Difference:
- ESPSupabase adds message parsing logic
- This test ONLY tests raw connection
- If this test fails, ESPSupabase will also fail

If This Test Succeeds But ESPSupabase Fails:
- Issue is in ESPSupabase message handling
- Check Realtime.cpp event parsing
- Verify API key format in Realtime.begin()

If This Test Fails:
- Issue is in WebSocketsClient library
- Apply fix from FIX-WebSocketsClient-BearSSL.md
- No amount of ESPSupabase tweaking will help
*/
