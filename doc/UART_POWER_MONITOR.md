# UART Power Monitor – Raspberry Pi (Master) + Arduino Nano (Slave)

Power monitoring over UART: Arduino Nano reads voltage (ZMPT101B) and current (ZMCT103C), sends `<V:xxx.xx,I:xxx.xx>` every 1 s. Raspberry Pi runs a separate Python module that parses the stream and can log or display values. **Existing Pi services (e.g. RFID) are not modified.**

---

## 1. Wiring (text diagram)

```
Arduino Nano                    Raspberry Pi
-----------                     ------------
  A0  -------------------------  (ZMPT101B output → A0 only)
  A1  -------------------------  (ZMCT103C output → A1 only)

  TX  --------(wire)-----------> RX (GPIO15, RPi Pin 10)
  RX  <--------(wire)-----------  TX (GPIO14, RPi Pin 8)
  GND ---------(common GND)-----  GND (e.g. Pin 6 or 9)

ZMPT101B (voltage):
  Output (signal) → Nano A0
  VCC → 5V, GND → GND

ZMCT103C (current):
  Output (signal) → Nano A1
  VCC → 5V, GND → GND
```

**Important:** Use a common GND between Pi and Nano. Do **not** connect Pi 5V to Nano VIN if Nano is USB‑powered; GND and TX/RX only.

---

## 2. Enable UART on Raspberry Pi (safe, no conflict with Bluetooth)

1. **Choose serial port**
   - Primary UART (GPIO14/15): `/dev/serial0` (or `/dev/ttyS0`).
   - If you use a USB‑serial adapter for the Nano, use e.g. `/dev/ttyUSB0` and do **not** enable the built‑in UART for this.

2. **Raspberry Pi OS (legacy)**  
   Run:
   ```bash
   sudo raspi-config
   ```
   - **Interface Options → Serial Port**
   - “Login shell over serial”: **No**
   - “Serial port hardware enabled”: **Yes**
   - Reboot.

3. **Raspberry Pi OS (Bookworm and later)**  
   Add to `/boot/firmware/config.txt` (or `/boot/config.txt`):
   ```ini
   enable_uart=1
   ```
   Then:
   ```bash
   sudo systemctl disable serial-getty@ttyS0.service
   sudo reboot
   ```

4. **Check**
   ```bash
   ls -l /dev/serial0
   ```
   If you use USB adapter:
   ```bash
   ls -l /dev/ttyUSB*
   ```

5. **Permissions**
   ```bash
   sudo usermod -aG dialout $USER
   ```
   Log out and back in (or reboot).

---

## 3. Arduino setup

1. Open `arduino/power_monitor_slave/power_monitor_slave.ino` in Arduino IDE.
2. Board: **Arduino Nano**, correct processor (e.g. ATmega328P).
3. Calibrate in code (placeholders):
   - `VOLTAGE_SCALE` / `VOLTAGE_OFFSET` for ZMPT101B.
   - `CURRENT_SCALE` / `CURRENT_OFFSET` for ZMCT103C.
4. Upload. Leave connected via USB for testing, or power Nano and connect **only** TX/RX/GND to the Pi (see wiring).

---

## 4. Raspberry Pi Python

- Install dependency:
  ```bash
  pip install pyserial
  ```
  Or from project:
  ```bash
  pip install -r scripts/requirements.txt
  ```

- Port in code defaults to `/dev/serial0`. If Nano is on USB adapter, set `port="/dev/ttyUSB0"` (or override via env/config).

- Run standalone (example loop that prints V, I, P):
  ```bash
  python scripts/power_monitor_uart.py
  ```
  Ctrl+C to stop.

- Use as module:
  ```python
  from power_monitor_uart import PowerMonitorUART, PowerReading

  def on_reading(r: PowerReading):
      print(r.voltage, r.current, r.power_watts)

  m = PowerMonitorUART(port="/dev/serial0", on_reading=on_reading, debug=True)
  while True:
      m.read_once()
      time.sleep(0.1)
  ```

---

## 5. Testing

1. **Arduino only**
   - Open Serial Monitor, 9600 baud.
   - Expect one line per second: `<V:xxx.xx,I:xxx.xx>` (e.g. `<V:230.45,I:0.82>`).

2. **Pi + Nano over UART**
   - Wire TX→RX, RX→TX, GND→GND (no 5V between Pi and Nano if Nano is USB‑powered).
   - Run: `python scripts/power_monitor_uart.py`.
   - You should see lines like `V=230.45 V  I=0.82 A  P=...` about once per second.
   - Unplug Nano: after ~5 s you should see timeout and reconnect messages; replug and see readings resume.

3. **Robustness**
   - Power cycle Nano: Pi should reconnect and continue.
   - No change to existing RFID or other services if they do not use the same serial port.

---

## 6. Files in this repo

| Item | Path |
|------|------|
| Arduino sketch | `arduino/power_monitor_slave/power_monitor_slave.ino` |
| Pi Python module | `scripts/power_monitor_uart.py` |
| Doc (this file) | `doc/UART_POWER_MONITOR.md` |

---

## 7. Future‑ready

- **Power:** Use `PowerReading.power_watts` (or add reactive power if needed).
- **Multiple slaves:** Run one `PowerMonitorUART` per port or use a simple multiplexer/protocol.
- **MQTT / DB:** In `on_reading`, publish to MQTT or write to Supabase/DB.
