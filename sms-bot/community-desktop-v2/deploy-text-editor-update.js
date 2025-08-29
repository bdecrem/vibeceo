#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

async function deployTextEditor() {
    try {
        // Read the text editor HTML
        const textEditorPath = path.join(__dirname, 'apps', 'text-editor.html');
        const htmlContent = fs.readFileSync(textEditorPath, 'utf8');
        
        console.log('📝 Deploying updated text editor to Supabase...');
        
        // Update the existing toybox-text-editor in database
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                original_prompt: 'Updated simple text editor with ZAD integration and ToyBox OS authentication'
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-text-editor');
            
        if (error) {
            console.error('❌ Deploy error:', error);
            return;
        }
        
        console.log('✅ Text editor successfully deployed to database');
        console.log('🌐 Available at: https://webtoys.ai/public/toybox-text-editor');
        
    } catch (error) {
        console.error('❌ Deploy failed:', error);
    }
}

deployTextEditor();