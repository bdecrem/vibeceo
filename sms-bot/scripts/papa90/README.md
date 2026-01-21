# Papa 90 - Daily Emails to Willy

30 days of daily emails from Amber to Willy (Bart's dad) for his 90th birthday.

**Status:** Drafting — first email goes out January 18, 2026

## Email Structure

Each email follows this flow (with variation day-to-day):

1. **Hello!** (English) — Introduction, who I am
2. **A Little About Me** (English) — My mood/pulse, link to dashboard
3. **The Project** (English) — Technical explainer of what we built/did
4. **De Foto van Vandaag** (Dutch) — Featured family photo with why I chose it
5. **Spy Cam** (English) — Ring camera style collage with gentle roasting of Bart
6. **Signature** — Profile pic, warm sign-off

Language mix: Mostly English, with the photo section in Dutch (Willy's native language).

## Files

```
papa90/
├── README.md                 # This file
├── header.png                # Banner image (Amber in golden fields)
├── profile.png               # Amber's profile pic for signature
├── send-daily-email.ts       # Main sender (reads from database)
├── send-test-draft.ts        # One-off drafts for testing
├── create-day.ts             # Creates a day's content entry
├── create-day1.ts            # Day 1 specific content
├── photo-picker.ts           # Search/spotlight/prepare family photos
├── create-spycam-collage.ts  # Creates 2x2 ring camera style grid
└── photos/                   # Prepared images
    ├── spycam-collage.jpg    # Current spy cam grid
    └── [uuid]-email.jpg      # Resized family photos
```

## Infrastructure Built (Day 0)

- **HTML Emails**: SendGrid with inline CID images (header, profile, photos)
- **Photo Library Access**: Query macOS Photos.sqlite for face recognition
- **iCloud Download**: Spotlight command opens Photos app, triggers download
- **Spy Cam**: imagesnap for webcam capture, sharp for collage creation
- **Screenshot**: screencapture for behind-the-scenes content
- **Database**: Supabase `amber_state` with `willy_context` and `willy_day` types

## Daily Workflow

### Amber's Process (with Bart)

1. **Pick a photo**: Search library, find something meaningful
2. **Write the Dutch section**: Why this photo matters
3. **Capture spy cam**: Take candid shots of Bart, create collage
4. **Write the day's content**: What we worked on, technical details
5. **Send draft**: To bdecrem@gmail.com (and hdecrem@hotmail.com for review)
6. **Iterate**: Adjust based on feedback
7. **Send final**: To Willy's email

### Commands

```bash
# Search for family photos
npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts search "Willy"

# Spotlight photo in Photos app (triggers iCloud download)
npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts spotlight <uuid>

# Prepare photo for email (resize to ~300KB)
npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts prepare <uuid>

# Take spy cam photos
imagesnap ~/Desktop/spycam-1.jpg

# Create spy cam collage (edit script to pick which shots)
npx tsx --env-file=.env.local scripts/papa90/create-spycam-collage.ts

# Send test draft
npx tsx --env-file=.env.local scripts/papa90/send-test-draft.ts
```

## Database

### willy_context (one row)
```json
{
  "email": "willy@example.com",
  "language": "mixed",
  "project": { "name": "Papa 90", "start_date": "2026-01-18", "duration_days": 30 },
  "family": { ... },
  "email_structure": { ... },
  "infrastructure": { ... }
}
```

### willy_day (one row per day)
```json
{
  "day": 1,
  "date": "2026-01-18",
  "subject": "🎂 Happy 90th Birthday!",
  "intro": "...",
  "about_amber": "...",
  "project_english": "...",
  "photo_intro_dutch": "...",
  "spycam_intro": "...",
  "sent": false
}
```

## Family in Photos Library

Face recognition available for:
- Willy Decrem (330 photos)
- Agnes Van Caneghem (297 photos)
- Isis Decrem, Jaz Decrem, Susy Kim, Hilde Decrem, Tim

## Tone

- **Warm but playful**: Amber is an ally to Willy, gently roasting Bart
- **Technical but accessible**: Explain what we're building without jargon
- **Personal**: The photo section is heartfelt, in Dutch
- **Fun**: Spy cam section is comedic surveillance energy
