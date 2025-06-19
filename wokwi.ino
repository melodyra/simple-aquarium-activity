#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* ssid     = "Wokwi-GUEST";
const char* password = "";
const char* serverUrl = "https://yuna.loca.lt"; 

// Pin Setup
#define ONE_WIRE_BUS 12    
#define UV_LAMP_PIN 14       
#define SERVO_PIN 4          

// Inisialisasi Objek
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Servo servo;

// Variabel Global
float temperature = 0.0;
bool uvLampState = false;         
String feederState = "closed";   

unsigned long previousMillis = 0;
const long interval = 1000;      

void setup() {
  Serial.begin(115200);
  pinMode(UV_LAMP_PIN, OUTPUT);
  digitalWrite(UV_LAMP_PIN, LOW);  
  servo.attach(SERVO_PIN);
  servo.write(0);  
  sensors.begin();  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());
}

// Loop utama
void loop() {
  unsigned long currentMillis = millis();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    readTemperature();
    sendTemperature();
    getControlStatus();
  }
}

// Fungsi Baca Suhu
void readTemperature() {
  sensors.requestTemperatures();
  temperature = sensors.getTempCByIndex(0);
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
}

// Kirim Suhu ke Server
void sendTemperature() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/api/suhu");
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<128> doc;
  doc["suhu"] = temperature;
  String json;
  serializeJson(doc, json);
  int response = http.POST(json);
  if (response > 0) {
    Serial.print("Suhu terkirim, code: ");
    Serial.println(response);
  } else {
    Serial.print("Gagal kirim suhu: ");
    Serial.println(http.errorToString(response));
  }
  http.end();
}

// Ambil Status Kontrol
void getControlStatus() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/get-control-status");
  int response = http.GET();
  if (response > 0) {
    String payload = http.getString();
    Serial.println("Status kontrol diterima: " + payload);
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (!error) {
      // UV lamp control
      String uvStatus = doc["uvlamp"];
      bool newUVState = (uvStatus == "on");
      if (newUVState != uvLampState) {
        uvLampState = newUVState;
        digitalWrite(UV_LAMP_PIN, uvLampState ? HIGH : LOW);
        Serial.println(uvLampState ? "UV Lamp ON" : "UV Lamp OFF");
      }
      // Servo feeder control
      String newFeeder = doc["foodbottle"].as<String>();
      if (newFeeder != feederState) {
        feederState = newFeeder;
        if (feederState == "open") {
          servo.write(90);
          Serial.println("Feeder OPEN");
        } else {
          servo.write(0);
          Serial.println("Feeder CLOSED");
        }
      }
    } else {
      Serial.print("JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("Gagal ambil status kontrol: ");
    Serial.println(http.errorToString(response));
  }
  http.end();
}
