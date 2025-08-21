import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import crypto from 'crypto';

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

// Rate limiting: max 3 attempts per phone per hour
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const key = phoneNumber;
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(key, { count: 1, resetTime: now + 60 * 60 * 1000 }); // 1 hour
    return true;
  }
  
  if (limit.count >= 3) {
    return false;
  }
  
  limit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { phone_number } = await req.json();
    
    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // Check rate limiting
    if (!checkRateLimit(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again in an hour.' },
        { status: 429 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Check if this phone number already exists in sms_subscribers
    const { data: existingSubscriber } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    let subscriberId: string;
    
    if (existingSubscriber) {
      // Phone exists, update verification info
      subscriberId = existingSubscriber.id;
    } else {
      // Create a new subscriber record for payment flow
      const { uniqueNamesGenerator, adjectives, animals } = await import('unique-names-generator');
      const slug = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: '',
        style: 'lowerCase'
      });
      
      const { data: newSubscriber, error: createError } = await supabase
        .from('sms_subscribers')
        .insert({
          phone_number: normalizedPhone,
          opt_in_date: new Date().toISOString(),
          consent_given: true,
          confirmed: false, // Will be confirmed when they verify the code
          unsubscribed: false,
          is_admin: false,
          role: 'coder',
          slug: slug,
          credits_remaining: 0, // No credits until payment
        })
        .select()
        .single();
        
      if (createError || !newSubscriber) {
        console.error('Failed to create subscriber:', createError);
        return NextResponse.json(
          { error: 'Failed to process phone number' },
          { status: 500 }
        );
      }
      
      subscriberId = newSubscriber.id;
    }
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store verification info
    const { error: updateError } = await supabase
      .from('sms_subscribers')
      .update({
        verification_code: verificationCode,
        verification_expires: expiresAt.toISOString(),
        payment_verification_active: true, // Flag to indicate this is for payment flow
      })
      .eq('id', subscriberId);
    
    if (updateError) {
      console.error('Failed to store verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to start verification process' },
        { status: 500 }
      );
    }
    
    // Send SMS verification code
    try {
      const twilioClient = getTwilioClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!fromNumber) {
        throw new Error('Missing Twilio phone number');
      }
      
      await twilioClient.messages.create({
        body: `Your WEBTOYS payment verification code is: ${verificationCode}\\n\\nValid for 10 minutes.`,
        from: fromNumber,
        to: normalizedPhone
      });
      
      console.log(`[Payments] Sent verification code ${verificationCode} to ${normalizedPhone}`);
      
    } catch (twilioError: any) {
      console.error('Failed to send SMS:', twilioError);
      
      // Clean up verification data since SMS failed
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: null,
          verification_expires: null,
          payment_verification_active: null,
        })
        .eq('id', subscriberId);
        
      return NextResponse.json(
        { error: 'Failed to send verification code. Please check your phone number.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent'
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}