# Hume AI TTS API Reference

Quick reference for integrating Hume's Octave TTS into Kochi.

## Overview

Hume offers two main products:
- **Octave** - Text-to-Speech (TTS)
- **EVI** - Empathic Voice Interface (speech-to-speech, interactive)

Both use the same voice library, enabling seamless switching between podcast generation and interactive Q&A.

## Authentication

### API Key (Server-side)
```bash
curl https://api.hume.ai/v0/tts \
  --header "X-Hume-Api-Key: <YOUR_API_KEY>"
```

### Token Auth (Client-side)
1. Get access token via `POST /oauth2-cc/token` with Basic auth: `base64(API_KEY:SECRET_KEY)`
2. Use token: `Authorization: Bearer ${accessToken}`
3. Tokens expire after 30 minutes

## Environment Variables

```bash
HUME_API_KEY=your_api_key
HUME_SECRET_KEY=your_secret_key  # Only needed for token auth
```

## TTS Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v0/tts` | POST | Sync JSON response with base64 audio |
| `/v0/tts/file` | POST | Returns audio file directly |
| `/v0/tts/stream/json` | POST | Streamed JSON with base64 chunks |
| `/v0/tts/stream/file` | POST | Streamed raw audio bytes |

## Python SDK

### Installation

```bash
pip install hume python-dotenv
# or with audio playback support:
pip install "hume[microphone]" python-dotenv
```

### Basic Usage

```python
import asyncio
import base64
from hume import AsyncHumeClient
from hume.tts import PostedUtterance, FormatMp3

async def generate_speech():
    client = AsyncHumeClient(api_key="your_api_key")

    # Using description to generate voice dynamically
    result = await client.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                text="Hello, welcome to today's episode!",
                description="A warm, friendly podcast host voice"
            )
        ],
        format=FormatMp3()  # NOTE: Must use FormatMp3() object, not string!
    )

    # Decode and save audio
    audio_bytes = base64.b64decode(result.generations[0].audio)
    with open("output.mp3", "wb") as f:
        f.write(audio_bytes)

asyncio.run(generate_speech())
```

### Streaming (for real-time/long content)

```python
async def stream_speech():
    client = AsyncHumeClient(api_key="your_api_key")

    stream = client.tts.synthesize_json_streaming(
        utterances=[PostedUtterance(text="Long text here...")],
        strip_headers=True,
        version="1"
    )

    audio_chunks = []
    async for chunk in stream:
        audio_chunks.append(base64.b64decode(chunk.audio))

    with open("output.mp3", "wb") as f:
        f.write(b"".join(audio_chunks))
```

## Request Parameters

### Utterance Object

```python
PostedUtterance(
    text="The text to speak",
    voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI"),
    description="Acting instructions: speak with enthusiasm",  # Optional
    speed=1.0,  # 0.5-2.0, recommended 0.75-1.5
    trailing_silence=0.5  # Seconds of silence after utterance
)
```

### Synthesis Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `utterances` | list | Required. Text segments to synthesize |
| `format` | str | `mp3`, `wav`, or `pcm` |
| `version` | str | `"1"` or `"2"` (v2 requires voice spec) |
| `context` | str | generation_id for voice continuity |
| `num_generations` | int | Generate multiple variations (up to 5) |

## Voice Options

### Pre-built Voices (Hume Voice Library)
- 100+ voices available
- Access via `provider="HUME_AI"`
- Browse at: https://platform.hume.ai/tts/voice-library

Example voices:
- `Ava Song` - Female, warm conversational
- Check voice library for full list

### Custom Voice via Description
```python
PostedUtterance(
    text="Hello there!",
    description="A warm, friendly male voice with a slight British accent"
)
```

### Voice Cloning
Requires audio sample (min 5 seconds). Use `hume.tts.voices.create` to save cloned voices.

## Acting Instructions

Add emotion/style to speech without changing the voice identity:

```python
PostedUtterance(
    text="This is incredible news!",
    voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI"),
    description="Speak with excitement and joy"
)
```

## Continuity Across Requests

To maintain consistent prosody across multiple API calls:

```python
# First request
result1 = await client.tts.synthesize_json(utterances=[...])
generation_id = result1.generations[0].generation_id

# Subsequent request with context
result2 = await client.tts.synthesize_json(
    utterances=[...],
    context=generation_id  # Maintains voice continuity
)
```

## Response Structure

```python
{
    "generations": [
        {
            "audio": "base64_encoded_audio_string",
            "generation_id": "uuid-for-continuity",
            "duration_seconds": 5.2,
            "file_size_bytes": 83200,
            "snippets": [...]  # Word-level timestamps (v2 only)
        }
    ]
}
```

## Pricing (Pro Plan - $70/mo)

- 1,000,000 TTS characters (~1,000 minutes)
- 1,200 minutes EVI speech-to-speech
- Unlimited voice cloning
- 75 requests/minute rate limit

## Direct REST API (without SDK)

```bash
curl -X POST "https://api.hume.ai/v0/tts" \
  -H "X-Hume-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "utterances": [
      {
        "text": "Hello world!",
        "voice": {
          "name": "Ava Song",
          "provider": "HUME_AI"
        }
      }
    ],
    "format": "mp3"
  }' \
  --output output.mp3
```

## Comparison vs ElevenLabs

| Feature | Hume | ElevenLabs |
|---------|------|------------|
| TTS + Interactive | Yes (same voice) | Separate products |
| Price (1M chars) | $70/mo | $275/mo |
| Voice Library | 100+ | 3000+ |
| Speech-to-Speech | EVI included | Extra cost |
| Latency | ~100ms (v2) | ~150ms |

## Common Gotchas

1. **Format must be object, not string**
   ```python
   # WRONG
   format="mp3"

   # CORRECT
   format=FormatMp3()
   ```

2. **Voice names are case-sensitive** — Check the voice library for exact names

3. **Dynamic voices via description** — If you don't know valid voice names, just use `description` parameter to generate a voice on the fly

4. **Duration not always returned** — The `duration_seconds` field may be None; calculate from file size if needed

## Test Scripts

### Python Test
```bash
cd sms-bot
source .env.local
python experiments/hume/test_hume_tts.py
```

### TypeScript Integration

Hume is now integrated into the voice provider abstraction at `lib/voice/`:

```typescript
import { getVoiceProvider } from '../lib/voice/index.js';

// Get Hume provider
const voice = getVoiceProvider('hume', {
  voiceId: '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
});

// Synthesize
const result = await voice.synthesize('Hello world', {
  description: 'Speak warmly and naturally',
  speed: 1.0,
});

// result.audioBuffer is the MP3 data
```

### Environment Variables

```bash
# Required for Hume
HUME_API_KEY=your_api_key
HUME_SECRET_KEY=your_secret_key  # Required for EVI token generation

# Optional: Override default voice for AI Twitter Daily
AI_TWITTER_HUME_VOICE_ID=5bbc32c1-a1f6-44e8-bedb-9870f23619e2

# Optional: Switch AIT back to ElevenLabs
AI_TWITTER_VOICE_PROVIDER=elevenlabs

# Optional: Switch interactive mode provider (default: hume)
NEXT_PUBLIC_INTERACTIVE_PROVIDER=hume  # or 'openai'
```

## EVI Integration (Interactive Voice)

Hume EVI (Empathic Voice Interface) is now integrated for interactive Q&A after podcasts in the music player.

### Architecture

```
music-player → HumeEVIClient → Hume EVI WebSocket
                    ↓
              /api/hume-token (access token generation)
```

No proxy server needed - direct browser connection via access tokens.

### Key Files

| File | Purpose |
|------|---------|
| `web/app/api/hume-token/route.ts` | Access token endpoint (OAuth2 flow) |
| `web/lib/hume-evi.ts` | HumeEVIClient for WebSocket + audio |
| `web/app/music-player/page.tsx` | Interactive mode UI |

### Usage

```typescript
import { HumeEVIClient } from '@/lib/hume-evi';

// 1. Get access token from our API
const tokenRes = await fetch('/api/hume-token');
const { accessToken } = await tokenRes.json();

// 2. Create client with same voice as TTS podcasts
const client = new HumeEVIClient({
  accessToken,
  systemPrompt: 'You are a helpful assistant...',
  onConnected: () => console.log('Connected!'),
  onAssistantMessage: (text) => console.log('AI:', text),
  onResponseFinished: () => console.log('Done'),
});

// 3. Connect and start recording
await client.connect();
await client.startRecording();

// 4. Stop recording (triggers AI response)
client.stopRecording();

// 5. Cleanup
client.disconnect();
```

### Benefits

- **Same voice** for TTS podcasts and interactive Q&A
- **No proxy server** - direct WebSocket from browser
- **Included in Pro plan** ($70/mo) - 1,200 min EVI
- **Lower latency** than OpenAI Realtime API

## Resources

- [TTS Overview](https://dev.hume.ai/docs/text-to-speech-tts/overview)
- [Python Quickstart](https://dev.hume.ai/docs/text-to-speech-tts/quickstart/python)
- [Voice Guide](https://dev.hume.ai/docs/text-to-speech-tts/voice)
- [Acting Instructions](https://dev.hume.ai/docs/text-to-speech-tts/acting-instructions)
- [API Reference](https://dev.hume.ai/reference/text-to-speech-tts/synthesize-json)
- [Voice Library](https://platform.hume.ai/tts/voice-library)
- [GitHub Examples](https://github.com/HumeAI/hume-api-examples)
