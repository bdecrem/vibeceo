import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sendTrialConfirmationEmail(email: string, competitors: string[]): Promise<void> {
  try {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('[RivalAlert] Missing SendGrid API key - confirmation email not sent');
      return;
    }

    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(sendgridApiKey);

    const competitorList = competitors.map(url => {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return url;
      }
    }).join('\n- ');

    const subject = 'Welcome to RivalAlert - Your trial has started!';
    const text = `Welcome to RivalAlert!

Your 30-day free trial has started. We're now monitoring your competitors:

- ${competitorList}

What happens next:
✓ Every day at 7:00 AM PT, we'll check your competitors' websites
✓ If we detect any changes (pricing, features, content), you'll get an email alert
✓ You'll receive an AI-powered summary of what changed and why it matters

Your first report will arrive tomorrow at 7:00 AM PT.

Trial details:
• Duration: 30 days
• Competitors monitored: ${competitors.length} (max 3 for trial)
• First report: Tomorrow at 7:00 AM PT

Want to monitor more competitors? Upgrade anytime:
• Standard: $29/mo (3 competitors)
• Pro: $49/mo (10 competitors)

Upgrade: https://rivalalert.ai/upgrade

Questions? Just reply to this email.

Happy monitoring!
- The RivalAlert Team`;

    await sgMail.send({
      to: email,
      from: 'RivalAlert <bot@advisorsfoundry.ai>', // Using verified sender
      subject,
      text,
    });

    console.log(`[RivalAlert] Confirmation email sent to ${email}`);
  } catch (error) {
    console.error('[RivalAlert] Failed to send confirmation email:', error);
    // Don't fail the signup if email fails
  }
}

export async function POST(request: NextRequest) {
  console.log('[RivalAlert] Trial signup request received');
  try {
    // Check env vars are set
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[RivalAlert] Missing Supabase env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
        urlPrefix: supabaseUrl?.substring(0, 20),
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }
    console.log('[RivalAlert] Env vars OK, parsing body...');
    const { email, companyName, competitors } = await request.json();
    console.log('[RivalAlert] Body parsed:', { email, companyName, competitorCount: competitors?.length });

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: 'At least one competitor URL required' },
        { status: 400 }
      );
    }

    // Normalize and validate URLs
    const validUrls: string[] = [];
    for (const input of competitors) {
      if (!input || typeof input !== 'string') continue;
      let url = input.trim();
      if (!url) continue;

      // Add https:// if no protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // Validate it's a proper URL with domain structure
      try {
        const parsed = new URL(url);
        // Must have at least something.something
        if (parsed.hostname.includes('.')) {
          validUrls.push(url);
        }
      } catch {
        // Skip invalid URLs
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'Please enter at least one competitor website (e.g., competitor.com)' },
        { status: 400 }
      );
    }

    // Limit to 3 competitors for free trial
    const competitorsToAdd = validUrls.slice(0, 3);

    console.log('[RivalAlert] Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[RivalAlert] Supabase client created, checking for existing user...');

    // Check if user already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('ra_users')
      .select('id, trial_ends_at')
      .eq('email', email.toLowerCase())
      .single();

    console.log('[RivalAlert] User lookup result:', {
      found: !!existingUser,
      error: lookupError?.message || null
    });

    let userId: string;

    if (existingUser) {
      // User exists - check if trial is still active
      const trialEnds = new Date(existingUser.trial_ends_at);
      if (trialEnds > new Date()) {
        return NextResponse.json(
          { error: 'You already have an active trial. Check your email for reports!' },
          { status: 400 }
        );
      }
      // Trial expired - extend it
      userId = existingUser.id;
      await supabase
        .from('ra_users')
        .update({
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', userId);
    } else {
      // Create new user with 30-day trial
      console.log('[RivalAlert] Creating new user...');
      const { data: newUser, error: userError } = await supabase
        .from('ra_users')
        .insert({
          email: email.toLowerCase(),
          company_name: companyName || null,
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();

      console.log('[RivalAlert] User create result:', {
        success: !!newUser,
        userId: newUser?.id,
        error: userError?.message || null
      });

      if (userError || !newUser) {
        console.error('[RivalAlert] Error creating user:', userError);
        return NextResponse.json(
          { error: 'Failed to create trial. Please try again.' },
          { status: 500 }
        );
      }

      userId = newUser.id;
    }

    // Add competitors
    const competitorInserts = competitorsToAdd.map((url) => ({
      user_id: userId,
      website_url: url,
      name: new URL(url).hostname.replace('www.', ''),
    }));

    const { error: compError } = await supabase
      .from('ra_competitors')
      .insert(competitorInserts);

    if (compError) {
      console.error('Error adding competitors:', compError);
      // Don't fail - user is created, they can add competitors later
    }

    // Send confirmation email
    await sendTrialConfirmationEmail(email, competitorsToAdd);

    // TODO: Trigger immediate report generation
    // For now, the daily scheduler will pick this up at 7am PT
    // In the future, we could call the monitor directly here

    return NextResponse.json({
      success: true,
      message: 'Trial started! Check your email for confirmation.',
      competitors_added: competitorsToAdd.length,
    });
  } catch (error) {
    console.error('Trial signup error:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
