# Static HTML URL Routing

How to make static HTML apps in `web/public/` accessible via clean URLs like `/909`, `/303`, `/90s`.

## The Pattern

Static HTML apps live in `web/public/<name>/ui/<app>/index.html`. To make them accessible at `/<name>`:

### 1. Create an App Route Redirect

Create `web/app/<name>/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function MyAppRedirect() {
  redirect('/<name>/ui/<app>/index.html')
}
```

**This is the critical piece.** The Next.js app route handles the root URL and redirects to the static HTML.

### 2. Add Middleware Bypass

In `web/middleware.ts`, add a bypass so the middleware doesn't intercept the route:

```typescript
// SPECIFIC FIX: Bypass <name>
if (pathname === '/<name>' || pathname.startsWith('/<name>/')) {
  log(`[Middleware] <name> bypassed: ${pathname}`)
  return NextResponse.next()
}
```

Add this in **two places** if needed:
- Under `isKochiDomain` block (for kochi.to)
- Under `isInTheAmberDomain` block (for intheamber.com)
- In the general bypasses section (for localhost/other domains)

### 3. Add Config Rewrites (Optional)

In `web/next.config.cjs`, add rewrites for the UI path:

```javascript
async rewrites() {
  return {
    beforeFiles: [
      { source: '/<name>/ui/<app>', destination: '/<name>/ui/<app>/index.html' },
      { source: '/<name>', destination: '/<name>/ui/<app>/index.html' },
    ],
  }
}
```

Note: The app route redirect (step 1) handles the root URL. These rewrites help with direct `/ui/` path access.

## Example: Adding /90s for R9-DS Sampler

### File Structure
```
web/
├── app/90s/page.tsx           # Redirect route
├── public/90s/
│   ├── ui/r9ds/index.html     # The actual app
│   ├── dist/                  # JavaScript modules
│   └── kits/                  # Sample kits
```

### app/90s/page.tsx
```tsx
import { redirect } from 'next/navigation'

export default function R9DSRedirect() {
  redirect('/90s/ui/r9ds/index.html')
}
```

### middleware.ts additions
```typescript
// Under isKochiDomain:
if (pathname.startsWith('/90s')) {
  log(`[Middleware] 90s route bypassed: ${pathname}`)
  return NextResponse.next()
}

// Under isInTheAmberDomain:
if (pathname.startsWith('/90s')) {
  log(`[Middleware] intheamber.com 90s route bypassed: ${pathname}`)
  return NextResponse.next()
}

// In general bypasses:
if (pathname === '/90s' || pathname.startsWith('/90s/')) {
  log(`[Middleware] R9-DS bypassed: ${pathname}`)
  return NextResponse.next()
}
```

### next.config.cjs additions
```javascript
// R9-DS sampler UI
{ source: '/90s/ui/r9ds', destination: '/90s/ui/r9ds/index.html' },
{ source: '/90s', destination: '/90s/ui/r9ds/index.html' },
```

## Why This Pattern?

1. **App route redirect** - Next.js needs a route to handle `/<name>`. Without it, you get 404.
2. **Middleware bypass** - The middleware rewrites paths for custom domains. Static HTML routes need to bypass this.
3. **Config rewrites** - Help serve `index.html` when accessing directory paths.

## Existing Implementations

| URL | App Route | Static HTML |
|-----|-----------|-------------|
| `/909` | `app/909/page.tsx` | `public/909/ui/tr909/index.html` |
| `/303` | `app/303/page.tsx` | `public/303/ui/tb303/index.html` |
| `/90s` | `app/90s/page.tsx` | `public/90s/ui/r9ds/index.html` |

## Troubleshooting

### 404 on root URL
- Check that `app/<name>/page.tsx` exists
- Restart the Next.js dev server after creating app routes

### 404 on subpaths
- Check middleware bypasses are in place
- Verify the file exists in `public/`

### Redirect loops
- Don't use `NextResponse.redirect()` in middleware for these routes
- Use `NextResponse.next()` (bypass) instead

## Testing

```bash
# Should return 307 redirect
curl -sI http://localhost:3000/90s | head -5

# Should return 200
curl -sI http://localhost:3000/90s/ui/r9ds/index.html | head -5
```
