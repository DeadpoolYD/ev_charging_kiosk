import serial

# Open UART
ser = serial.Serial(
    port='/dev/serial0',  # Pi UART
    baudrate=9600,
    timeout=1
)

print("Listening to Arduino Nano...")

while True:
    try:
        line = ser.readline().decode('utf-8').strip()

        if not line:
            continue

        if line == "POWER_OFF":
            print("⚠️ Power OFF")
            continue

        # Parse CSV
        vrms, irms, real_p, app_p, pf = map(float, line.split(","))

        print(f"Voltage: {vrms:.2f} V")
        print(f"Current: {irms:.2f} A")
        print(f"Real Power: {real_p:.2f} W")
        print(f"Apparent Power: {app_p:.2f} VA")
        print(f"Power Factor: {pf:.2f}")
        print("-" * 40)

    except Exception as e:
        print("Error:", e)