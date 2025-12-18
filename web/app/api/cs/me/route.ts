import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, isAdmin } from '../auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    // Try cookie first, then fallback to query param (for localStorage recovery)
    let token = req.cookies.get('cs_token')?.value
    const fallbackToken = req.nextUrl.searchParams.get('token')
    const needsCookieRefresh = !token && !!fallbackToken

    if (!token && fallbackToken) {
      token = fallbackToken
    }

    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ authenticated: false })
    }

    // Get user's handle
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('personalization')
      .eq('phone_number', phone)
      .single()

    const handle = subscriber?.personalization?.handle || null
    const userIsAdmin = await isAdmin(phone)

    const response = NextResponse.json({
      authenticated: true,
      token,
      handle,
      isAdmin: userIsAdmin
    })

    // Re-set cookie if it was missing but localStorage token was valid
    if (needsCookieRefresh) {
      response.cookies.set('cs_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      if (handle) {
        response.cookies.set('cs_handle', handle, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        })
      }
    }

    return response

  } catch (error) {
    console.error('[cs/me] Error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
