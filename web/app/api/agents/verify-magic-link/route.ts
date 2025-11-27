import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Verify a magic link token and return subscriber info
 * GET /api/agents/verify-magic-link?token=xxx
 *
 * Called when user visits the marketplace via magic link
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Find the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('agent_marketplace_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 401 }
      );
    }

    // Get subscriber info
    const { data: subscriber, error: subscriberError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', tokenData.phone_number)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Update token usage count
    await supabase
      .from('agent_marketplace_tokens')
      .update({
        accessed_count: (tokenData.accessed_count || 0) + 1,
        used_at: tokenData.used_at || new Date().toISOString()
      })
      .eq('id', tokenData.id);

    console.log(`✅ Magic link verified for ${subscriber.phone_number} (${subscriber.slug})`);

    // Return subscriber info (without sensitive data)
    return NextResponse.json({
      success: true,
      subscriber: {
        id: subscriber.id,
        phone_number: subscriber.phone_number,
        slug: subscriber.slug,
        email: subscriber.email,
        role: subscriber.role,
        supabase_id: subscriber.supabase_id
      },
      token_expires_at: tokenData.expires_at
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
