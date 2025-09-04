#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBartUser() {
    try {
        console.log('🔄 Updating BART_1101 to bart_1102...');
        
        // First, check if the old user exists
        const { data: oldUser, error: fetchError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'desktop-auth')
            .eq('participant_id', 'BART_1101')
            .single();
            
        if (fetchError || !oldUser) {
            console.error('❌ User BART_1101 not found:', fetchError);
            return;
        }
        
        console.log('✅ Found user BART_1101');
        console.log('📝 Current data:', oldUser.content_data);
        
        // Create updated user data with lowercase and new PIN
        const updatedData = {
            ...oldUser.content_data,
            handle: 'bart',
            display_name: 'Bart',
            pin: '1102',
            participantId: 'bart_1102',
            id: 'bart'
        };
        
        // Delete old record (since participant_id is part of the key)
        const { error: deleteError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .delete()
            .eq('app_id', 'desktop-auth')
            .eq('participant_id', 'BART_1101');
            
        if (deleteError) {
            console.error('❌ Failed to delete old user:', deleteError);
            return;
        }
        
        console.log('✅ Deleted old BART_1101 record');
        
        // Insert new record with lowercase participant_id
        const { error: insertError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .insert({
                app_id: 'desktop-auth',
                participant_id: 'bart_1102',
                action_type: 'register',
                content_data: updatedData,
                participant_data: {},
                created_at: oldUser.created_at // Preserve original creation time
            });
            
        if (insertError) {
            console.error('❌ Failed to insert new user:', insertError);
            return;
        }
        
        console.log('✅ Created new bart_1102 record');
        console.log('📋 New user details:');
        console.log('   - participant_id: bart_1102');
        console.log('   - handle: bart');
        console.log('   - display_name: Bart');
        console.log('   - pin: 1102');
        
        console.log('\n✨ User successfully migrated from BART_1101 to bart_1102!');
        console.log('🔑 You can now login with:');
        console.log('   Username: Bart (or bart, BART - case insensitive)');
        console.log('   PIN: 1102');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

updateBartUser().then(() => process.exit(0));