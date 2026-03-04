#include "EmonLib.h"

EnergyMonitor emon1;

#define VOLT_PIN A0
#define CT_PIN   A1

#define VOLT_CAL 627
#define CURR_CAL 60
#define PHASE_CAL 1.7

void setup()
{
  Serial.begin(9600);

  emon1.voltage(VOLT_PIN, VOLT_CAL, PHASE_CAL);
  emon1.current(CT_PIN, CURR_CAL);
}

void loop()
{
  emon1.calcVI(25, 1000);

  float Vrms = emon1.Vrms;
  float Irms = emon1.Irms;
  float realPower = emon1.realPower;
  float apparentPower = Vrms * Irms;
  float pf = emon1.powerFactor;

  if (Vrms >= 100)
  {
    // ===== CSV FORMAT (easy for Pi) =====
    Serial.print(Vrms); Serial.print(",");
    Serial.print(Irms); Serial.print(",");
    Serial.print(realPower); Serial.print(",");
    Serial.print(apparentPower); Serial.print(",");
    Serial.println(pf);
  }
  else
  {
    Serial.println("POWER_OFF");
  }

  delay(1000);
}