# Technical Context

## Technology Stack

### Frontend (Web Platform)
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS
- **UI Components:** Custom components + Radix UI primitives
- **State Management:** React hooks (useState, useEffect)
- **Real-time Features:** Server-Sent Events (SSE) for chat
- **TypeScript:** Full TypeScript implementation

### Backend Services
- **SMS Bot:** Node.js/Express server (port 3030)
- **Monitor System:** Python scripts for content generation
- **Database:** Supabase (PostgreSQL with real-time features)
- **Authentication:** Phone number verification via Twilio

### Infrastructure
- **Domain:** `wtaf.me` for generated content, `advisorsfoundry.ai` for main site
- **Hosting:** Railway/Render for deployment
- **File Storage:** Local file system for queue (`data/wtaf/`)
- **Environment:** Environment variables in `.env.local`

## URL Routing Architecture

### Dual-Domain System
**Primary Complexity:** Single Next.js application serves two different websites with sophisticated middleware routing.

#### Domain Configuration
- **`www.advisorsfoundry.ai`** - Main business coaching website
- **`wtaf.me`** - Chaotic app generator service

#### Environment-Aware Routing
**Development (localhost:3000 or :3001):**
- Single domain serves both sites
- URLs like `/bart` automatically rewrite to `/wtaf/bart`
- Direct access to `/wtaf/` routes also supported

**Production (Railway):**
- Separate domains with cross-domain routing
- Middleware handles domain detection and rewrites

### Middleware Logic (`web/middleware.ts`)

#### Domain Detection
```javascript
const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me'
const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
const isDevWtafRoute = isDevEnvironment && pathname.startsWith('/wtaf/')
const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/)
```

#### Routing Rules
1. **Production WTAF domain requests:**
   - `wtaf.me/bart` → rewrites internally to `/wtaf/bart`
   - `wtaf.me/bart/my-app` → rewrites to `/wtaf/bart/my-app`

2. **Development user routes:**
   - `localhost:3000/bart` → rewrites to `/wtaf/bart`
   - `localhost:3001/bart/my-app` → rewrites to `/wtaf/bart/my-app`

3. **Direct WTAF routes (development):**
   - `localhost:3000/wtaf/bart` → continues normally (no rewrite)

#### Static Asset Handling
Middleware skips processing for:
- API routes (`/api/`)
- Next.js internals (`/_next/`)
- Images (`/images/`)
- Favicon files
- Any files with extensions

### File Structure Mapping

#### Next.js App Router Structure
```
web/app/
├── page.tsx                     # AdvisorsFoundry homepage
├── coaches/page.tsx             # Business coaching
├── sms/page.tsx                 # SMS signup
├── wtaf/
│   ├── page.tsx                 # WTAF main page
│   ├── layout.tsx               # WTAF-specific layout/metadata
│   └── [user_slug]/
│       ├── page.tsx             # User's main page (/wtaf/bart)
│       ├── chat/page.tsx        # User's chat interface (/wtaf/bart/chat)
│       └── [app_slug]/
│           └── page.tsx         # Generated app pages (/wtaf/bart/my-app)
```

#### URL Pattern Examples
- **Business Site:** `advisorsfoundry.ai/coaches` → `app/coaches/page.tsx`
- **WTAF Landing:** `wtaf.me/` → `app/wtaf-landing/page.tsx` (rewrite)
- **User Page:** `wtaf.me/bart` → `app/wtaf/[user_slug]/page.tsx`
- **User Chat:** `wtaf.me/bart/chat` → `app/wtaf/[user_slug]/chat/page.tsx`
- **Generated App:** `wtaf.me/bart/calculator` → `app/wtaf/[user_slug]/[app_slug]/page.tsx`

### Environment Configuration System

#### SMS Bot Environment Detection
```python
# Environment-aware domain configuration
if "localhost" in WEB_APP_URL or "ngrok" in WEB_APP_URL:
    WTAF_DOMAIN = WEB_APP_URL  # Development: use web app URL
else:
    WTAF_DOMAIN = os.getenv("WTAF_DOMAIN", "https://www.wtaf.me")  # Production: separate domain
```

#### Development Port Handling
- **Normal:** `localhost:3000` (standard Next.js)
- **Secondary:** `localhost:3001` (when Cursor starts second instance)
- **Both ports work:** Middleware detects any localhost host

### Routing Complexity Factors

1. **Domain Switching:** Same codebase serves completely different websites
2. **Environment Detection:** Behavior changes between development and production
3. **URL Rewriting:** Clean URLs hide internal routing structure
4. **Infinite Loop Prevention:** Careful checks prevent rewrite cycles
5. **Static Asset Handling:** Different rules for API routes vs content
6. **Cross-Service Integration:** SMS bot generates URLs for different domains based on environment

### Production Deployment Considerations
- **Railway Configuration:** Environment variables control domain behavior
- **Middleware Performance:** Runs on Edge Runtime for speed
- **Domain DNS:** Separate domain configuration for wtaf.me vs advisorsfoundry.ai
- **SSL Certificates:** Both domains require proper certificates

## Key Dependencies

### Web Platform (`/web/package.json`)
```json
{
  "@supabase/supabase-js": "Database client",
  "next": "14.x",
  "react": "18.x", 
  "tailwindcss": "Styling",
  "@radix-ui/*": "UI primitives",
  "typescript": "Type checking"
}
```

### SMS Bot (`/sms-bot/`)
- **Express:** HTTP server framework
- **Twilio:** SMS webhook processing
- **Supabase:** Database integration
- **File System:** Queue management

### Monitor System
- **Python:** Content generation scripts
- **File Watching:** Queue processing
- **Database Drivers:** Supabase Python client

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# SMS Integration  
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# OpenAI Integration
OPENAI_API_KEY=your-openai-key

# Service URLs
SMS_BOT_URL=http://localhost:3030
```

### Development Setup
1. **SMS Bot:** `cd sms-bot && npm install && npm start`
2. **Web Platform:** `cd web && npm install && npm run dev`
3. **Monitor:** `cd monitoring && python monitor.py`
4. **Database:** Supabase project with proper tables

## Database Schema

### Core Tables
```sql
-- User management
sms_subscribers (
  id, phone_number, user_slug, role, 
  created_at, updated_at
)

-- Generated content
wtaf_content (
  id, user_slug, app_slug, content,
  created_at, prompt
)
```

### Key Relationships
- `user_slug` links users across SMS and web interfaces
- `wtaf_content.user_slug` references `sms_subscribers.user_slug`
- Generated URLs follow pattern: `wtaf.me/{user_slug}/{app_slug}`

## Service Communication

### SMS Bot (Port 3030)
```javascript
// Main webhook endpoint
POST /sms/webhook
{
  From: "+14156366573",
  Body: "build a hello world page"
}
```

### Web Platform API
```javascript
// WTAF chat endpoint
POST /api/wtaf-chat
{
  message: "build a hello world page",
  userSlug: "cptcrk"
}
```

### Database Polling
```javascript
// Real-time result detection
const pollForResults = async (userSlug, startTime) => {
  // Query wtaf_content table every 2 seconds
  // Return when new content found
}
```

## File Structure

### Web Platform (`/web/`)
```
app/
  wtaf/[user_slug]/chat/     # WTAF chat pages
  api/wtaf-chat/             # Chat API endpoint
components/
  wtaf-chat-layout.tsx       # Chat UI layout
  wtaf-chat-area.tsx         # Chat interface
lib/
  hooks/use-wtaf-chat.ts     # Chat logic
  supabase/                  # Database client
```

### SMS Bot (`/sms-bot/`)
```
server.js                    # Main Express server
handlers/                    # SMS command handlers
data/wtaf/                   # Processing queue
```

### Shared Resources (`/data/`)
```
ceos.ts                      # CEO personality data
discord-ceos.ts              # Discord bot CEO data
```

## Development Workflow

### Local Development
1. **Start SMS Bot:** `npm start` (port 3030)
2. **Start Web:** `npm run dev` (port 3001)
3. **Test Chat:** Visit `localhost:3001/cptcrk/chat`
4. **Monitor Logs:** Check database for generated content

### Deployment
- **SMS Bot:** Railway service with port 3030 exposed
- **Web Platform:** Vercel/Railway with Next.js
- **Environment:** Production environment variables
- **Database:** Supabase production instance

### Testing Strategy
- **SMS:** Direct SMS to configured phone numbers
- **Web:** Browser testing of chat interface
- **Integration:** End-to-end request → generated page flow
- **Database:** Supabase admin panel for data verification

## Performance Considerations

### Chat Interface
- **SSE Streaming:** Real-time progress updates
- **Database Polling:** 2-second intervals with 60s timeout
- **Graceful Degradation:** Fallback for failed requests

### SMS Processing
- **Async Queue:** File-based processing queue
- **Response Speed:** Immediate acknowledgment
- **Background Processing:** Python monitor handles generation

This technical stack enables rapid development while maintaining production stability across multiple interfaces. 