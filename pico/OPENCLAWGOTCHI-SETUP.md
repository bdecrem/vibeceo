# OpenClawGotchi Setup Guide

How we set up the Raspberry Pi Zero 2 WH for OpenClawGotchi from scratch on macOS.

## Hardware

- Raspberry Pi Zero 2 WH (pre-soldered headers)
- Waveshare 2.13" E-Ink HAT V4
- 16GB micro SD card
- USB micro SD card reader (iMac has no SD slot)
- Micro-USB cable for power

## Flashing the SD Card

**Use Raspberry Pi Imager.** Do not try to manually configure files on the boot partition — it doesn't work reliably on Bookworm.

```bash
brew install --cask raspberry-pi-imager
```

### Imager Settings

| Setting | Value |
|---------|-------|
| Device | Raspberry Pi Zero 2 W |
| OS | Raspberry Pi OS (other) > Raspberry Pi OS Lite (64-bit) |
| Storage | Your SD card |

### Customizations (CRITICAL — don't skip)

When prompted "Would you like to apply OS customisation settings?" click **Edit Settings** and fill in ALL of these:

| Setting | Value |
|---------|-------|
| Hostname | `openclawgotchi` |
| Enable SSH | Yes, password authentication |
| Username | `pi` |
| Password | `jkl;` |
| WiFi SSID | `861 clara` |
| WiFi Password | *(set in Imager, not stored here)* |
| WiFi Country | `US` |
| Timezone | `America/Los_Angeles` |
| Raspberry Pi Connect | No |

Click **Save**, then confirm **Yes** to apply customizations, then **Write**.

## First Boot

1. Insert SD card into Pi Zero 2 WH
2. Connect power via micro-USB (either port works for power, but use the middle USB port if connecting to Mac for data)
3. Wait 2-3 minutes — green LED blinks during boot, goes solid when done
4. Pi does TWO boots: first applies the OS, second applies customizations and reboots

## Connecting

```bash
# Install sshpass for non-interactive password auth
brew install esolitos/ipa/sshpass

# Connect
sshpass -p 'jkl;' ssh pi@openclawgotchi.local

# If mDNS doesn't resolve, find the IP:
ping openclawgotchi.local
# or scan the network:
arp -a | grep "5a:fc"
```

## Installing OpenClawGotchi

```bash
git clone https://github.com/turmyshevd/openclawgotchi.git
cd openclawgotchi
./setup.sh
```

The setup script prompts for Telegram bot token, user ID, and bot name.

## What Went Wrong (and Why)

We burned ~2 hours debugging SSH before getting it right. Here's what happened:

1. **First attempt (Amber via CLI):** Flashed with `dd`, created `firstrun.sh` on boot partition to configure WiFi+SSH. WiFi worked but SSH didn't — the script ran but `systemctl enable ssh` didn't stick.

2. **Boot partition hacks:** Tried `ssh` flag file + `userconf.txt` on FAT32 boot partition. Didn't enable SSH on Bookworm.

3. **USB gadget mode:** Added `dtoverlay=dwc2` and `modules-load=dwc2,g_ether`. Pi showed up as RNDIS USB Ethernet device but had no IP configured on its end — chicken-and-egg problem.

4. **ext4 direct write:** Installed `e2fsprogs`, used `debugfs` to write NetworkManager config and SSH symlinks directly to rootfs. Didn't work — debugfs symlink creation is unreliable for this.

5. **Raspberry Pi Imager (first try):** Flashed but user accidentally skipped the customization settings. Image went on without SSH/WiFi configured.

6. **Raspberry Pi Imager (second try):** Carefully filled in ALL customization fields including SSH. Worked immediately.

### Root Cause

Raspberry Pi OS Bookworm changed how WiFi and SSH are configured:
- **WiFi** moved from `wpa_supplicant.conf` (boot partition) to NetworkManager `.nmconnection` files (ext4 rootfs)
- **SSH** enablement via boot partition `ssh` file is unreliable — the Imager's `imager_custom enable_ssh` is the supported path
- **macOS cannot write to ext4**, so boot-partition-only approaches can't configure WiFi on Bookworm

**Lesson: Always use Raspberry Pi Imager. It exists for a reason.**
