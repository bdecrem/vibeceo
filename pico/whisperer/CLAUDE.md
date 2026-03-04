# Home Whisperer

## What This Is

AI-powered home awareness system using cameras, local vision models, and smart home automation. Part of the Pico/Home project.

## Scripts

### DogCalm (`dogcalm.py`)
- **Loop:** Snaps Reolink camera every 240s (configurable via `DOGCALM_CYCLE`)
- **Vision:** Local **Qwen 3.5 4B** via **Ollama** — zero API cost, ~46s per inference on M1
- **Detection target:** Poop emoji pillow (signals Glimmer is on her bed)
- **Action:** Plays/pauses `dogmusic` playlist on HomePod via AppleScript
- **Upload:** Compresses snap to 800px/60% quality, uploads as `latest.jpg` to Supabase Storage (`whisperer` bucket, upsert)
- **Notifications:** Optional WhatsApp via OpenClaw (`DOGCALM_NOTIFY=1`)

### Whisperer (`whisperer.py`)
- **Loop:** Snaps camera every 30s, pixel-diffs consecutive frames via ImageMagick
- **Vision:** **Claude Haiku** (API) for scene description when change detected
- **Action:** Generates warm, playful messages about scene changes
- **Notifications:** Logs to `whisperer_messages.log`, optional WhatsApp

## Web Page

- **Route:** `web/app/whisperer/` → `kochi.to/whisperer`
- **Shows:** Latest camera snap from Supabase public URL + Glimmer status
- **Image URL:** `https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/whisperer/latest.jpg`

## Infrastructure

- **Camera:** Reolink E1 Zoom at `192.168.7.22` (HTTPS API, token auth)
- **Storage:** Supabase Storage `whisperer` bucket (public)
- **Music:** Apple Music → AirPlay speaker ("Roaming w Bart")
- **Vision models:** Ollama (local) for DogCalm, Anthropic API for Whisperer

## Running DogCalm

```bash
source pico/whisperer/.venv/bin/activate
SUPABASE_SERVICE_KEY=<key> DOGCALM_CYCLE=240 DOGCALM_NOTIFY=1 python3 -u pico/whisperer/dogcalm.py
```

Requires: `SUPABASE_SERVICE_KEY` env var (in `sms-bot/.env.local`), Ollama running with `qwen3.5:4b` model pulled.

## Venv

Python venv at `pico/whisperer/.venv/`. Install deps: `pip install ollama requests urllib3`.

## Environment Variables

| Var | Default | What |
|-----|---------|------|
| `DOGCALM_CYCLE` | `180` | Seconds between checks |
| `DOGCALM_SPEAKER` | `Roaming w Bart` | AirPlay speaker name |
| `DOGCALM_PLAYLIST` | `dogmusic` | Apple Music playlist |
| `DOGCALM_VOLUME` | `25` | Playback volume (0-100) |
| `DOGCALM_NOTIFY` | `0` | `1` to enable WhatsApp |
| `DOGCALM_MODEL` | `qwen3.5:4b` | Ollama vision model |
| `SUPABASE_URL` | project URL | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | (required) | Supabase service role key |
