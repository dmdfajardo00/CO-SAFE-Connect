#include "ESPSupabaseRealtime.h"

// Internal functions
String getEventTable(JsonDocument result)
{
  String table = result["payload"]["data"]["table"];
  return table;
}

String getEventType(JsonDocument result)
{
  String type = result["payload"]["data"]["type"];
  return type;
}

int SupabaseRealtime::_login_process()
{
  HTTPClient Loginhttps;
  WiFiClientSecure *clientLogin = new WiFiClientSecure();

  clientLogin->setInsecure();

  int httpCode;
  JsonDocument doc;
  String url = "https://" + hostname + "/auth/v1/token?grant_type=password";
  Serial.println("Beginning to login to " + url);

  if (Loginhttps.begin(*clientLogin, url))
  {
    Loginhttps.addHeader("apikey", key);
    Loginhttps.addHeader("Content-Type", "application/json");

    String query = "{\"" + loginMethod + "\": \"" + phone_or_email + "\", \"password\": \"" + password + "\"}";
    httpCode = Loginhttps.POST(query);

    if (httpCode > 0)
    {
      String data = Loginhttps.getString();
      deserializeJson(doc, data);
      if (doc.containsKey("access_token") && !doc["access_token"].isNull() && doc["access_token"].is<String>() && !doc["access_token"].as<String>().isEmpty())
      {
        String USER_TOKEN = doc["access_token"].as<String>();
        authTimeout = doc["expires_in"].as<int>() * 1000;
        Serial.println("Login Success");

        JsonDocument authConfig;
        deserializeJson(authConfig, tokenConfig);
        authConfig["payload"]["access_token"] = USER_TOKEN;
        serializeJson(authConfig, configAUTH);
      }
      else
      {
        Serial.println("Login Failed: Invalid access token in response");
      }
    }
    else
    {
      Serial.print("Login Failed : ");
      Serial.println(httpCode);
    }

    Loginhttps.end();
    delete clientLogin;
    clientLogin = NULL;

    loginTime = millis();
  }
  else
  {
    return -100;
  }

  return httpCode;
}

void SupabaseRealtime::addChangesListener(String table, String event, String schema, String filter)
{
  JsonDocument tableObj;
  
  tableObj["event"] = event;
  tableObj["schema"] = schema;
  tableObj["table"] = table;

  if (filter != "")
  {
    tableObj["filter"] = filter;
  }

  postgresChanges.add(tableObj);
}

void SupabaseRealtime::listen()
{
  // Build Phoenix Channel phx_join message with correct structure
  JsonDocument phxJoinMessage;
  phxJoinMessage["event"] = "phx_join";
  phxJoinMessage["topic"] = "realtime:*";
  phxJoinMessage["ref"] = "1";

  // Build payload with config containing postgres_changes
  JsonDocument payloadDoc;
  payloadDoc["config"]["postgres_changes"] = postgresChanges;

  // Note: access_token is already in the URL query string
  // Don't duplicate it in the payload

  phxJoinMessage["payload"] = payloadDoc;

  // Serialize Phoenix message
  serializeJson(phxJoinMessage, configJSON);

  String slug = "/realtime/v1/websocket?apikey=" + String(key) + "&vsn=1.0.0";

  // Debug connection parameters
  Serial.println("[Realtime] WebSocket connection parameters:");
  Serial.printf("  Hostname: %s\n", hostname.c_str());
  Serial.println("  Port: 443 (WSS)");

  // DIAGNOSTIC: Print FULL WebSocket URL to verify format
  Serial.println("[Realtime] ========== FULL WEBSOCKET URL ==========");
  Serial.print("wss://");
  Serial.print(hostname);
  Serial.print(":443");
  Serial.println(slug);
  Serial.println("[Realtime] =======================================");

  // DIAGNOSTIC: Verify API key format
  Serial.printf("  API Key Length: %d chars\n", String(key).length());
  Serial.printf("  API Key Preview: %s...\n", String(key).substring(0, 20).c_str());
  Serial.printf("  Path length: %d chars\n", slug.length());
  Serial.printf("  Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.println("[Realtime] Phoenix message prepared (will send after connection)");

  // CRITICAL FIX: Bind event handler BEFORE initiating connection
  // This prevents race condition where connection events fire before handler is ready
  webSocket.onEvent(std::bind(&SupabaseRealtime::webSocketEvent, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));

  // CRITICAL: Set proper Origin header - store in member variable to avoid dangling pointer
  // CRITICAL: Use browser User-Agent to avoid server filtering Arduino clients
  // NOTE: WebSocketsClient.cpp now checks for existing User-Agent to prevent duplicates
  originHeader = "Origin: https://" + hostname + "\r\n";
  originHeader += "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n";
  webSocket.setExtraHeaders(originHeader.c_str());
  Serial.printf("[Realtime] Set Origin header: https://%s\n", hostname.c_str());
  Serial.println("[Realtime] Set User-Agent: Mozilla/5.0 (Chrome browser)");

  // Server address, port and URL
  // 1st param: hostname without https://
  // 2nd param: port 443 for WSS
  // 3rd param: url path with apikey
  // 4th param: NULL fingerprint to disable SSL certificate validation
  // Server address, port, URL, fingerprint, protocol
  // CRITICAL: Protocol must be empty string - Supabase doesn't use WebSocket sub-protocols
  webSocket.beginSSL(
      hostname.c_str(),
      443,
      slug.c_str(),
      NULL,
      "");  // Empty protocol - Supabase Realtime doesn't support "arduino" protocol
}

void SupabaseRealtime::processMessage(uint8_t *payload)
{
  JsonDocument result;
  deserializeJson(result, payload);
  String table = getEventTable(result);
  if (table != "null")
  {
    String data = result["payload"]["data"];
    handler(data);
  };
}

void SupabaseRealtime::webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
    Serial.println("[WSc] ❌ Disconnected!");
    Serial.printf("[WSc] Disconnect at heap: %d bytes\n", ESP.getFreeHeap());
    // DIAGNOSTIC: Check if we ever successfully connected
    Serial.println("[WSc] TIP: Check if HTTP 101 Switching Protocols was received");
    break;
  case WStype_CONNECTED:
    Serial.println("[WSc] Connected to url: /realtime/v1/websocket");
    Serial.printf("[WSc] Free Heap: %d bytes\n", ESP.getFreeHeap());

    // Small delay to let server stabilize after handshake
    delay(100);

    Serial.println("[WSc] Sending Phoenix phx_join message...");
    Serial.println(configJSON);  // Debug: show what we're sending

    if (webSocket.sendTXT(configJSON)) {
      Serial.println("[WSc] phx_join sent successfully");
    } else {
      Serial.println("[WSc] ERROR: Failed to send phx_join");
    }
    break;
  case WStype_TEXT:
    Serial.printf("[WSc] Received: %s\n", payload);  // Debug: show server response

    // Check for Phoenix join acknowledgment
    if (strstr((char*)payload, "phx_reply") != NULL &&
        strstr((char*)payload, "\"status\":\"ok\"") != NULL) {
      Serial.println("[WSc] ✅ Phoenix join acknowledged by server");
    }

    processMessage(payload);
    break;
  case WStype_BIN:
    Serial.printf("[WSc] get binary length: %u\n", length);
    break;
  case WStype_ERROR:
    Serial.println("[WSc] ⚠️⚠️⚠️ ERROR EVENT RECEIVED ⚠️⚠️⚠️");
    if (length > 0) {
      Serial.printf("[WSc] Error payload (%d bytes): %s\n", length, payload);
    } else {
      Serial.println("[WSc] Error event with no payload");
    }
    Serial.printf("[WSc] Heap at error: %d bytes\n", ESP.getFreeHeap());
    break;
  case WStype_PING:
    Serial.println("[WSc] Received PING");
    break;
  case WStype_PONG:
    Serial.println("[WSc] get pong");
    break;
  case WStype_FRAGMENT_TEXT_START:
  case WStype_FRAGMENT_BIN_START:
  case WStype_FRAGMENT:
  case WStype_FRAGMENT_FIN:
    break;
  }
}

void SupabaseRealtime::loop()
{
  if (useAuth && millis() - loginTime > authTimeout / 2)
  {
    webSocket.disconnect();
    _login_process();
  }
  else
  {
    webSocket.loop();
  }

  if (millis() - last_ms > 20000)  // FIXED: Reduced from 30s to 20s for Supabase compatibility
  {
    last_ms = millis();
    webSocket.sendTXT(jsonRealtimeHeartbeat);
    webSocket.sendTXT(configAUTH);
  }
}

void SupabaseRealtime::begin(String hostname, String key, void (*func)(String))
{
  // Remove any protocol prefix - WebSocket library expects hostname only
  hostname.replace("https://", "");
  hostname.replace("http://", "");
  hostname.replace("wss://", "");
  hostname.replace("ws://", "");

  this->hostname = hostname;
  this->key = key;
  this->handler = func;

  Serial.printf("[Realtime] Initialized for hostname: %s\n", hostname.c_str());

  // Memory check
  uint32_t heap = ESP.getFreeHeap();
  if (heap < 35000) {
    Serial.printf("[Realtime] WARNING: Low heap memory: %d bytes (need 35KB+)\n", heap);
  }
}

int SupabaseRealtime::login_email(String email_a, String password_a)
{
  useAuth = true;
  loginMethod = "email";
  phone_or_email = email_a;
  password = password_a;

  int httpCode = 0;
  while (httpCode <= 0)
  {
    httpCode = _login_process();
  }
  return httpCode;
}

int SupabaseRealtime::login_phone(String phone_a, String password_a)
{
  useAuth = true;
  loginMethod = "phone";
  phone_or_email = phone_a;
  password = password_a;

  int httpCode = 0;
  while (httpCode <= 0)
  {
    httpCode = _login_process();
  }
  return httpCode;
}

bool SupabaseRealtime::isConnected()
{
  return webSocket.isConnected();
}