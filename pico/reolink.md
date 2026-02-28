# Home Cameras — Agent Instructions

You have access to two WiFi cameras on the local network. You can grab snapshots, record video, and control the indoor camera's pan/tilt/zoom.

**Credentials** are stored in `sms-bot/.env.local` (gitignored):
- `REOLINK_IP`, `REOLINK_USER`, `REOLINK_PASS` — Reolink E1 Zoom
- `TAPO_IP`, `TAPO_USER`, `TAPO_PASS` — Tapo C560WS

---

## Camera 1: Tapo C560WS (Outdoor)

- **IP:** `$TAPO_IP`
- **Credentials:** `$TAPO_USER` / `$TAPO_PASS`

**Grab a snapshot:**
```bash
ffmpeg -rtsp_transport tcp \
  -i "rtsp://${TAPO_USER//@/%40}:${TAPO_PASS}@${TAPO_IP}:554/stream1" \
  -frames:v 1 -update 1 -y /tmp/outdoor.jpg
```

That's it for this camera — it has no pan/tilt/zoom.

---

## Camera 2: Reolink E1 Zoom (Living Room — Indoor PTZ)

- **IP:** `$REOLINK_IP`
- **Credentials:** `$REOLINK_USER` / `$REOLINK_PASS`
- **Resolution:** 4K (3840x2160)
- **Firmware:** v3.2.0.4741_2503281992
- **Capabilities:** Pan, tilt, 5x optical zoom, autofocus, 32 presets, audio, SD card recording

### Enabled Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 554 | RTSP | Video streaming |
| 443 | HTTPS | Web API (PTZ control, snapshots, config) |
| 8000 | ONVIF | Alternative control protocol |
| 9000 | Reolink | Proprietary protocol (app/client use) |

### Grab a Snapshot (simple — ffmpeg)

```bash
ffmpeg -rtsp_transport tcp \
  -i "rtsp://$REOLINK_USER:$REOLINK_PASS@$REOLINK_IP:554/h264Preview_01_main" \
  -frames:v 1 -update 1 -y /tmp/livingroom.jpg
```

### Grab a 4K Snapshot via HTTPS API

```bash
TOKEN=$(curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=Login" \
  -H "Content-Type: application/json" \
  -d "[{\"cmd\":\"Login\",\"action\":0,\"param\":{\"User\":{\"userName\":\"$REOLINK_USER\",\"password\":\"$REOLINK_PASS\"}}}]" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['value']['Token']['name'])")

curl -sk -o /tmp/livingroom.jpg \
  "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=Snap&channel=0&token=$TOKEN"
```

### HTTPS API — Login

All API calls require a token. Token expires after 3600 seconds (1 hour).

```bash
TOKEN=$(curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=Login" \
  -H "Content-Type: application/json" \
  -d "[{\"cmd\":\"Login\",\"action\":0,\"param\":{\"User\":{\"userName\":\"$REOLINK_USER\",\"password\":\"$REOLINK_PASS\"}}}]" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['value']['Token']['name'])")
```

### PTZ Control

The camera moves **continuously** until you send Stop. Always send Stop after moving.

```bash
# Move: Left, Right, Up, Down, LeftUp, LeftDown, RightUp, RightDown
# Speed: 1 (slow) to 64 (fast)
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"Right","speed":5}}]'

# ALWAYS stop after moving
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"Stop"}}]'
```

**All PTZ operations:**

| op | Action |
|----|--------|
| `Left` | Pan left |
| `Right` | Pan right |
| `Up` | Tilt up |
| `Down` | Tilt down |
| `LeftUp` | Diagonal |
| `LeftDown` | Diagonal |
| `RightUp` | Diagonal |
| `RightDown` | Diagonal |
| `Stop` | Stop all movement |
| `ZoomInc` | Zoom in |
| `ZoomDec` | Zoom out |
| `FocusInc` | Manual focus near |
| `FocusDec` | Manual focus far |
| `AutoFocus` | Auto-focus |
| `ToPos` | Go to preset position |

### Zoom

```bash
# Zoom in
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"ZoomInc","speed":5}}]'

# Zoom out
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"ZoomDec","speed":5}}]'

# Auto-focus (do this after zooming)
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"AutoFocus"}}]'
```

- **Zoom range:** 0 (wide) to 32 (5x optical zoom)
- **Focus range:** 0 to 285

### Save/Recall Preset Positions

Up to 32 presets (ids 0-31).

```bash
# Save current position as preset
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=SetPtzPreset&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"SetPtzPreset","action":0,"param":{"PtzPreset":{"channel":0,"enable":1,"id":0,"name":"desk_view"}}}]'

# Go to saved preset
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=PtzCtrl&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"PtzCtrl","action":0,"param":{"channel":0,"op":"ToPos","id":0,"speed":32}}]'

# List all presets
curl -sk -X POST "https://$REOLINK_IP:443/cgi-bin/api.cgi?cmd=GetPtzPreset&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"cmd":"GetPtzPreset","action":1,"param":{"channel":0}}]'
```

### Record a Video Clip

```bash
ffmpeg -rtsp_transport tcp \
  -i "rtsp://$REOLINK_USER:$REOLINK_PASS@$REOLINK_IP:554/h264Preview_01_main" \
  -t 10 -c copy -y /tmp/livingroom_clip.mp4
```

---

## AI Agent Usage Pattern

1. **Load creds:** `source sms-bot/.env.local`
2. **Login** (Reolink API): get a token (valid 1 hour)
3. **Snap:** ffmpeg RTSP or HTTPS Snap API
4. **View:** read the JPEG with vision
5. **PTZ (Reolink only):** move → stop → snap → analyze
6. **Save positions:** create named presets for commonly-viewed areas

## Troubleshooting

- **Token expired?** → Re-login. You'll get "please login first" error.
- **Port scans show closed but connections work** — normal for both cameras. Just use the URLs directly.
- **Slow ping (>1s)?** → Camera may be rebooting or on weak WiFi. Wait a minute.
- **RTSP not connecting?** → Must be enabled in Reolink app → gear → Network → Advanced → Port Settings → RTSP toggle ON.
- **HTTPS API not responding?** → Must enable HTTPS in same Port Settings screen (port 443).
- **Tapo `@` in username?** → Must URL-encode as `%40` in RTSP URLs.
- **After zooming, image blurry?** → Send AutoFocus command.
