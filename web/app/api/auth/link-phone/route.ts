import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio environment variables');
  }
  
  return twilio(accountSid, authToken);
}

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add US country code if not present
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { phone_number, user_id } = await req.json();
    
    if (!phone_number || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify auth token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseClient();
    
    // Verify token and ensure user_id matches
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== user_id) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 403 });
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // Check if this user already has a phone number (that's not a placeholder)
    const { data: currentUser } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', user_id)
      .single();
      
    if (currentUser && currentUser.phone_number && !currentUser.phone_number.startsWith('+1555')) {
      return NextResponse.json(
        { error: 'You already have a phone number linked to your account' },
        { status: 400 }
      );
    }
    
    // Check if phone number already exists in sms_subscribers
    const { data: existingSubscriber } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store verification code
    // IMPORTANT: For web users linking phones, we store the code on THEIR record
    
    if (existingSubscriber) {
      // Phone already exists in system
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: verificationCode,
          verification_expires: expiresAt.toISOString()
        })
        .eq('phone_number', normalizedPhone);
    } else {
      // Phone doesn't exist - store verification on current user's record
      // We'll update their phone_number after verification
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: verificationCode,
          verification_expires: expiresAt.toISOString(),
          // Store the pending phone number in a temporary field or just remember it for verification
        })
        .eq('supabase_id', user_id);
        
      console.log(`Stored verification code for user ${user_id} to link ${normalizedPhone}`);
    }
    
    // Send SMS verification code
    try {
      const twilioClient = getTwilioClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!fromNumber) {
        throw new Error('Missing Twilio phone number');
      }
      
      await twilioClient.messages.create({
        body: `Your WEBTOYS verification code is: ${verificationCode}`,
        from: fromNumber,
        to: normalizedPhone
      });
      
      console.log(`Sent verification code to ${normalizedPhone}`);
    } catch (twilioError: any) {
      console.error('Failed to send SMS:', twilioError);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please check your phone number.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      phone_exists: !!existingSubscriber
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}