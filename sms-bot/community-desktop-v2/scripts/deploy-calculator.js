#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function deployCalculator() {
        console.log('📱 Deploying Calculator app to Supabase...');

        try {
            // Read the calculator HTML file
            const calculatorPath = path.join(__dirname, '../calculator.html');
            const htmlContent = fs.readFileSync(calculatorPath, 'utf8');
            console.log('✅ Read calculator HTML file (', htmlContent.length, 'bytes)');

            // Check if app already exists
            const { data: existing, error: checkError } = await supabase
                .from('wtaf_content')
                .select('id, created_at')
                .eq('user_slug', 'public')
                .eq('app_slug', 'calculator')
                .single();

            if (existing) {
                console.log('⚠️  Calculator app already exists, updating...');
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: htmlContent,
                        updated_at: new Date().toISOString(),
                        original_prompt: 'Simple Calculator app - Windows 95 style calculator with history and ZAD integration for saving calculations'
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'calculator');

                if (updateError) {
                    console.error('❌ Update failed:', updateError);
                    return;
                }
                console.log('✅ Updated existing Calculator app');
            } else {
                console.log('🆕 Creating new Calculator app...');
                const { error: insertError } = await supabase
                    .from('wtaf_content')
                    .insert({
                        user_slug: 'public',
                        app_slug: 'calculator',
                        html_content: htmlContent,
                        original_prompt: 'Simple Calculator app - Windows 95 style calculator with history and ZAD integration for saving calculations',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('❌ Insert failed:', insertError);
                    return;
                }
                console.log('✅ Created new Calculator app');
            }

            console.log('🎉 Calculator app deployed successfully!');
            console.log('🔗 Available at: https://webtoys.ai/public/calculator');
            console.log('📱 Features:');
            console.log('  - Windows 95 style interface');
            console.log('  - Basic arithmetic operations');
            console.log('  - Calculation history');
            console.log('  - Keyboard support');
            console.log('  - ZAD integration for saving history');
            console.log('  - ToyBox OS authentication integration');

        } catch (error) {
            console.error('❌ Deployment error:', error);
        }
    }

    await deployCalculator();
}, 100);