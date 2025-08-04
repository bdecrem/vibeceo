const { createClient } = require('@supabase/supabase-js');
const config = require('./sms-bot/dist/engine/shared/config.js');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

async function findPhoneVerificationIssue() {
    console.log('🔍 Finding root cause of phone verification issue...\n');
    
    try {
        const testPhone = '+15558037911';
        console.log(`Testing with phone number: ${testPhone}`);
        
        // Check if phone exists
        const { data: allPhoneRecords } = await supabase
            .from('sms_subscribers')
            .select('*')
            .eq('phone_number', testPhone);
            
        console.log(`📞 All records with phone ${testPhone}:`, allPhoneRecords?.length || 0);
        allPhoneRecords?.forEach((record, i) => {
            console.log(`  Record ${i + 1}:`);
            console.log(`    ID: ${record.id}`);
            console.log(`    Slug: ${record.slug || 'NULL'}`);
            console.log(`    Supabase ID: ${record.supabase_id || 'NULL'}`);
            console.log(`    Verification Code: ${record.verification_code || 'NULL'}`);
            console.log(`    Verification Expires: ${record.verification_expires || 'NULL'}`);
            console.log(`    Confirmed: ${record.confirmed}`);
            console.log(`    Consent Given: ${record.consent_given}`);
            console.log('');
        });
        
        // Check for records WITH verification codes
        const { data: verificationRecords } = await supabase
            .from('sms_subscribers')
            .select('*')
            .eq('phone_number', testPhone)
            .not('verification_code', 'is', null);
            
        console.log(`🔐 Records with verification codes for ${testPhone}:`, verificationRecords?.length || 0);
        
        // The problem analysis
        const hasPhone = allPhoneRecords && allPhoneRecords.length > 0;
        const hasVerification = verificationRecords && verificationRecords.length > 0;
        
        if (hasPhone && !hasVerification) {
            console.log('\n🚨 ISSUE IDENTIFIED:');
            console.log('- Phone number exists in database');
            console.log('- But has NO verification code set');
            console.log('- The verify-link API requires a verification code to proceed');
            console.log('- This suggests the phone linking flow is broken\n');
            
            console.log('💡 LIKELY CAUSES:');
            console.log('1. Phone numbers were added via SMS bot (normal flow) and never went through web verification');
            console.log('2. Verification codes are being cleared/not set properly in link-phone API');
            console.log('3. Old records that predate the verification system');
        }
        
        // Check account types
        const { data: webOnlyAccounts } = await supabase
            .from('sms_subscribers')
            .select('*')
            .not('supabase_id', 'is', null)
            .is('phone_number', null);
            
        const { data: phoneOnlyAccounts } = await supabase
            .from('sms_subscribers')
            .select('*')
            .not('phone_number', 'is', null)
            .is('supabase_id', null);
            
        console.log(`\n🌐 Web-only accounts (have supabase_id but no phone): ${webOnlyAccounts?.length || 0}`);
        webOnlyAccounts?.forEach((record, i) => {
            console.log(`  ${i + 1}. Slug: ${record.slug || 'NULL'}, Supabase ID: ${record.supabase_id}`);
        });
        
        console.log(`\n📱 Phone-only accounts (have phone but no supabase_id): ${phoneOnlyAccounts?.length || 0}`);
        phoneOnlyAccounts?.forEach((record, i) => {
            console.log(`  ${i + 1}. Phone: ${record.phone_number}, Slug: ${record.slug || 'NULL'}`);
        });
        
        // Summary
        console.log('\n📊 SUMMARY:');
        console.log(`- Total web-only accounts: ${webOnlyAccounts?.length || 0}`);
        console.log(`- Total phone-only accounts: ${phoneOnlyAccounts?.length || 0}`);
        console.log(`- Test phone has record: ${hasPhone ? 'YES' : 'NO'}`);
        console.log(`- Test phone has verification code: ${hasVerification ? 'YES' : 'NO'}`);
        
        if (hasPhone && !hasVerification) {
            console.log('\n🔧 RECOMMENDED FIX:');
            console.log('The verify-link API should handle cases where a phone exists but has no verification code.');
            console.log('This could happen when:');
            console.log('1. User created account via SMS first (common flow)');
            console.log('2. User later tries to link their web account');
            console.log('3. But the phone record has no verification code set');
            console.log('\nSolution: Modify verify-link API to either:');
            console.log('A) Allow linking without verification for existing phone records, OR');
            console.log('B) First call link-phone API to set verification code, then verify');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

findPhoneVerificationIssue().then(() => process.exit(0)).catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});