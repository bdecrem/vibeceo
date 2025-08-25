
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateFixitBoard() {
    try {
        const htmlContent = fs.readFileSync('/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/FIXED-FIXIT-BOARD.html', 'utf8');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) {
            console.error('❌ Supabase update failed:', error);
            process.exit(1);
        }
        
        console.log('✅ Fixed Fixit Board deployed to Supabase successfully!');
        console.log('🎯 The auth property mismatch has been fixed:');
        console.log('   - OLD: user.username (did not exist)');
        console.log('   - NEW: user.handle (correct ToyBox OS property)');
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

updateFixitBoard();
