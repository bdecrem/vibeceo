import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

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

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Simple in-memory rate limit
const rateLimits = new Map<string, { count: number; reset: number }>()

function checkRateLimit(phone: string): boolean {
  const now = Date.now()
  const limit = rateLimits.get(phone)

  if (!limit || now > limit.reset) {
    rateLimits.set(phone, { count: 1, reset: now + 3600000 })
    return true
  }

  if (limit.count >= 5) return false
  limit.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    if (!checkRateLimit(normalizedPhone)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    // Store code
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        phone: normalizedPhone,
        code,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('[cs/send-code] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    // Send SMS
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    await twilioClient.messages.create({
      body: `Your CS verification code: ${code}\n\nValid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: normalizedPhone
    })

    console.log(`[cs/send-code] Sent code to ${normalizedPhone}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[cs/send-code] Error:', error)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
