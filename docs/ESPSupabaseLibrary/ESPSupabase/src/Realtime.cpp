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
  isPostgresChanges = true;
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

void SupabaseRealtime::sendPresence(String device_name)
{
  JsonDocument presence;
  isPresence = true;

  deserializeJson(presence, jsonPresence);
  presence["payload"]["payload"]["user"] = device_name;
  serializeJson(presence, presenceConfig);
}

void SupabaseRealtime::listen()
{
  // Build Phoenix Channel phx_join message with correct structure
  JsonDocument phxJoinMessage;
  phxJoinMessage["event"] = "phx_join";
  phxJoinMessage["topic"] = "realtime:*";
  phxJoinMessage["ref"] = "1";

  // Build nested payload structure: payload.config.postgres_changes
  JsonDocument configDoc;

  if (isPostgresChanges)
  {
    configDoc["postgres_changes"] = postgresChanges;
  }

  if (isPresence)
  {
    configDoc["presence"]["key"] = "";
  }
  // if (isBroadcast)
  // {
  //   // not implemented yet
  //   // configDoc["broadcast"] = broadcastConfig;
  // }

  JsonDocument payloadDoc;
  payloadDoc["config"] = configDoc;

  // Add access_token to payload for RLS authentication
  payloadDoc["access_token"] = key;

  phxJoinMessage["payload"] = payloadDoc;

  // Serialize Phoenix message
  serializeJson(phxJoinMessage, configJSON);

  // Debug: Print the message being sent
  Serial.println("[Realtime] Sending phx_join message:");
  Serial.println(configJSON);

  String slug = "/realtime/v1/websocket?apikey=" + String(key) + "&vsn=1.0.0";

  // Server address, port and URL
  // 1st param: hostname without https://
  // 2nd param: port 443 for WSS (WebSocket Secure)
  // 3rd param: url path with apikey
  // 4th param: NULL fingerprint to disable SSL certificate validation
  webSocket.beginSSL(
      hostname.c_str(),
      443,
      slug.c_str(),
      NULL);  // CRITICAL FIX: Pass NULL to disable cert validation for ESP8266

  // event handler
  webSocket.onEvent(std::bind(&SupabaseRealtime::webSocketEvent, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
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
    Serial.println("[WSc] ❌ DISCONNECTED!");
    break;
  case WStype_CONNECTED:
    Serial.println("[WSc] ✅ CONNECTED to Supabase Realtime");
    Serial.println("[WSc] Sending phx_join message...");
    webSocket.sendTXT(configJSON);
    if (useAuth)
    {
      Serial.println("[WSc] Sending access_token...");
      webSocket.sendTXT(configAUTH);
    }
    if (isPresence)
    {
      Serial.println("[WSc] Sending presence...");
      webSocket.sendTXT(presenceConfig);
    }
    break;
  case WStype_TEXT:
    Serial.printf("[WSc] 📨 RECEIVED: %s\n", payload);
    processMessage(payload);
    break;
  case WStype_BIN:
    Serial.printf("[WSc] Binary data received: %u bytes\n", length);
    break;
  case WStype_ERROR:
    Serial.printf("[WSc] ⚠️ ERROR: %s\n", payload);
    break;
  case WStype_PING:
    Serial.println("[WSc] 🏓 PING received");
    break;
  case WStype_PONG:
    Serial.println("[WSc] 🏓 PONG received");
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
  // Request AUTH token every 50 minutes (on defautlt timeout / 60 min)
  if (useAuth && millis() - loginTime > authTimeout / 1.2)
  {
    webSocket.disconnect();
    _login_process();
  }
  else
  {
    webSocket.loop();
  }

  // send heartbeat every 30 seconds
  if (millis() - last_ms > 30000)
  {
    last_ms = millis();
    webSocket.sendTXT(jsonRealtimeHeartbeat);
    if (useAuth)
      webSocket.sendTXT(configAUTH);
  }
}

void SupabaseRealtime::begin(String hostname, String key, void (*func)(String))
{
  hostname.replace("https://", "");
  this->hostname = hostname;
  this->key = key;
  this->handler = func;
}

void SupabaseRealtime::end()
{
  webSocket.disconnect();
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
