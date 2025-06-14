import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')

  // Handle wtaf.me domain
  if (host === 'wtaf.me' || host === 'www.wtaf.me') {
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

    // Root path - redirect to main WTAF page
    if (pathname === '/') {
      const url = new URL('https://advisorsfoundry.ai/wtaf')
      return NextResponse.redirect(url)
    }

    // Handle wtaf.me/username/filename format
    // Rewrite to /wtaf/username/filename internally
    const newUrl = new URL(`/wtaf${pathname}${search}`, request.url)
    return NextResponse.rewrite(newUrl)
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