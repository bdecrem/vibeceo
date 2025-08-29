#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployBDpaint() {
    try {
        // Read the HTML file
        const htmlPath = path.join(__dirname, 'bdpaint.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        console.log('Deploying BDpaint to Supabase...');
        
        // Check if app already exists
        const { data: existing, error: checkError } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'bdpaint')
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        const appData = {
            user_slug: 'public',
            app_slug: 'bdpaint',
            html_content: htmlContent,
            original_prompt: 'BDpaint - Simple paint application with brush, eraser, colors, and save/load functionality',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        if (existing) {
            // Update existing app
            const { data, error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();
                
            if (error) throw error;
            console.log('✅ BDpaint updated successfully!');
        } else {
            // Insert new app
            const { data, error } = await supabase
                .from('wtaf_content')
                .insert([appData])
                .select();
                
            if (error) throw error;
            console.log('✅ BDpaint deployed successfully!');
        }
        
        console.log('🎨 BDpaint is now available at: https://webtoys.ai/public/bdpaint');
        console.log('📱 Test locally at: http://localhost:3000/public/bdpaint');
        
    } catch (error) {
        console.error('❌ Error deploying BDpaint:', error);
        process.exit(1);
    }
}

deployBDpaint();