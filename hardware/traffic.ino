#include <WiFi.h>
#include <PubSubClient.h>

// --- Configuration ---
const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com";
const char* topic = "routeiq/ambulance/junction";

// Pins
const int JYOTHI_RED = 25;
const int JYOTHI_GREEN = 27;
const int PVS_RED = 26;
const int PVS_GREEN = 14;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSwitchTime = 0;
const long interval = 10000; // 10 seconds normal cycle
bool isJyothiTurn = true;
bool emergencyMode = false;
String emergencyRoute = "";

void setup() {
  Serial.begin(115200);
  pinMode(JYOTHI_RED, OUTPUT);
  pinMode(JYOTHI_GREEN, OUTPUT);
  pinMode(PVS_RED, OUTPUT);
  pinMode(PVS_GREEN, OUTPUT);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected");

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) { message += (char)payload[i]; }
  
  Serial.println("MQTT Message: " + message);

  if (message == "ENTER_JYOTHI") {
    emergencyMode = true;
    emergencyRoute = "JYOTHI";
  } else if (message == "ENTER_PVS") {
    emergencyMode = true;
    emergencyRoute = "PVS";
  } else if (message == "EXIT") {
    emergencyMode = false;
    emergencyRoute = "";
    lastSwitchTime = millis(); // Reset normal timer
  }
}

void updateSignals(bool jyothiGreen, bool pvsGreen) {
  digitalWrite(JYOTHI_GREEN, jyothiGreen);
  digitalWrite(JYOTHI_RED, !jyothiGreen);
  digitalWrite(PVS_GREEN, pvsGreen);
  digitalWrite(PVS_RED, !pvsGreen);
}

void loop() {
  if (!client.connected()) {
    while (!client.connected()) {
      if (client.connect("ESP32_BuntsHostel_Junction")) {
        client.subscribe(topic);
        Serial.println("MQTT Connected");
      } else { delay(5000); }
    }
  }
  client.loop();

  if (emergencyMode) {
    if (emergencyRoute == "JYOTHI") {
      updateSignals(true, false); // Jyothi Green, PVS Red
    } else if (emergencyRoute == "PVS") {
      updateSignals(false, true); // PVS Green, Jyothi Red
    }
  } else {
    // Normal Mode Logic
    if (millis() - lastSwitchTime > interval) {
      isJyothiTurn = !isJyothiTurn;
      lastSwitchTime = millis();
    }
    updateSignals(isJyothiTurn, !isJyothiTurn);
  }
}