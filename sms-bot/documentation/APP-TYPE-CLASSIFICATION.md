# 🏷️ App Type Classification System

Automatically classifies all apps in `wtaf_content` into distinct types based on their characteristics and database relationships.

## Current App Types

### 1. **GAME** 🎮
- **Stored as**: `'GAME'` in database (uppercase)
- **Criteria**: Contains the word "GAME" in `original_prompt`
- **Examples**: "make a simple SNAKE game", "create a PONG game"
- **Database**: Only in `wtaf_content`
- **Note**: Classification script outputs `'games'` but database stores as `'GAME'`

### 2. **ZAD** 🌐
- **Stored as**: `'ZAD'` in database
- **Criteria**: Has a record in `wtaf_zero_admin_collaborative` table
- **Purpose**: Zero Admin Collaborative pages
- **Database**: `wtaf_content` + `wtaf_zero_admin_collaborative`
- **Lookup**: Matches by `user_slug` and `app_slug`

### 3. **needsAdmin** 👥
- **Stored as**: `'needsAdmin'` in database
- **Criteria**: Has a record in `wtaf_submissions` table  
- **Purpose**: Pages that get an admin URL for user submissions
- **Database**: `wtaf_content` + `wtaf_submissions`
- **Lookup**: Matches by `user_slug` and `app_slug`

### 4. **MEME** 🎨
- **Stored as**: `'MEME'` in database
- **Criteria**: Generated through meme processor
- **Purpose**: AI-generated meme images with text
- **Database**: Only in `wtaf_content`
- **Note**: Not detected by classification script, set during meme generation

### 5. **web** 🕸️
- **Stored as**: `'web'` in database
- **Criteria**: Default bucket for everything else
- **Purpose**: General web pages, utilities, tools
- **Database**: Only in `wtaf_content`

### ~~6. oneThing~~ 📝 (DISABLED)
- **Status**: Currently disabled in classification script
- **Reason**: "Too unreliable with keyword matching"
- **Original Purpose**: Pages that collect just one thing (usually email)
- **Would match**: email, subscribe, newsletter, contact, sign up, etc.

## Classification Logic (Priority Order)

The classifier checks in this order:

1. **Games first** - If prompt contains "GAME" → outputs `'games'` (stored as `'GAME'`)
2. **ZAD second** - If exists in `wtaf_zero_admin_collaborative` → `'ZAD'`  
3. **Admin third** - If exists in `wtaf_submissions` → `'needsAdmin'`
4. ~~**OneThing fourth**~~ - DISABLED in current implementation
5. **Web default** - Everything else → `'web'`

## Usage

### Preview Classifications (Safe)
```bash
# See sample of first 10 apps
npm run classify-app-types-sample

# See all apps (dry run - no changes made)
npm run classify-app-types --dry-run
```

### Apply Classifications (Updates Database)
```bash
# Actually update the database
npm run classify-app-types --apply
```

### Get Help
```bash
npm run classify-app-types --help
```

## Sample Output

```
🔍 Processing 7/10: bart/contemporary-leaf-calculating
   📝 Prompt: "make a simple SNAKE game with a pink background"
   🏷️ Current: null → Suggested: games
   💭 Reasoning: Contains "GAME" in original_prompt

🔍 Processing 4/10: bart/nebula-swordfish-windsurfing  
   📝 Prompt: "build a simple grocery shopping list I can share with my family"
   🏷️ Current: null → Suggested: web
   💭 Reasoning: Default classification - general web page
```

## Summary Statistics

After running, you'll see a breakdown like:
```
📊 CLASSIFICATION SUMMARY
Type Distribution:
  web: 450 apps
  games: 23 apps  
  needsAdmin: 156 apps
  ZAD: 89 apps
  oneThing: 35 apps

📈 Total apps: 753
📝 Changes needed: 753
✅ Already correct: 0
```

## Safety Features

- **Default is dry-run** - No accidental database changes
- **5-second warning** before live updates
- **Detailed reasoning** for each classification
- **Rollback support** - Can re-run to fix mistakes
- **Progress tracking** - Shows current/suggested types

## Database Schema

The script populates the `type` column in `wtaf_content`:

```sql
ALTER TABLE wtaf_content 
ADD COLUMN type VARCHAR(20);
```

Valid values: `'GAME'`, `'ZAD'`, `'needsAdmin'`, `'MEME'`, `'web'`

**Note**: 
- The classification script outputs `'games'` but it should be stored as `'GAME'` in the database
- `'MEME'` type is set during meme generation, not by the classification script

## Advanced Usage

### Re-classify Specific Types
You can modify the script to only update apps of certain types, or add additional logic for edge cases.

### Custom Keywords  
The `oneThing` patterns are currently commented out in the script (lines 69-96) due to unreliability. To re-enable, uncomment the code block in `classify-app-types.ts`.

### Verification Queries
After classification, verify results with:

```sql
-- Check distribution
SELECT type, COUNT(*) as count 
FROM wtaf_content 
GROUP BY type 
ORDER BY count DESC;

-- Verify games
SELECT user_slug, app_slug, original_prompt 
FROM wtaf_content 
WHERE type = 'GAME' 
LIMIT 10;

-- Check ZAD consistency  
SELECT COUNT(*) FROM wtaf_content w
JOIN wtaf_zero_admin_collaborative z 
ON w.user_slug = z.user_slug AND w.app_slug = z.app_slug
WHERE w.type != 'ZAD';
```

## Troubleshooting

**"Failed to fetch apps"**
- Check Supabase credentials in `.env.local`
- Verify database connection

**"Classification failed"**  
- Check that all required tables exist
- Verify table permissions for SERVICE_KEY

**Wrong classifications**
- Review the `oneThingPatterns` array
- Check for edge cases in your prompts
- Run with `--dry-run` first to verify logic 