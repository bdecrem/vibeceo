import { supabase } from './supabase.js';
import { normalizePhoneNumber } from './subscribers.js';

export interface CreditCheckResult {
  hasCredits: boolean;
  creditsRemaining: number;
  message?: string;
}

/**
 * Check if a user has credits available for app creation
 * PAYWALL DISABLED: Everyone gets 200 free apps
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
      // No subscriber found - create one with free credits
      console.log(`🎉 New user ${normalizedPhone} - granting 200 free credits`);

      // Try to create a new subscriber with free credits
      const { error: createError } = await supabase
        .from('sms_subscribers')
        .insert({
          phone_number: normalizedPhone,
          credits_remaining: 200,
          usage_count: 0,
          created_at: new Date().toISOString()
        });

      if (!createError) {
        return {
          hasCredits: true,
          creditsRemaining: 200,
          message: "🎉 Welcome! You have 200 free app credits!"
        };
      }

      // If creation fails, still allow access (Poke integration, etc.)
      return {
        hasCredits: true,
        creditsRemaining: 200,
        message: "Free access granted!"
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

    // If user has 0 credits, give them 200 free credits
    if (creditsRemaining <= 0) {
      console.log(`🎁 Granting 200 free credits to ${normalizedPhone} (was at 0)`);

      // Update their credits to 200
      await supabase
        .from('sms_subscribers')
        .update({
          credits_remaining: 200
        })
        .eq('phone_number', normalizedPhone);

      return {
        hasCredits: true,
        creditsRemaining: 200,
        message: `🎁 You've been granted 200 free app credits! Happy building!`
      };
    }

    return {
      hasCredits: true,
      creditsRemaining: creditsRemaining
    };

  } catch (error) {
    console.error('Error checking credits:', error);
    // On error, allow the request to proceed
    return {
      hasCredits: true,
      creditsRemaining: 200,
      message: "Free access granted!"
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
 * PAYWALL DISABLED: Shows 200 free credits for new/zero-credit users
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
      // New users get 200 free credits
      return { credits: 200, usage: 0 };
    }

    // Special roles show unlimited credits
    if (subscriber.role === 'OPERATOR' || subscriber.role === 'ADMIN' || subscriber.role === 'admin') {
      return { credits: 999999, usage: subscriber.usage_count || 0 };
    }

    // If user has 0 credits, show them as having 200 (they'll get them on next check)
    const credits = subscriber.credits_remaining || 0;
    if (credits <= 0) {
      return { credits: 200, usage: subscriber.usage_count || 0 };
    }

    return {
      credits: credits,
      usage: subscriber.usage_count || 0
    };

  } catch (error) {
    console.error('Error getting credits balance:', error);
    return { credits: 200, usage: 0 };
  }
}