# Active Context: URL Routing Architecture Documentation

## Current Focus: COMPLETED
**Successfully documented the sophisticated dual-domain URL routing system**

## What Was Just Analyzed

### Complex URL Routing System
- **Two Domains:** `advisorsfoundry.ai` (business) + `wtaf.me` (app generator)
- **Environment Aware:** Different behavior for development vs production
- **Single Codebase:** One Next.js app serves both websites via middleware

### Key Architecture Insights

#### Middleware-Driven Routing (`web/middleware.ts`)
```
Domain Detection → Environment Check → URL Rewriting → File Structure Mapping
```

#### Environment Patterns
- **Development (localhost:3000/3001):** Single domain serves both sites
- **Production (Railway):** Separate domains with cross-domain routing
- **Port Flexibility:** Works on both 3000 (normal) and 3001 (secondary Cursor instance)

#### URL Rewriting Examples
- `wtaf.me/bart` → internally becomes `/wtaf/bart`
- `localhost:3000/bart` → internally becomes `/wtaf/bart`
- `localhost:3000/wtaf/bart` → continues normally (no rewrite)

### File Structure Mapping
```
web/app/
├── page.tsx                     # AdvisorsFoundry homepage
├── coaches/page.tsx             # Business coaching
├── wtaf/
│   ├── [user_slug]/
│   │   ├── page.tsx             # User pages (wtaf.me/bart)
│   │   ├── chat/page.tsx        # Chat interface (wtaf.me/bart/chat)
│   │   └── [app_slug]/page.tsx  # Generated apps (wtaf.me/bart/my-app)
```

### Complexity Factors Identified
1. **Domain Switching:** Same codebase serves different websites
2. **Environment Detection:** localhost vs production behavior
3. **URL Rewriting:** Clean URLs hide internal structure
4. **Loop Prevention:** Careful checks avoid infinite rewrites
5. **Asset Handling:** Different rules for API vs content routes

## Cross-Service Integration
- **SMS Bot:** Environment-aware URL generation for different domains
- **Web Platform:** Middleware handles routing for both business and WTAF sites
- **Database:** Unified data layer works across all domains

## Technical Implementation Details

### Environment Configuration
```python
# SMS Bot adapts URL generation based on environment
if "localhost" in WEB_APP_URL:
    WTAF_DOMAIN = WEB_APP_URL  # Development: single domain
else:
    WTAF_DOMAIN = "https://www.wtaf.me"  # Production: separate domain
```

### Middleware Logic
```javascript
// Detects domain type and rewrites URLs accordingly
const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me'
const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+/)
```

## Current Status: FULLY DOCUMENTED
- Routing system complexity understood
- Environment patterns documented
- Cross-service integration mapped
- Development workflow clarified
- Production deployment considerations noted

## Next Steps Available
- System works smoothly in both development and production
- Documentation enables easier onboarding and maintenance
- Architecture ready for future expansion (mobile app, API, etc.)
- Clear separation enables independent scaling of services 