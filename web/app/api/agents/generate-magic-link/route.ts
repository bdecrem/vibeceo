import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Generate a secure magic link token for SMS users to access the agent marketplace
 * POST /api/agents/generate-magic-link
 * Body: { phone_number: string }
 *
 * This endpoint is called by the SMS bot when a user sends "AGENTS"
 */
export async function POST(req: NextRequest) {
  try {
    const { phone_number } = await req.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Missing phone_number' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify the phone number exists in our system
    const { data: subscriber, error: subscriberError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { error: 'Phone number not found in system' },
        { status: 404 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store the token
    const { error: tokenError } = await supabase
      .from('agent_marketplace_tokens')
      .insert({
        token,
        phone_number,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('Failed to create magic link token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate link' },
        { status: 500 }
      );
    }

    // Generate the magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';
    const magicLink = `${baseUrl}/agents/marketplace?token=${token}`;

    console.log(`🔗 Generated magic link for ${phone_number}: ${magicLink}`);

    return NextResponse.json({
      success: true,
      magic_link: magicLink,
      expires_at: expiresAt.toISOString(),
      subscriber: {
        phone: subscriber.phone_number,
        slug: subscriber.slug,
        email: subscriber.email
      }
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
