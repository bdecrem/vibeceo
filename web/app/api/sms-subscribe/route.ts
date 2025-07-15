import { NextResponse } from 'next/server';
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

/**
 * Normalize a US phone number to E.164 format
 * Converts formats like (650) 898-9508, 650-898-9508, 6508989508 to +16508989508
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Handle case where user included country code with + or without
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Already has country code, just add the +
    return `+${digitsOnly}`;
  } else if (digitsOnly.length === 10) {
    // Standard 10-digit US number, add +1
    return `+1${digitsOnly}`;
  } else {
    // Return original with + if it looks like it might be international
    // or already correctly formatted
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    } else if (phoneNumber.startsWith('1') && phoneNumber.length > 10) {
      return `+${phoneNumber}`;
    }
    // Otherwise just return as is and let validation handle it
    return phoneNumber;
  }
}

export async function POST(request: Request) {
  try {
    const { phoneNumber: rawPhoneNumber, consentGiven } = await request.json();
    
    // Basic validation
    if (!rawPhoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' }, 
        { status: 400 }
      );
    }
    
    if (!consentGiven) {
      return NextResponse.json(
        { success: false, message: 'Consent is required' },
        { status: 400 }
      );
    }
    
    // Normalize phone number to E.164 format
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
    
    // Validate phone number format (E.164 for US)
    // US numbers should be +1 followed by 10 digits
    if (!/^\+1\d{10}$/.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid US phone number' },
        { status: 400 }
      );
    }
    
    console.log(`Processing subscription for normalized number: ${phoneNumber}`);
    
    // Check if phone number already exists
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
      
    if (existing) {
      // If already subscribed
      if (!existing.unsubscribed) {
        return NextResponse.json(
          { success: true, message: 'You are already subscribed' },
          { status: 200 }
        );
      }
      
      // If previously unsubscribed, resubscribe them but require confirmation again
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update({
          unsubscribed: false,
          consent_given: true,
          confirmed: false, // Require confirmation again
          opt_in_date: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber);
        
      if (updateError) {
        console.error('Error resubscribing user:', updateError);
        return NextResponse.json(
          { success: false, message: `Database error: ${updateError.message}`, details: updateError },
          { status: 500 }
        );
      }
      
      // Send confirmation SMS for resubscription
      try {
        const twilioClient = getTwilioClient();
        const confirmationMessage = 
          "Welcome back to The Foundry! 🚀\n\n" +
          "Reply YES to confirm your resubscription to daily startup chaos via SMS.\n\n" +
          "Standard msg & data rates may apply. Reply STOP to unsubscribe.";

        const message = await twilioClient.messages.create({
          body: confirmationMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });

        console.log(`Resubscription confirmation SMS sent to ${phoneNumber}, SID: ${message.sid}`);
      } catch (smsError) {
        console.error('Error sending resubscription confirmation SMS:', smsError);
        // Don't fail the whole request if SMS fails, just log the error
      }

      return NextResponse.json(
        { success: true, message: 'You have been successfully resubscribed! Please check your phone for a confirmation message.' },
        { status: 200 }
      );
    }
    
    // Add new subscriber with normalized phone number as unconfirmed
    const { error: insertError } = await supabase
      .from('sms_subscribers')
      .insert({
        phone_number: phoneNumber, // Using normalized E.164 format
        consent_given: consentGiven,
        opt_in_date: new Date().toISOString(),
        unsubscribed: false,
        confirmed: false, // Require SMS confirmation
        role: 'coder' // Set valid role for SMS subscriptions
      });
      
    if (insertError) {
      console.error('Error subscribing user:', insertError);
      return NextResponse.json(
        { success: false, message: `Database error: ${insertError.message}`, details: insertError },
        { status: 500 }
      );
    }

    // Send confirmation SMS
    try {
      const twilioClient = getTwilioClient();
      const confirmationMessage = 
        "Welcome to The Foundry! 🚀\n\n" +
        "Reply YES to confirm your subscription to daily startup chaos via SMS.\n\n" +
        "Standard msg & data rates may apply. Reply STOP to unsubscribe.";

      const message = await twilioClient.messages.create({
        body: confirmationMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`Confirmation SMS sent to ${phoneNumber}, SID: ${message.sid}`);
    } catch (smsError) {
      console.error('Error sending confirmation SMS:', smsError);
      // Don't fail the whole request if SMS fails, just log the error
      // The user is still subscribed in the database
    }

    return NextResponse.json(
      { success: true, message: 'You have been successfully subscribed! Please check your phone for a confirmation message.' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in SMS subscription API:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error instanceof Error ? error.message : String(error)}`, details: error },
      { status: 500 }
    );
  }
}
