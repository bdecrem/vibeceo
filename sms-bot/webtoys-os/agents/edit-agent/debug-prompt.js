#!/usr/bin/env node

// Debug what prompt is being built
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Import the buildSmartPrompt function
import { buildSmartPrompt } from './execute-open-issue-v2.js';

async function debugPrompt() {
    // Get the issue
    const { data: issues, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('id', 3512)
        .single();
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    const content = issues.content_data || {};
    const description = content.description || '';
    
    // Build the prompt
    const prompt = buildSmartPrompt(content, description);
    
    console.log('📝 Prompt size:', prompt.length, 'characters');
    console.log('📋 Prompt preview (first 500 chars):');
    console.log(prompt.substring(0, 500));
    console.log('\n---\n');
    
    // Save to file for inspection
    const debugFile = '/tmp/debug-prompt.txt';
    fs.writeFileSync(debugFile, prompt);
    console.log('💾 Full prompt saved to:', debugFile);
    
    // Try running it
    console.log('\n🧪 Testing with Claude...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
        const result = await execAsync(
            `cat "${debugFile}" | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions`,
            {
                timeout: 10000,
                maxBuffer: 1024 * 1024 * 50
            }
        );
        console.log('✅ SUCCESS!');
        console.log('Output preview:', result.stdout.substring(0, 200));
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.stdout) {
            console.log('Stdout:', error.stdout);
        }
        if (error.stderr) {
            console.log('Stderr:', error.stderr);
        }
    }
}

debugPrompt();