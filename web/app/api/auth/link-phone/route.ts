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
  
  // Add + prefix for E.164 format
  return '+' + cleaned;
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
    
    // Check if phone number already exists in sms_subscribers
    const { data: existingSubscriber } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store verification code in temporary table (or in-memory for now)
    // For production, use a proper cache like Redis or a verification_codes table
    // For now, we'll store it in the sms_subscribers table
    
    if (existingSubscriber) {
      // Update existing record with verification code
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: verificationCode,
          verification_expires: expiresAt.toISOString()
        })
        .eq('phone_number', normalizedPhone);
    } else {
      // Create a new record with pending status
      // IMPORTANT: Don't set supabase_id yet - that happens after verification
      const { error: insertError } = await supabase
        .from('sms_subscribers')
        .insert({
          phone_number: normalizedPhone,
          supabase_id: null, // Leave null until verified
          email: null, // Some fields might be required
          role: 'user', // Default role
          verification_code: verificationCode,
          verification_expires: expiresAt.toISOString(),
          confirmed: false,
          consent_given: false,
          slug: `pending-${Date.now()}`, // Temporary slug
          created_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Failed to create pending record:', insertError);
        return NextResponse.json(
          { error: 'Failed to create verification record' },
          { status: 500 }
        );
      }
      
      console.log(`Created pending record for ${normalizedPhone}`);
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