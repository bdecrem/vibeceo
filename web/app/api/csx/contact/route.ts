import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

const typeSubjects: Record<string, string> = {
  signup: 'Office Hours Signup',
  apply: 'Founder Award Application',
  general: 'General Inquiry'
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, message, type } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const subject = `[CTRL SHIFT] ${typeSubjects[type] || 'Contact Form'}: ${name}`

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'IBM Plex Mono', monospace; padding: 24px; max-width: 600px;">
        <h2 style="margin: 0 0 24px 0; font-weight: 400;">${typeSubjects[type] || 'Contact Form'}</h2>

        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">From:</p>
        <p style="margin: 0 0 16px 0;"><strong>${name}</strong> &lt;${email}&gt;</p>

        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Message:</p>
        <div style="background: #f5f5f5; padding: 16px; border-left: 3px solid #333;">
          ${message.replace(/\n/g, '<br>')}
        </div>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #888;">
          Sent from ctrlshift.pizza contact form
        </p>
      </div>
    `

    const textContent = `${typeSubjects[type] || 'Contact Form'}

From: ${name} <${email}>

Message:
${message}

---
Sent from ctrlshift.pizza contact form`

    if (!apiKey) {
      // Log for development without SendGrid
      console.log('📧 Would send email to hey@ctrlshift.pizza:')
      console.log('Subject:', subject)
      console.log('From:', name, email)
      console.log('Message:', message)
      return NextResponse.json({ success: true })
    }

    await sgMail.send({
      to: 'hey@ctrlshift.pizza',
      from: 'CTRL SHIFT <bot@advisorsfoundry.ai>',
      replyTo: email,
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`📧 Contact form sent: ${type} from ${email}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Contact form error:', error.response?.body || error.message)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
