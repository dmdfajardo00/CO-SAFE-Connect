#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ====== OLED SETUP ======
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ====== MQ7 SETUP ======
#define MQ7_PIN A0
#define MOSFET_PIN D1  // Heater control
#define RL 10.0
float Ro = 0.36;

// ====== TIMING ======
unsigned long previousMillis = 0;
bool isHeating = true;
const unsigned long HEATING_TIME = 60000;   // 60 seconds
const unsigned long SENSING_TIME = 90000;   // 90 seconds

void setup() {
  Serial.begin(9600);
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED allocation failed");
    for (;;);
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CO MONITOR");
  display.println("System Starting...");
  display.display();
  delay(2000);

  Serial.println("MQ7 Sensor System Initialized");
}

void loop() {
  unsigned long currentMillis = millis();

  // ====== HEATING CYCLE CONTROL ======
  if (isHeating && (currentMillis - previousMillis >= HEATING_TIME)) {
    isHeating = false;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, LOW); // Sensing phase
    Serial.println("Switched to SENSING phase (1.4V)");
  } 
  else if (!isHeating && (currentMillis - previousMillis >= SENSING_TIME)) {
    isHeating = true;
    previousMillis = currentMillis;
    digitalWrite(MOSFET_PIN, HIGH); // Heating phase
    Serial.println("Switched to HEATING phase (5V)");
  }

  // ====== MEASUREMENT (Only during Sensing Phase) ======
  if (!isHeating) {
    int sensorValue = analogRead(MQ7_PIN);
    sensorValue = constrain(sensorValue, 1, 1022);  // Prevent division errors

    float Rs = RL * (1023.0 - sensorValue) / sensorValue;
    float ratio = Rs / Ro;
    ratio = constrain(ratio, 0.01, 1000.0);

    float ppm = pow(10, ((log10(ratio) - 1.7) / -0.77));
    if (!isfinite(ppm) || ppm > 999.99) ppm = 999.99;
    if (ppm < 0) ppm = 0;

    String status;
    if (ppm <= 50) status = "SAFE";
    else if (ppm <= 200) status = "CAUTION";
    else status = "DANGER!";

    Serial.print("CO: "); Serial.print(ppm, 2);
    Serial.print(" ppm | Status: "); Serial.println(status);

    // ====== OLED DISPLAY ======
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("CO MONITOR");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

    display.setTextSize(1);
    display.setCursor(0, 20);
    display.print(ppm, 2);
    display.println(" ppm");

    display.setCursor(0, 50);
    display.print("Status: ");
    display.print(status);

    display.display();

    // ====== OLED WARNING FLASH ======
    if (status == "DANGER!") {
      delay(375);
      display.clearDisplay();
      display.setTextSize(2);
      display.setCursor(10, 25);
      display.println("⚠ DANGER ⚠");
      display.display();
      delay(375);
    } else {
      delay(750); // Standard measurement delay
    }
  } 
  else {
    // ====== HEATING DISPLAY ======
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("CO MONITOR");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
    display.setCursor(0, 25);
    display.println("Heating... please wait");
    display.display();
  }
}
