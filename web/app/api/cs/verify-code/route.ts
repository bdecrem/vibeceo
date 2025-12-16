import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

// Simple session token: base64(phone:timestamp:signature)
function createSessionToken(phone: string): string {
  const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32)
  const timestamp = Date.now()
  const data = `${phone}:${timestamp}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16)
  return Buffer.from(`${data}:${signature}`).toString('base64')
}

export function verifySessionToken(token: string): string | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32)
    const decoded = Buffer.from(token, 'base64').toString()
    const [phone, timestamp, signature] = decoded.split(':')

    // Check signature
    const expectedSig = crypto.createHmac('sha256', secret).update(`${phone}:${timestamp}`).digest('hex').slice(0, 16)
    if (signature !== expectedSig) return null

    // Check expiry (24 hours)
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) return null

    return phone
  } catch {
    return null
  }
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

    const handle = subscriber?.personalization?.handle || subscriber?.personalization?.name || null
    const token = createSessionToken(normalizedPhone)

    return NextResponse.json({
      success: true,
      token,
      handle,
      needsHandle: !handle
    })

  } catch (error) {
    console.error('[cs/verify-code] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
