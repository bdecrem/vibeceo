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
    const token = req.cookies.get('cs_token')?.value

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

    return NextResponse.json({
      authenticated: true,
      token,
      handle,
      isAdmin: userIsAdmin
    })

  } catch (error) {
    console.error('[cs/me] Error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
