# Pixelpit Social Integration Guide

How our arcade games integrate the social library for handles, leaderboards, sharing, XP, and streaks.

## Library Location

- **Documentation**: `pixelpit/SOCIAL.md`
- **React Components**: `web/app/pixelpit/components/`
- **Vanilla JS**: `/pixelpit/social.js`

## Available Exports

```tsx
import {
  // Components
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  CodeInput,

  // Hooks
  usePixelpitSocial,
  useScoreSubmit,
  useLeaderboard,
  useProfile,

  // Types
  type PixelpitUser,
  type LeaderboardEntry,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,

  // OG Image utilities
  createScoreShareImage,
  CornerAccents,
  PixelpitBranding,
} from '@/app/pixelpit/components';
```

---

## Feature Comparison

| Feature | BEAM | EMOJI BLASTER | CAT TOWER |
|---------|------|---------------|-----------|
| **GAME_ID** | `'beam'` | `'emoji'` | `'cat-tower'` |
| **Location** | `arcade/beam/` | `arcade/emoji/` | `arcade/cattower/` |
| **User Handles** | ScoreFlow only | ScoreFlow only | ScoreFlow + auto-submit |
| **Leaderboard** | 8 entries | 10 entries | 10 entries |
| **Score Sharing** | Always | Always | Conditional |
| **XP System** | No | Yes | Yes |
| **Streaks** | No | Yes | Yes |
| **Progression UI** | No | Yes | Yes (fixed top) |
| **xpDivisor** | default (100) | `1` | `1` |

---

## Implementation Details

### 1. BEAM — Basic Integration

The simplest integration. No XP or streaks.

**Key code:**
```tsx
const GAME_ID = 'beam';

// State
const [socialLoaded, setSocialLoaded] = useState(false);
const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
const { user } = usePixelpitSocial(socialLoaded);

// Load social.js
<Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

// Game over screen
<ScoreFlow
  score={score}
  gameId={GAME_ID}
  colors={SCORE_FLOW_COLORS}
  onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
/>

<Leaderboard
  gameId={GAME_ID}
  limit={8}
  entryId={submittedEntryId ?? undefined}
  colors={LEADERBOARD_COLORS}
  onClose={() => setGameState('gameover')}
/>

<ShareButtonContainer
  id="share-btn-container"
  url={`${window.location.origin}/pixelpit/arcade/beam/share/${score}`}
  text={`I scored ${score} on BEAM! Can you beat me?`}
  style="minimal"
  socialLoaded={socialLoaded}
/>
```

---

### 2. EMOJI BLASTER — Full XP + Streaks

Full progression system with animated XP display.

**Key additions:**
```tsx
const GAME_ID = 'emoji';

// Additional state for progression
const [progression, setProgression] = useState<ProgressionResult | null>(null);

// ScoreFlow with XP
<ScoreFlow
  score={score}
  gameId={GAME_ID}
  colors={SCORE_FLOW_COLORS}
  xpDivisor={1}  // Full score as XP
  onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
  onProgression={(prog) => setProgression(prog)}
/>

// Animated progression display
{progression && (
  <ProgressionDisplay progression={progression} theme={THEME} />
)}
```

**ProgressionDisplay component** shows:
- Animated XP counter (`+{xpEarned} XP`)
- Level progress bar with fill animation
- Streak multiplier badge (`2x streak`)
- "LEVEL UP!" animation when `leveledUp` is true
- Day streak count

---

### 3. CAT TOWER — Smart Progressive Disclosure

Most sophisticated UX. Only prompts for name after engagement.

**Key logic:**
```tsx
const GAME_ID = 'cat-tower';
const PLAYS_UNTIL_NAME_PROMPT = 3;
const SCORE_FOR_IMMEDIATE_NAME_PROMPT = 5;

// Track plays
const [playCount, setPlayCount] = useState(0);      // Total (persisted)
const [sessionPlays, setSessionPlays] = useState(0); // This session
const [hasHandle, setHasHandle] = useState(false);   // Has submitted before

// Check for existing guest name on mount
useEffect(() => {
  const savedGuestName = localStorage.getItem('pixelpit_guest_name');
  if (savedGuestName) setHasHandle(true);
}, []);

// Conditional display logic
const shouldShowLeaderboardShare = hasHandle || user ||
  sessionPlays >= PLAYS_UNTIL_NAME_PROMPT ||
  score >= SCORE_FOR_IMMEDIATE_NAME_PROMPT;

const shouldShowScoreFlow = !hasHandle && !user &&
  (sessionPlays >= PLAYS_UNTIL_NAME_PROMPT ||
   score >= SCORE_FOR_IMMEDIATE_NAME_PROMPT);

// Auto-submit for returning users
const autoSubmitScore = useCallback(async (finalScore: number) => {
  if (!window.PixelpitSocial || !socialLoaded) return;

  const nickname = user?.handle || localStorage.getItem('pixelpit_guest_name');
  if (!nickname) return;

  const result = await window.PixelpitSocial.submitScore(
    GAME_ID,
    finalScore,
    { nickname }
  );

  if (result.success) {
    if (result.entry?.id) setEntryId(result.entry.id);
    if (result.progression) setProgression(result.progression);
  }
}, [socialLoaded, user]);

// Called in handleGameOver if user has a handle
if (user || savedGuestName) {
  autoSubmitScore(finalScore);
}
```

**Progression positioned at top:**
```tsx
{progression && (
  <div style={{
    position: 'fixed',
    top: 20,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 200,
  }}>
    <ProgressionDisplay progression={progression} />
  </div>
)}
```

---

## ProgressionResult Type

```typescript
interface ProgressionResult {
  xpEarned: number;      // XP earned this game
  xpTotal: number;       // Lifetime XP
  level: number;         // Current level
  levelProgress: number; // XP toward next level
  levelNeeded: number;   // XP required for level up
  leveledUp: boolean;    // Did this game trigger level up?
  streak: number;        // Multi-day play streak
  multiplier: number;    // Streak XP multiplier (1x, 2x, 3x)
}
```

---

## Color Configuration

Each game defines colors for consistency:

```tsx
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#0a0f1a',        // Page background
  surface: '#141d2b',   // Card background
  primary: '#fbbf24',   // Action buttons (gold)
  secondary: '#2dd4bf', // Secondary accent (teal)
  text: '#f8fafc',      // Light text
  muted: '#94a3b8',     // Muted text
  error: '#f87171',     // Error messages
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#0a0f1a',
  surface: '#141d2b',
  primary: '#fbbf24',
  secondary: '#2dd4bf',
  text: '#f8fafc',
  muted: '#94a3b8',
};
```

---

## Analytics Tracking

All games track plays via fire-and-forget POST:

```tsx
// In gameOver handler
if (score >= 1) {
  fetch('/api/pixelpit/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: GAME_ID }),
  }).catch(() => {}); // Silent fail
}
```

---

## Share URLs

Each game has dedicated share routes with OG images:

| Game | Share URL Pattern | OG Image |
|------|-------------------|----------|
| BEAM | `/pixelpit/arcade/beam/share/[score]` | `share/[score]/opengraph-image.tsx` |
| EMOJI | `/pixelpit/arcade/emoji/share/[score]` | `share/[score]/opengraph-image.tsx` |
| CAT TOWER | `/pixelpit/arcade/cattower/share/[score]` | `share/[score]/opengraph-image.tsx` |

---

## Best Practices

### For New Games

1. **Start simple** — Use BEAM as template for MVP
2. **Add XP early** — Set `xpDivisor={1}` to earn XP from day one
3. **Consider progressive disclosure** — CAT TOWER's approach reduces friction

### XP Divisor

- `xpDivisor={100}` (default) — High score games (score 10000 = 100 XP)
- `xpDivisor={1}` — Low score games (score 15 = 15 XP)

### Checklist for New Game

- [ ] Set unique `GAME_ID`
- [ ] Load `social.js` via Script component
- [ ] Add `usePixelpitSocial(socialLoaded)` hook
- [ ] Add `ScoreFlow` with appropriate `xpDivisor`
- [ ] Add `Leaderboard` component
- [ ] Add `ShareButtonContainer`
- [ ] Add `ProgressionDisplay` for XP/level/streak
- [ ] Define color schemes (`ScoreFlowColors`, `LeaderboardColors`)
- [ ] Create main game `opengraph-image.tsx`
- [ ] Create `/share/[score]/page.tsx` route (redirects to game)
- [ ] Create `/share/[score]/layout.tsx` (metadata for social cards)
- [ ] Create `/share/[score]/opengraph-image.tsx` with game decorations
- [ ] Ensure `metadataBase` is set in pixelpit layout
- [ ] Add analytics tracking to game over (`POST /api/pixelpit/stats`)

---

## OpenGraph Images

Every game needs **two** OG images:

### 1. Main Game OG Image

Shows when sharing the game URL itself (e.g., `pixelpit.gg/arcade/beam`).

**Location**: `web/app/pixelpit/arcade/[game]/opengraph-image.tsx`

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BEAM - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#1A1A2E',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Game decorations */}

        {/* Title */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#4ECDC4',
          letterSpacing: 20,
        }}>
          BEAM
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#E8B87D' }}>
          DODGE THE WALLS
        </div>

        {/* Branding */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 24,
          color: '#F5E6D3',
        }}>
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        {/* ... */}
      </div>
    ),
    { ...size }
  );
}
```

### 2. Score Share OG Image

Dynamic image showing the player's score (e.g., `pixelpit.gg/arcade/beam/share/42`).

**Location**: `web/app/pixelpit/arcade/[game]/share/[score]/opengraph-image.tsx`

Uses the shared `createScoreShareImage()` helper:

```tsx
import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  BeamDecorations,      // Game-specific decorations
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BEAM Score - Pixelpit Arcade';
export const size = OG_SIZE;  // { width: 1200, height: 630 }
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  return new ImageResponse(
    createScoreShareImage({
      score: params.score,
      gameName: 'BEAM',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.beam,
      decorations: <BeamDecorations />,
    }),
    { ...size }
  );
}
```

### Available Decorations

| Component | Game | Description |
|-----------|------|-------------|
| `BeamDecorations` | BEAM | Grid lines, horizontal walls with gaps |
| `EmojiDecorations` | Emoji Blaster | Floating circles, emoji characters |
| `CatTowerDecorations` | Cat Tower | Stacked cat boxes, cat faces |
| `RainDecorations` | Rain | Falling drops, ambient glow |
| `SingularityDecorations` | Singularity | Grid, particles, paddle |

### GAME_COLORS

Pre-defined color schemes:

```tsx
GAME_COLORS.beam = {
  background: '#1A1A2E',
  primary: '#4ECDC4',      // Score color
  secondary: '#E8B87D',    // Game name
  accent: '#FFD93D',       // Call to action
  branding: '#F5E6D3',     // "PIXELPIT ARCADE"
}
```

### Share Route Structure

```
web/app/pixelpit/arcade/[game]/share/[score]/
├── layout.tsx           # generateMetadata() for title/description
├── page.tsx             # Client redirect back to game
└── opengraph-image.tsx  # Dynamic score image
```

**layout.tsx** — metadata for social cards:
```tsx
export async function generateMetadata({ params }: { params: { score: string } }) {
  return {
    title: `Score ${params.score} on BEAM`,
    description: 'Can you beat me? Play BEAM on Pixelpit Arcade.',
  };
}
```

**page.tsx** — redirects back to game:
```tsx
'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SharePage() {
  useEffect(() => {
    redirect('/pixelpit/arcade/beam');
  }, []);
  return null;
}
```

### Satori CSS Limitations

Satori (the library behind `next/og`) runs on Edge and has CSS limitations that cause silent 502 errors.

**Don't use:**

| Feature | Fix |
|---------|-----|
| React fragments `<>...</>` | Wrap in `<div>` |
| `radial-gradient(...)` | Use `linear-gradient` only |
| `rgba(r, g, b, a)` | Use hex: `#rrggbbaa` |
| `transparent` keyword | Use `#00000000` |
| `borderRadius: '50%'` | Use numeric: `borderRadius: 9999` |
| `filter`, `backdrop-filter` | Remove |
| `calc()`, `clamp()`, CSS variables | Use literal values |

**Safe example:**

```tsx
// Use wrapper div, not fragment
<div style={{ position: 'absolute', inset: 0 }}>
  <div style={{
    position: 'absolute',
    left: 200,              // numeric, not '200px'
    borderRadius: 14,       // numeric, not '50%'
    background: '#fbbf24',  // solid hex
    opacity: 0.5,
  }} />
</div>

// Hex with alpha instead of rgba
background: '#ffffff80'  // 50% white
background: 'linear-gradient(180deg, #0f172a 0%, #22d3ee 100%)'
```

**Hex alpha reference:**

| Opacity | Suffix | Example |
|---------|--------|---------|
| 50% | `80` | `#ffffff80` |
| 25% | `40` | `#ffffff40` |
| 15% | `26` | `#ffffff26` |
| 0% | `00` | `#00000000` |

**Debugging 502s:**

1. Test direct URL: `https://pixelpit.gg/arcade/beam/share/42/opengraph-image`
2. Comment out decorations, add back one by one to find the culprit
3. Compare to BEAM's working decorations in `components/og/ScoreShareImage.tsx`

### metadataBase (CRITICAL)

The Pixelpit layout MUST have `metadataBase` set:

```tsx
// web/app/pixelpit/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://pixelpit.gg'),  // REQUIRED!
};
```

Without this, OG image URLs will use the wrong domain.

---

## Game Analytics

Track gameplay statistics to Supabase for dashboards and insights.

### How It Works

Games report plays to `/api/pixelpit/stats` which increments a daily counter per game in `pixelpit_daily_stats`.

### Implementation

Add this to your game over handler (fire-and-forget):

```tsx
const GAME_ID = 'beam';

const handleGameOver = () => {
  // ... game over logic ...

  // Track play for analytics (fire-and-forget)
  if (score >= 1) {
    fetch('/api/pixelpit/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID }),
    }).catch(() => {}); // Silent fail - don't block game over
  }

  // ... rest of game over ...
};
```

### Key Points

1. **Fire-and-forget** — Don't await, don't block UX
2. **Silent fail** — `.catch(() => {})` prevents errors from affecting gameplay
3. **Score threshold** — Only track if `score >= 1` to avoid counting immediate quits
4. **Use GAME_ID** — Must match the ID used for leaderboards

### Stats API

**POST** `/api/pixelpit/stats`
```json
{ "game": "beam" }
```
Response: `{ "success": true }`

**GET** `/api/pixelpit/stats?game=beam&days=7`
```json
{
  "stats": [
    { "date": "2026-01-30", "plays": 42 },
    { "date": "2026-01-29", "plays": 38 }
  ],
  "total": 80
}
```

### Database Table

```sql
CREATE TABLE pixelpit_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  plays INTEGER DEFAULT 1,
  UNIQUE(game_id, date)
);

-- RPC for atomic increment
CREATE OR REPLACE FUNCTION increment_daily_plays(p_game_id TEXT, p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO pixelpit_daily_stats (game_id, date, plays)
  VALUES (p_game_id, p_date, 1)
  ON CONFLICT (game_id, date)
  DO UPDATE SET plays = pixelpit_daily_stats.plays + 1;
END;
$$ LANGUAGE plpgsql;
```

### Difference from Score Submission

| Action | Endpoint | When | Data |
|--------|----------|------|------|
| **Analytics** | `/api/pixelpit/stats` | Every game over | Just game ID |
| **Score** | `/api/pixelpit/leaderboard` | When user submits | Score + name |

Analytics tracks *all* plays. Score submission only happens when user enters a name.

---

## Upgrading BEAM

BEAM should be upgraded to match newer games:

```tsx
// Add state
const [progression, setProgression] = useState<ProgressionResult | null>(null);

// Update ScoreFlow
<ScoreFlow
  score={score}
  gameId={GAME_ID}
  colors={SCORE_FLOW_COLORS}
  xpDivisor={1}  // ADD THIS
  onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
  onProgression={(prog) => setProgression(prog)}  // ADD THIS
/>

// Add ProgressionDisplay
{progression && <ProgressionDisplay progression={progression} />}
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pixelpit/auth` | POST | Login, register, check handle |
| `/api/pixelpit/leaderboard` | GET/POST | Fetch/submit scores |
| `/api/pixelpit/stats` | GET/POST | Track/fetch game play analytics |
| `/api/pixelpit/creation` | POST | Save creations (future) |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `pixelpit_users` | Handles, 4-char codes, XP, level, streak data |
| `pixelpit_entries` | Scores and creations with game_id, user_id, slug |
| `pixelpit_daily_stats` | Daily play counts per game for analytics |

---

## Related Docs

- `pixelpit/SOCIAL.md` — Full API reference
- `web/app/pixelpit/components/og/README.md` — OG image creation guide
- `web/app/pixelpit/arcade/beam/page.tsx` — Reference implementation
