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
 * @param phoneNumber The phone number of the subscriber
 * @param date Optional custom date to set as last_message_date, defaults to current time
 */
export async function updateLastMessageDate(phoneNumber: string, date: Date = new Date()): Promise<void> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ last_message_date: date.toISOString() })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error updating last message date:', error);
    }
  } catch (error) {
    console.error('Error in updateLastMessageDate:', error);
  }
}

/**
 * Update the last_inspiration_date for a subscriber
 * This tracks when the last daily inspiration was sent, separately from regular chat messages
 * @param phoneNumber The phone number of the subscriber
 * @param date Optional custom date to set as last_inspiration_date, defaults to current time
 */
export async function updateLastInspirationDate(phoneNumber: string, date: Date = new Date()): Promise<void> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ last_inspiration_date: date.toISOString() })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error updating last inspiration date:', error);
    }
  } catch (error) {
    console.error('Error in updateLastInspirationDate:', error);
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

/**
 * Create a new subscriber in the database
 * Used when someone texts START to sign up for the first time
 */
export async function createNewSubscriber(phoneNumber: string): Promise<boolean> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if subscriber already exists
    const existingSubscriber = await getSubscriber(normalizedNumber);
    if (existingSubscriber) {
      console.log(`Subscriber ${normalizedNumber} already exists`);
      return false;
    }
    
    // Generate a unique slug for this user
    const { uniqueNamesGenerator, adjectives, animals } = await import('unique-names-generator');
    const slug = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: '',
      style: 'lowerCase'
    });
    
    // Create new subscriber record
    const { error } = await supabase
      .from('sms_subscribers')
      .insert({
        phone_number: normalizedNumber,
        opt_in_date: new Date().toISOString(),
        consent_given: true,
        confirmed: false, // Will be set to true when they reply YES
        unsubscribed: false,
        is_admin: false,
        role: 'coder',
        slug: slug,
        ai_daily_subscribed: false
      });
      
    if (error) {
      console.error('Error creating new subscriber:', error);
      return false;
    }
    
    console.log(`Successfully created new subscriber: ${normalizedNumber} with slug: ${slug}`);
    return true;
  } catch (error) {
    console.error('Error in createNewSubscriber:', error);
    return false;
  }
}

export async function setAiDailySubscription(phoneNumber: string, subscribed: boolean): Promise<boolean> {
  try {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);

    const updates: Record<string, unknown> = {
      ai_daily_subscribed: subscribed
    };

    if (!subscribed) {
      updates.ai_daily_last_sent_at = null;
    }

    const { error } = await supabase
      .from('sms_subscribers')
      .update(updates)
      .eq('phone_number', normalizedNumber);

    if (error) {
      console.error('Error updating AI Daily subscription:', error);
      return false;
    }

    console.log(`Updated AI Daily subscription for ${normalizedNumber}: ${subscribed}`);
    return true;
  } catch (error) {
    console.error('Error in setAiDailySubscription:', error);
    return false;
  }
}

export async function getAiDailySubscribers(): Promise<SMSSubscriber[]> {
  const { data, error } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('ai_daily_subscribed', true)
    .eq('consent_given', true)
    .eq('unsubscribed', false);

  if (error) {
    console.error('Error fetching AI Daily subscribers:', error);
    return [];
  }

  return data || [];
}

export async function updateAiDailyLastSent(phoneNumber: string, date: Date = new Date()): Promise<void> {
  try {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);

    const { error } = await supabase
      .from('sms_subscribers')
      .update({ ai_daily_last_sent_at: date.toISOString() })
      .eq('phone_number', normalizedNumber);

    if (error) {
      console.error('Error updating AI Daily last sent timestamp:', error);
    }
  } catch (error) {
    console.error('Error in updateAiDailyLastSent:', error);
  }
}

/**
 * Set the hide_default setting for a subscriber
 * @param phoneNumber The phone number of the subscriber
 * @param hideDefault Boolean value - true to hide pages by default, false to show them
 */
export async function setHideDefault(phoneNumber: string, hideDefault: boolean): Promise<boolean> {
  try {
    // Normalize the phone number first
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ hide_default: hideDefault })
      .eq('phone_number', normalizedNumber);
      
    if (error) {
      console.error('Error updating hide_default:', error);
      return false;
    }
    
    console.log(`Successfully updated hide_default=${hideDefault} for subscriber: ${normalizedNumber}`);
    return true;
  } catch (error) {
    console.error('Error in setHideDefault:', error);
    return false;
  }
}

/**
 * Get the hide_default setting for a subscriber
 * @param phoneNumber The phone number of the subscriber
 * @returns Boolean value or null if subscriber not found
 */
export async function getHideDefault(phoneNumber: string): Promise<boolean | null> {
  try {
    const subscriber = await getSubscriber(phoneNumber);
    return subscriber ? (subscriber.hide_default || false) : null;
  } catch (error) {
    console.error('Error in getHideDefault:', error);
    return null;
  }
}
