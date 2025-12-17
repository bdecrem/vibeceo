import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import twilio from 'twilio'
import { verifySessionToken } from '../auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  try {
    const { token, linkId, text } = await req.json()

    if (!token || !linkId || !text) {
      return NextResponse.json({ error: 'Token, linkId, and text required' }, { status: 400 })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user's handle
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('personalization')
      .eq('phone_number', phone)
      .single()

    const handle = subscriber?.personalization?.handle || subscriber?.personalization?.name || 'Anonymous'

    // Get current link with poster info
    const { data: link, error: linkError } = await supabase
      .from('cs_content')
      .select('comments, posted_by_phone, posted_by_name')
      .eq('id', linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Add comment
    const comments = link.comments || []
    const newComment = {
      id: crypto.randomUUID(),
      author: handle,
      text: text.trim().slice(0, 500),
      created_at: new Date().toISOString()
    }
    comments.push(newComment)

    // Update
    const { error: updateError } = await supabase
      .from('cs_content')
      .update({ comments })
      .eq('id', linkId)

    if (updateError) {
      console.error('[cs/comment] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    // Notify original poster (if not commenting on own post)
    if (link.posted_by_phone && link.posted_by_phone !== phone) {
      try {
        const commenterName = handle !== 'Anonymous' ? `[${handle}]` : 'someone'
        await twilioClient.messages.create({
          body: `${commenterName} replied to your link — 💬 kochi.to/cs 👀`,
          to: link.posted_by_phone,
          from: process.env.TWILIO_PHONE_NUMBER
        })
      } catch (smsError) {
        console.error('[cs/comment] Failed to send notification:', smsError)
        // Don't fail the request if SMS fails
      }
    }

    return NextResponse.json({ success: true, comment: newComment })

  } catch (error) {
    console.error('[cs/comment] Error:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
