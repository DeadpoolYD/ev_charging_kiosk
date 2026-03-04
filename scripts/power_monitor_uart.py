#!/usr/bin/env python3
"""
UART Power Monitor - Raspberry Pi (Master) side.
Receives <V:xxx.xx,I:xxx.xx> from Arduino Nano over serial.
Modular, non-blocking, with auto-reconnect and timeout handling.
Does not modify existing Pi services or ports; use a dedicated serial port.
"""

import re
import time
from dataclasses import dataclass
from typing import Callable, Optional

try:
    import serial
    import serial.tools.list_ports
    PYSERIAL_AVAILABLE = True
except ImportError:
    PYSERIAL_AVAILABLE = False
    serial = None

# Protocol: <V:xxx.xx,I:xxx.xx>
PACKET_PATTERN = re.compile(r"<V:([\d.]+),I:([-\d.]+)>")
DEFAULT_BAUD = 9600
DEFAULT_PORT = "/dev/serial0"
RECV_TIMEOUT_SEC = 5.0
RECONNECT_DELAY_SEC = 2.0
MAX_LINE_BYTES = 64


@dataclass
class PowerReading:
    """Single parsed power reading from the slave."""
    voltage: float
    current: float

    @property
    def power_watts(self) -> float:
        return self.voltage * self.current


class PowerMonitorUART:
    """
    Non-blocking UART reader for Arduino power monitor.
    Buffers incoming data, parses complete packets, handles timeouts and reconnect.
    """

    def __init__(
        self,
        port: str = DEFAULT_PORT,
        baud: int = DEFAULT_BAUD,
        timeout_sec: float = RECV_TIMEOUT_SEC,
        on_reading: Optional[Callable[[PowerReading], None]] = None,
        on_timeout: Optional[Callable[[], None]] = None,
        on_disconnect: Optional[Callable[[Exception], None]] = None,
        debug: bool = False,
    ):
        self.port = port
        self.baud = baud
        self.timeout_sec = timeout_sec
        self.on_reading = on_reading
        self.on_timeout = on_timeout
        self.on_disconnect = on_disconnect
        self.debug = debug
        self._ser: Optional["serial.Serial"] = None
        self._buffer = ""
        self._last_recv_time: Optional[float] = None
        self._running = False

    def _log(self, msg: str) -> None:
        if self.debug:
            print(f"[PowerMonitor] {msg}")

    def connect(self) -> bool:
        """Open serial port. Returns True if connected."""
        if not PYSERIAL_AVAILABLE:
            self._log("pyserial not installed")
            return False
        try:
            if self._ser is not None and self._ser.is_open:
                return True
            self._ser = serial.Serial(
                port=self.port,
                baudrate=self.baud,
                timeout=0.05,
                write_timeout=0.5,
            )
            self._buffer = ""
            self._last_recv_time = time.monotonic()
            self._log(f"Connected to {self.port} @ {self.baud}")
            return True
        except Exception as e:
            if self.on_disconnect:
                self.on_disconnect(e)
            self._log(f"Connect failed: {e}")
            return False

    def disconnect(self) -> None:
        """Close serial port."""
        try:
            if self._ser is not None and self._ser.is_open:
                self._ser.close()
        except Exception:
            pass
        self._ser = None
        self._buffer = ""

    def _try_reconnect(self) -> bool:
        self.disconnect()
        time.sleep(RECONNECT_DELAY_SEC)
        return self.connect()

    def _parse_packet(self, line: str) -> Optional[PowerReading]:
        """Validate and parse one line. Returns PowerReading or None."""
        line = line.strip()
        if not line or len(line) > MAX_LINE_BYTES:
            return None
        m = PACKET_PATTERN.fullmatch(line)
        if not m:
            return None
        try:
            v = float(m.group(1))
            i = float(m.group(2))
            if not (-1000 <= v <= 1000 and -1000 <= i <= 1000):
                return None
            return PowerReading(voltage=v, current=i)
        except (ValueError, TypeError):
            return None

    def read_once(self) -> Optional[PowerReading]:
        """
        Non-blocking: read available bytes, buffer, return one parsed reading if available.
        Handles timeout and reconnect. Call in a loop.
        """
        if not PYSERIAL_AVAILABLE or self._ser is None or not self._ser.is_open:
            if not self.connect():
                return None

        now = time.monotonic()
        try:
            n = self._ser.in_waiting
            if n > 0:
                self._last_recv_time = now
                raw = self._ser.read(n).decode("ascii", errors="ignore")
                self._buffer += raw
            elif self._last_recv_time is not None and (now - self._last_recv_time) > self.timeout_sec:
                self._log("Timeout: no data from Nano")
                if self.on_timeout:
                    self.on_timeout()
                self._last_recv_time = None
                self._try_reconnect()
                return None

            while "<" in self._buffer and ">" in self._buffer:
                start = self._buffer.find("<")
                end = self._buffer.find(">", start)
                if end == -1:
                    self._buffer = self._buffer[start:]
                    break
                packet = self._buffer[start : end + 1]
                self._buffer = self._buffer[end + 1 :].lstrip()
                if len(self._buffer) > 2 * MAX_LINE_BYTES:
                    self._buffer = ""
                reading = self._parse_packet(packet)
                if reading is not None:
                    if self.on_reading:
                        self.on_reading(reading)
                    return reading
        except serial.SerialException as e:
            if self.on_disconnect:
                self.on_disconnect(e)
            self._log(f"Serial error: {e}")
            self._try_reconnect()
            return None
        except Exception as e:
            self._log(f"Read error: {e}")
            return None

        return None

    def run_loop(self, interval_sec: float = 0.1) -> None:
        """Blocking loop: read at interval, optional callback handles readings."""
        self._running = True
        while self._running:
            self.read_once()
            time.sleep(interval_sec)

    def stop(self) -> None:
        self._running = False
        self.disconnect()


def main() -> None:
    """Example main: print readings and handle timeout; Ctrl+C to exit."""
    def on_reading(r: PowerReading) -> None:
        print(f"V={r.voltage:.2f} V  I={r.current:.2f} A  P={r.power_watts:.2f} W")

    def on_timeout() -> None:
        print("[PowerMonitor] No data (timeout). Will reconnect...")

    monitor = PowerMonitorUART(
        port=DEFAULT_PORT,
        baud=DEFAULT_BAUD,
        on_reading=on_reading,
        on_timeout=on_timeout,
        debug=True,
    )
    try:
        monitor.run_loop(interval_sec=0.1)
    except KeyboardInterrupt:
        pass
    finally:
        monitor.stop()


if __name__ == "__main__":
    main()
