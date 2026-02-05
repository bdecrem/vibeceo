# Magic Streaks

Magic streaks are streak groups that auto-create when two users share games with each other. No explicit group creation required — streaks emerge naturally from sharing behavior.

## How It Works

```
1. Player A shares a game → URL includes ?ref=A_id
2. Player B opens the link, plays, submits score → connection A→B recorded
3. Player B shares a game → URL includes ?ref=B_id
4. Player A opens the link, plays, submits score → connection B→A recorded
5. Bidirectional sharing detected → magic streak "@A + @B" auto-created
```

Once created, magic pairs appear in users' "YOUR GROUPS" and work exactly like manually-created streak groups.

## Technical Implementation

### Database

**`pixelpit_connections` table** tracks when users play games via another user's shared link:

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial | Primary key |
| `from_user_id` | bigint | User who shared the link |
| `to_user_id` | bigint | User who played via the link |
| `game_id` | varchar(50) | Which game was played |
| `created_at` | timestamptz | When the connection was recorded |

Unique constraint on `(from_user_id, to_user_id)` ensures only one connection per direction.

### Client (`social.js`)

**New functions:**
- `getRefFromUrl()` - Extracts `?ref=` parameter from current URL
- `storeRefUserId(id)` - Stores ref in sessionStorage
- `getStoredRefUserId()` - Retrieves stored ref
- `clearStoredRefUserId()` - Clears stored ref

**Modified functions:**
- `share(url, text)` - Now appends `?ref=<userId>` when user is logged in
- `submitScore()` - Includes `refUserId` in POST body when playing via referral

### Server (`leaderboard/route.ts`)

**New helpers:**
- `generateGroupCode()` - Creates unique 4-char group codes
- `createMagicStreakPair(userA, userB)` - Creates the magic streak group

**POST handler additions:**
1. Extracts `refUserId` from request body
2. Upserts connection to `pixelpit_connections`
3. Checks for reverse connection (bidirectional)
4. Calls `createMagicStreakPair()` if bidirectional
5. Returns `magicPair` object when created

## Duplicate Prevention

Magic pairs are only created if the two users don't already share a streak group. The `createMagicStreakPair()` function checks for existing shared streak groups before creating a new one.

## Response Format

When a magic pair is created, `submitScore()` returns:

```javascript
{
  success: true,
  entry: { ... },
  rank: 5,
  progression: { ... },
  magicPair: {
    code: "ab12",
    name: "@alice + @bob"
  }
}
```

Games can use this to show a notification like "You and @bob now have a streak!"

## Guest Behavior

Guests can still play via ref links, but:
- No connection is recorded (requires logged-in user)
- No magic pair can be created
- No errors thrown — the ref is simply ignored
