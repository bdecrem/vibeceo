import { supabase } from './supabase.js';
import { normalizePhoneNumber } from './subscribers.js';

export interface CreditCheckResult {
  hasCredits: boolean;
  creditsRemaining: number;
  message?: string;
}

/**
 * Check if a user has credits available for app creation
 */
export async function checkCredits(phoneNumber: string): Promise<CreditCheckResult> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    const { data: subscriber, error } = await supabase
      .from('sms_subscribers')
      .select('credits_remaining, usage_count, role')
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (error || !subscriber) {
      // No subscriber found - they need to buy credits first
      return {
        hasCredits: false,
        creditsRemaining: 0,
        message: "🚨 You need credits to create apps! Visit https://webtoys.ai/payments to buy $10 credits and start building via SMS."
      };
    }
    
    // Special roles get unlimited access
    if (subscriber.role === 'OPERATOR' || subscriber.role === 'ADMIN' || subscriber.role === 'admin') {
      return {
        hasCredits: true,
        creditsRemaining: 999999 // Show as unlimited
      };
    }
    
    const creditsRemaining = subscriber.credits_remaining || 0;
    
    if (creditsRemaining <= 0) {
      return {
        hasCredits: false,
        creditsRemaining: 0,
        message: `💳 Out of credits! You've created ${subscriber.usage_count || 0} apps. Buy more credits at https://webtoys.ai/payments to keep building.`
      };
    }
    
    return {
      hasCredits: true,
      creditsRemaining: creditsRemaining
    };
    
  } catch (error) {
    console.error('Error checking credits:', error);
    // On error, allow the request to proceed but log the issue
    return {
      hasCredits: true,
      creditsRemaining: 0,
      message: "Credit check failed, proceeding anyway"
    };
  }
}

/**
 * Deduct one credit from a user's account and increment usage count
 */
export async function deductCredit(phoneNumber: string): Promise<boolean> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    const { data: subscriber, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('id, credits_remaining, usage_count, role')
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (fetchError || !subscriber) {
      console.error('Failed to fetch subscriber for credit deduction:', fetchError);
      return false;
    }
    
    // Special roles don't have credits deducted
    if (subscriber.role === 'OPERATOR' || subscriber.role === 'ADMIN' || subscriber.role === 'admin') {
      console.log(`Credit deduction skipped for ${subscriber.role}: ${normalizedPhone}`);
      return true;
    }
    
    const newCredits = Math.max(0, (subscriber.credits_remaining || 0) - 1);
    const newUsageCount = (subscriber.usage_count || 0) + 1;
    
    const { error: updateError } = await supabase
      .from('sms_subscribers')
      .update({
        credits_remaining: newCredits,
        usage_count: newUsageCount,
        last_usage_date: new Date().toISOString()
      })
      .eq('id', subscriber.id);
      
    if (updateError) {
      console.error('Failed to deduct credit:', updateError);
      return false;
    }
    
    console.log(`Credit deducted for ${normalizedPhone}: ${subscriber.credits_remaining} -> ${newCredits} (usage: ${newUsageCount})`);
    return true;
    
  } catch (error) {
    console.error('Error deducting credit:', error);
    return false;
  }
}

/**
 * Get current credit balance for a user
 */
export async function getCreditsBalance(phoneNumber: string): Promise<{ credits: number; usage: number }> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    const { data: subscriber, error } = await supabase
      .from('sms_subscribers')
      .select('credits_remaining, usage_count, role')
      .eq('phone_number', normalizedPhone)
      .single();
      
    if (error || !subscriber) {
      return { credits: 0, usage: 0 };
    }
    
    // Special roles show unlimited credits
    if (subscriber.role === 'OPERATOR' || subscriber.role === 'ADMIN' || subscriber.role === 'admin') {
      return { credits: 999999, usage: subscriber.usage_count || 0 };
    }
    
    return { 
      credits: subscriber.credits_remaining || 0, 
      usage: subscriber.usage_count || 0 
    };
    
  } catch (error) {
    console.error('Error getting credits balance:', error);
    return { credits: 0, usage: 0 };
  }
}