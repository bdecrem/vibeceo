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
    
    // Get current user's record
    console.log(`[LinkPhone] Looking up user with supabase_id: ${user_id}`);
    const { data: currentUser, error: lookupError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', user_id)
      .single();
      
    if (!currentUser || lookupError) {
      console.log(`[LinkPhone] User lookup failed:`, lookupError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[LinkPhone] Found user: ${currentUser.email}, phone: ${currentUser.phone_number}, slug: ${currentUser.slug}`);
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // SIMPLE CHECK 1: Does this user already have a REAL phone (not placeholder)?
    // Debug: log the current phone to understand format
    console.log(`[LinkPhone] Checking if can link. Current phone: "${currentUser.phone_number}", type: ${typeof currentUser.phone_number}`);
    
    // Check if it's a fake/placeholder phone number (555 numbers)
    // ALL fake numbers start with +1555 (followed by any digit 0-9)
    const isPlaceholderPhone = !currentUser.phone_number || 
                                currentUser.phone_number.startsWith('+1555');
    
    console.log(`[LinkPhone] Phone validation:`);
    console.log(`  - Current phone: ${currentUser.phone_number}`);
    console.log(`  - Starts with +1555: ${currentUser.phone_number?.startsWith('+1555')}`);
    console.log(`  - Is placeholder: ${isPlaceholderPhone}`);
    
    if (currentUser.phone_number && !isPlaceholderPhone) {
      console.log(`[LinkPhone] ERROR: Rejecting because user already has real phone`);
      return NextResponse.json(
        { error: 'You already have a phone number linked to your account' },
        { status: 400 }
      );
    }
    console.log(`[LinkPhone] SUCCESS: Phone check passed, can proceed with linking`);
    
    // SIMPLE CHECK 2: Does this phone exist anywhere in our system?
    const { data: existingPhone } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (existingPhone) {
      // PHASE 2: Phone exists - prepare for merge
      console.log(`[LinkPhone] Phone ${normalizedPhone} already exists for user ${existingPhone.slug}`);
      
      // Generate a real 6-digit verification code for SMS
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Get app counts for both accounts
      const { count: existingPhoneApps } = await supabase
        .from('wtaf_content')
        .select('*', { count: 'exact', head: true })
        .eq('user_slug', existingPhone.slug);
        
      const { count: currentUserApps } = await supabase
        .from('wtaf_content')
        .select('*', { count: 'exact', head: true })
        .eq('user_slug', currentUser.slug);
      
      // Determine which account is older
      const phoneDate = new Date(existingPhone.created_at);
      const webDate = new Date(currentUser.created_at);
      const survivingSlug = phoneDate < webDate ? existingPhone.slug : currentUser.slug;
      
      // Store the verification code and phone - we'll detect merge in verify by checking if phone exists elsewhere
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update({
          verification_code: verificationCode,  // Real 6-digit code
          verification_expires: expiresAt.toISOString(),
          pending_phone_number: normalizedPhone
        })
        .eq('id', currentUser.id);
        
      if (updateError) {
        console.error('Failed to store merge info:', updateError);
        return NextResponse.json(
          { error: 'Failed to prepare account merge' },
          { status: 500 }
        );
      }
      
      // Send SMS verification code for merge
      try {
        const twilioClient = getTwilioClient();
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!fromNumber) {
          throw new Error('Missing Twilio phone number');
        }
        
        await twilioClient.messages.create({
          body: `Your WEBTOYS verification code is: ${verificationCode}\n\nThis will merge your accounts.`,
          from: fromNumber,
          to: normalizedPhone
        });
        
        console.log(`[LinkPhone] Sent merge verification code ${verificationCode} to ${normalizedPhone}`);
        
      } catch (twilioError: any) {
        console.error('Failed to send SMS:', twilioError);
        
        // Clean up verification data since SMS failed
        await supabase
          .from('sms_subscribers')
          .update({
            verification_code: null,
            verification_expires: null,
            pending_phone_number: null
          })
          .eq('id', currentUser.id);
          
        return NextResponse.json(
          { error: 'Failed to send verification code. Please check your phone number.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        merge_required: true,
        merge_info: {
          phone_account: `@${existingPhone.slug} (${phoneDate.toLocaleDateString()}, ${existingPhoneApps || 0} apps)`,
          web_account: `@${currentUser.slug} (${webDate.toLocaleDateString()}, ${currentUserApps || 0} apps)`,
          surviving_account: `@${survivingSlug}`,
          message: `This phone belongs to @${existingPhone.slug}. We'll merge everything into @${survivingSlug} (the older account). Check your SMS for the verification code.`
        }
      });
    }
      
    // PHASE 1: Phone doesn't exist - proceed with simple verification
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store verification info on the current user's record
    const { error: updateError } = await supabase
      .from('sms_subscribers')
      .update({
        verification_code: verificationCode,
        verification_expires: expiresAt.toISOString(),
        pending_phone_number: normalizedPhone
      })
      .eq('id', currentUser.id);
    
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
        body: `Your WEBTOYS verification code is: ${verificationCode}`,
        from: fromNumber,
        to: normalizedPhone
      });
      
      console.log(`[LinkPhone] Sent code ${verificationCode} to ${normalizedPhone} for user ${currentUser.slug}`);
      
    } catch (twilioError: any) {
      console.error('Failed to send SMS:', twilioError);
      
      // Clean up verification data since SMS failed
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: null,
          verification_expires: null,
          pending_phone_number: null
        })
        .eq('id', currentUser.id);
        
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