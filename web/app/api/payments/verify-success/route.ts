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
    const { order_id, phone_number } = await req.json();
    
    if (!order_id || !phone_number) {
      return NextResponse.json(
        { error: 'Order ID and phone number are required' },
        { status: 400 }
      );
    }
    
    const normalizedPhone = normalizePhoneNumber(phone_number);
    const supabase = getSupabaseClient();
    
    // For MVP, just check if user has credits (webhook would have added them)
    // In production, you might want to verify the order_id with LemonSqueezy API
    
    // Get current subscriber credits
    const { data: subscriber, error: subscriberError } = await supabase
      .from('sms_subscribers')
      .select('credits_remaining, slug')
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }
    
    console.log(`[Payments] Success verification for ${normalizedPhone}`);
    
    return NextResponse.json({
      success: true,
      credits: 10, // Assume $10 purchase for MVP
      total_credits: subscriber.credits_remaining,
      user_slug: subscriber.slug
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}