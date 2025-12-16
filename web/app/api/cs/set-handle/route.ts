import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function verifySessionToken(token: string): string | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32)
    const decoded = Buffer.from(token, 'base64').toString()
    const [phone, timestamp, signature] = decoded.split(':')

    const expectedSig = crypto.createHmac('sha256', secret).update(`${phone}:${timestamp}`).digest('hex').slice(0, 16)
    if (signature !== expectedSig) return null
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) return null

    return phone
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, handle } = await req.json()

    if (!token || !handle) {
      return NextResponse.json({ error: 'Token and handle required' }, { status: 400 })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Validate handle
    const cleanHandle = handle.trim().slice(0, 20)
    if (cleanHandle.length < 2) {
      return NextResponse.json({ error: 'Handle must be at least 2 characters' }, { status: 400 })
    }

    // Get current subscriber
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('id, personalization')
      .eq('phone_number', phone)
      .single()

    if (!subscriber) {
      // Create subscriber if doesn't exist
      const { error: insertError } = await supabase
        .from('sms_subscribers')
        .insert({
          phone_number: phone,
          personalization: { handle: cleanHandle },
          opt_in_date: new Date().toISOString(),
          consent_given: true,
          confirmed: true
        })

      if (insertError) {
        console.error('[cs/set-handle] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save handle' }, { status: 500 })
      }
    } else {
      // Update existing
      const newPersonalization = { ...subscriber.personalization, handle: cleanHandle }
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update({ personalization: newPersonalization })
        .eq('id', subscriber.id)

      if (updateError) {
        console.error('[cs/set-handle] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to save handle' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, handle: cleanHandle })

  } catch (error) {
    console.error('[cs/set-handle] Error:', error)
    return NextResponse.json({ error: 'Failed to set handle' }, { status: 500 })
  }
}
