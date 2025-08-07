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

export async function POST(req: NextRequest) {
  try {
    const { verification_code, user_id } = await req.json();
    
    if (!verification_code || !user_id) {
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
    const { data: currentUser } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', user_id)
      .single();
      
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check expiration first
    if (currentUser.verification_expires && new Date(currentUser.verification_expires) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }
    
    // Check if we have a pending phone number
    if (!currentUser.pending_phone_number) {
      return NextResponse.json({ error: 'No phone number pending verification' }, { status: 400 });
    }
    
    // Check if this is a merge operation (phone already exists for another user)
    const { data: existingPhone } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', currentUser.pending_phone_number)
      .neq('id', currentUser.id)  // Exclude current user
      .single();
    
    const isMerge = !!existingPhone;
    
    if (isMerge) {
      // Verify the code matches
      if (verification_code !== currentUser.verification_code) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }
      
      // Use the existing phone account we found
      const phoneAccount = existingPhone;
        
      if (!phoneAccount) {
        return NextResponse.json({ error: 'Phone account not found' }, { status: 404 });
      }
      
      // Determine which is older
      const phoneDate = new Date(phoneAccount.created_at);
      const webDate = new Date(currentUser.created_at);
      const survivingId = phoneDate < webDate ? phoneAccount.id : currentUser.id;
      const dyingId = phoneDate < webDate ? currentUser.id : phoneAccount.id;
      const survivingSlug = phoneDate < webDate ? phoneAccount.slug : currentUser.slug;
      const dyingSlug = phoneDate < webDate ? currentUser.slug : phoneAccount.slug;
      
      console.log(`[VerifyLink] Merging accounts: ${dyingSlug} -> ${survivingSlug}`);
      
      // Step 1: Migrate all apps from dying account to surviving account
      const { error: migrateError } = await supabase
        .from('wtaf_content')
        .update({ user_slug: survivingSlug })
        .eq('user_slug', dyingSlug);
        
      if (migrateError) {
        console.error('[VerifyLink] Failed to migrate apps:', migrateError);
        return NextResponse.json({ error: 'Failed to migrate apps' }, { status: 500 });
      }
      
      // Step 2: Delete the dying account FIRST (to free up the phone number if needed)
      const { error: deleteError } = await supabase
        .from('sms_subscribers')
        .delete()
        .eq('id', dyingId);
        
      if (deleteError) {
        console.error('[VerifyLink] Failed to delete old account:', deleteError);
        // Not critical - accounts might still work, just log it
      }
      
      // Step 3: Update surviving account with necessary fields
      const updates: any = {
        verification_code: null,
        verification_expires: null,
        pending_phone_number: null
      };
      
      // If web account is surviving, it needs the phone number
      if (survivingId === currentUser.id) {
        updates.phone_number = currentUser.pending_phone_number;
      }
      
      // If phone account is surviving, it needs the supabase_id and email
      if (survivingId === phoneAccount.id) {
        updates.supabase_id = currentUser.supabase_id;
        updates.email = currentUser.email;
      }
      
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update(updates)
        .eq('id', survivingId);
        
      if (updateError) {
        console.error('[VerifyLink] Failed to update surviving account:', updateError);
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
      }
      
      // Get final app count
      const { count } = await supabase
        .from('wtaf_content')
        .select('*', { count: 'exact', head: true })
        .eq('user_slug', survivingSlug);
      
      return NextResponse.json({
        success: true,
        merged: true,
        message: `Accounts merged! Everything is now under @${survivingSlug}`,
        surviving_slug: survivingSlug,
        total_apps: count || 0
      });
      
    } else {
      // PHASE 1: Simple phone number addition
      // Check verification code for normal flow
      if (!currentUser.verification_code || currentUser.verification_code !== verification_code) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update({
          phone_number: currentUser.pending_phone_number,
          verification_code: null,
          verification_expires: null,
          pending_phone_number: null
        })
        .eq('id', currentUser.id);
        
      if (updateError) {
        console.error('[VerifyLink] Failed to update user:', updateError);
        return NextResponse.json({ error: 'Failed to link phone number' }, { status: 500 });
      }
      
      console.log(`[VerifyLink] Successfully linked phone ${currentUser.pending_phone_number} to user ${currentUser.slug}`);
      
      return NextResponse.json({
        success: true,
        message: 'Phone number successfully linked to your account'
      });
    }
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}