import { NextRequest, NextResponse } from 'next/server'

// Only log in development to reduce production overhead
const isDev = process.env.NODE_ENV !== 'production'
const log = (...args: any[]) => {
  if (isDev) console.log(...args)
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')

  log(`[Middleware] Processing: ${pathname}`)

  const isB52Domain = host === 'b52s.me' || host === 'www.b52s.me'
  const isKochiDomain = host === 'kochi.to' || host === 'www.kochi.to'

  // Handle kochi.to domain
  if (isKochiDomain) {
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/kochi', request.url)
      log(`[Middleware] Kochi domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    return NextResponse.next()
  }

  // Handle b52s.me domain
  if (isB52Domain) {
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/b52s', request.url)
      log(`[Middleware] B52 domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    return NextResponse.next()
  }
  
  // SPECIFIC FIX: Bypass music player route immediately
  if (pathname === '/music-player' || pathname.startsWith('/music-player/')) {
    log(`[Middleware] Music player bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass report viewer route immediately
  if (pathname === '/report-viewer' || pathname.startsWith('/report-viewer/')) {
    log(`[Middleware] Report viewer bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass webtoys-logo immediately
  if (pathname === '/webtoys-logo' || pathname.startsWith('/webtoys-logo/')) {
    log(`[Middleware] WEBTOYS-LOGO bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // CRITICAL FIX: Bypass ALL API routes immediately - no processing whatsoever
  if (pathname.startsWith('/api/')) {
    log(`[Middleware] API route bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // CRITICAL FIX: Bypass auth routes and global pages - no processing whatsoever
  if (pathname === '/l' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/link') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/l/') ||
      pathname.startsWith('/trending') ||
      pathname.startsWith('/recents') ||
      pathname.startsWith('/featured') ||
      pathname.startsWith('/kochi') ||
      pathname.startsWith('/about') ||
      pathname.startsWith('/test-auth') ||
      pathname.startsWith('/test-subscriber') ||
      pathname.startsWith('/console') ||
      pathname.startsWith('/webtoys-logo') ||
      pathname.startsWith('/report-viewer') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/payments') ||
      pathname.startsWith('/b52s') ||
      pathname.startsWith('/kochi')) {
    log(`[Middleware] Auth/global route bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // CRITICAL FIX: Also bypass Next.js internals, static files, and assets immediately
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  log(`[Middleware] ${host}${pathname} - Processing request`)

  // Handle wtaf.me, webtoys.io, and webtoys.ai domains (both production and development)
  const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me' || host === 'webtoys.io' || host === 'www.webtoys.io' || host === 'webtoys.ai' || host === 'www.webtoys.ai'
  const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
  const isDevWtafRoute = isDevEnvironment && pathname.startsWith('/wtaf/')
  const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/) && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && pathname !== '/wtaf-landing' && pathname !== '/wtaf-landing-old' && pathname !== '/featured' && pathname !== '/featured-old' && pathname !== '/trending' && pathname !== '/trending-old' && pathname !== '/creations2' && !pathname.startsWith('/creations-old') && pathname !== '/webtoys-logo'
  
  // Debug logging for WTAF domain routing
  if (isWtafDomain) {
    log(`[Middleware] WTAF domain detected: ${host}${pathname}`)
    log(`[Middleware] Search params: ${search}`)
    log(`[Middleware] Full URL: ${request.url}`)
  }
  
  if (isWtafDomain || isDevWtafRoute || isDevUserRoute) {
    // Skip API routes, static files, and Next.js internals
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Root path - serve WTAF landing page (only for wtaf.me domain, not dev routes)
    if (pathname === '/' && isWtafDomain) {
      const newUrl = new URL('/wtaf-landing', request.url)
      log(`[Middleware] Serving WTAF landing page for root path`)
      return NextResponse.rewrite(newUrl)
    }

    // CRITICAL FIX: Prevent infinite loops by checking if path already starts with /wtaf/
    if (pathname.startsWith('/wtaf/')) {
      log(`[Middleware] Path already starts with /wtaf/, continuing normally: ${pathname}`)
      return NextResponse.next()
    }

    // Handle different routing scenarios
    if (isWtafDomain) {
      // CRITICAL FIX: Handle trailing slash properly for dynamic routes
      let rewritePath = `/wtaf${pathname}`
      
      // If pathname ends with / and it's not just root, ensure it maps correctly
      if (pathname !== '/' && pathname.endsWith('/')) {
        // For user paths like /bart/, rewrite to /wtaf/bart (remove trailing slash for dynamic route)
        rewritePath = `/wtaf${pathname.slice(0, -1)}`
      }
      
      const newUrl = new URL(`${rewritePath}${search}`, request.url)
      log(`[Middleware] Rewriting wtaf.me ${host}${pathname} -> ${rewritePath}`)
      log(`[Middleware] New URL: ${newUrl.toString()}`)
      return NextResponse.rewrite(newUrl)
    } else if (isDevUserRoute) {
      // For dev user routes (e.g., /bart or /bart/app): rewrite to /wtaf/bart or /wtaf/bart/app
      const newUrl = new URL(`/wtaf${pathname}${search}`, request.url)
      log(`[Middleware] Rewriting dev user route ${pathname} -> /wtaf${pathname}`)
      return NextResponse.rewrite(newUrl)
    }
    
    // For dev routes that are already /wtaf/..., just continue normally
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
