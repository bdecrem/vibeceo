import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Verify the waitlist entry exists and is pending
    const { data: entry, error: fetchError } = await supabase
      .from('cs_waitlist')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
    }

    // Use phone from the database entry, not from request
    const phone = entry.phone

    // Update waitlist status
    const { error: updateError } = await supabase
      .from('cs_waitlist')
      .update({ status: 'approved' })
      .eq('id', id)

    if (updateError) {
      console.error('[cs/approve] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
    }

    // Get subscriber ID for agent subscription
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('id, personalization')
      .eq('phone_number', phone)
      .single()

    if (subscriber) {
      // Add to agent_subscriptions
      const { error: subError } = await supabase
        .from('agent_subscriptions')
        .upsert({
          subscriber_id: subscriber.id,
          agent_slug: 'cs',
          active: true,
          subscribed_at: new Date().toISOString(),
        }, {
          onConflict: 'subscriber_id,agent_slug'
        })

      if (subError) {
        console.error('[cs/approve] Subscription error:', subError)
      }

      // Send welcome SMS
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      )

      const handle = subscriber.personalization?.handle
      const welcomeMsg = handle
        ? `You're in! Welcome to CTRL Shift, ${handle}. Share links: CS <url>. Feed: kochi.to/cs`
        : `You're in! Welcome to CTRL Shift. Share links: CS <url>. Feed: kochi.to/cs`

      await twilioClient.messages.create({
        body: welcomeMsg,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone
      })

      console.log(`[cs/approve] Approved and notified ${phone}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[cs/approve] Error:', error)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }
}
