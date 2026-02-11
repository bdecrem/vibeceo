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
  SettingsPanel,

  // Hooks
  usePixelpitSocial, getGuestName, saveGuestName,
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
  BeamDecorations, CatchDecorations, CatTowerDecorations,
  CaveMothDecorations, EmojiDecorations, FlappyDecorations,
  FlipDecorations, RainDecorations, SingularityDecorations,
  SproutRunDecorations, TapBeatsDecorations,
  OG_SIZE,
  CornerAccents, PixelpitBranding, GAME_COLORS,
} from '@/app/pixelpit/components';
```

---

## Feature Comparison

| Feature | SUPERBEAM | BAT DASH | TAPPER | EMOJI BLASTER | CAT TOWER | BEAM |
|---------|-----------|----------|--------|---------------|-----------|------|
| **GAME_ID** | `'superbeam'` | `'batdash'` | `'tapper'` | `'emoji'` | `'cat-tower'` | `'beam'` |
| **Location** | `arcade/superbeam/` | `arcade/batdash/` | `arcade/tapper/` | `arcade/emoji/` | `arcade/cattower/` | `arcade/beam/` |
| **Groups** | Yes | Yes | Yes | No | No | No |
| **ShareModal** | Yes | Yes | Yes | No | No | No |
| **Group Leaderboard** | Yes | Yes | Yes | No | No | No |
| **Group Code URL** | `?pg=CODE` | `?pg=CODE` | `?pg=CODE` | No | No | No |
| **Logout URL** | `?logout` | `?logout` | `?logout` | No | No | No |
| **XP System** | Yes | Yes | Yes | Yes | Yes | No |
| **Streaks** | Yes | Yes | Yes | Yes | Yes | No |
| **maxScore** | per-game | per-game | per-game | per-game | per-game | `50` (default) |
| **Progression UI** | Yes | Yes | Yes | Yes | Yes (fixed top) | No |

**SUPERBEAM, BAT DASH, and TAPPER are the reference implementations** for full social integration. New games should follow their pattern.

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
  maxScore={20}  // Game's "great score" benchmark — awards 10-50 XP normalized
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
    Share / Groups
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

**Leaderboard — with groups enabled:**

**IMPORTANT:** Do NOT wrap `<Leaderboard>` in a custom modal/overlay — the component renders its own full-screen layout. Use the `onClose` prop for the back button. Wrapping it causes the back button to be hidden behind the component.

```tsx
{showLeaderboard && (
  <Leaderboard
    gameId={GAME_ID}
    limit={8}
    entryId={submittedEntryId ?? undefined}
    colors={LEADERBOARD_COLORS}
    onClose={() => setShowLeaderboard(false)}
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

## ShareModal (Deep Dive)

The `ShareModal` is a full-screen overlay for logged-in users. It provides two features in one panel: a personal share link with copy-to-clipboard, and group management (view groups, share to groups, create new groups).

### What It Shows

1. **YOUR LINK** — A share URL built from `gameUrl/share/${score}` with `?ref=<userId>` appended (for magic streaks). Copy button with clipboard fallback.
2. **YOUR GROUPS** — Loads the user's groups via `PixelpitSocial.getGroups()`. Each group row shows name, type badge, streak count (if streak group), and a "Share" button.
3. **+ Create New Group** — Opens `CreateGroupForm` inline (replaces modal content).

### Props

```typescript
interface ShareModalProps {
  gameUrl: string;         // e.g. "https://pixelpit.gg/pixelpit/arcade/superbeam"
  score?: number;          // Current score (used in share URL and challenge text)
  colors: LeaderboardColors;
  onClose: () => void;
  onGroupShare?: (group: Group) => void;  // Called after sharing to a group
}
```

### How Group Sharing Works

When a user taps "Share" on a group row:
1. Builds URL: `gameUrl/share/${score}?pg=${group.code}&ref=${userId}`
2. Composes challenge text: `"@handle wants you to beat their score of X! Play GroupName: <url>"`
3. Tries `navigator.share()` (native share sheet on mobile), falls back to clipboard copy + toast

### How CreateGroupForm Works

Rendered inside ShareModal when user taps "+ Create New Group":
1. User picks type: **STREAK (2ppl)** or **LEADERBOARD**
2. Enters group name (max 50 chars)
3. Optionally enters phone numbers for SMS invite
4. Calls `PixelpitSocial.createGroup(name, type, { phones, gameUrl, score })`
5. On success: reloads groups list, opens SMS link if provided, shows toast "+10 XP"

### Integration Pattern

Games render ShareModal at the component root (outside game-over div) so it overlays everything:

```tsx
// State
const [showShareModal, setShowShareModal] = useState(false);

// In game-over screen — show "share / groups" for logged-in users
{user ? (
  <button onClick={() => setShowShareModal(true)}>share / groups</button>
) : (
  <ShareButtonContainer ... />  // Anonymous users get basic share
)}

// At component root — the modal itself
{showShareModal && user && (
  <ShareModal
    gameUrl={GAME_URL}
    score={score}
    colors={LEADERBOARD_COLORS}
    onClose={() => setShowShareModal(false)}
  />
)}
```

**Reset `showShareModal` to `false` in your `startGame`/restart function** so the modal doesn't persist across plays.

---

## Magic Streaks (Referral System)

When a logged-in user shares a link, it includes `?ref=<userId>`. When another logged-in user plays via that link, a **magic streak pair** is automatically created — a 2-person streak group that tracks daily play streaks between the two users.

### How It Works

1. **Share URL built**: `PixelpitSocial.buildShareUrl(url)` appends `?ref=<userId>`
2. **Recipient plays**: `social.js` reads `?ref=` from URL, stores in `sessionStorage`, sends `refUserId` with score submission
3. **Server creates pair**: Leaderboard POST handler calls `createMagicStreakPair(userId, refUserId)` — creates a streak group named `@handle1 + @handle2` with initial streak of 1
4. **Deduplication**: Only one streak group per user pair. If they already share a streak group, no duplicate is created.
5. **For new users**: `?ref=` is stored in `sessionStorage` and recorded on register/login via `recordConnection()`

### URL Parameters

| Param | Purpose | Stored In |
|-------|---------|-----------|
| `?ref=123` | Referrer user ID for magic streaks | `sessionStorage` (`pixelpit_ref_user`) |
| `?pg=abcd` | Group code for auto-join | `sessionStorage` (`pixelpit_group_code`) |
| `?logout` | Log out and reload | N/A |

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

| Game | Share URL Pattern |
|------|-------------------|
| BAT DASH | `/pixelpit/arcade/batdash/share/[score]` |
| BEAM | `/pixelpit/arcade/beam/share/[score]` |
| CATCH | `/pixelpit/arcade/catch/share/[score]` |
| CAT TOWER | `/pixelpit/arcade/cattower/share/[score]` |
| CAVE MOTH | `/pixelpit/arcade/cavemoth/share/[score]` |
| EMOJI | `/pixelpit/arcade/emoji/share/[score]` |
| FLAPPY | `/pixelpit/arcade/flappy/share/[score]` |
| FLIP | `/pixelpit/arcade/flip/share/[score]` |
| HAUNT | `/pixelpit/arcade/haunt/share/[score]` |
| PIXEL | `/pixelpit/arcade/pixel/share/[score]` |
| RAIN | `/pixelpit/arcade/rain/share/[score]` |
| SINGULARITY | `/pixelpit/arcade/singularity/share/[score]` |
| SPROUT RUN | `/pixelpit/arcade/sprout-run/share/[score]` |
| SURGE | `/pixelpit/arcade/surge/share/[score]` |
| TAP BEATS | `/pixelpit/arcade/tap-beats/share/[score]` |
| TAPPER | `/pixelpit/arcade/tapper/share/[score]` |

All follow the same route structure: `share/[score]/layout.tsx`, `share/[score]/page.tsx`, `share/[score]/opengraph-image.tsx`.

---

## Session Persistence (Safari ITP)

Safari's ITP purges localStorage after 7 days of inactivity, which logs users out. To fix this, we use a server-set httpOnly cookie (`pp_session`, 30-day maxAge) as a durable fallback.

### How It Works

1. **Write**: On login/register, the server sets a `pp_session` cookie in the response
2. **Read**: On mount, `usePixelpitSocial` checks localStorage first; if empty, calls `checkSession()` which reads the cookie via `GET /api/pixelpit/auth`
3. **Clear**: `logout()` clears both localStorage and the cookie

### Critical: `credentials: 'include'` on ALL auth fetches

**Every fetch to `/api/pixelpit/auth` MUST include `credentials: 'include'`** — without it, Safari will not store the `Set-Cookie` response, and the cookie fallback silently fails. This applies to:

- `register()` — writes cookie on account creation
- `login()` — writes cookie on login
- `checkSession()` — reads cookie to hydrate localStorage
- `logout()` — clears the cookie

All four are in `social.js`. If you ever modify auth fetch calls, always include `credentials: 'include'`.

### Key Files

| File | Role |
|------|------|
| `web/public/pixelpit/social.js` | `register()`, `login()`, `checkSession()`, `logout()` — all with `credentials: 'include'` |
| `web/app/api/pixelpit/auth/route.ts` | `setSessionCookie()` on login/register, `GET` handler verifies cookie, `logout` action deletes cookie |
| `web/app/pixelpit/components/hooks/usePixelpitSocial.ts` | Calls `checkSession()` when localStorage is empty |

---

## Best Practices

### For New Games

1. **Start with full integration** — Use TAPPER as template (simplest game with full social: groups, ShareModal, streaks, XP)
2. **Add XP early** — Set `maxScore` to your game's "great score" benchmark
3. **Consider progressive disclosure** — CAT TOWER's approach reduces friction

### maxScore (XP Normalization)

Every game awards 10-50 XP per play regardless of scoring system:
- `maxScore` = the game's "great score" (roughly p90)
- Formula: `base = clamp(floor(score / maxScore * 50), 10, 50)`
- Floor: 10 XP (just for playing), Ceiling: 50 XP (hit the benchmark)
- Streak multipliers apply on top: 1x / 1.5x (3d) / 2x (7d) / 2.5x (14d)

### Checklist for New Game

**Social core:**
- [ ] Set unique `GAME_ID`
- [ ] Load `social.js` via Script component
- [ ] Add `usePixelpitSocial(socialLoaded)` hook
- [ ] Define `GAME_URL` constant
- [ ] Add `ScoreFlow` with `maxScore={N}` (set to game's p90 "great score") and `onProgression`
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

| Component | Game |
|-----------|------|
| `BeamDecorations` | BEAM |
| `CatchDecorations` | CATCH |
| `CatTowerDecorations` | CAT TOWER |
| `CaveMothDecorations` | CAVE MOTH |
| `EmojiDecorations` | EMOJI BLASTER |
| `FlappyDecorations` | FLAPPY |
| `FlipDecorations` | FLIP |
| `RainDecorations` | RAIN |
| `SingularityDecorations` | SINGULARITY |
| `SproutRunDecorations` | SPROUT RUN |
| `TapBeatsDecorations` | TAP BEATS |

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

## social.js Public API

The vanilla JS library (`/pixelpit/social.js`) exposes `window.PixelpitSocial` with these methods:

| Category | Method | Description |
|----------|--------|-------------|
| **State** | `getUser()` | Get logged-in user from localStorage |
| **Auth** | `checkHandle(handle)` | Check if handle is taken |
| | `register(handle, code)` | Create account (auto-joins pending group, records ref) |
| | `login(handle, code)` | Login (auto-joins pending group, records ref) |
| | `logout()` | Clear localStorage + server session |
| | `checkSession()` | Hydrate localStorage from server cookie |
| **Scores** | `submitScore(gameId, score, opts?)` | Submit score (opts: `nickname`, `maxScore`, `groupCode`) |
| | `getLeaderboard(gameId, limit?, opts?)` | Fetch leaderboard (opts: `entryId`) |
| **Profile** | `getProfile(userId)` | Fetch XP/level/streak data |
| **Groups** | `getGroups()` | Get current user's groups |
| | `createGroup(name, type, opts?)` | Create group (opts: `phones`, `gameUrl`, `score`) |
| | `createQuickGroup(opts?)` | Create streak group with auto-generated name |
| | `joinGroup(code)` | Join group by 4-char code |
| | `renameGroup(groupId, name)` | Rename a group (owner only) |
| | `deleteGroup(groupId)` | Delete a group (owner only) |
| | `getGroupLeaderboard(gameId, groupCode, limit?)` | Leaderboard filtered to group |
| | `getSmsInviteLink(phones, groupCode, gameUrl, score?)` | Build `sms:` link for invites |
| | `getGroupCodeFromUrl()` | Read `?pg=` from URL |
| | `storeGroupCode(code)` / `getStoredGroupCode()` / `clearStoredGroupCode()` | sessionStorage helpers |
| **Referrals** | `getRefFromUrl()` | Read `?ref=` from URL (auto-stores) |
| | `buildShareUrl(url)` | Append `?ref=<userId>` to URL |
| **Creations** | `saveCreation(gameId, contentType, contentData, opts?)` | Save music/drawing/etc. |
| | `getCreation(slug)` | Fetch creation by slug |
| **Share** | `share(url, text)` | Native share → clipboard fallback |
| | `shareGame(gameId, text?)` | Share a game URL |
| **UI** | `ShareButton(containerId, opts)` | Mount share button in DOM |
| | `showToast(message, duration?)` | Toast notification |
| | `formatLeaderboardEntry(entry)` | Format `@handle` / score |
| | `renderLeaderboard(container, data, opts?)` | Render leaderboard into DOM |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pixelpit/auth` | GET/POST | Session check (GET), login/register/logout/check handle (POST) |
| `/api/pixelpit/leaderboard` | GET/POST/PATCH | Fetch leaderboard (GET, supports `groupCode` filter), submit scores (POST, supports `refUserId` for magic streaks, `groupCode` for auto-join), link guest entry to user (PATCH) |
| `/api/pixelpit/groups` | GET/POST | Fetch user's groups (GET), create group (POST) |
| `/api/pixelpit/groups/[id]` | PATCH/DELETE | Rename group (PATCH), delete group (DELETE) — owner only |
| `/api/pixelpit/groups/join` | POST | Join a group by code |
| `/api/pixelpit/phone` | GET/POST | Phone status (GET), send-code/verify/remove (POST) |
| `/api/pixelpit/connections` | POST | Record magic streak connection (referral) |
| `/api/pixelpit/profile` | GET | Fetch user profile with XP/level/streak |
| `/api/pixelpit/stats` | GET/POST | Track/fetch game play analytics |
| `/api/pixelpit/creation` | GET/POST | Save/fetch creations |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `pixelpit_users` | Handles, 4-char codes, XP, level, streak data, phone/phone_verified/phone_verify_code |
| `pixelpit_entries` | Scores and creations with game_id, user_id, slug |
| `pixelpit_groups` | Groups (code, name, type: streak/leaderboard) |
| `pixelpit_group_members` | Group membership (user_id, group_id) |
| `pixelpit_connections` | Magic streak connections (referrals between users) |
| `pixelpit_daily_stats` | Daily play counts per game for analytics |

---

## SettingsPanel (User Preferences)

The `SettingsPanel` is a full-screen overlay accessible from the gear icon on the game-over screen (logged-in users only). It provides group management and phone alerts in one panel.

### What It Shows

1. **YOUR GROUPS** — Lists all groups the user belongs to. Each row shows name, type badge (streak/leaderboard), streak count, and member handles. Owner can rename (inline edit) or delete (with confirmation).
2. **PHONE ALERTS** — Add/verify phone number to receive SMS notifications when streak group members play.
3. **Logout** button.

### Group Management

- **Rename**: Tap group name to edit inline (owner only). Calls `PATCH /api/pixelpit/groups/[id]`.
- **Delete**: Tap trash icon, confirm deletion (owner only). Calls `DELETE /api/pixelpit/groups/[id]`. Deletes all members first, then the group.

### Props

```typescript
interface SettingsPanelProps {
  colors: ScoreFlowColors;
  onClose: () => void;
}
```

### Integration

ScoreFlow renders SettingsPanel automatically when the gear icon is tapped:

```tsx
// Already built into ScoreFlow — no extra code needed for games
// The gear icon appears at bottom-center for logged-in users
```

---

## Phone Alerts (SMS Notifications)

Users can add and verify their phone number to receive SMS alerts when streak group members play.

### How It Works

1. **Add phone**: User enters phone number in Settings → "Send Code" → receives 6-digit SMS code
2. **Verify**: Enter code → phone marked as verified
3. **Receive alerts**: When a streak group member submits a score, all other verified members get SMS: `"@handle just played gameName! Keep the streak alive → pixelpit.gg/gameName"`
4. **Remove**: User can remove their phone from Settings at any time

### API Route: `/api/pixelpit/phone`

**GET** `?userId=X` — Returns phone status:
```json
{ "phone": "***9508", "verified": true }
// or
{ "phone": null }
```

**POST** actions:
- `{ action: "send-code", phone: "+16501234567", userId: 1 }` — Send 6-digit verification SMS
- `{ action: "verify", code: "123456", userId: 1 }` — Verify code
- `{ action: "remove", userId: 1 }` — Remove phone number

### Database Columns (pixelpit_users)

| Column | Type | Description |
|--------|------|-------------|
| `phone` | text | E.164 phone number |
| `phone_verified` | boolean | Whether phone is verified |
| `phone_verify_code` | text | 6-digit code (cleared after verification) |

### SMS Notification Trigger Points

Notifications fire from two places in `/api/pixelpit/leaderboard`:
1. **POST** (score submission) — When a logged-in user submits a score, `notifyStreakGroupMembers()` runs
2. **PATCH** (link guest entry to account) — When a new user registers after playing as guest, their entry gets linked and notifications fire

Both call `notifyStreakGroupMembers(userId, gameId)` which:
- Finds all streak groups the scorer is in
- Gets other members with verified phones
- Sends SMS via Twilio REST API (direct fetch, no SDK)

### Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number (E.164) |

---

## Group Management API

### `/api/pixelpit/groups/[id]`

**PATCH** — Rename a group (owner only):
```json
{ "userId": 1, "name": "New Name" }
```

**DELETE** — Delete a group (owner only):
```json
{ "userId": 1 }
```
Deletes all members first, then the group. Returns `{ success: true }`.

### social.js Group Methods

```javascript
// Rename a group (owner only)
await PixelpitSocial.renameGroup(groupId, "New Name");

// Delete a group (owner only)
await PixelpitSocial.deleteGroup(groupId);

// Quick-create a streak group with auto-generated name
await PixelpitSocial.createQuickGroup({ gameUrl, score });
```

---

## Related Docs

- `pixelpit/SOCIAL.md` — Full API reference
- `pixelpit/personas/push.md` — Release checklist (Push persona)
- `web/app/pixelpit/components/og/README.md` — OG image creation guide
- `web/app/pixelpit/arcade/superbeam/page.tsx` — Reference implementation (full social)
- `web/app/pixelpit/arcade/batdash/page.tsx` — Reference implementation (full social)
- `web/app/pixelpit/arcade/tapper/page.tsx` — Reference implementation (simplest full social)
