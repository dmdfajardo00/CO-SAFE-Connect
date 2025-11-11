#ifndef ESP_Supabase_Realtime_h
#define ESP_Supabase_Realtime_h

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>

#if defined(ESP8266)
#include <ESP8266HTTPClient.h>
#elif defined(ESP32)
#include <HTTPClient.h>
#else
#error "This library is not supported for your board! ESP32 and ESP8266"
#endif

class SupabaseRealtime
{
private:
  WebSocketsClient webSocket;

  String key;
  String hostname;

  // RLS Stuff
  String phone_or_email;
  String password;
  String data;
  String loginMethod;
  bool useAuth;
  int _login_process();
  unsigned int authTimeout = 0;
  unsigned long loginTime;
  String configAUTH;

  // Initial config
  const char *config = R"({"event":"phx_join","topic":"realtime:*","payload":{"config":{}},"ref":"1"})";
  // Postgres Changes
  bool isPostgresChanges = false;
  JsonDocument postgresChanges;
  // Presence
  const char *jsonPresence = R"({"topic":"realtime:*","event":"presence","payload":{"type":"presence","event":"track","payload":{"user":"","online_at":""}},"ref":"2"})";
  bool isPresence = false;
  String presenceConfig;
  // bool isBroadcast = false;  // Not implemented yet
  // JsonDocument broadcastConfig; // Not implemented yet
  JsonDocument jsonRealtimeConfig;
  String configJSON;

  // Heartbeat
  unsigned int last_ms = millis();
  const char *jsonRealtimeHeartbeat = R"({"event":"heartbeat","topic":"phoenix","payload":{},"ref":"0"})";
  const char *tokenConfig = R"({"topic":"realtime:*","event":"access_token","payload":{"access_token":""},"ref":"3"})";

  void processMessage(uint8_t *payload);
  void webSocketEvent(WStype_t type, uint8_t *payload, size_t length);

  std::function<void(String)> handler;

public:
  SupabaseRealtime() {}
  void begin(String hostname, String key, void (*func)(String));
  void sendPresence(String device_name);
  // void broadcast(); // Not implemented yet
  void addChangesListener(String table, String event, String schema, String filter);
  void listen();
  void loop();
  void end(); // A way to end the websocket process (if realtime.loop() is called it will reconnect automatically)
  int login_email(String email_a, String password_a);
  int login_phone(String phone_a, String password_a);
  bool isConnected(); // Check if WebSocket is connected
};

#endif
