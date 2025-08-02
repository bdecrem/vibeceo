import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { phone_number, verification_code, user_id } = await req.json();
    
    if (!phone_number || !verification_code || !user_id) {
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
    
    // Get current user's subscriber record
    const { data: currentSubscriber } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', user_id)
      .single();
    
    if (!currentSubscriber) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // Check verification code
    const { data: phoneSubscriber } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    if (!phoneSubscriber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // Verify code and expiration
    if (phoneSubscriber.verification_code !== verification_code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }
    
    if (phoneSubscriber.verification_expires && new Date(phoneSubscriber.verification_expires) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }
    
    // Now handle the linking logic
    let merged = false;
    let finalSlug = currentSubscriber.slug;
    let finalRole = currentSubscriber.role || 'coder';
    let appCount = 0;
    
    if (phoneSubscriber.supabase_id && phoneSubscriber.supabase_id !== user_id) {
      // Phone number belongs to a different account - merge them
      merged = true;
      
      // Determine which account is older
      const currentDate = new Date(currentSubscriber.created_at);
      const phoneDate = new Date(phoneSubscriber.created_at);
      
      if (phoneDate < currentDate) {
        // Phone account is older - keep its slug and role
        finalSlug = phoneSubscriber.slug;
        finalRole = phoneSubscriber.role || currentSubscriber.role || 'coder';
        
        // Transfer all content from current account to phone account
        await supabase
          .from('wtaf_content')
          .update({ user_slug: phoneSubscriber.slug })
          .eq('user_slug', currentSubscriber.slug);
        
        // Update phone account with supabase_id
        await supabase
          .from('sms_subscribers')
          .update({
            supabase_id: user_id,
            email: user.email,
            verification_code: null,
            verification_expires: null,
            confirmed: true,
            consent_given: true
          })
          .eq('phone_number', normalizedPhone);
        
        // Delete the current web-only account
        await supabase
          .from('sms_subscribers')
          .delete()
          .eq('supabase_id', user_id)
          .neq('phone_number', normalizedPhone);
        
      } else {
        // Current account is older - update it with phone number
        finalSlug = currentSubscriber.slug;
        finalRole = currentSubscriber.role || phoneSubscriber.role || 'coder';
        
        // Transfer all content from phone account to current account
        await supabase
          .from('wtaf_content')
          .update({ user_slug: currentSubscriber.slug })
          .eq('user_slug', phoneSubscriber.slug);
        
        // Update current account with phone number
        await supabase
          .from('sms_subscribers')
          .update({
            phone_number: normalizedPhone,
            verification_code: null,
            verification_expires: null,
            confirmed: true,
            consent_given: true,
            role: finalRole
          })
          .eq('supabase_id', user_id);
        
        // Delete the old phone-only account
        await supabase
          .from('sms_subscribers')
          .delete()
          .eq('phone_number', normalizedPhone)
          .neq('supabase_id', user_id);
      }
      
    } else if (!phoneSubscriber.supabase_id) {
      // Phone number exists but not linked - update current account
      await supabase
        .from('sms_subscribers')
        .update({
          phone_number: normalizedPhone,
          verification_code: null,
          verification_expires: null,
          confirmed: true,
          consent_given: true
        })
        .eq('supabase_id', user_id);
      
      // Delete the pending phone record
      await supabase
        .from('sms_subscribers')
        .delete()
        .eq('phone_number', normalizedPhone)
        .is('supabase_id', null);
        
    } else {
      // Phone already belongs to this account
      await supabase
        .from('sms_subscribers')
        .update({
          verification_code: null,
          verification_expires: null,
          confirmed: true,
          consent_given: true
        })
        .eq('phone_number', normalizedPhone);
    }
    
    // Get app count
    const { count } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_slug', finalSlug);
    
    appCount = count || 0;
    
    return NextResponse.json({
      success: true,
      merged,
      slug: finalSlug,
      role: finalRole,
      app_count: appCount
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}