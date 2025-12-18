import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionToken, isAdmin } from '../auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) cleaned = '1' + cleaned
  return '+' + cleaned
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // Find valid code
    const { data: codeRecord, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !codeRecord) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    // Mark as verified
    await supabase
      .from('verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', codeRecord.id)

    // Check if user exists in sms_subscribers
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('id, personalization')
      .eq('phone_number', normalizedPhone)
      .single()

    if (!subscriber) {
      return NextResponse.json({ error: 'Not a CS member. Text "CS SUBSCRIBE" to join.' }, { status: 403 })
    }

    // Check if user is subscribed to CS agent
    const { data: subscription } = await supabase
      .from('agent_subscriptions')
      .select('id')
      .eq('subscriber_id', subscriber.id)
      .eq('agent_slug', 'cs')
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Not a CS member. Text "CS SUBSCRIBE" to join.' }, { status: 403 })
    }

    const handle = subscriber?.personalization?.handle || subscriber?.personalization?.name || null
    const token = createSessionToken(normalizedPhone)
    const userIsAdmin = await isAdmin(normalizedPhone)

    const response = NextResponse.json({
      success: true,
      token,
      handle,
      needsHandle: !handle,
      isAdmin: userIsAdmin
    })

    // Set cookie for 30 days
    // httpOnly: true helps Safari persist (not flagged as "tracking" cookie)
    response.cookies.set('cs_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
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

    return response

  } catch (error) {
    console.error('[cs/verify-code] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
