# Pico W — Hello World (Zero Wiring Edition)

**What you need:** The Pico W board + a micro-USB cable. That's it. Nothing else from the kit.

---

## Step 1: Plug It In (Bootloader Mode)

1. Find the **BOOTSEL** button on the Pico W (small white button on the board)
2. **Hold BOOTSEL down** while you plug the USB cable into your Mac
3. A USB drive called **RPI-RP2** should appear on your desktop / Finder
4. You can release the button now

> If no drive appears: try a different USB cable (some are charge-only, no data).

---

## Step 2: Install MicroPython

1. Download the MicroPython firmware for Pico W:
   https://micropython.org/download/RPI_PICO_W/
   → grab the latest `.uf2` file (the "Releases" one, not "Nightly")

2. **Drag the .uf2 file onto the RPI-RP2 drive** in Finder

3. The drive will disappear — that's normal! The Pico rebooted with MicroPython installed.

---

## Step 3: Say Hello

Open Terminal on your Mac and run:

```bash
ls /dev/tty.usbmodem*
```

You should see something like `/dev/tty.usbmodem1101`. That's your Pico.

Connect to it:

```bash
screen /dev/tty.usbmodem1101 115200
```

You should see a `>>>` Python prompt. Type:

```python
print("Hello World")
```

You just ran Python on a microcontroller. Now blink the LED:

```python
from machine import Pin; Pin("LED", Pin.OUT).on()
```

The onboard LED lights up. Turn it off:

```python
Pin("LED", Pin.OUT).off()
```

---

## Step 4 (Bonus): Make It Blink Forever

At the `>>>` prompt, paste these lines one at a time:

```python
from machine import Pin
import time
led = Pin("LED", Pin.OUT)
while True:
    led.toggle()
    time.sleep(0.5)
```

Watch it blink. Press **Ctrl+C** to stop.

To disconnect from `screen`: press **Ctrl+A** then **K**, then **Y**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No RPI-RP2 drive appears | Try a different USB cable — many are power-only |
| No `/dev/tty.usbmodem*` found | Unplug, re-plug (without BOOTSEL this time) |
| `screen` shows nothing | Press Enter a couple times to get the `>>>` prompt |
| `Resource busy` error on screen | Another process has the port — close Thonny or any other serial app |
