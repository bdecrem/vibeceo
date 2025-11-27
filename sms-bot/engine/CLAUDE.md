# SMS Bot Engine - Technical Documentation

## Classifier and Routing System (V2)

### Overview
The SMS bot uses a two-stage classification system to route user requests to the appropriate builder:
1. **Pre-screening** - Quick bypass checks in controller.ts
2. **GPT Classifier** - Smart AI-powered routing using modular JSON configs

### Pre-Screening (controller.ts)

Pre-screening happens before the GPT classifier to handle obvious cases:

1. **Override Flags** - Skip classifier entirely
   - `--admin` → Force admin dual-page generation
   - `--admin-test` → Use minimal test builder
   - `--zad-test` → Use simple ZAD test builder
   - `--zad-api` → Use comprehensive ZAD builder
   - `--music` → Force music app generation
   - `--opus` → Use Claude Opus 4.5 instead of Sonnet 4.5
   - `--stack`, `--remix`, etc. → Direct to stacker system

2. **BUILD Command** (OPERATOR+ only)
   - `BUILD [request]` → Same as WTAF but uses Claude Opus 4.5
   - Internally transforms to `WTAF --opus [request]`
   - All flags work: `BUILD --remix`, `BUILD --stack`, etc.
   - Requires OPERATOR or ADMIN role

3. **Revision Commands**
   - `--revise [app-slug] [changes]` → Agent-based revision using claude-agent-sdk
     - Works with BUILD: `BUILD --revise my-app make buttons blue`
     - Uses Opus 4.5 when combined with BUILD/--opus
     - Runs autonomous agent that fetches HTML, revises it, updates Supabase
   - `--revise-OG [app-slug] [changes]` → Legacy webhook-based revision
     - Original system using Mac Mini worker pool
     - Queues to database, triggers webhook, processed by worker

4. **Basic Detection**
   - Simple keyword matching for games ("game", "pong", "puzzle", "arcade")
   - Adds special markers (`MUSIC_MARKER`, `ZAD_API_MARKER`) to influence routing

### GPT Classifier System

When pre-screening doesn't bypass, requests go through the GPT classifier which uses a **priority-based decision tree**:

#### Classification Modules (in priority order)

1. **Meme Detection** (`1-is-meme.json`)
   - Triggers: "meme", specific formats (drake, distracted boyfriend), "funny image with text"
   - Action: Returns `MEME_BYPASS_SIGNAL` → Routes to meme-processor.ts
   - Output: Meme image with overlaid text

2. **Game Detection** (`2-is-game.json`)
   - Triggers: "game", game types (snake, tetris), gameplay mechanics, scoring
   - Action: Sets game configuration with temperature 0.8
   - Output: Interactive HTML5 game

3. **Music Detection** (`3-is-music.json`)
   - Triggers: "song", "music", "beat", "playlist", artist styles, genres
   - Action: Returns `MUSIC_APP_REQUEST` → Routes to Sonauto-powered builder
   - Output: AI-generated music player app

4. **Email Collection** (`4-needs-email.json`)
   - Triggers: "waitlist", "newsletter", "signup", "launch", "notify me"
   - Action: Adds email collection features to the app
   - Output: Standard app with email capture

5. **ZAD Apps** (`5-is-it-a-zad.json`)
   - Triggers: CRUD operations, voting, polls, blogs, "shared", collaborative features
   - Action: Routes to ZAD builder with database helper functions
   - Output: Multi-user app with data persistence (max 5 users)

6. **Admin Pages** (`6-needs-admin.json`)
   - Triggers: Complex data needs beyond ZAD capabilities
   - Action: Creates dual-page application
   - Output: Public page + Admin dashboard

#### Process Flow

```
User SMS Request
    ↓
controller.ts (Pre-Screening)
    ├─ Has override flag? → Skip to appropriate builder
    ├─ Is stack command? → stackables-manager.ts
    └─ Continue to classifier
           ↓
wtaf-processor.ts (generateCompletePrompt)
    ↓
classifier-builder.ts (Loads JSON modules)
    ↓
GPT-4 Classifier (Checks in order)
    ├─ Meme? → meme-processor.ts
    ├─ Game? → game builder (temp 0.8)
    ├─ Music? → music builder
    ├─ Email needed? → Add email features
    ├─ ZAD app? → ZAD builder
    ├─ Admin needed? → Dual-page builder
    └─ Standard app → Regular builder
           ↓
Selected Builder Generates HTML
           ↓
storage-manager.ts (Saves to Supabase)
```

### Key Files

- **controller.ts** - Main orchestrator, handles pre-screening
- **wtaf-processor.ts** - Manages classifier prompt generation and routing decisions
- **classifier-builder.ts** - Loads and combines modular classification JSON files
- **content/classification/*.json** - Individual classification logic modules

### Important Implementation Details

1. **Priority Matters**: Classification checks run in numbered order (1-6) and stop at first match
2. **Bypass Signals**: Special returns like `MEME_BYPASS_SIGNAL` skip normal processing
3. **Config Selection**: Different content types use different AI model configurations
4. **Markers**: Special markers (`MUSIC_MARKER`, `ZAD_API_MARKER`) influence downstream processing

### Adding New Content Types

To add a new content type:

1. Create a new JSON file in `content/classification/` with appropriate priority number
2. Follow the existing JSON structure:
   ```json
   {
     "classification_type": "your-type",
     "step_title": "Detection Title",
     "good_examples": [...],
     "bad_examples": [...],
     "key_indicators": [...],
     "decision_logic": {
       "if_yes": "...",
       "if_no": "..."
     }
   }
   ```
3. Update module loading order in `classifier-builder.ts`
4. Add routing logic in `wtaf-processor.ts`
5. Implement builder or processor for the new type

### Testing Classification

Use override flags to test specific paths:
- `--admin-test` - Test admin dual-page generation
- `--zad-test` - Test ZAD app generation
- `--music` - Test music app generation

Or send test messages that trigger specific classifiers:
- "make a meme about coding" → Meme processor
- "create a snake game" → Game builder
- "build a voting app" → ZAD builder