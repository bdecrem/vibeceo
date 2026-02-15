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

  const isTokenTankDomain = host?.includes('token-tank') || host?.includes('tokentank')
  const isB52Domain = host === 'b52s.me' || host === 'www.b52s.me'
  const isKochiDomain = host === 'kochi.to' || host === 'www.kochi.to'
  const isCtrlShiftDomain = host === 'ctrlshift.so' || host === 'www.ctrlshift.so' || host === 'ctrlshift.pizza' || host === 'www.ctrlshift.pizza'
  const isRivalAlertDomain = host === 'rivalalert.ai' || host === 'www.rivalalert.ai'
  const isInTheAmberDomain = host === 'intheamber.com' || host === 'www.intheamber.com'
  const isKochitoLabsDomain = host === 'kochitolabs.com' || host === 'www.kochitolabs.com'
  const isPixelpitDomain = host === 'pixelpit.gg' || host === 'www.pixelpit.gg'

  // Handle token-tank domain (mirror kochi pattern)
  if (isTokenTankDomain) {
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
      const newUrl = new URL('/token-tank', request.url)
      log(`[Middleware] Token Tank domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    return NextResponse.next()
  }

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

    // Amber's blog lives at /amber, not /kochi/amber
    if (pathname.startsWith('/amber')) {
      log(`[Middleware] Amber route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // TR-909 drum machine at /909
    if (pathname.startsWith('/909')) {
      log(`[Middleware] 909 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // TB-303 bass synth at /303
    if (pathname.startsWith('/303')) {
      log(`[Middleware] 303 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // SH-101 synth at /101
    if (pathname.startsWith('/101')) {
      log(`[Middleware] 101 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // 90s synth library at /90s
    if (pathname.startsWith('/90s')) {
      log(`[Middleware] 90s route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // Mave's space at /mave
    if (pathname.startsWith('/mave')) {
      log(`[Middleware] mave route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // Mixer module at /mixer
    if (pathname.startsWith('/mixer')) {
      log(`[Middleware] mixer route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB200 bass monosynth at /jb200
    if (pathname.startsWith('/jb200')) {
      log(`[Middleware] JB200 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB202 modular bass synth at /jb202
    if (pathname.startsWith('/jb202')) {
      log(`[Middleware] JB202 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB-01 drum machine at /jb01
    if (pathname.startsWith('/jb01')) {
      log(`[Middleware] JB01 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT10 lead synth at /jt10
    if (pathname.startsWith('/jt10')) {
      log(`[Middleware] JT10 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT30 acid bass at /jt30
    if (pathname.startsWith('/jt30')) {
      log(`[Middleware] JT30 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT90 drum machine at /jt90
    if (pathname.startsWith('/jt90')) {
      log(`[Middleware] JT90 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // SynthMachine landing page at /synthmachine
    if (pathname === '/synthmachine' || pathname.startsWith('/synthmachine/')) {
      log(`[Middleware] synthmachine route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // /links is the login-wall-free CS page, not /kochi/links
    if (pathname === '/links' || pathname.startsWith('/links/')) {
      log(`[Middleware] Links route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // /l/* shortlinks should not be rewritten
    if (pathname === '/l' || pathname.startsWith('/l/')) {
      log(`[Middleware] Shortlink route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // /music-player, /report-viewer, /voice-chat should not be rewritten
    if (pathname === '/music-player' || pathname.startsWith('/music-player')) {
      log(`[Middleware] Music player route bypassed: ${pathname}`)
      return NextResponse.next()
    }
    if (pathname === '/report-viewer' || pathname.startsWith('/report-viewer')) {
      log(`[Middleware] Report viewer route bypassed: ${pathname}`)
      return NextResponse.next()
    }
    if (pathname === '/voice-chat' || pathname.startsWith('/voice-chat')) {
      log(`[Middleware] Voice chat route bypassed: ${pathname}`)
      return NextResponse.next()
    }
    if (pathname === '/simple-voice' || pathname.startsWith('/simple-voice')) {
      log(`[Middleware] Simple voice route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // /cc/* (code investigation viewer) and /code-voice should not be rewritten
    if (pathname.startsWith('/cc/') || pathname.startsWith('/code-voice')) {
      log(`[Middleware] Code agent route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/kochi', request.url)
      log(`[Middleware] Kochi domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // Rewrite all other paths to /kochi/* (e.g., /peel -> /kochi/peel)
    const newUrl = new URL(`/kochi${pathname}`, request.url)
    log(`[Middleware] Kochi domain rewrite ${pathname} -> ${newUrl.pathname}`)
    return NextResponse.rewrite(newUrl)
  }

  // Handle ctrlshift.so domain
  if (isCtrlShiftDomain) {
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Root → /csx
    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/csx', request.url)
      log(`[Middleware] CTRL SHIFT domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // /cs → rewrite to /cs (explicit rewrite needed for custom domain)
    if (pathname === '/cs' || pathname.startsWith('/cs/')) {
      const newUrl = new URL(pathname, request.url)
      log(`[Middleware] CTRL SHIFT /cs rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // /rs → show terminal animation first, then click through to /csx/rs
    if (pathname === '/rs') {
      const newUrl = new URL('/csx?next=rs', request.url)
      log(`[Middleware] CTRL SHIFT /rs rewrite -> ${newUrl.pathname}${newUrl.search}`)
      return NextResponse.rewrite(newUrl)
    }

    // /rs/* subpaths → rewrite directly to /csx/rs/*
    if (pathname.startsWith('/rs/')) {
      const newUrl = new URL(`/csx${pathname}`, request.url)
      log(`[Middleware] CTRL SHIFT /rs/ subpath rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // /lf → show terminal animation first, then click through to /csx/lf (links to /links not /cs)
    if (pathname === '/lf') {
      const newUrl = new URL('/csx/entry-lf', request.url)
      log(`[Middleware] CTRL SHIFT /lf rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // /lf/* subpaths → rewrite directly to /csx/lf/*
    if (pathname.startsWith('/lf/')) {
      const newUrl = new URL(`/csx${pathname}`, request.url)
      log(`[Middleware] CTRL SHIFT /lf/ subpath rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // /hiring → rewrite to /csx/hiring
    if (pathname === '/hiring' || pathname.startsWith('/hiring/')) {
      const newUrl = new URL(`/csx${pathname}`, request.url)
      log(`[Middleware] CTRL SHIFT /hiring rewrite -> ${newUrl.pathname}`)
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

  // Handle rivalalert.ai domain (i1/Forge)
  if (isRivalAlertDomain) {
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
      const newUrl = new URL('/rivalalert', request.url)
      log(`[Middleware] RivalAlert domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    return NextResponse.next()
  }

  // Handle intheamber.com domain (Amber's blog)
  if (isInTheAmberDomain) {
    // Only bypass Next.js internals - everything else gets /amber prefix
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/')
    ) {
      return NextResponse.next()
    }

    // TR-909 drum machine at /909
    if (pathname.startsWith('/909')) {
      log(`[Middleware] intheamber.com 909 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // TB-303 bass synth at /303
    if (pathname.startsWith('/303')) {
      log(`[Middleware] intheamber.com 303 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // SH-101 synth at /101
    if (pathname.startsWith('/101')) {
      log(`[Middleware] intheamber.com 101 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // 90s synth library at /90s
    if (pathname.startsWith('/90s')) {
      log(`[Middleware] intheamber.com 90s route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // Mave's space at /mave
    if (pathname.startsWith('/mave')) {
      log(`[Middleware] intheamber.com mave route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // Mixer module at /mixer
    if (pathname.startsWith('/mixer')) {
      log(`[Middleware] intheamber.com mixer route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB200 bass monosynth at /jb200
    if (pathname.startsWith('/jb200')) {
      log(`[Middleware] intheamber.com JB200 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB202 modular bass synth at /jb202
    if (pathname.startsWith('/jb202')) {
      log(`[Middleware] intheamber.com JB202 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JB-01 drum machine at /jb01
    if (pathname.startsWith('/jb01')) {
      log(`[Middleware] intheamber.com JB01 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT10 lead synth at /jt10
    if (pathname.startsWith('/jt10')) {
      log(`[Middleware] intheamber.com JT10 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT30 acid bass at /jt30
    if (pathname.startsWith('/jt30')) {
      log(`[Middleware] intheamber.com JT30 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // JT90 drum machine at /jt90
    if (pathname.startsWith('/jt90')) {
      log(`[Middleware] intheamber.com JT90 route bypassed: ${pathname}`)
      return NextResponse.next()
    }

    // If path already starts with /amber/, don't double-prefix - pass through
    // This handles assets like /amber/amber-avatar.png and direct links
    if (pathname.startsWith('/amber/') || pathname === '/amber') {
      log(`[Middleware] intheamber.com pass-through: ${pathname}`)
      return NextResponse.next()
    }

    // Root → /amber
    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/amber', request.url)
      log(`[Middleware] intheamber.com root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // All other paths → /amber/* (including static files like .html, .js, .css)
    const newUrl = new URL(`/amber${pathname}`, request.url)
    log(`[Middleware] intheamber.com rewrite ${pathname} -> ${newUrl.pathname}`)
    return NextResponse.rewrite(newUrl)
  }

  // Handle kochitolabs.com domain
  if (isKochitoLabsDomain) {
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Rewrite all paths to /kochitolabs/*
    const targetPath = pathname === '/' || pathname === '' ? '/kochitolabs' : `/kochitolabs${pathname}`
    const newUrl = new URL(targetPath, request.url)
    log(`[Middleware] Kochito Labs domain rewrite ${pathname} -> ${newUrl.pathname}`)
    return NextResponse.rewrite(newUrl)
  }

  // Handle pixelpit.gg domain
  if (isPixelpitDomain) {
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // /pp/* shorthand → /pixelpit/arcade/*
    if (pathname.startsWith('/pp/')) {
      const rest = pathname.slice('/pp'.length) // keeps leading slash
      const newUrl = new URL(`/pixelpit/arcade${rest}`, request.url)
      log(`[Middleware] Pixelpit /pp/ rewrite ${pathname} -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // Root → /pixelpit
    if (pathname === '/' || pathname === '') {
      const newUrl = new URL('/pixelpit', request.url)
      log(`[Middleware] Pixelpit domain root rewrite -> ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }

    // Don't double-rewrite paths already under /pixelpit
    if (pathname.startsWith('/pixelpit')) {
      return NextResponse.next()
    }

    // Shipwreck lives at /shipwreck, not /pixelpit/shipwreck
    if (pathname.startsWith('/shipwreck')) {
      return NextResponse.next()
    }

    // All other paths → /pixelpit/*
    const newUrl = new URL(`/pixelpit${pathname}`, request.url)
    log(`[Middleware] Pixelpit domain rewrite ${pathname} -> ${newUrl.pathname}`)
    return NextResponse.rewrite(newUrl)
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

  // SPECIFIC FIX: Bypass token-tank immediately (v2 - forced rebuild)
  if (pathname === '/token-tank' || pathname.startsWith('/token-tank/')) {
    console.log(`[Middleware] Token Tank bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass TR-909 drum machine
  if (pathname === '/909' || pathname.startsWith('/909/')) {
    log(`[Middleware] TR-909 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass TB-303 bass synth
  if (pathname === '/303' || pathname.startsWith('/303/')) {
    log(`[Middleware] TB-303 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass SH-101 synth
  if (pathname === '/101' || pathname.startsWith('/101/')) {
    log(`[Middleware] SH-101 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass R9-DS sampler
  if (pathname === '/90s' || pathname.startsWith('/90s/')) {
    log(`[Middleware] R9-DS bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass moltbook essay
  if (pathname === '/moltbook-essay.html' || pathname === '/moltbook-essay') {
    log(`[Middleware] Moltbook essay bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass Mave's space
  if (pathname === '/mave' || pathname.startsWith('/mave/')) {
    log(`[Middleware] Mave bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass mixer module
  if (pathname === '/mixer' || pathname.startsWith('/mixer/')) {
    log(`[Middleware] Mixer bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JB200 bass monosynth
  if (pathname === '/jb200' || pathname.startsWith('/jb200/')) {
    log(`[Middleware] JB200 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JB202 modular bass synth
  if (pathname === '/jb202' || pathname.startsWith('/jb202/')) {
    log(`[Middleware] JB202 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JB-01 drum machine
  if (pathname === '/jb01' || pathname.startsWith('/jb01/')) {
    log(`[Middleware] JB-01 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JT10 lead synth
  if (pathname === '/jt10' || pathname.startsWith('/jt10/')) {
    log(`[Middleware] JT10 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JT30 acid bass
  if (pathname === '/jt30' || pathname.startsWith('/jt30/')) {
    log(`[Middleware] JT30 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass JT90 drum machine
  if (pathname === '/jt90' || pathname.startsWith('/jt90/')) {
    log(`[Middleware] JT90 bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass synthmachine landing page
  if (pathname === '/synthmachine' || pathname.startsWith('/synthmachine/')) {
    log(`[Middleware] SynthMachine bypassed: ${pathname}`)
    return NextResponse.next()
  }

  // SPECIFIC FIX: Bypass inspiration (TryAir v2)
  if (pathname === '/inspiration' || pathname.startsWith('/inspiration/')) {
    log(`[Middleware] Inspiration bypassed: ${pathname}`)
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
      pathname.startsWith('/kochi') ||
      pathname.startsWith('/token-tank') ||
      pathname.startsWith('/rivalalert') ||
      pathname.startsWith('/echo-gallery') ||
      pathname.startsWith('/coinrundown') ||
      pathname.startsWith('/amber') ||
      pathname.startsWith('/mave') ||
      pathname.startsWith('/voice-chat') ||
      pathname.startsWith('/simple-voice') ||
      pathname.startsWith('/pixelpit') ||
      pathname.startsWith('/shipwreck') ||
      pathname.startsWith('/cs')) {
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
// Cache bust 1764888457
