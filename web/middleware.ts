import { NextRequest, NextResponse } from 'next/server'

// Only log in development to reduce production overhead
const isDev = process.env.NODE_ENV !== 'production'
const log = (...args: any[]) => {
  if (isDev) console.log(...args)
}

// --- Route bypass configuration ---
// Adding a new route? Add it here instead of writing a new if-block.

// Routes that should never be rewritten, regardless of which domain is being accessed.
// Used by domain handlers AND the default/WTAF fallback.
const GLOBAL_BYPASS_PREFIXES = [
  // Next.js internals & API
  '/_next/', '/api/', '/images/', '/favicon',
  // Synths & music tools (shared across kochi.to, intheamber.com, and default)
  '/909', '/303', '/101', '/90s', '/mixer', '/mave',
  '/jb200', '/jb202', '/jb01', '/jt10', '/jt30', '/jt90', '/synthmachine',
  // Viewers & tools
  '/music-player', '/report-viewer', '/voice-chat', '/simple-voice',
  '/cc/', '/code-voice', '/webtoys-logo', '/inspiration',
]

// Synth routes only — used by intheamber.com which has narrower bypasses
const SYNTH_BYPASSES = [
  '/909', '/303', '/101', '/90s', '/mixer', '/mave',
  '/jb200', '/jb202', '/jb01', '/jt10', '/jt30', '/jt90', '/synthmachine',
]

// Additional kochi.to bypasses — routes that live at root, not under /kochi/*
const KOCHI_BYPASSES = [
  '/amber', '/shipshot', '/mutabl', '/links', '/l',
]

// Default-section bypasses — prevent WTAF handler from catching known app routes
const DEFAULT_BYPASSES = [
  // All app roots
  '/token-tank', '/kochi', '/amber', '/pixelpit', '/shipshot', '/mutabl',
  '/b52s', '/rivalalert', '/echo-gallery', '/coinrundown', '/csx', '/cs',
  // Auth & global routes
  '/login', '/register', '/link', '/dashboard', '/l',
  '/trending', '/recents', '/featured', '/about',
  '/test-auth', '/test-subscriber', '/console',
  '/reset-password', '/payments', '/moltbook-essay',
]

// --- Helper ---

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
}

function matchesBypass(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(p => {
    // Prefixes ending in / (like '/cc/') are already prefix-match-safe
    if (p.endsWith('/')) return pathname.startsWith(p)
    // Otherwise: exact match OR path continues with /
    return pathname === p || pathname.startsWith(p + '/')
  })
}

// --- Domain matchers ---

function matchHost(host: string, domain: string | string[], mode: 'exact' | 'includes' = 'exact'): boolean {
  const domains = Array.isArray(domain) ? domain : [domain]
  if (mode === 'includes') return domains.some(d => host.includes(d))
  return domains.some(d => host === d || host === `www.${d}`)
}

// --- Standard domain rewrite (covers 6 simple domains) ---

interface SimpleDomain {
  domain: string | string[]
  app: string
  match?: 'exact' | 'includes'
}

// Domains that rewrite root AND all subpaths to /app/*
const REWRITE_ALL_DOMAINS: SimpleDomain[] = [
  { domain: 'kochitolabs.com', app: 'kochitolabs' },
  { domain: 'shipshot.io', app: 'shipshot' },
  { domain: 'mutabl.co', app: 'mutabl' },
]

// Domains that ONLY rewrite root to /app, everything else passes through
const ROOT_ONLY_DOMAINS: SimpleDomain[] = [
  // Original: host?.includes('token-tank') || host?.includes('tokentank')
  { domain: ['token-tank', 'tokentank'], app: 'token-tank', match: 'includes' },
  { domain: 'b52s.me', app: 'b52s' },
  { domain: 'rivalalert.ai', app: 'rivalalert' },
]

function handleRewriteAllDomain(app: string, pathname: string, request: NextRequest): NextResponse {
  // Root → /app
  if (pathname === '/' || pathname === '') {
    return NextResponse.rewrite(new URL(`/${app}`, request.url))
  }
  // Don't double-rewrite paths already under the app
  if (pathname.startsWith(`/${app}`)) {
    return NextResponse.next()
  }
  // All other paths → /app/*
  return NextResponse.rewrite(new URL(`/${app}${pathname}`, request.url))
}

// --- Main middleware ---

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host') || ''

  log(`[Middleware] Processing: ${pathname}`)

  // --- Root-only domains (token-tank, b52s, rivalalert) ---
  // These only rewrite root to /app, everything else passes through
  for (const { domain, app, match } of ROOT_ONLY_DOMAINS) {
    if (matchHost(host, domain, match || 'exact')) {
      if (isStaticAsset(pathname)) return NextResponse.next()
      if (pathname === '/' || pathname === '') {
        return NextResponse.rewrite(new URL(`/${app}`, request.url))
      }
      return NextResponse.next()
    }
  }

  // --- Rewrite-all domains (kochitolabs, shipshot, mutabl) ---
  // These rewrite root AND all subpaths to /app/*
  for (const { domain, app, match } of REWRITE_ALL_DOMAINS) {
    if (matchHost(host, domain, match || 'exact')) {
      if (isStaticAsset(pathname)) return NextResponse.next()
      return handleRewriteAllDomain(app, pathname, request)
    }
  }

  // --- kochi.to ---
  if (matchHost(host, 'kochi.to')) {
    if (isStaticAsset(pathname)) return NextResponse.next()
    // Bypass synth routes, tools, and apps that live at root
    if (matchesBypass(pathname, GLOBAL_BYPASS_PREFIXES) || matchesBypass(pathname, KOCHI_BYPASSES)) {
      log(`[Middleware] kochi.to bypass: ${pathname}`)
      return NextResponse.next()
    }
    // Root → /kochi
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/kochi', request.url))
    }
    // Everything else → /kochi/*
    return NextResponse.rewrite(new URL(`/kochi${pathname}`, request.url))
  }

  // --- ctrlshift.so / ctrlshift.pizza ---
  if (matchHost(host, 'ctrlshift.so') || matchHost(host, 'ctrlshift.pizza')) {
    if (isStaticAsset(pathname)) return NextResponse.next()
    // Root → /csx
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/csx', request.url))
    }
    // /cs → explicit rewrite (needed for custom domain)
    if (pathname === '/cs' || pathname.startsWith('/cs/')) {
      return NextResponse.rewrite(new URL(pathname, request.url))
    }
    // /rs exact → terminal animation with ?next=rs
    if (pathname === '/rs') {
      return NextResponse.rewrite(new URL('/csx?next=rs', request.url))
    }
    // /rs/* subpaths → /csx/rs/*
    if (pathname.startsWith('/rs/')) {
      return NextResponse.rewrite(new URL(`/csx${pathname}`, request.url))
    }
    // /lf exact → special entry page (NOT /csx/lf)
    if (pathname === '/lf') {
      return NextResponse.rewrite(new URL('/csx/entry-lf', request.url))
    }
    // /lf/* subpaths → /csx/lf/*
    if (pathname.startsWith('/lf/')) {
      return NextResponse.rewrite(new URL(`/csx${pathname}`, request.url))
    }
    // /hiring → /csx/hiring
    if (pathname === '/hiring' || pathname.startsWith('/hiring/')) {
      return NextResponse.rewrite(new URL(`/csx${pathname}`, request.url))
    }
    return NextResponse.next()
  }

  // --- intheamber.com ---
  // NOTE: This domain intentionally rewrites static files (.html, .js, .css)
  // into /amber/* namespace. Only /_next/, /api/, and synth routes are bypassed.
  // DO NOT use isStaticAsset() or GLOBAL_BYPASS_PREFIXES here.
  if (matchHost(host, 'intheamber.com')) {
    if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    // Only synth routes bypass — NOT /images/, /favicon, /music-player, etc.
    if (matchesBypass(pathname, SYNTH_BYPASSES)) {
      log(`[Middleware] intheamber.com bypass: ${pathname}`)
      return NextResponse.next()
    }
    // /amber paths pass through (prevent double-prefix)
    if (pathname.startsWith('/amber/') || pathname === '/amber') {
      return NextResponse.next()
    }
    // Root → /amber
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/amber', request.url))
    }
    // All other paths → /amber/* (including static files)
    return NextResponse.rewrite(new URL(`/amber${pathname}`, request.url))
  }

  // --- pixelpit.gg ---
  if (matchHost(host, 'pixelpit.gg')) {
    if (isStaticAsset(pathname)) return NextResponse.next()
    // /pp/* shorthand → /pixelpit/arcade/*
    if (pathname.startsWith('/pp/')) {
      const rest = pathname.slice('/pp'.length) // keeps leading slash
      return NextResponse.rewrite(new URL(`/pixelpit/arcade${rest}`, request.url))
    }
    return handleRewriteAllDomain('pixelpit', pathname, request)
  }

  // --- Default section (no custom domain matched) ---
  // Bypass static assets
  if (isStaticAsset(pathname)) return NextResponse.next()
  // Bypass synth routes, tools, and all known app routes
  if (matchesBypass(pathname, GLOBAL_BYPASS_PREFIXES) || matchesBypass(pathname, DEFAULT_BYPASSES)) {
    log(`[Middleware] Default bypass: ${pathname}`)
    return NextResponse.next()
  }

  log(`[Middleware] ${host}${pathname} - Processing request`)

  // --- wtaf.me / webtoys.io / webtoys.ai ---
  const isWtafDomain = host === 'wtaf.me' || host === 'www.wtaf.me' || host === 'webtoys.io' || host === 'www.webtoys.io' || host === 'webtoys.ai' || host === 'www.webtoys.ai'
  const isDevEnvironment = host?.includes('localhost') || host?.includes('ngrok')
  const isDevWtafRoute = isDevEnvironment && pathname.startsWith('/wtaf/')
  const isDevUserRoute = isDevEnvironment && pathname.match(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/) && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && pathname !== '/wtaf-landing' && pathname !== '/wtaf-landing-old' && pathname !== '/featured' && pathname !== '/featured-old' && pathname !== '/trending' && pathname !== '/trending-old' && pathname !== '/creations2' && !pathname.startsWith('/creations-old') && pathname !== '/webtoys-logo'

  if (isWtafDomain) {
    log(`[Middleware] WTAF domain detected: ${host}${pathname}`)
  }

  if (isWtafDomain || isDevWtafRoute || isDevUserRoute) {
    // Root → /wtaf-landing (only on WTAF domain, not dev)
    if (pathname === '/' && isWtafDomain) {
      return NextResponse.rewrite(new URL('/wtaf-landing', request.url))
    }
    // Prevent infinite loops
    if (pathname.startsWith('/wtaf/')) {
      return NextResponse.next()
    }
    if (isWtafDomain) {
      // Handle trailing slash: /bart/ → /wtaf/bart
      let rewritePath = `/wtaf${pathname}`
      if (pathname !== '/' && pathname.endsWith('/')) {
        rewritePath = `/wtaf${pathname.slice(0, -1)}`
      }
      return NextResponse.rewrite(new URL(`${rewritePath}${search}`, request.url))
    } else if (isDevUserRoute) {
      return NextResponse.rewrite(new URL(`/wtaf${pathname}${search}`, request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
