# TryAir

AI-powered video ad generator. Creates ~20 second vertical (9:16) video ads from a single topic.

## Quick Start

```bash
cd tryair
npm install
npm start
```

## Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER INPUT                                                         │
│  "how acai bowls became all the rage"                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: STORYBOARD (Claude Sonnet 4)                               │
│                                                                     │
│  Sonnet acts as creative director, generating:                      │
│                                                                     │
│  SCENE 1:                                                           │
│    narration: "Remember when breakfast was just cereal..."          │
│    image: "Split screen showing plain cereal vs vibrant acai bowl"  │
│    overlay: "Instagram Effect"                                      │
│                                                                     │
│  SCENE 2:                                                           │
│    narration: "Now acai bowls are everywhere..."                    │
│    image: "Hands holding smartphone photographing acai bowl"        │
│    overlay: "Snap Then Eat"                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌───────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│  STEP 2-3: IMAGES     │ │                 │ │  STEP 4: AUDIO      │
│  (GPT Image 1.5)      │ │                 │ │  (Hume AI TTS)      │
│                       │ │                 │ │                     │
│  scene.image +        │ │                 │ │  fullNarration      │
│  style template       │ │                 │ │  → narration.mp3    │
│  → scene-1.png        │ │                 │ │                     │
│  → scene-2.png        │ │                 │ │                     │
└───────────────────────┘ │                 │ └─────────────────────┘
          │               │                 │           │
          ▼               │                 │           │
┌───────────────────────┐ │                 │           │
│  TEXT OVERLAY         │ │                 │           │
│  (Sharp)              │ │                 │           │
│                       │ │                 │           │
│  scene.overlay        │ │                 │           │
│  → bottom 25% safe    │ │                 │           │
│    zone               │ │                 │           │
└───────────────────────┘ │                 │           │
          │               │                 │           │
          └───────────────┴────────┬────────┴───────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: VIDEO RENDER (FFmpeg)                                      │
│                                                                     │
│  - Ken Burns effect (3% zoom, focus on upper 35%)                   │
│  - Scene 1 zooms IN, Scene 2 zooms OUT                              │
│  - Crossfade transition between scenes                              │
│  - Audio layered underneath                                         │
│  → final.mp4                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

Each video creates a project folder:

```
projects/
└── acai-bowls-1768151834438/
    ├── final.mp4           ← The finished video
    └── assets/
        ├── project.json    ← Metadata
        ├── script.json     ← Storyboard from Sonnet
        ├── scene-1.png     ← First scene with overlay
        ├── scene-2.png     ← Second scene with overlay
        └── narration.mp3   ← Voiceover audio
```

## Style System

Styles control HOW images are rendered, not WHAT they show. The storyboard's `image` field drives the content.

| Style | Look |
|-------|------|
| `illuminated-wellness` | Paper-craft, deep navy + warm gold, elegant |
| `paper-cut-wellness` | Paper-cut silhouettes, teal + cream, airy |
| `tech-dark` | Dark dramatic, purple/cyan glows, premium tech |

Styles are defined in `content/styles/*.txt` and follow this format:

```
style-name
Short description

---

[prompt template with {subject} placeholder]

---

NOTES FOR EDITORS:
[documentation for humans]
```

## Safe Zone

All images reserve the **bottom 25%** for text overlay:

```
┌────────────────────┐
│                    │
│   Visual content   │  ← Upper 75%
│   (main subject)   │
│                    │
├────────────────────┤
│   OVERLAY TEXT     │  ← Bottom 25% safe zone
└────────────────────┘
```:q!


The Ken Burns effect focuses on 35% from the top, keeping the safe zone stable during zoom.

## Environment Variables

Create `.env.local` in the tryair folder or parent:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
HUME_API_KEY=...
```

## Dependencies

- **Claude Sonnet 4** - Storyboard/script generation
- **GPT Image 1.5** - Image generation (via OpenAI)
- **Hume AI** - Text-to-speech
- **FFmpeg** - Video rendering (must be installed: `brew install ffmpeg`)
- **Sharp** - Image text overlay
