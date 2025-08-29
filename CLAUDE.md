# Claude Code Rules for WEBTOYS (formerly WTAF.me)

## Project Context

**WEBTOYS** (formerly WTAF.me) is a "vibecoding over SMS" system that enables users to create web content via text messages:

### What We Build
- **Web Pages**: Simple HTML pages with embedded CSS
- **Apps**: Including CRUD apps (multi-user capable, called ZAD apps)
- **Games**: Simple arcade-style games
- **Memes**: Generated meme content

### Technical Stack
- **Language**: TypeScript, React, Node.js
- **SMS Processing**: Twilio
- **Database**: Supabase (stores HTML content)
- **Deployment**: GitHub → Railway (automatic)
- **Code Location**: `/sms-bot` (main), `/sms-bot/engine` (processing engine)

### ZAD Apps (Zero Admin Data)
Our CRUD/social apps feature:
- 2 simple API endpoints: `/api/zad/save` and `/api/zad/load`
- Helper functions with backend business logic
- Client helper functions injected into generated pages
- Supports up to 5 users per app
- Uses `wtaf_zero_admin_collaborative` table
- Full documentation in `sms-bot/documentation/ZAD-API-SYSTEM-OVERVIEW.md`

### Website Structure
- **Main Site**: AdvisorsFoundry (parent directory)
- **WEBTOYS.ai Website** (as of August 6, 2025): 
  - **Important**: "The website" refers to the Webtoys.ai website specifically, NOT everything in the web/ folder
  - **Homepage**: `/web/wtaf-landing`
  - **Gallery Pages**:
    - `/recents` - Most recent creations
    - `/trending` - Popular creations
    - `/featured` - Curated content
  - **User Pages**: "Creations" (user homepages)

## Project Architecture Overview

The SMS bot follows a microservices architecture with strict separation of concerns:
- **Controller (controller.ts)**: Business logic orchestration, request routing
- **Processors**: Specialized handlers for different content types
- **Managers**: Domain-specific functionality (storage, social, stackables)
- **Shared utilities**: Common functions and configurations

**📚 For detailed technical documentation on the classifier and routing system, see: `sms-bot/engine/CLAUDE.md`**

## Strict Rules for Code Agents

### 0. SECURITY: NEVER Hardcode Secrets
**THIS IS THE #1 RULE - VIOLATING THIS RULE IS UNACCEPTABLE**
- **NEVER** put API keys, tokens, or secrets directly in code files
- **NEVER** commit credentials to Git, even in test scripts
- **ALWAYS** use environment variables from `.env` files
- **ALWAYS** use `process.env.VARIABLE_NAME` for sensitive values
- Test scripts are NOT exempt from this rule
- **DO NOT EDIT OR CHANGE OR COPY OR IN ANY OTHER WAY MESS WITH MY SECRETS**

```javascript
// ❌ ABSOLUTELY WRONG - NEVER DO THIS
const supabaseKey = 'eyJhbGc...actual-key-here...';

// ✅ CORRECT - ALWAYS DO THIS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
```

### CRITICAL: Supabase Anon Key Handling
**THE SUPABASE ANON KEY IS PUBLIC BY DESIGN - BUT HANDLE IT CORRECTLY:**

1. **Use the CORRECT anon key from `.env.local`**:
   - Located in `web/.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Format: `sb_publishable_` prefix (NOT the old JWT `eyJ...` format)
   - This key is PUBLIC and safe to use in browser code

2. **For browser/client code that needs Supabase**:
   ```javascript
   // ✅ CORRECT - Use the exact key from web/.env.local
   const SUPABASE_URL = 'https://tqniseocczttrfwtpbdr.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_wZCf4S2dQo6sCI2_GMhHQw_tJ_p7Ty0';
   ```

3. **NEVER confuse anon key with service key**:
   - **Anon key**: Public, safe for browser, has `sb_publishable_` prefix
   - **Service key**: SECRET, server-only, NEVER expose to browser

4. **Security Model**: See `sms-bot/documentation/security_practices.md` for full details on:
   - Row Level Security (RLS) policies
   - Which tables have public vs service-only access
   - Why `wtaf_desktop_config` has public access (UI settings only)

### CRITICAL: iframe and CORS Issues
**When content runs in iframes, special considerations apply:**

1. **Scripts loaded in iframe with `srcdoc`**:
   ```html
   <!-- ✅ CORRECT - Add crossorigin attribute for CDN scripts in iframes -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" crossorigin="anonymous"></script>
   
   <!-- ❌ WRONG - Missing crossorigin causes CORS issues in srcdoc iframes -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```

2. **Why this matters**:
   - Pages served via iframe `srcdoc` have different origin than parent
   - External scripts without `crossorigin` fail in this context
   - Supabase API calls will get 401/CORS errors without proper setup

3. **Testing iframe content**:
   - Always test in actual iframe context, not standalone
   - Check browser console for CORS errors
   - Ensure all CDN scripts have `crossorigin="anonymous"`

If you create test scripts:
1. Put them in directories covered by .gitignore (`/sms-bot/scripts/`, `/web/scripts/`)
2. Still use environment variables for all credentials
3. Include instructions for setting up required env vars

### 1. NEVER Mix Layers
- **Controller** handles business logic and orchestration ONLY
- **Storage Manager** handles ALL database operations - no Supabase calls elsewhere
- **AI processors** handle AI interactions - no direct API calls in controller
- **File operations** belong in file-watcher.ts or storage-manager.ts ONLY

### 2. Module Boundaries Are Sacred
```
BAD: 
- controller.ts making direct Supabase calls
- wtaf-processor.ts handling file operations
- storage-manager.ts containing business logic

GOOD:
- controller.ts calls storage-manager.ts functions
- wtaf-processor.ts returns data to controller
- storage-manager.ts exposes clean interfaces
```

### 3. Import Dependencies Correctly
- Use dynamic imports for optional features: `await import('./module.js')`
- ALWAYS import from the correct module, not copy functionality
- If a function exists in shared/utils.ts, NEVER reimplement it

### 4. Data Flow Must Be Unidirectional
```
User Request → Controller → Processor → Manager → Database
             ← Response  ← Result    ← Result  ← Data
```

### 5. Error Handling Hierarchy
- Managers throw specific errors
- Processors catch and transform errors
- Controller handles user-facing error messages
- NEVER send raw database errors to users

### 6. Configuration Management
- ALL config values come from shared/config.ts
- NEVER hardcode URLs, keys, or settings
- Environment-specific values use process.env

### 7. Logging Standards
- Use shared/logger.ts functions ONLY
- Controllers log high-level flow
- Processors log operation details
- Managers log technical specifics

### 8. Type Safety Requirements
- Define interfaces for all cross-module communication
- Use TypeScript types, never 'any' without justification
- Export types from the module that owns the data

### 9. Testing Boundaries
- Unit tests mock module boundaries
- Integration tests verify module communication
- NEVER test implementation details of other modules

### 10. New Feature Guidelines
When adding features:
1. Identify which module owns the functionality
2. Add to existing module if it fits
3. Create new module only if truly distinct domain
4. Update module interfaces, don't bypass them
5. Document cross-module dependencies

## CRITICAL: ZAD Apps and Stack Commands

### ZAD APPS NEVER USE DIRECT SUPABASE ACCESS
**THIS IS NON-NEGOTIABLE. ZAD apps use ONLY these APIs:**
- `/api/zad/save` - All write operations
- `/api/zad/load` - All read operations

```javascript
// ❌ ABSOLUTELY WRONG - NEVER DO THIS IN ZAD APPS
const supabase = supabase.createClient('url', 'key');
const { data } = await supabase.from('wtaf_zero_admin_collaborative').select();

// ✅ CORRECT - ZAD apps ONLY use helper functions
const data = await load('blog_post');  // Uses /api/zad/load internally
await save('blog_post', { title: 'New Post' }); // Uses /api/zad/save internally
```

### Stack Commands Pattern for Shared Data
**When implementing ANY stack command that shares data (stackzad, stackpublic, stackobjectify):**

1. **MUST inject the shared UUID** (e.g., `window.SHARED_DATA_UUID`)
2. **MUST override getAppId()** to return the shared UUID:
```javascript
function getAppId() {
    if (window.SHARED_DATA_UUID) {
        return window.SHARED_DATA_UUID;
    }
    return window.APP_ID || 'unknown-app';
}
```
3. **NEVER tell LLMs to use Supabase directly**
4. **ALWAYS use ZAD helper functions**

### UUID Issues Are Unacceptable
**Before implementing ANY feature involving UUIDs:**
1. Find an existing working pattern (e.g., stackzad)
2. Copy that pattern EXACTLY
3. Do not innovate or "improve" - use what works
4. Test that the correct UUID is being used

## Common Violations to Avoid

### Database Access
```typescript
// ❌ BAD - Direct Supabase in controller
const { data } = await supabase.from('table').select()

// ✅ GOOD - Use storage manager
const data = await storageManager.getData(params)
```

### Business Logic
```typescript
// ❌ BAD - Business logic in storage manager
if (userType === 'admin' && feature.enabled) { ... }

// ✅ GOOD - Business logic in controller/processor
const shouldProcess = controller.checkPermissions(user, feature)
```

### Cross-Cutting Concerns
```typescript
// ❌ BAD - Logging scattered everywhere
console.log('Something happened')

// ✅ GOOD - Centralized logging
logWithTimestamp('Something happened')
```

## Module Responsibilities

### controller.ts
- Request routing and orchestration
- High-level business logic
- Workflow coordination
- Error message formatting

### wtaf-processor.ts
- AI prompt generation
- Model selection and fallbacks
- Response validation
- Coach personality injection

### storage-manager.ts
- ALL database operations
- File system operations
- Data validation and sanitization
- Transaction management

### notification-client.ts
- SMS sending
- Email notifications
- Message formatting
- Delivery tracking

### social-manager.ts
- Social features (follows, remixes)
- Activity tracking
- Relationship management

### stackables-manager.ts
- Stack command parsing
- Template management
- Data aggregation

## Important Development Notes

### File Extensions
- Always use `.js` extensions in imports (even for TypeScript files)
- TypeScript compiles to `.js`, so imports must reference the compiled output

### Database Schema
- Check `sms-bot/documentation` for complete database structure
- Main tables: 
  - `wtaf_content` - All created apps/pages
  - `wtaf_submissions` - Form submissions from apps
  - `wtaf_users` - User accounts and roles
  - `wtaf_zero_admin_collaborative` - ZAD app data
- Never assume table structure - verify first

### Disabled Features
Some features are disabled but preserved in code:
- Daily inspiration SMS broadcasts
- Random AI coach responses to unknown commands
- See `sms-bot/documentation/DISABLED-FEATURES.md` for details

### Common Pitfalls
- The website and SMS bot are separate systems
- Web pages are stored as complete HTML in Supabase
- User slugs and app slugs form the URL structure
- OG images are generated post-deployment

## Enforcement

These rules are not suggestions. They are requirements for maintaining a clean, scalable architecture. Any code that violates these principles should be refactored immediately.

When in doubt:
1. Check if the functionality already exists
2. Use the existing module's interface
3. Ask: "Which module owns this concern?"
4. Keep modules focused on their single responsibility

## Server Management and Deployment Rules

### 🚨 HIGH PRIORITY: Server Control Restrictions

**NEVER start, stop, restart, or build ANY of these services without explicit user permission:**

1. **SMS listener** (port 3030) - `node dist/src/index.js`
2. **Webtoys Engine** - engine processing system
3. **Web server** (port 3000) - Next.js development server

**ALWAYS ASK FIRST** before running commands like:
- `npm run build`
- `npm start` / `npm run dev`
- Any server start/stop/restart commands
- Any build or compilation commands

### Claude Code MUST Have User Permission For:
- **Starting, stopping, or restarting ANY server** (web server on port 3000, SMS listener on port 3030, Webtoys Engine)
- **Running build commands** (`npm run build`, etc.)
- **Pushing code to GitHub** (commits are allowed without permission)
- Always ask for explicit user approval before any of these actions

### 🎯 MANDATORY: Post-Task Server Guidance

**After completing ANY task, when it's not VERY obvious, you MUST inform the user:**

**"Do you need to REBUILD or RESTART any services?"**

Specify exactly which action may be needed:

#### When to REBUILD:
- **SMS bot changes** → `cd sms-bot && npm run build`
- **Web app changes** → `cd web && npm run build` (production only)
- **TypeScript changes** → Rebuild the affected service

#### When to RESTART:
- **SMS listener (port 3030)** → For changes to `sms-bot/` code
- **Web server (port 3000)** → For changes to `web/` directory
- **Webtoys Engine** → For changes to `sms-bot/engine/`

#### Example Post-Task Messages:
```
✅ Task completed! 

📋 Next steps: You may need to REBUILD the SMS bot since I modified validation logic:
   cd sms-bot && npm run build

Then RESTART the SMS listener if it's currently running.
```

```
✅ Template updated!

📋 Next steps: Since I modified the ZAD builder template, you'll need to REBUILD the SMS bot:
   cd sms-bot && npm run build
   
No restart needed - changes take effect on next SMS request.
```

## Automated Agents (Mac Mini)

Three automated agents run on the Mac Mini via cron:

### 1. **WEBTOYS.AI ISSUE TRACKER AGENT**
- **Location**: `/sms-bot/agent-issue-tracker/`
- **Purpose**: Processes issues from webtoys.ai/bart/issue-tracker, creates PRs for fixes
- **Cron**: Runs every minute

### 2. **WTAF REVISE AGENT**
- **Location**: `/sms-bot/webtoys-edit-agent/`
- **Purpose**: Handles `--revise` SMS commands to edit existing Webtoys
- **Cron**: Runs every 10 minutes

### 3. **WEBTOYS OS V3 EDIT AGENT**
- **Location**: `/sms-bot/webtoys-os/agents/edit-agent/`
- **Purpose**: Processes issues from toybox-issue-tracker-v3 (Community Desktop)
- **Cron**: Runs every 2 minutes

**Note**: These agents are independent systems that won't interfere with normal development.

## Git Commit and Push Rules

**Claude Code can commit anytime. For PUSHES the user needs to approve those requests.**
- You may stage changes with `git add`
- You may check status with `git status`
- You may run `git commit` at any time
- DO NOT run `git push` unless the user explicitly approves
- Wait for explicit user approval before pushing any changes

## Production Deployment Checklist

**BEFORE pushing code that might break production, check:**

1. **New Dependencies**: If you `import` a new library:
   - Add it to package.json with `npm install <package>`
   - Verify it's in the correct package.json (web/ or sms-bot/)
   - Run `npm run test:smoke` to check for missing dependencies

2. **Environment Variables**: If you add `process.env.NEW_VAR`:
   - Document it in the relevant .env.example file
   - Inform user it needs to be set in production (Railway)
   - Add to critical vars list in smoke tests if critical

3. **Config Changes**: If you modify config.ts or shared/config.ts:
   - Ensure default values work for production
   - Check if production override is needed

4. **Database Changes**: If you modify database schema:
   - Alert user that Supabase migration may be needed
   - Never assume table structure - verify first

5. **API/Service Changes**: If you add new external service:
   - Ensure API keys are via environment variables
   - Document the service setup requirements

## Security Exception: Web Console API

The web console API at `/api/wtaf/web-console` is an **approved exception** to the "no direct database access" rule. This exception exists for security reasons:

1. **Why the Exception**: The web API needs to verify user roles and permissions before forwarding commands to the SMS bot
2. **Security Measures**: 
   - Uses token validation to ensure users can only act as themselves
   - Service key is only used after authenticating the user's identity
   - Rate limiting and command filtering prevent abuse
3. **Trade-off**: We accept this architectural violation because the alternative (exposing storage-manager over HTTP) would be less secure

This is the only approved location for direct Supabase access outside of storage-manager.ts.

## Special Commands & Flags

### Override Flags (Development/Testing)
- `--admin` - Force admin dual-page generation (bypasses classifier)
- `--admin-test` - Use minimal test builder (bypasses classifier)
- `--zad-test` - Use simple ZAD test builder
- `--zad-api` - Use comprehensive ZAD builder with API conversion
- `--music` - Force music app generation
- `--stack [app-slug] [request]` - Use HTML template from existing app
- `--stackdb [app-slug] [request]` - Create app with live database connection
- `--stackdata [app-slug] [request]` - Use submission data from existing app
- `--stackemail [app-slug] [message]` - Email all app submitters
- `--remix [app-slug] [request]` - Remix existing app with changes
- `--stackzad [app-slug] [request]` - Create ZAD app with shared data access
- `--stackpublic [app-slug] [request]` - Create app using PUBLIC ZAD data
- `--stackobjectify [app-slug] [request]` - Create object pages from ZAD data (OPERATOR only)

### App Type Classification
The system automatically classifies apps into 5 types:
1. **games** - Contains "GAME" in prompt
2. **ZAD** - Has record in `wtaf_zero_admin_collaborative`
3. **needsAdmin** - Has submissions in `wtaf_submissions`
4. **oneThing** - Email/contact collection keywords
5. **web** - Everything else

### Request Processing Flow
1. **Game Detection** → Skip classifier, use game builder
2. **Override Flags** → Skip classifier if flag present
3. **Classifier** → Determines app type and requirements
4. **Builder Selection** → Routes to appropriate builder
5. **Post-Processing** → OG image, notifications, cleanup

## Quick Reference

**Need to add a feature?**
1. SMS processing → `controller.ts` orchestrates
2. AI/LLM calls → `wtaf-processor.ts` or specific processor
3. Database ops → `storage-manager.ts` ONLY
4. SMS/Email → `notification-client.ts`
5. User social features → `social-manager.ts`
6. Stack commands → `stackables-manager.ts`
7. ZAD helpers → `zad-helpers.ts` (client-side functions)

**Never:**
- Copy code between modules
- Access database outside storage-manager
- Put business logic in managers
- Skip error transformation
- Hardcode configuration values
- Make direct Supabase calls in controller

## CRITICAL: Use Task Tool to Avoid Failure Loops

### When to AUTOMATICALLY use the Task tool:
- **After 2 failed attempts** at fixing any issue (especially UI/CSS)
- **When user shows ANY frustration** ("still broken", "doesn't work", "come on", "NO", etc.)
- **When dealing with:**
  - Complex CSS positioning/layout problems
  - Visual appearance issues
  - Multi-file debugging
  - Any issue you've tried to fix 2+ times

### Trigger Phrases (use Task tool IMMEDIATELY):
- "still not working" / "still broken"
- "that's wrong" / "not right"
- "try again" / "failed again"
- Multiple "NO" responses
- Any swearing or CAPS LOCK frustration
- "X times" (indicating repeated failures)

### How to Use:
```
Task tool with subagent_type: general-purpose
Include:
- File path(s) involved
- What's broken (with screenshots if provided)
- What you've already tried
- Exact desired outcome
```

### Why This is MANDATORY:
- Prevents endless trial-and-error loops
- Gets fresh perspective on the problem
- Respects user's time and patience
- Task agents can review entire context you might miss

**DO NOT continue trying the same type of fix after 2 failures. Use the Task tool.**

## Automatic Commits and Testing

### When to Auto-Commit (Without Asking)

Claude Code SHOULD automatically commit at these logical points:
1. **After completing a feature** - When a requested feature is fully implemented
2. **After fixing a bug** - When a bug fix is complete and tested
3. **Before starting new work** - To checkpoint completed work
4. **After refactoring** - When code structure improvements are done
5. **Every 3-5 related changes** - To maintain atomic commit history

Example: User says "fix the gallery hover effects" → implement → test → auto-commit

### Smoke Testing System

**Automatic pre-commit testing is enabled:**
- Tests run automatically before every commit
- Located in `web/scripts/smoke-test.js`
- Checks critical paths:
  - Web server responds
  - Key pages load (/trending, /featured, /recents)
  - OG image API works
  - Demo mode functions
  - Static assets accessible

**If tests fail:**
1. Fix the issue immediately
2. OR inform user and ask if they want to skip with `--no-verify`

**For complex testing needs:**
- Use `test-runner` sub-agent type with Task tool
- Example: "Task: Run comprehensive tests on all gallery pages"

### Visual Testing with Puppeteer MCP

**PROACTIVE USE REQUIRED**: Claude Code MUST use Puppeteer MCP to visually verify changes when:

1. **After UI/CSS Changes** - Take screenshots to verify visual appearance
2. **Testing User-Created Pages** - Navigate to and screenshot generated apps/pages
3. **Gallery Updates** - Visually verify /trending, /featured, /recents pages
4. **Form Testing** - Fill and submit forms on created apps
5. **Mobile Responsiveness** - Test at different viewport sizes
6. **Before Committing UI Changes** - Screenshot before/after for visual regression

**When to Use Puppeteer Automatically:**
- User mentions "looks broken", "visual bug", "CSS issue" → Take screenshot
- After modifying gallery pages → Navigate and verify visually
- Testing created apps → Navigate to the app URL and interact
- User shares screenshot of issue → Compare with Puppeteer screenshot
- After OG image changes → Verify OG images render correctly

**Example Workflow:**
```javascript
// After making CSS changes to gallery
1. Navigate to https://webtoys.ai/trending
2. Screenshot the page
3. Check hover states by hovering elements
4. Test at mobile viewport (390x844)
5. Verify visual consistency
```

**Puppeteer Commands to Use:**
- `mcp__puppeteer__puppeteer_navigate` - Go to pages
- `mcp__puppeteer__puppeteer_screenshot` - Capture visuals
- `mcp__puppeteer__puppeteer_click` - Test interactions
- `mcp__puppeteer__puppeteer_fill` - Test forms
- `mcp__puppeteer__puppeteer_evaluate` - Check computed styles

**Testing Generated Content:**
When user creates an app via SMS, automatically:
1. Navigate to the generated URL
2. Take a screenshot
3. Test any interactive elements
4. Report visual confirmation to user

**Launch Options for Different Scenarios:**
```javascript
// Standard testing
{ "headless": true }

// Visual debugging
{ "headless": false }

// Mobile testing
{ "headless": true, "defaultViewport": { "width": 390, "height": 844 } }
```

<!-- AUTO-GENERATED-START -->
<!-- This section is automatically updated by npm run docs:generate -->
<!-- DO NOT EDIT MANUALLY -->
<!-- AUTO-GENERATED-END -->