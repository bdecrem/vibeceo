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

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add US country code if not present
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  // Add + prefix for E.164 format
  return '+' + cleaned;
}

// Generate a secure session token for the payment flow
function generateSessionToken(phoneNumber: string, subscriberId: string): string {
  const payload = {
    phone: phoneNumber,
    subscriber_id: subscriberId,
    timestamp: Date.now(),
    purpose: 'payment'
  };
  
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const token = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('base64url');
    
  return `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${token}`;
}

export async function POST(req: NextRequest) {
  try {
    const { phone_number, verification_code } = await req.json();
    
    if (!phone_number || !verification_code) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    const supabase = getSupabaseClient();
    
    // Find subscriber with this phone and verification code
    const { data: subscriber, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verification_code', verification_code)
      .eq('payment_verification_active', true)
      .single();
      
    if (fetchError || !subscriber) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Check if code is expired
    const expiresAt = new Date(subscriber.verification_expires);
    if (Date.now() > expiresAt.getTime()) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }
    
    // Mark user as confirmed and clear verification data
    const { error: updateError } = await supabase
      .from('sms_subscribers')
      .update({
        confirmed: true,
        verification_code: null,
        verification_expires: null,
        payment_verification_active: null,
        last_message_date: new Date().toISOString(),
      })
      .eq('id', subscriber.id);
    
    if (updateError) {
      console.error('Failed to confirm subscriber:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm verification' },
        { status: 500 }
      );
    }
    
    // Generate session token for checkout
    const sessionToken = generateSessionToken(normalizedPhone, subscriber.id);
    
    console.log(`[Payments] Verified code for ${normalizedPhone}, subscriber ${subscriber.slug}`);
    
    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      message: 'Phone verified successfully'
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}