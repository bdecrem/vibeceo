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

    async function deployDetectiveMystery() {
        console.log('🔍 Deploying Detective Mystery app to Supabase...');

        try {
            // Read the detective mystery HTML file
            const mysteryPath = path.join(__dirname, '../detective-mystery.html');
            const htmlContent = fs.readFileSync(mysteryPath, 'utf8');
            console.log('✅ Read Detective Mystery HTML file (', htmlContent.length, 'bytes)');

            // Check if app already exists
            const { data: existing, error: checkError } = await supabase
                .from('wtaf_content')
                .select('id, created_at')
                .eq('user_slug', 'public')
                .eq('app_slug', 'detective-mystery')
                .single();

            if (existing) {
                console.log('⚠️  Detective Mystery app already exists, updating...');
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: htmlContent,
                        updated_at: new Date().toISOString(),
                        original_prompt: 'Detective Mystery - Interactive mystery solving game with multiple cases, clues, and suspects. Features case selection, clue discovery, evidence board, and detective gameplay with ZAD integration for user progress tracking.'
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'detective-mystery');

                if (updateError) {
                    console.error('❌ Update failed:', updateError);
                    return;
                }
                console.log('✅ Updated existing Detective Mystery app');
            } else {
                console.log('🆕 Creating new Detective Mystery app...');
                const { error: insertError } = await supabase
                    .from('wtaf_content')
                    .insert({
                        user_slug: 'public',
                        app_slug: 'detective-mystery',
                        html_content: htmlContent,
                        original_prompt: 'Detective Mystery - Interactive mystery solving game with multiple cases, clues, and suspects. Features case selection, clue discovery, evidence board, and detective gameplay with ZAD integration for user progress tracking.',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('❌ Insert failed:', insertError);
                    return;
                }
                console.log('✅ Created new Detective Mystery app');
            }

            console.log('🎉 Detective Mystery app deployed successfully!');
            console.log('🔗 Available at: https://webtoys.ai/public/detective-mystery');
            console.log('🕵️ Features:');
            console.log('  - 3 mystery cases to solve');
            console.log('  - Interactive clue discovery system');
            console.log('  - Evidence board for tracking discoveries');
            console.log('  - Suspect selection and deduction');
            console.log('  - Progress tracking and case solutions');
            console.log('  - ZAD integration for user progress');
            console.log('  - ToyBox OS authentication integration');

        } catch (error) {
            console.error('❌ Deployment error:', error);
        }
    }

    await deployDetectiveMystery();
}, 100);