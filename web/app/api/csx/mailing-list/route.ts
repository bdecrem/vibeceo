import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedName = name?.trim() || null

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('csx_mailing_list')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already subscribed'
      })
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('csx_mailing_list')
      .insert({
        email: normalizedEmail,
        name: trimmedName,
        subscribed_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Mailing list insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      )
    }

    // Send notification email to bdecrem@gmail.com
    if (apiKey) {
      try {
        await sgMail.send({
          to: 'bdecrem@gmail.com',
          from: 'CTRL SHIFT <bot@advisorsfoundry.ai>',
          subject: `[CTRL SHIFT] New mailing list signup: ${normalizedEmail}`,
          text: `New subscriber to CTRL SHIFT mailing list:\n\nEmail: ${normalizedEmail}\nName: ${trimmedName || '(not provided)'}\nTime: ${new Date().toISOString()}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'IBM Plex Mono', monospace; padding: 24px; max-width: 600px;">
              <h2 style="margin: 0 0 24px 0; font-weight: 400;">New Mailing List Signup</h2>

              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Email:</p>
              <p style="margin: 0 0 16px 0;"><strong>${normalizedEmail}</strong></p>

              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Name:</p>
              <p style="margin: 0 0 16px 0;">${trimmedName || '<em>Not provided</em>'}</p>

              <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
              <p style="font-size: 12px; color: #888;">
                CTRL SHIFT Lab mailing list
              </p>
            </div>
          `
        })
        console.log(`📧 Notification sent for new subscriber: ${normalizedEmail}`)
      } catch (emailError) {
        // Log but don't fail the subscription
        console.error('Failed to send notification email:', emailError)
      }
    } else {
      console.log(`📧 Would notify about new subscriber: ${normalizedEmail}`)
    }

    console.log(`✅ New CTRL SHIFT subscriber: ${normalizedEmail}`)
    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully'
    })

  } catch (error) {
    console.error('Mailing list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to list subscribers (admin only, for future use)
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('csx_mailing_list')
      .select('*')
      .order('subscribed_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscribers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subscribers: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Mailing list GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
