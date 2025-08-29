const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployFixedFixitBoard() {
    try {
        console.log('🚀 Deploying fixed Fixit Board to Supabase...');
        
        const fixedFilePath = path.join(__dirname, 'FIXED-FIXIT-BOARD.html');
        const htmlContent = fs.readFileSync(fixedFilePath, 'utf8');
        
        console.log('📁 Read fixed HTML file, length:', htmlContent.length);
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .select();
        
        if (error) {
            console.error('❌ Supabase update failed:', error);
            process.exit(1);
        }
        
        if (!data || data.length === 0) {
            console.error('❌ No records updated - check if public/toybox-issue-tracker exists');
            process.exit(1);
        }
        
        console.log('✅ Fixed Fixit Board deployed to Supabase successfully!');
        console.log('📊 Records updated:', data.length);
        console.log('');
        console.log('🎯 KEY FIXES APPLIED:');
        console.log('   ✓ Changed user.username → user.handle');
        console.log('   ✓ Added comprehensive auth debug logging');
        console.log('   ✓ Added fallback auth request for timing issues');
        console.log('   ✓ Improved error handling and user feedback');
        console.log('');
        console.log('🧪 TEST NOW:');
        console.log('   1. Open: https://webtoys.ai/public/toybox-os');
        console.log('   2. Login as "bart" with PIN "1234"');
        console.log('   3. Open Fixit Board app');
        console.log('   4. Should see "⚡ BART Admin Mode Active" message');
        console.log('   5. Press Ctrl+D for debug panel if needed');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

deployFixedFixitBoard();