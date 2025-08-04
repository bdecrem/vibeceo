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
- **WEBTOYS**: Subdirectory using middleware/routing
- **Key Pages**:
  - Homepage: `/web/wtaf-landing`
  - `/trending` - Popular creations
  - `/featured` - Curated content
  - User pages: "Creations" (user homepages)

## Project Architecture Overview

The SMS bot follows a microservices architecture with strict separation of concerns:
- **Controller (controller.ts)**: Business logic orchestration, request routing
- **Processors**: Specialized handlers for different content types
- **Managers**: Domain-specific functionality (storage, social, stackables)
- **Shared utilities**: Common functions and configurations

## Strict Rules for Code Agents

### 0. SECURITY: NEVER Hardcode Secrets
**THIS IS THE #1 RULE - VIOLATING THIS RULE IS UNACCEPTABLE**
- **NEVER** put API keys, tokens, or secrets directly in code files
- **NEVER** commit credentials to Git, even in test scripts
- **ALWAYS** use environment variables from `.env` files
- **ALWAYS** use `process.env.VARIABLE_NAME` for sensitive values
- Test scripts are NOT exempt from this rule

```javascript
// ❌ ABSOLUTELY WRONG - NEVER DO THIS
const supabaseKey = 'eyJhbGc...actual-key-here...';

// ✅ CORRECT - ALWAYS DO THIS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
```

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

## Git Commit and Push Rules

**NEVER commit or push changes to GitHub unless explicitly requested by the user.**
- You may stage changes with `git add` for review
- You may check status with `git status`
- DO NOT run `git commit` unless the user says "commit" 
- DO NOT run `git push` unless the user says "push"
- Wait for explicit user approval before committing or pushing any changes

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

<!-- AUTO-GENERATED-START -->
<!-- This section is automatically updated by npm run docs:generate -->
<!-- DO NOT EDIT MANUALLY -->
<!-- AUTO-GENERATED-END -->