# Pixelpit Social Integration Guide

How our arcade games integrate the social library for handles, leaderboards, sharing, groups, XP, and streaks.

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
  ShareModal,
  CreateGroupForm,
  GroupTabs,
  StreakBoard,
  CodeInput,

  // Hooks
  usePixelpitSocial,
  useScoreSubmit,
  useLeaderboard,
  useProfile,
  useGroups,

  // Types
  type PixelpitUser,
  type LeaderboardEntry,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
  type Group,
  type GroupType,
  type GroupsResult,
  type CreateGroupResult,
  type JoinGroupResult,

  // OG Image utilities
  createScoreShareImage,
  CornerAccents,
  PixelpitBranding,
} from '@/app/pixelpit/components';
```

---

## Feature Comparison

| Feature | SUPERBEAM | BAT DASH | EMOJI BLASTER | CAT TOWER | BEAM |
|---------|-----------|----------|---------------|-----------|------|
| **GAME_ID** | `'superbeam'` | `'batdash'` | `'emoji'` | `'cat-tower'` | `'beam'` |
| **Location** | `arcade/superbeam/` | `arcade/batdash/` | `arcade/emoji/` | `arcade/cattower/` | `arcade/beam/` |
| **Groups** | Yes | Yes | No | No | No |
| **ShareModal** | Yes | Yes | No | No | No |
| **Group Leaderboard** | Yes | Yes | No | No | No |
| **Group Code URL** | `?pg=CODE` | `?pg=CODE` | No | No | No |
| **Logout URL** | `?logout` | `?logout` | No | No | No |
| **XP System** | Yes | Yes | Yes | Yes | No |
| **Streaks** | Yes | Yes | Yes | Yes | No |
| **xpDivisor** | `1` | `1` | `1` | `1` | default (100) |
| **Progression UI** | Yes | Yes | Yes | Yes (fixed top) | No |

**SUPERBEAM and BAT DASH are the reference implementations** for full social integration. New games should follow their pattern.

---

## Implementation Details

### 1. Full Integration (SUPERBEAM / BAT DASH pattern)

This is the standard for all new games. Includes groups, ShareModal, session handling, XP, and streaks.

**Required state and setup:**
```tsx
const GAME_ID = 'your-game';

const [socialLoaded, setSocialLoaded] = useState(false);
const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
const [progression, setProgression] = useState<ProgressionResult | null>(null);
const [showShareModal, setShowShareModal] = useState(false);

const { user } = usePixelpitSocial(socialLoaded);

const GAME_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/pixelpit/arcade/YOUR_GAME`
  : 'https://pixelpit.gg/pixelpit/arcade/YOUR_GAME';
```

**Load social.js:**
```tsx
<Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />
```

**Group code + logout URL handling (required):**
```tsx
useEffect(() => {
  if (!socialLoaded || typeof window === 'undefined') return;
  if (!window.PixelpitSocial) return;

  const params = new URLSearchParams(window.location.search);
  if (params.has('logout')) {
    window.PixelpitSocial.logout();
    params.delete('logout');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    window.location.reload();
    return;
  }

  const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
  if (groupCode) {
    window.PixelpitSocial.storeGroupCode(groupCode);
  }
}, [socialLoaded]);
```

**Game over screen — ScoreFlow + progression:**
```tsx
<ScoreFlow
  score={score}
  gameId={GAME_ID}
  colors={SCORE_FLOW_COLORS}
  xpDivisor={1}
  onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
  onProgression={(prog) => setProgression(prog)}
/>

{progression && (
  <div>
    <div>+{progression.xpEarned} XP</div>
    <div>Level {progression.level} {progression.streak > 1 ? `${progression.multiplier}x streak` : ''}</div>
  </div>
)}
```

**Game over screen — user-aware share button:**
```tsx
{user ? (
  <button onClick={() => setShowShareModal(true)}>
    share / groups
  </button>
) : (
  <ShareButtonContainer
    id="share-btn-container"
    url={`${window.location.origin}/pixelpit/arcade/YOUR_GAME/share/${score}`}
    text={`I scored ${score} on GAME NAME! Can you beat me?`}
    style="minimal"
    socialLoaded={socialLoaded}
  />
)}
```

**Leaderboard — modal with groups enabled:**
```tsx
{gameState === 'leaderboard' && (
  <Leaderboard
    gameId={GAME_ID}
    limit={8}
    entryId={submittedEntryId ?? undefined}
    colors={LEADERBOARD_COLORS}
    onClose={() => setGameState('gameover')}
    groupsEnabled={true}
    gameUrl={GAME_URL}
    socialLoaded={socialLoaded}
  />
)}
```

**ShareModal — at component root, outside game-over div:**
```tsx
{showShareModal && user && (
  <ShareModal
    gameUrl={GAME_URL}
    score={score}
    colors={LEADERBOARD_COLORS}
    onClose={() => setShowShareModal(false)}
  />
)}
```

---

### 2. Legacy: Basic Integration (BEAM)

Older pattern without groups. **Do not use for new games** — upgrade to the full pattern above.

```tsx
// Missing: ShareModal, group code handling, logout handling,
// groupsEnabled on Leaderboard, user-aware share button
<ShareButtonContainer ... />  // Same button for all users
<Leaderboard ... />           // No groupsEnabled, no gameUrl
```

---

### 3. Smart Progressive Disclosure (CAT TOWER)

Most sophisticated UX. Only prompts for name after engagement.

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

**Social core:**
- [ ] Set unique `GAME_ID`
- [ ] Load `social.js` via Script component
- [ ] Add `usePixelpitSocial(socialLoaded)` hook
- [ ] Define `GAME_URL` constant
- [ ] Add `ScoreFlow` with `xpDivisor={1}` and `onProgression`
- [ ] Add `ProgressionDisplay` for XP/level/streak
- [ ] Define color schemes (`ScoreFlowColors`, `LeaderboardColors`)

**Groups & sharing:**
- [ ] Add group code detection `useEffect` (`?pg=` URL param → `storeGroupCode`)
- [ ] Add logout URL param handling (`?logout`)
- [ ] Add `Leaderboard` with `groupsEnabled={true}`, `gameUrl`, `socialLoaded`
- [ ] Add user-aware share: `ShareModal` for logged-in, `ShareButtonContainer` for anonymous
- [ ] Add `showShareModal` state, reset on game restart

**OG images & share routes:**
- [ ] Create main game `opengraph-image.tsx`
- [ ] Create `/share/[score]/page.tsx` route (redirects to game)
- [ ] Create `/share/[score]/layout.tsx` (metadata for social cards)
- [ ] Create `/share/[score]/opengraph-image.tsx` with game decorations
- [ ] Ensure `metadataBase` is set in pixelpit layout

**Analytics:**
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

## Upgrading Older Games

Games without groups integration (BEAM, EMOJI BLASTER, CAT TOWER) should be upgraded to match the full pattern. The changes needed:

1. Add `ShareModal` import
2. Add `showShareModal` state + `GAME_URL` constant
3. Add `useEffect` for group code (`?pg=`) and logout (`?logout`) URL params
4. Replace `ShareButtonContainer` with user-aware split (ShareModal for logged-in, ShareButtonContainer for anonymous)
5. Add `groupsEnabled={true}`, `gameUrl`, `socialLoaded` to `Leaderboard`
6. Render `ShareModal` at component root

See the BAT DASH commit (`6247a1d8`) for a clean diff of exactly these changes applied to an existing game.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pixelpit/auth` | GET/POST | Session check (GET), login/register/logout/check handle (POST) |
| `/api/pixelpit/leaderboard` | GET/POST | Fetch leaderboard (GET, supports `groupCode` filter), submit scores (POST) |
| `/api/pixelpit/groups` | GET/POST | Fetch user's groups (GET), create group (POST) |
| `/api/pixelpit/groups/join` | POST | Join a group by code |
| `/api/pixelpit/connections` | POST | Record magic streak connection (referral) |
| `/api/pixelpit/profile` | GET | Fetch user profile with XP/level/streak |
| `/api/pixelpit/stats` | GET/POST | Track/fetch game play analytics |
| `/api/pixelpit/creation` | GET/POST | Save/fetch creations |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `pixelpit_users` | Handles, 4-char codes, XP, level, streak data |
| `pixelpit_entries` | Scores and creations with game_id, user_id, slug |
| `pixelpit_groups` | Groups (code, name, type: streak/leaderboard) |
| `pixelpit_group_members` | Group membership (user_id, group_id) |
| `pixelpit_connections` | Magic streak connections (referrals between users) |
| `pixelpit_daily_stats` | Daily play counts per game for analytics |

---

## Related Docs

- `pixelpit/SOCIAL.md` — Full API reference
- `pixelpit/personas/push.md` — Release checklist (Push persona)
- `web/app/pixelpit/components/og/README.md` — OG image creation guide
- `web/app/pixelpit/arcade/superbeam/page.tsx` — Reference implementation (full social)
- `web/app/pixelpit/arcade/batdash/page.tsx` — Reference implementation (full social)
