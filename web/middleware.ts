import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')
  
  // CRITICAL FIX: Bypass ALL API routes immediately - no processing whatsoever
  if (pathname.startsWith('/api/')) {
    if (host?.includes('localhost') || host?.includes('ngrok')) {
      console.log(`[Middleware] API route bypassed: ${pathname}`)
    }
    return NextResponse.next()
  }

  // CRITICAL FIX: Bypass auth routes and global pages - no processing whatsoever
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/register') || 
      pathname.startsWith('/link') || 
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/trending') ||
      pathname.startsWith('/featured') ||
      pathname.startsWith('/test-auth')) {
    if (host?.includes('localhost') || host?.includes('ngrok')) {
      console.log(`[Middleware] Auth/global route bypassed: ${pathname}`)
    }
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

  // Debug logging for development
  if (host?.includes('localhost') || host?.includes('ngrok')) {
    console.log(`[Middleware] ${host}${pathname} - Processing request`)
  }

  // Handle wtaf.me, webtoys.io, and webtoys.ai domains (both production and development)
  const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me' || host === 'webtoys.io' || host === 'www.webtoys.io' || host === 'webtoys.ai' || host === 'www.webtoys.ai'
  const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
  const isDevWtafRoute = isDevEnvironment && pathname.startsWith('/wtaf/')
  const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/) && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && pathname !== '/wtaf-landing' && pathname !== '/wtaf-landing-old' && pathname !== '/featured' && pathname !== '/featured-old' && pathname !== '/trending' && pathname !== '/trending-old' && pathname !== '/creations2' && !pathname.startsWith('/creations-old')
  
  // Debug logging for WTAF domain routing
  if (isWtafDomain) {
    console.log(`[Middleware] WTAF domain detected: ${host}${pathname}`)
    console.log(`[Middleware] Search params: ${search}`)
    console.log(`[Middleware] Full URL: ${request.url}`)
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
      console.log(`[Middleware] Serving WTAF landing page for root path`)
      return NextResponse.rewrite(newUrl)
    }

    // CRITICAL FIX: Prevent infinite loops by checking if path already starts with /wtaf/
    if (pathname.startsWith('/wtaf/')) {
      console.log(`[Middleware] Path already starts with /wtaf/, continuing normally: ${pathname}`)
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
      console.log(`[Middleware] Rewriting wtaf.me ${host}${pathname} -> ${rewritePath}`)
      console.log(`[Middleware] New URL: ${newUrl.toString()}`)
      return NextResponse.rewrite(newUrl)
    } else if (isDevUserRoute) {
      // For dev user routes (e.g., /bart or /bart/app): rewrite to /wtaf/bart or /wtaf/bart/app
      const newUrl = new URL(`/wtaf${pathname}${search}`, request.url)
      console.log(`[Middleware] Rewriting dev user route ${pathname} -> /wtaf${pathname}`)
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