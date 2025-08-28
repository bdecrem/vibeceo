#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployTestEditor() {
    console.log('📝 Deploying TEST Text Editor...');
    
    try {
        // Read the HTML file
        const htmlPath = path.join(__dirname, '../test-text-editor.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        console.log(`📖 Read HTML file: ${htmlContent.length} characters`);
        
        // Check if app already exists
        const { data: existingApp } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'test-text-editor')
            .single();
            
        if (existingApp) {
            console.log('🔄 Updating existing TEST Text Editor...');
            
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'test-text-editor');
                
            if (updateError) {
                console.error('❌ Failed to update app:', updateError);
                return;
            }
            
            console.log('✅ Updated TEST Text Editor in database');
        } else {
            console.log('🆕 Creating new TEST Text Editor...');
            
            const { error: insertError } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'test-text-editor',
                    html_content: htmlContent,
                    original_prompt: 'Simple TEST text editor for WebtoysOS',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                
            if (insertError) {
                console.error('❌ Failed to create app:', insertError);
                return;
            }
            
            console.log('✅ Created TEST Text Editor in database');
        }
        
        console.log('🎉 Successfully deployed TEST Text Editor!');
        console.log('🔗 Available at: https://webtoys.ai/public/test-text-editor');
        console.log('📋 Features:');
        console.log('  - Simple text editing');
        console.log('  - Save documents to ZAD database');
        console.log('  - User authentication integration');
        console.log('  - Keyboard shortcuts (Ctrl+S, Ctrl+N)');
        
    } catch (error) {
        console.error('❌ Deployment error:', error);
    }
}

deployTestEditor();