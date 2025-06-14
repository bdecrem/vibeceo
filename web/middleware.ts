import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')
  
  // Debug logging for development
  if (host?.includes('localhost') || host?.includes('ngrok')) {
    console.log(`[Middleware] ${host}${pathname} - Processing request`)
  }

  // Handle wtaf.me domain (both production and development)
  const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me'
  const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
  const isDevWtafRoute = isDevEnvironment && pathname.startsWith('/wtaf/')
  const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/) && !pathname.startsWith('/api') && !pathname.startsWith('/_next')
  
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

    // Root path - redirect to main WTAF page (only for wtaf.me domain, not dev routes)
    if (pathname === '/' && isWtafDomain) {
      const url = new URL('https://advisorsfoundry.ai/wtaf')
      return NextResponse.redirect(url)
    }

    // Handle different routing scenarios
    if (isWtafDomain) {
      // For wtaf.me domain: rewrite to /wtaf/username/filename internally
      const newUrl = new URL(`/wtaf${pathname}${search}`, `https://${host}`)
      console.log(`[Middleware] Rewriting wtaf.me ${pathname} -> /wtaf${pathname}`)
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