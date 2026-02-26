DON'T BE LAZY. READ THE MANUAL BEFORE GUESSING.

# Pico — Claude Code Instructions

## What This Is

Projects built with hardware kits for Raspberry Pi ecosystem:

### 1. Freenove Ultimate Starter Kit for Raspberry Pi Pico W
- **Board:** Raspberry Pi Pico W — dual-core Arm Cortex-M0+ microcontroller, Wi-Fi enabled
- **Kit:** 224 items, 119 projects, 767-page tutorial
- **Languages:** Python (MicroPython), C, Java
- **Reference:** [Freenove tutorial & code](https://github.com/Freenove/Freenove_Ultimate_Starter_Kit_for_Raspberry_Pi_Pico)
- **Tutorial PDF:** `pico/freenove-kit/Python/Python_Tutorial.pdf`
- **Parts list image:** `pico/freenove-kit/Picture/PartsList.jpg`
- **Wiring diagrams:** `pico/wiring_*.png`, `pico/passive_wiring_*.png`

### 2. OpenClawGotchi (ON ORDER)
- **Board:** Raspberry Pi Zero 2 WH (pre-soldered headers)
- **Display:** Waveshare 2.13" E-Ink HAT V4 (plugs directly onto Pi, no wires)
- **What:** AI Tamagotchi — OpenClaw agent with E-Ink face, 25+ moods
- **Reference:** [OpenClawGotchi GitHub](https://github.com/turmyshevd/openclawgotchi)
- **Guides:**
  - [Turn your Raspberry Pi into an AI agent with OpenClaw](https://www.raspberrypi.com/news/turn-your-raspberry-pi-into-an-ai-agent-with-openclaw/)
  - [Adafruit OpenClaw on Raspberry Pi](https://learn.adafruit.com/openclaw-on-raspberry-pi/overview)
- **Amazon orders:**
  - [Pi Zero 2 WH Kit](https://www.amazon.com/Raspberry-Official-Pre-Soldered-Quad-core-Bluetooth/dp/B0DRRDJKDV)
  - [Waveshare 2.13" E-Ink Display HAT V4](https://www.amazon.com/waveshare-2-13inch-HAT-Compatible-Resolution/dp/B071S8HT76)
- Also needs: micro SD card (8GB+)

## Pico W Current Setup

- **MicroPython** installed on the Pico W
- **WiFi**: connects to local network, gets IP `192.168.7.135`
- **LED server** running — HTTP endpoints control onboard LED
- Serial port: `/dev/tty.usbmodem2101` (may vary)

## How to Connect Pico W

1. Plug Pico W into Mac via micro-USB (no BOOTSEL needed after first flash)
2. Serial: `screen /dev/tty.usbmodem2101 115200`
3. Python serial: `serial.Serial(glob.glob('/dev/tty.usbmodem*')[0], 115200)`
4. Use paste mode (`Ctrl+E`) for multi-line code, `Ctrl+D` to execute
5. `machine.reset()` to hard reset (needed to free bound ports after server crashes)

## First-time Flash (BOOTSEL)

1. Hold BOOTSEL button while plugging USB into Mac
2. Drive `RPI-RP2` appears in Finder
3. Download MicroPython .uf2 from https://micropython.org/download/RPI_PICO_W/
4. Drag .uf2 onto the RPI-RP2 drive — it reboots automatically

## iMac Camera

```bash
# Take a single photo
ffmpeg -f avfoundation -framerate 30 -video_size 1920x1080 -i "0:none" -frames:v 1 -update 1 -y /Users/bart/Documents/code/vibeceo/pico/camera.jpg

# Available devices
# [0] iMac Camera
# [1] iMac Desk View Camera
# [2] Capture screen 0
```

Camera access via Swift/imagesnap is blocked by macOS permissions. ffmpeg works.

## WiFi Server Endpoints

| Endpoint | Action |
|----------|--------|
| `http://192.168.7.135/led/on` | LED on |
| `http://192.168.7.135/led/off` | LED off |
| `http://192.168.7.135/blink` | Blink 5 times |

## WiFi Server Code (paste mode)

```python
import network, socket, time
from machine import Pin

led = Pin("LED", Pin.OUT)
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("SSID", "PASSWORD")  # don't hardcode real creds
for i in range(20):
    if wlan.isconnected():
        break
    led.toggle()
    time.sleep(0.5)
led.on()
ip = wlan.ifconfig()[0]

addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(addr)
s.listen(1)

while True:
    cl, addr = s.accept()
    request = cl.recv(1024).decode()
    path = request.split(" ")[1] if " " in request else "/"
    # handle routes...
    cl.send("HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\n" + msg)
    cl.close()
```

## Pico W Pinout (USB on top, left side, bottom up)

- Pin 20 (bottom) = **GP15**
- Pin 19 = GP14
- Pin 18 = **GND**
- Pin 17 = GP13

## CRITICAL: User is a BEGINNER. Act like it.

The user is not a hardware person. They have said so explicitly. Every interaction in pico/ must reflect this:

1. **NEVER assume they have anything.** No spare cables, no adapters, no SD cards, no readers. If it's not in the Freenove kit or something they already bought, they don't have it.
2. **Shopping lists must be 100% COMPLETE the first time.** Include EVERY accessory: SD cards, card readers, cables, adapters, power supplies, anything needed to connect to their Mac. The iMac has USB-C ports and NO SD card slot — account for this. No "you'll also need..." later. If they have to make a second order because you forgot something, you failed.
3. **Never ask "do you have X?"** — just include it in the list. Worst case they have a spare. Best case you saved them a wasted day.
4. **Explain every physical step.** "Plug it in" is not enough. Which port? Which end? Which direction? Use the camera to verify.
5. **Don't use jargon without explaining it.** "Headless", "flash", "OTG", "GPIO" — define these the first time.
6. **One step at a time.** Don't dump a 5-step plan. Give step 1, verify with camera, then step 2.

## Lessons Learned

- **Buzzer/speaker need a transistor amplifier circuit** (S8050 NPN + 1kΩ resistor) to get enough current from GPIO pins. Direct GPIO → buzzer is unreliable.
- Components on the breadboard are **NOT soldered** — pushed in for shipping protection. Use screwdriver to gently pry out.
- WiFi server code must be sent via **paste mode** (`Ctrl+E`) in one shot — REPL loses variables between disconnects
- User is **NOT handy** — keep hardware steps to absolute minimum, use camera to verify every step
- Always **READ THE MANUAL** (`Python_Tutorial.pdf`) before guessing about wiring or components
- **Show pictures** of components when asking user to find them — don't just describe
- The Pico W is a **microcontroller** (runs one program). For AI agent stuff (OpenClaw), need a full **Raspberry Pi** (runs Linux).
- Pi Zero 2**WH** = pre-soldered headers. The H matters. Without H = must solder yourself.
- **Pi Zero 2 W does NOT come with a micro SD card.** It cannot boot without one. ALWAYS include micro SD card + USB card reader in any Pi shopping list.
