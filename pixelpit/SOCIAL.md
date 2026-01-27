# Pixelpit Social Backend

Unified social backend for Pixelpit games: user registration, leaderboards, score submission, and shareable creations.

## React Components (Recommended)

For Next.js/React games, use the extracted components from `@/app/pixelpit/components`:

```tsx
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  createScoreShareImage,
  type ScoreFlowColors,
} from '@/app/pixelpit/components';
```

### What You Get for Free

| Component | Handles |
|-----------|---------|
| **ScoreFlow** | Guest name entry, score submission, rank display, account creation prompts, handle conflicts |
| **Leaderboard** | Top N entries, player position with "..." separator, @handle for registered users |
| **ShareButtonContainer** | Social.js initialization, native share vs clipboard fallback |
| **createScoreShareImage** | Parameterized OG image with corner accents, branding, score display |

### Integration Checklist

1. **Script tag** — Load social.js
2. **Game Over** — Add `<ScoreFlow>` component
3. **Leaderboard** — Add `<Leaderboard>` component
4. **Share** — Add `<ShareButtonContainer>`
5. **OG Images** — Create `/share/[score]/opengraph-image.tsx`

### Colors (Required)

```tsx
const MY_COLORS: ScoreFlowColors = {
  bg: '#0f172a',        // page background
  surface: '#1e293b',   // card background
  primary: '#fbbf24',   // action buttons
  secondary: '#22d3ee', // secondary accent
  text: '#f8fafc',      // light text
  muted: '#94a3b8',     // muted text
  error: '#f87171',     // error messages
};
```

### Reference

See `web/app/pixelpit/arcade/beam/page.tsx` for complete example.

---

## Vanilla JS (Legacy)

For non-React games, use the vanilla JS library directly:

```html
<!-- Include the library -->
<script src="/pixelpit/social.js"></script>

<script>
// Check if user is logged in
const user = PixelpitSocial.getUser();

// Submit a score (as guest)
await PixelpitSocial.submitScore('g1', 1250, { nickname: 'speedrunner' });

// Get leaderboard
const leaderboard = await PixelpitSocial.getLeaderboard('g1', 10);
</script>
```

## Database Schema

### `pixelpit_users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `handle` | VARCHAR(20) | Display name (case preserved) |
| `handle_lower` | VARCHAR(20) | Lowercase for uniqueness check |
| `code` | VARCHAR(4) | Login code (case sensitive) |
| `data` | JSONB | Future: email, settings, etc. |
| `created_at` | TIMESTAMPTZ | Registration time |

### `pixelpit_entries`

Combines scores AND creations (music, drawings, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `game_id` | VARCHAR(50) | Game identifier ('g1', 'tap-tempo', etc.) |
| `user_id` | BIGINT | FK to pixelpit_users (NULL for guests) |
| `nickname` | VARCHAR(20) | Guest nickname (only if user_id is NULL) |
| `score` | INTEGER | Score value (NULL for non-score creations) |
| `slug` | VARCHAR(50) | Deep link slug (unique) |
| `content_type` | VARCHAR(50) | 'music', 'drawing', NULL for plain scores |
| `content_data` | JSONB | The actual creation data |
| `metadata` | JSONB | Game-specific extras |
| `created_at` | TIMESTAMPTZ | Submission time |

## API Endpoints

### Authentication

**POST** `/api/pixelpit/auth`

```typescript
// Check if handle exists
{ action: 'check', handle: string }
→ { exists: boolean, handle: string }

// Register new account
{ action: 'register', handle: string, code: string }
→ { success: true, user: { id, handle } }
→ { success: false, error: string }

// Login
{ action: 'login', handle: string, code: string }
→ { success: true, user: { id, handle } }
→ { success: false, error: string }
```

**Handle rules**: 3-20 characters, alphanumeric + underscores only.
**Code rules**: Exactly 4 alphanumeric characters, case sensitive.

### Leaderboard

**GET** `/api/pixelpit/leaderboard?game={gameId}&limit={limit}`

```typescript
→ {
    leaderboard: [{
      rank: number,
      name: string,
      score: number,
      isRegistered: boolean,
      created_at: string
    }]
  }
```

**POST** `/api/pixelpit/leaderboard`

```typescript
// Submit as registered user
{ game: string, score: number, userId: number }

// Submit as guest
{ game: string, score: number, nickname: string }

→ { success: true, rank: number, entry: {...} }
```

### Creations

**POST** `/api/pixelpit/creation`

```typescript
{
  game: string,
  contentType: string,  // 'music', 'drawing', etc.
  contentData: object,  // The creation data
  userId?: number,      // If logged in
  nickname?: string,    // If guest
  metadata?: object     // Optional extras
}

→ { success: true, slug: string, url: string }
```

**GET** `/api/pixelpit/creation/{slug}`

```typescript
→ {
    slug: string,
    game: string,
    contentType: string,
    contentData: object,
    creator: { handle?: string, nickname?: string, isRegistered: boolean } | null,
    metadata: object,
    created_at: string
  }
```

## Frontend Library

### State

```javascript
// Get current logged-in user
const user = PixelpitSocial.getUser();
// → { id: number, handle: string } or null
```

### Authentication

```javascript
// Check if handle is taken
const { exists } = await PixelpitSocial.checkHandle('MyHandle');

// Register new account
const result = await PixelpitSocial.register('MyHandle', 'Ab12');
// → { success: true, user: { id, handle } }

// Login
const result = await PixelpitSocial.login('MyHandle', 'Ab12');
// → { success: true, user: { id, handle } }

// Logout
PixelpitSocial.logout();
```

### Scores

```javascript
// Submit score (uses logged-in user automatically)
const result = await PixelpitSocial.submitScore('g1', 1250);

// Submit score as guest
const result = await PixelpitSocial.submitScore('g1', 1250, { nickname: 'speedrunner' });
// → { success: true, rank: 3, entry: {...} }

// Get leaderboard
const leaderboard = await PixelpitSocial.getLeaderboard('g1', 10);
// → [{ rank, name, score, isRegistered, created_at }, ...]
```

### Creations

```javascript
// Save a creation
const result = await PixelpitSocial.saveCreation('jb01', 'music', {
  tempo: 120,
  pattern: [1, 0, 0, 1, 0, 0, 1, 0]
});
// → { success: true, slug: 'ab12cd34', url: '/pixelpit/c/ab12cd34' }

// Fetch a creation
const creation = await PixelpitSocial.getCreation('ab12cd34');
```

### Sharing

```javascript
// Share using native share or clipboard fallback
const { success, method } = await PixelpitSocial.share(
  'https://pixelpit.gg/g1',
  'Check out my score!'
);
// method is 'native' or 'clipboard'

// Share a game
await PixelpitSocial.shareGame('g1', 'Just beat level 5!');
```

### Share Button

Drop-in share button with consistent Pixelpit styling.

```html
<div id="share-container"></div>

<script>
PixelpitSocial.ShareButton('share-container', {
  url: 'https://pixelpit.gg/g1',
  text: 'Check out my score on Pixelpit!',
  style: 'button'  // 'button' | 'icon' | 'minimal'
});
</script>
```

**Styles:**
- `button` (default) — Cyan filled button with icon + "Share" text
- `icon` — Circular icon-only button
- `minimal` — Transparent with cyan border

**Behavior:**
- Mobile: Opens native share sheet
- Desktop: Copies URL to clipboard, shows "Copied!" toast for 2s

```javascript
// Show a toast manually
PixelpitSocial.showToast('Link copied!', 2000);
```

### UI Helpers

```javascript
// Format a leaderboard entry
const { displayName, formattedScore } = PixelpitSocial.formatLeaderboardEntry(entry);
// displayName: '@MyHandle' for registered, 'speedrunner' for guests
// formattedScore: '1,250'

// Render leaderboard to a container
PixelpitSocial.renderLeaderboard(
  document.getElementById('leaderboard'),
  leaderboard,
  { highlightUser: true }
);
```

## Game Over Flow

```
┌─────────────────────────────────────┐
│         GAME OVER                   │
│         Score: 1,250                │
│                                     │
│  [Enter nickname: _______]          │
│  [Submit as Guest]                  │
│                                     │
│  ─── or ───                         │
│                                     │
│  [Login / Sign Up]                  │
│  [Skip → View Leaderboard]          │
│                                     │
│  [Share]                            │
└─────────────────────────────────────┘
```

## Leaderboard Display

```
 #  │ Player          │ Score
────┼─────────────────┼───────
 1  │ @Pit            │ 2,450    ← registered (@ prefix)
 2  │ @Dot            │ 2,100
 3  │ speedrunner     │ 1,800    ← guest (italic or dimmed)
 4  │ @Chip           │ 1,650
 5  │ coolguy         │ 1,500    ← guest
```

**Visual distinction**:
- Registered users: `@handle` (normal weight)
- Guests: `nickname` (italic or lighter color)

## CSS for Leaderboard

```css
.leaderboard-row {
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}

.leaderboard-row .rank {
  width: 30px;
  font-weight: bold;
}

.leaderboard-row .name {
  flex: 1;
}

.leaderboard-row .score {
  font-variant-numeric: tabular-nums;
}

/* Guest styling */
.leaderboard-row.guest .name {
  font-style: italic;
  opacity: 0.8;
}

/* Highlight current user */
.leaderboard-row.current-user {
  background: rgba(255, 255, 255, 0.1);
}
```

## Integration Example

```javascript
// Game over handler
async function handleGameOver(score) {
  const user = PixelpitSocial.getUser();

  if (user) {
    // Logged in - submit directly
    const result = await PixelpitSocial.submitScore('g1', score);
    showResult(`You ranked #${result.rank}!`);
  } else {
    // Not logged in - show nickname prompt
    showNicknamePrompt(async (nickname) => {
      const result = await PixelpitSocial.submitScore('g1', score, { nickname });
      showResult(`You ranked #${result.rank}!`);
    });
  }

  // Refresh leaderboard
  const leaderboard = await PixelpitSocial.getLeaderboard('g1');
  PixelpitSocial.renderLeaderboard(
    document.getElementById('leaderboard'),
    leaderboard,
    { highlightUser: true }
  );
}
```

## localStorage

User session is stored in `localStorage` under the key `pixelpit_user`:

```json
{
  "id": 123,
  "handle": "Pit"
}
```

No sensitive data (code) is stored client-side.
