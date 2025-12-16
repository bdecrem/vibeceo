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

    // Get current link
    const { data: link, error: linkError } = await supabase
      .from('cs_content')
      .select('comments')
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

    return NextResponse.json({ success: true, comment: newComment })

  } catch (error) {
    console.error('[cs/comment] Error:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
