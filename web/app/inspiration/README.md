# Inspiration - AI Video Ad Generator

Internal tool for generating AI-powered video ads with multiple creative directions.

## Overview

Inspiration is a web-based creative tool that generates video ads using AI. Users enter a topic, choose a mode and style, and receive two creative directions (Comp A and Comp B) to choose from. An agent mode allows iterative refinement through natural language feedback.

## Features

| Feature | Description |
|---------|-------------|
| **Three Modes** | Video (2 scenes), Wall of Text (scrolling text), Single Image |
| **Two-Comp System** | AI generates 2 creative directions, user picks one |
| **Agent Mode** | Provide feedback, AI generates new comps based on critique |
| **Multiple Image Models** | FLUX Dev, FLUX Max, GPT-Image 1.5, Recraft V3, Nano Banana via fal.ai |
| **Text Customization** | Font family, color, shadow style, size controls |
| **Animation Controls** | Zoom in/out, pan left/right, Ken Burns, static + speed + focus point |
| **Professional Quality** | High-quality image generation, Hume AI voiceover, FFmpeg video rendering |

## Architecture

```
web/app/inspiration/
├── page.tsx              # Main UI (single-file React component)
├── layout.tsx            # Layout wrapper
├── README.md             # This file
└── api/
    ├── storyboard/route.ts   # Generate creative directions (Claude Sonnet 4)
    ├── image/route.ts        # Generate images (OpenAI gpt-image-1.5)
    ├── audio/route.ts        # Generate voiceover (Hume AI TTS)
    ├── video/route.ts        # Render final video (FFmpeg)
    └── agent/route.ts        # Handle feedback, generate new comps
```

## API Routes

### POST `/api/storyboard`

Generates creative directions for the given topic.

**Request:**
```json
{
  "topic": "the rise of acai bowls",
  "mode": "video" | "wall-of-text" | "image",
  "style": "illuminated-wellness" | "paper-cut" | "tech-dark" | "crystal-clear"
}
```

**Response (video mode):**
```json
{
  "storyboard": {
    "type": "video",
    "narration": {
      "scene1": "Hook/problem text...",
      "scene2": "Payoff/CTA text..."
    },
    "compA": {
      "mood": "warm and inviting",
      "scene1": { "image": "detailed prompt...", "overlay": "TASTE THIS" },
      "scene2": { "image": "detailed prompt...", "overlay": "FEEL BETTER" }
    },
    "compB": {
      "mood": "cool and minimal",
      "scene1": { "image": "detailed prompt...", "overlay": "PURE" },
      "scene2": { "image": "detailed prompt...", "overlay": "SIMPLE" }
    }
  }
}
```

**Response (wall-of-text mode):**
```json
{
  "storyboard": {
    "type": "wall-of-text",
    "script": "Full narration text (100-150 words)...",
    "compA": {
      "mood": "cinematic and moody",
      "backgroundImage": "detailed prompt..."
    },
    "compB": {
      "mood": "bright and energetic",
      "backgroundImage": "detailed prompt..."
    }
  }
}
```

### POST `/api/image`

Generates images using either fal.ai models or OpenAI gpt-image-1.5.

**Request:**
```json
{
  "prompt": "Detailed image description with lighting, composition, textures...",
  "size": "1024x1536",
  "quality": "high",
  "model": "flux-dev"
}
```

**Available Models:**
| Model | Provider | Description |
|-------|----------|-------------|
| `flux-dev` | fal.ai | Fast, production quality (default) |
| `flux-max` | fal.ai | Best quality, artistic |
| `gpt-image-1.5` | OpenAI | Sharp details, high fidelity |
| `recraft-v3` | fal.ai | Design/branding focus |
| `nano-banana` | fal.ai | Fastest generation |

**Response:**
```json
{
  "image": "base64-encoded-image-data"
}
```

**Image Generation Best Practices:**
- Include visual medium (e.g., "cinematic photography", "professional advertising shot")
- Specify lighting (e.g., "golden hour rim lighting", "soft diffused studio light")
- Define composition (e.g., "rule of thirds", "centered with negative space")
- Add concrete textures and materials
- Include color palette

### POST `/api/audio`

Generates voiceover using Hume AI Text-to-Speech.

**Request:**
```json
{
  "text": "Narration text to speak...",
  "voiceId": "optional-voice-id"
}
```

**Response:**
```json
{
  "audio": "base64-encoded-mp3-data",
  "duration": 15.5
}
```

### POST `/api/video`

Renders final video using FFmpeg with customizable animations and text styling.

**Request:**
```json
{
  "mode": "video" | "wall-of-text" | "image",
  "images": ["base64-image-1", "base64-image-2"],
  "audio": "base64-audio-data",
  "script": "For wall-of-text mode, the scrolling text",
  "overlays": ["SCENE 1 TEXT", "SCENE 2 TEXT"],
  "textStyle": {
    "fontFamily": "Arial" | "Georgia" | "Montserrat" | "Impact",
    "color": "#FFFFFF",
    "shadowStyle": "none" | "subtle" | "bold",
    "size": "small" | "medium" | "large"
  },
  "animation": {
    "type": "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "ken-burns" | "static",
    "speed": "slow" | "medium" | "fast",
    "focusPoint": "upper" | "center" | "lower"
  }
}
```

**Response:**
```json
{
  "video": "base64-encoded-mp4-data",
  "duration": 20.5
}
```

### POST `/api/agent`

Handles iterative feedback and generates new creative directions.

**Request:**
```json
{
  "topic": "original topic",
  "mode": "video",
  "style": "illuminated-wellness",
  "currentComps": { "compA": {...}, "compB": {...} },
  "feedback": "I like A but want it more premium and exclusive"
}
```

**Response:**
```json
{
  "storyboard": {
    "compA": { "mood": "...", "scene1": {...}, "scene2": {...} },
    "compB": { "mood": "...", "scene1": {...}, "scene2": {...} }
  },
  "reasoning": "Based on your feedback about wanting a more premium feel..."
}
```

## Video Generation Modes

### Video Mode (2 Scenes)
- **Duration**: ~20 seconds
- **Structure**: Two scenes with crossfade transition
- **Images**: 2 images (one per scene)
- **Effect**: Ken Burns zoom (in on scene 1, out on scene 2)
- **Overlays**: 1-3 word text overlay per scene

### Wall of Text Mode
- **Duration**: 30-60 seconds (based on script length)
- **Structure**: Single background with scrolling text
- **Images**: 1 atmospheric background image
- **Text**: Word-wrapped script scrolls from bottom to top
- **Effect**: Subtle Ken Burns zoom, dark overlay for readability

### Single Image Mode
- **Output**: Static image with headline overlay
- **No video**: Just the composed image

## Environment Variables

Required in `web/.env`:

```bash
OPENAI_API_KEY=sk-...           # For gpt-image-1.5 image generation
ANTHROPIC_API_KEY=sk-ant-...    # For Claude Sonnet 4 storyboard generation
HUME_API_KEY=...                # For Hume AI text-to-speech
FAL_API_KEY_ISIS=...            # For fal.ai image models (FLUX, Recraft, etc.)
```

## Style Presets

| Style | Description |
|-------|-------------|
| `illuminated-wellness` | Deep navy + gold, warm lighting, luxury wellness aesthetic |
| `paper-cut` | Multi-layered paper craft, soft shadows, handmade organic feel |
| `tech-dark` | Ultra-dark background, subtle neon/cyan, Matrix-meets-futurism |
| `crystal-clear` | Cool blues + whites, crisp morning light, luxury water aesthetic |

Each style includes detailed prompting guidance for:
- Color palette
- Lighting description
- Mood and atmosphere
- Technical details (focus, depth of field, etc.)

## User Flow

```
1. Enter topic
   ↓
2. Select mode (Video / Wall of Text / Image)
   ↓
3. Select style (Illuminated Wellness / Paper Cut / etc.)
   ↓
4. Click "Generate Comps"
   ↓
5. View Comp A and Comp B previews (AI-generated images)
   ↓
6. Either:
   a. Select a comp → Generate final video
   b. Click "Let's discuss" → Enter agent mode
   ↓
7. Agent mode: Provide feedback → Get new comps (C, D)
   ↓
8. Repeat until satisfied → Generate final video
   ↓
9. Preview and download video
```

## Technical Details

### FFmpeg Commands

**Wall of Text (scrolling text):**
```bash
ffmpeg -y \
  -loop 1 -t [duration] -i image.png \
  -i audio.mp3 \
  -filter_complex "
    [0:v]zoompan=z='1+0.0005*on':...[bg];
    [bg]drawbox=...:color=black@0.55:...[bgdark];
    [bgdark]drawtext=textfile=script.txt:
      fontsize=52:fontcolor=white:
      x=80:y=h-(t*[scrollSpeed]):
      line_spacing=20:shadowcolor=black@0.8:...[outv]
  " \
  -map [outv] -map 1:a \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  output.mp4
```

**Two-Scene Video (with crossfade):**
```bash
ffmpeg -y \
  -loop 1 -t [sceneDuration] -i scene1.png \
  -loop 1 -t [sceneDuration] -i scene2.png \
  -i audio.mp3 \
  -filter_complex "
    [0:v]zoompan=z='1+increment*on':...[v0];
    [1:v]zoompan=z='1.03-increment*on':...[v1];
    [v0]drawtext=...[v0t];
    [v1]drawtext=...[v1t];
    [v0t][v1t]xfade=transition=fade:duration=0.5:...[outv]
  " \
  output.mp4
```

### Word Wrapping Algorithm

The wall of text mode manually word-wraps text before passing to FFmpeg:

```typescript
const avgCharWidth = fontSize * 0.52;  // Approximate character width
const charsPerLine = Math.floor(maxTextWidth / avgCharWidth);

const words = script.split(/\s+/);
const lines: string[] = [];
let currentLine = '';

for (const word of words) {
  const testLine = currentLine ? `${currentLine} ${word}` : word;
  if (testLine.length <= charsPerLine) {
    currentLine = testLine;
  } else {
    if (currentLine) lines.push(currentLine);
    currentLine = word;
  }
}
```

## Testing

Playwright test scripts are in `web/`:

| Script | Purpose |
|--------|---------|
| `test-inspiration-images.mjs` | Tests image generation pipeline |
| `test-wall-of-text.mjs` | Tests wall of text video generation |

Run with:
```bash
node web/test-inspiration-images.mjs
node web/test-wall-of-text.mjs
```

## Dependencies

- **Next.js 14+**: App router with colocated API routes
- **OpenAI API**: gpt-image-1.5 for image generation
- **Anthropic API**: Claude Sonnet 4 for storyboard generation
- **Hume AI**: Text-to-speech voiceover
- **FFmpeg**: Video rendering (must be installed on server)
- **Playwright**: End-to-end testing (dev dependency)

## Related Files

- `tryair/docs/V2-PLAN.md` - Original architecture plan
- `web/middleware.ts` - Must include `/inspiration` bypass (line ~133)
