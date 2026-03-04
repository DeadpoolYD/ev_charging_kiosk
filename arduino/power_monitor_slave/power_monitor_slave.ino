/*
 * EV Charging Kiosk - Power Monitor Slave (Arduino Nano)
 * Reads voltage (ZMPT101B) and current (ZMCT103C), sends via UART.
 * Protocol: <V:xxx.xx,I:xxx.xx> every 1000 ms. Non-blocking timing.
 */

const int PIN_VOLTAGE = A0;   // ZMPT101B output
const int PIN_CURRENT = A1;   // ZMCT103C output

// Averaging
const int SAMPLE_COUNT = 32;
const unsigned long SEND_INTERVAL_MS = 1000;

// Calibration placeholders (tune for your sensors/transformer)
const float VOLTAGE_SCALE = 0.1077f;   // ADC -> V RMS (adjust per ZMPT101B)
const float VOLTAGE_OFFSET = 0.0f;
const float CURRENT_SCALE = 0.0264f;    // ADC -> A RMS (adjust per ZMCT103C)
const float CURRENT_OFFSET = 0.0f;

// ADC limits
const float ADC_MAX = 1023.0f;

unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(9600);
  analogReference(DEFAULT);
  pinMode(PIN_VOLTAGE, INPUT);
  pinMode(PIN_CURRENT, INPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    float v = readVoltageAvg();
    float i = readCurrentAvg();

    // Clamp to reasonable range for display
    v = constrain(v, 0.0f, 999.99f);
    i = constrain(i, 0.0f, 999.99f);

    sendPacket(v, i);
  }
}

float readVoltageAvg() {
  long sum = 0;
  for (int n = 0; n < SAMPLE_COUNT; n++) {
    sum += analogRead(PIN_VOLTAGE);
  }
  float adcMean = (float)sum / (float)SAMPLE_COUNT;
  return (adcMean / ADC_MAX) * (5.0f * VOLTAGE_SCALE) + VOLTAGE_OFFSET;
}

float readCurrentAvg() {
  long sum = 0;
  for (int n = 0; n < SAMPLE_COUNT; n++) {
    sum += analogRead(PIN_CURRENT);
  }
  float adcMean = (float)sum / (float)SAMPLE_COUNT;
  float v = (adcMean / ADC_MAX) * 5.0f;
  return (v - 2.5f) * CURRENT_SCALE + CURRENT_OFFSET;
}

void sendPacket(float voltage, float current) {
  Serial.print('<');
  Serial.print('V');
  Serial.print(':');
  Serial.print(voltage, 2);
  Serial.print(',');
  Serial.print('I');
  Serial.print(':');
  Serial.print(current, 2);
  Serial.print('>');
}
