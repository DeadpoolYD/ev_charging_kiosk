// ThingSpeak service for fetching live sensor data (voltage & current)

export interface ThingSpeakReading {
  voltage: number;
  current: number;
  createdAt: string;
}

const THINGSPEAK_CHANNEL_ID = import.meta.env.VITE_THINGSPEAK_CHANNEL_ID;
const THINGSPEAK_READ_API_KEY = import.meta.env.VITE_THINGSPEAK_READ_API_KEY;

/**
 * Fetch latest reading from ThingSpeak.
 * Expects:
 *   Field 1 -> voltage
 *   Field 2 -> current
 */
export async function fetchLatestThingSpeakReading(): Promise<ThingSpeakReading | null> {
  if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY) {
    // Not configured – fail silently so UI can fallback to simulated data
    return null;
  }

  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_READ_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[ThingSpeak] HTTP error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const rawVoltage = data.field1;
    const rawCurrent = data.field2;

    let voltage = parseFloat(rawVoltage);
    let current = parseFloat(rawCurrent);

    if (Number.isNaN(voltage) || Number.isNaN(current)) {
      console.warn('[ThingSpeak] Invalid numeric data:', { rawVoltage, rawCurrent });
      return null;
    }

    // Normalize: some sensors report negative current for direction.
    // For kiosk UI we only care about magnitude.
    voltage = Math.abs(voltage);
    current = Math.abs(current);

    return {
      voltage,
      current,
      createdAt: data.created_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ThingSpeak] Failed to fetch latest reading:', error);
    return null;
  }
}

// Quick health check: is ThingSpeak / IoT live?
export async function checkThingSpeakOnline(
  maxAgeSeconds: number = 60
): Promise<{ online: boolean; reading: ThingSpeakReading | null }> {
  const reading = await fetchLatestThingSpeakReading();
  if (!reading) {
    return { online: false, reading: null };
  }

  const ageMs = Date.now() - new Date(reading.createdAt).getTime();
  const ageSeconds = ageMs / 1000;

  return {
    online: ageSeconds <= maxAgeSeconds,
    reading,
  };
}


