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
