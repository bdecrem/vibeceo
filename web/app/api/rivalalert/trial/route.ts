import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check env vars are set
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
        urlPrefix: supabaseUrl?.substring(0, 20),
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }
    const { email, companyName, competitors } = await request.json();

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('ra_users')
      .select('id, trial_ends_at')
      .eq('email', email.toLowerCase())
      .single();

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

      if (userError || !newUser) {
        console.error('Error creating user:', userError);
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

    // TODO: Trigger immediate report generation
    // For now, the daily scheduler will pick this up
    // In the future, we could call the monitor directly here

    return NextResponse.json({
      success: true,
      message: 'Trial started! Your first report is being generated.',
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
