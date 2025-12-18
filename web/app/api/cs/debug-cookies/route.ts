import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rawCookieHeader = req.headers.get('cookie')
  const csToken = req.cookies.get('cs_token')?.value
  const csHandle = req.cookies.get('cs_handle')?.value

  return NextResponse.json({
    raw_cookie_header: rawCookieHeader || '(none)',
    cs_token_present: !!csToken,
    cs_token_length: csToken?.length || 0,
    cs_token_preview: csToken ? `${csToken.slice(0, 20)}...` : null,
    cs_handle: csHandle || null,
    timestamp: new Date().toISOString(),
  })
}
