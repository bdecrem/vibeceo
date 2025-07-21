# Website Architecture Documentation

## Overview

The AdvisorsFoundry/WTAF website employs a sophisticated **middleware-based routing system** that seamlessly handles multiple domains, user-generated content, and environment-specific behaviors. The architecture supports both the coaching platform (`coaches.advisorsfoundry.ai`) and the WTAF app generator (`wtaf.me`) within a single Next.js application.

## Core Architecture Principles

1. **Middleware-First Routing**: All routing decisions happen at the middleware level before reaching page components
2. **Domain-Based Separation**: Clear separation between coaching platform and WTAF while sharing infrastructure
3. **Security-First**: API routes bypassed, iframe sandboxing for user content, environment-aware protections
4. **Dynamic User Content**: User-generated WTAF apps served through secure, isolated rendering
5. **Flexible User Experience**: Customizable user landing pages and content organization

---

## Middleware Routing System

The heart of the routing system lives in `web/middleware.ts` and acts as an intelligent traffic controller.

### Key Routing Logic

```typescript
// Critical bypasses - no processing for these routes
if (pathname.startsWith('/api/') || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/_next/')) {
  return NextResponse.next()
}

// Root path routing based on domain
if (pathname === '/' && isWtafDomain) {
  // wtaf.me → WTAF landing page
  return NextResponse.rewrite(new URL('/wtaf-landing', request.url))
}

// Dynamic user/app routing
// /bart → /wtaf/bart
// /bart/my-app → /wtaf/bart/my-app
const rewritePath = `/wtaf${pathname}`
return NextResponse.rewrite(new URL(rewritePath, request.url))
```

### Domain Detection

- **Production**: `wtaf.me`, `www.wtaf.me` → WTAF ecosystem
- **Development**: `localhost`, `ngrok` → Environment-aware routing with debug logging
- **Coaching Platform**: `coaches.advisorsfoundry.ai` → AdvisorsFoundry homepage

### Route Processing Order

1. **Security Bypasses**: API routes, auth routes, static assets
2. **Domain Analysis**: Determine target ecosystem (WTAF vs Coaching)
3. **Path Transformation**: Rewrite user-friendly URLs to internal structure
4. **Debug Logging**: Development environment feedback

---

## Directory Structure

```
web/app/
├── page.tsx                    # 🏠 AdvisorsFoundry homepage
├── layout.tsx                  # 🌐 Root layout with providers
├── globals.css                 # 🎨 Global styles
│
├── wtaf-landing/               # 🚀 WTAF homepage (wtaf.me root)
│   └── page.tsx               # Landing page with SMS instructions
│
├── wtaf/                       # 🎯 WTAF app ecosystem
│   ├── page.tsx               # WTAF instruction/demo page
│   ├── layout.tsx             # WTAF-specific layout and metadata
│   ├── README.md              # WTAF routing documentation
│   └── [user_slug]/           # 👤 Dynamic user routes
│       ├── page.tsx           # User index (smart redirects)
│       ├── creations/         # 📱 User's app gallery
│       ├── chat/              # 💬 Chat interface
│       └── [app_slug]/        # 🎮 Individual WTAF apps
│           └── page.tsx       # App content server
│
├── coaches/                    # 👨‍💼 Coaching platform pages
├── dashboard/                  # 📊 User dashboard
├── featured/                   # ⭐ Featured apps gallery
├── trending/                   # 📈 Trending apps
├── remix/                      # 🔄 App remixing system
├── login/                      # 🔐 Authentication
├── register/                   # 📝 User registration
├── sms/                        # 📱 SMS signup
│
└── api/                        # 🔌 API endpoints
    ├── generate-og-cached/     # OpenGraph image generation
    ├── user-creations/         # User app listings
    ├── remix-app/              # App remixing
    └── [39+ other endpoints]   # Full API ecosystem
```

---

## Domain & Environment Handling

### Production Domains

| Domain | Purpose | Root Route | Content |
|--------|---------|------------|---------|
| `wtaf.me` | WTAF App Generator | `/wtaf-landing` | SMS-based app creation |
| `coaches.advisorsfoundry.ai` | Coaching Platform | `/page.tsx` | AI coaching services |

### Development Environment

- **Local Development**: `localhost:3000` 
  - Homepage: AdvisorsFoundry coaching platform
  - WTAF Access: `/wtaf/` prefix required
  - Debug logging enabled

- **User Route Testing**: Works in both environments
  - Dev: `localhost:3000/bart` → `localhost:3000/wtaf/bart`
  - Prod: `wtaf.me/bart` → `wtaf.me/wtaf/bart` (internal)

### Environment Detection

```typescript
const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me'
const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
```

---

## WTAF App Serving System

### Individual App Rendering (`/wtaf/[user_slug]/[app_slug]`)

#### Content Pipeline
1. **Database Query**: Fetch HTML from `wtaf_content` table
2. **Security Processing**: Apply iframe sandboxing
3. **Demo Mode**: Optional demo user injection
4. **Metadata Generation**: Dynamic OpenGraph tags and images

#### Code Example
```typescript
// Fetch content
const { data } = await supabase
  .from("wtaf_content")
  .select("html_content, coach, original_prompt")
  .eq("user_slug", user_slug)
  .eq("app_slug", app_slug)
  .eq("status", "published")
  .single();

// Render in secure iframe
<iframe
  srcDoc={htmlContent}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  style={{ width: "100%", height: "100%" }}
/>
```

### User Profile System

#### Smart Redirects (`/wtaf/[user_slug]/page.tsx`)
```typescript
// Check for custom index file
const { data: subscriber } = await supabase
  .from('sms_subscribers')
  .select('index_file')
  .eq('slug', user_slug)

// Redirect logic
if (subscriber?.index_file === 'creations') {
  redirect(`/wtaf/${user_slug}/creations`)
} else if (subscriber?.index_file) {
  redirect(`/wtaf/${user_slug}/${app_slug}`)
} else {
  redirect(`/wtaf/${user_slug}/creations`) // Default
}
```

### Demo Mode (`?demo=true`)

Injects client-side override script for isolated testing:
```javascript
const demoUser = { 
  userLabel: 'Demo User', 
  participantId: 'demo-' + Math.random().toString(36).substr(2, 6) 
};
// Sets demo state, hides auth screens, enables full functionality
```

---

## Security & Performance

### Security Measures

1. **API Route Protection**: Complete middleware bypass prevents interference
2. **Iframe Sandboxing**: User content isolated with controlled permissions
3. **Environment Awareness**: Different security contexts for dev/prod
4. **Input Validation**: Strict parameter validation for dynamic routes

### Performance Optimizations

1. **Dynamic Rendering**: `revalidate = 0` ensures fresh user content
2. **Cached OpenGraph Images**: Supabase Storage with CDN delivery
3. **Middleware Efficiency**: Early route bypassing for static assets
4. **Lazy Loading**: Strategic iframe loading patterns

### Iframe Sandbox Permissions
```typescript
sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
```

---

## Development Workflow

### Local Development Setup

1. **Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` configured
2. **Development Server**: `npm run dev` starts on `localhost:3000`
3. **WTAF Testing**: Access via `/wtaf/` prefix
4. **Debug Logging**: Automatic console output for routing decisions

### Route Testing

```bash
# Homepage testing
curl localhost:3000              # AdvisorsFoundry coaching platform
curl localhost:3000/wtaf        # WTAF instruction page

# User route testing
curl localhost:3000/bart         # Redirects to /wtaf/bart internally
curl localhost:3000/bart/my-app # Serves WTAF app if exists

# Production testing
curl wtaf.me                     # WTAF landing page
curl wtaf.me/bart               # User profile or custom index
```

### Adding New Routes

1. **Static Routes**: Add directory under `app/`
2. **Dynamic Routes**: Use `[param]` naming convention
3. **Middleware Updates**: Add bypass rules if needed
4. **Layout Inheritance**: Leverage existing layout hierarchy

---

## Troubleshooting

### Common Issues

#### 1. API Routes Not Working
**Symptoms**: API calls returning unexpected content
**Solution**: Ensure middleware bypassing is working
```typescript
if (pathname.startsWith('/api/')) {
  return NextResponse.next() // Critical bypass
}
```

#### 2. WTAF Apps Not Loading
**Symptoms**: 404 or empty iframe content
**Debug Steps**:
1. Check Supabase connection
2. Verify `user_slug` and `app_slug` in database
3. Confirm `status = 'published'`
4. Check iframe sandbox permissions

#### 3. Routing Loops
**Symptoms**: Infinite redirects in development
**Solution**: Check middleware path detection logic
```typescript
// Prevent infinite loops
if (pathname.startsWith('/wtaf/')) {
  return NextResponse.next()
}
```

#### 4. Demo Mode Not Working
**Symptoms**: Auth screens still showing with `?demo=true`
**Debug**: Check script injection timing and variable scope

### Debug Tools

```typescript
// Enable debug logging in development
if (host?.includes('localhost') || host?.includes('ngrok')) {
  console.log(`[Middleware] Processing: ${host}${pathname}`)
}
```

---

## Future Considerations

### Scaling Opportunities
1. **CDN Integration**: Enhanced static asset delivery
2. **Route Caching**: Intelligent middleware caching for frequent routes
3. **Multi-Region**: Geographic routing for global performance

### Architecture Evolution
1. **Microservices**: Potential API separation for specialized services
2. **Edge Computing**: Move routing logic closer to users
3. **Real-time Features**: WebSocket integration for live collaboration

---

## Related Documentation

- `web/app/wtaf/README.md` - WTAF-specific routing details
- `sms-bot/documentation/` - Backend SMS integration
- `memory-bank/` - Project context and development history
- `.cursor/rules` - Development guidelines and patterns

---

*Last Updated: January 2025*
*Architecture Version: 2.0* 