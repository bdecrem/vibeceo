import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: './.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function updateHabitUser() {
    console.log('🎯 Updating habit tracker user...');
    
    const APP_ID = 'test11';
    const oldUserLabel = 'user1🎯';
    const newUserLabel = 'sebrina🎯';
    const newPasscode = '0000';
    
    try {
        // First, find the user record
        const { data: users, error: findError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', APP_ID)
            .eq('action_type', 'join')
            .eq('participant_data->>userLabel', oldUserLabel);
        
        if (findError) {
            console.error('❌ Error finding user:', findError);
            return;
        }
        
        if (!users || users.length === 0) {
            console.log('⚠️  User "goal1🎯" not found. Available users:');
            
            // Show all users
            const { data: allUsers } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('participant_data')
                .eq('app_id', APP_ID)
                .eq('action_type', 'join');
            
            allUsers?.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.participant_data?.userLabel} (passcode: ${user.participant_data?.passcode})`);
            });
            return;
        }
        
        const userRecord = users[0];
        console.log(`📝 Found user: ${userRecord.participant_data?.userLabel}`);
        
        // Update the user record
        const { error: updateError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({
                participant_data: {
                    ...userRecord.participant_data,
                    userLabel: newUserLabel,
                    passcode: newPasscode
                }
            })
            .eq('id', userRecord.id);
        
        if (updateError) {
            console.error('❌ Error updating user:', updateError);
            return;
        }
        
        console.log('✅ User updated successfully!');
        console.log(`   Old: ${oldUserLabel} → New: ${newUserLabel}`);
        console.log(`   Passcode: ${newPasscode}`);
        
        // Also update any related records (goals, progress, achievements)
        console.log('🔄 Updating related records...');
        
        // Update participant_data in all records for this user
        const { error: updateAllError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({
                participant_data: supabase.rpc('jsonb_set', {
                    target: supabase.rpc('participant_data'),
                    path: '{userLabel}',
                    new_value: `"${newUserLabel}"`
                })
            })
            .eq('app_id', APP_ID)
            .eq('participant_id', userRecord.participant_id);
        
        // Simpler approach - get all records and update them
        const { data: allRecords } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', APP_ID)
            .eq('participant_id', userRecord.participant_id);
        
        if (allRecords) {
            for (const record of allRecords) {
                if (record.participant_data?.userLabel === oldUserLabel) {
                    await supabase
                        .from('wtaf_zero_admin_collaborative')
                        .update({
                            participant_data: {
                                ...record.participant_data,
                                userLabel: newUserLabel
                            }
                        })
                        .eq('id', record.id);
                }
            }
        }
        
        console.log('✅ All related records updated!');
        console.log('\n🎉 sebrina🎯 can now login with passcode 0000');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the script
updateHabitUser().catch(console.error); 