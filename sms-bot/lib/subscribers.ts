import { supabase, SMSSubscriber } from './supabase.js';

/**
 * Normalize a phone number to E.164 format
 * Especially important for handling Twilio webhook phone numbers
 */
export function normalizePhoneNumber(phoneNumber: string): string {
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
    // Return as is - if from Twilio, should already be in correct format
    return phoneNumber;
  }
}

/**
 * Get all active subscribers
 */
export async function getActiveSubscribers(): Promise<SMSSubscriber[]> {
  const { data, error } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('consent_given', true)
    .eq('unsubscribed', false);
    
  if (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get a single subscriber by phone number
 */
export async function getSubscriber(phoneNumber: string): Promise<SMSSubscriber | null> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedNumber)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // Error code for no rows returned
        return null;
      }
      console.error('Error fetching subscriber:', error);
      return null;
    }
    
    return data as SMSSubscriber;
  } catch (error) {
    console.error('Error in getSubscriber:', error);
    return null;
  }
}

/**
 * Unsubscribe a user by phone number
 */
export async function unsubscribeUser(phoneNumber: string): Promise<boolean> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ unsubscribed: true })
      .eq('phone_number', normalizedNumber);
    
    if (error) {
      console.error('Error unsubscribing user:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in unsubscribeUser:', error);
    return false;
  }
}

/**
 * Resubscribe a user who previously unsubscribed
 */
export async function resubscribeUser(phoneNumber: string): Promise<boolean> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ 
        unsubscribed: false,
        opt_in_date: new Date().toISOString()
      })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error resubscribing user:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in resubscribeUser:', error);
    return false;
  }
}

/**
 * Update the last_message_date for a subscriber
 */
export async function updateLastMessageDate(phoneNumber: string): Promise<void> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ last_message_date: new Date().toISOString() })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error updating last message date:', error);
    }
  } catch (error) {
    console.error('Error in updateLastMessageDate:', error);
  }
}

/**
 * Confirm a subscriber who replied YES to the confirmation message
 */
export async function confirmSubscriber(phoneNumber: string): Promise<boolean> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if the subscriber exists and is unconfirmed
    const { data, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedNumber)
      .single();
      
    if (fetchError) {
      console.error('Error fetching subscriber for confirmation:', fetchError);
      return false;
    }
    
    // If they're already confirmed, no need to update
    if (data && data.confirmed) {
      return true;
    }
    
    // Update confirmation status
    const { error } = await supabase
      .from('sms_subscribers')
      .update({
        confirmed: true,
        last_message_date: new Date().toISOString()
      })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error confirming subscriber:', error);
      return false;
    }
    
    console.log(`Successfully confirmed subscriber: ${normalizedNumber}`);
    return true;
  } catch (error) {
    console.error('Error in confirmSubscriber:', error);
    return false;
  }
}
