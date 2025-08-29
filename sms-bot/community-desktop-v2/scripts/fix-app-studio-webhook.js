#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixAppStudioWebhook() {
    try {
        console.log('🔧 Fixing App Studio webhook URL...');
        
        // Get current App Studio content
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
            
        if (error) {
            throw new Error('Failed to fetch App Studio: ' + error.message);
        }
        
        let html = data.html_content;
        
        // Replace the old webhook URL with the correct one
        const oldWebhookURL = 'https://hook.us2.make.com/7h7vxk4hshkk1m9bgiqxq7bwqdbtjsrg';
        const newWebhookURL = 'https://webtoys-agents.ngrok.app/webhook/toybox-apps';
        
        console.log('🔄 Replacing webhook URL:');
        console.log('   OLD:', oldWebhookURL);
        console.log('   NEW:', newWebhookURL);
        
        if (!html.includes(oldWebhookURL)) {
            console.log('❌ Old webhook URL not found in App Studio HTML');
            console.log('Current webhook URL in HTML:', html.match(/window\.WEBHOOK_URL\s*=\s*['"]([^'"]+)['"]/)?.[1] || 'Not found');
            return;
        }
        
        // Replace the webhook URL
        html = html.replace(oldWebhookURL, newWebhookURL);
        
        // Update the App Studio in Supabase
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio');
            
        if (updateError) {
            throw new Error('Failed to update App Studio: ' + updateError.message);
        }
        
        console.log('✅ App Studio webhook URL updated successfully!');
        console.log('🔗 App Studio: https://webtoys.ai/public/app-studio');
        console.log('📡 Now using webhook: ' + newWebhookURL);
        
    } catch (error) {
        console.error('❌ Error fixing App Studio webhook:', error);
        process.exit(1);
    }
}

// Run the script
fixAppStudioWebhook();