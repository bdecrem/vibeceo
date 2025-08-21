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

// Verify session token from verify-code step
function verifySessionToken(token: string): { phone: string; subscriber_id: string } | null {
  try {
    const [payloadPart, signature] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
    
    // Verify signature
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Check if token is not too old (30 minutes max)
    if (Date.now() - payload.timestamp > 30 * 60 * 1000) {
      return null;
    }
    
    if (payload.purpose !== 'payment') {
      return null;
    }
    
    return {
      phone: payload.phone,
      subscriber_id: payload.subscriber_id
    };
  } catch {
    return null;
  }
}

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  return '+' + cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { session_token, phone_number } = await req.json();
    
    if (!session_token || !phone_number) {
      return NextResponse.json(
        { error: 'Session token and phone number are required' },
        { status: 400 }
      );
    }
    
    // Verify session token
    const tokenData = verifySessionToken(session_token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 403 }
      );
    }
    
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // Verify phone matches token
    if (tokenData.phone !== normalizedPhone) {
      return NextResponse.json(
        { error: 'Phone number mismatch' },
        { status: 403 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Get subscriber details
    const { data: subscriber, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('id', tokenData.subscriber_id)
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (fetchError || !subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }
    
    // Check LemonSqueezy API key
    const lemonSqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!lemonSqueezyApiKey) {
      throw new Error('Missing LemonSqueezy API key');
    }
    
    // Create checkout with LemonSqueezy API
    const checkoutData = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: false,
            dark: true,
            subscription_preview: false,
            button_color: '#3B82F6'
          },
          checkout_data: {
            email: subscriber.email || '',
            name: subscriber.slug || '',
            custom: {
              phone_number: normalizedPhone,
              subscriber_id: subscriber.id,
              purpose: 'credit_purchase'
            }
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          preview: false,
          test_mode: process.env.NODE_ENV !== 'production'
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: process.env.LEMONSQUEEZY_STORE_ID
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: process.env.LEMONSQUEEZY_VARIANT_ID // $10 credit bundle variant
            }
          }
        }
      }
    };
    
    const lemonSqueezyResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${lemonSqueezyApiKey}`
      },
      body: JSON.stringify(checkoutData)
    });
    
    if (!lemonSqueezyResponse.ok) {
      const errorData = await lemonSqueezyResponse.text();
      console.error('LemonSqueezy API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
    
    const checkoutResponse = await lemonSqueezyResponse.json();
    const checkoutUrl = checkoutResponse.data.attributes.url;
    
    console.log(`[Payments] Created checkout for ${normalizedPhone}: ${checkoutUrl}`);
    
    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}