#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../web/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY in environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadDictionary() {
    console.log('📚 Uploading ENABLE dictionary to Supabase...\n');

    try {
        // Read the dictionary file
        const dictionaryPath = '/tmp/enable1.txt';
        if (!fs.existsSync(dictionaryPath)) {
            console.error('❌ Dictionary file not found at /tmp/enable1.txt');
            console.log('💡 Please download it first with:');
            console.log('   curl -O https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt');
            process.exit(1);
        }

        const content = fs.readFileSync(dictionaryPath, 'utf-8');
        const words = content.split('\n').filter(word => word.trim().length > 0);
        
        console.log(`📖 Loaded ${words.length.toLocaleString()} words from ENABLE dictionary`);

        // Group words by length for easier access
        const wordsByLength = {};
        words.forEach(word => {
            const len = word.length;
            if (!wordsByLength[len]) {
                wordsByLength[len] = [];
            }
            wordsByLength[len].push(word.toLowerCase());
        });

        // Create a special HTML "app" that serves as our dictionary storage
        const dictionaryHTML = `<!DOCTYPE html>
<html>
<head>
    <title>WebtoysOS Shared Dictionary</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #f0f0f0;
        }
        .info {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .stats { color: #666; }
    </style>
</head>
<body>
    <div class="info">
        <h1>📚 WebtoysOS Shared Dictionary</h1>
        <p>This is the ENABLE word list used by WebtoysOS word games.</p>
        <div class="stats">
            <p>Total words: ${words.length.toLocaleString()}</p>
            <p>Source: ENABLE (Enhanced North American Benchmark Lexicon)</p>
            <p>Last updated: ${new Date().toISOString()}</p>
        </div>
    </div>
    <script>
        // Dictionary data embedded as JSON
        window.WEBTOYS_DICTIONARY = ${JSON.stringify(words)};
        window.WEBTOYS_DICTIONARY_BY_LENGTH = ${JSON.stringify(wordsByLength)};
        
        // Helper function for games to access the dictionary
        window.getDictionary = function() {
            return window.WEBTOYS_DICTIONARY;
        };
        
        window.getDictionaryByLength = function(length) {
            if (length) {
                return window.WEBTOYS_DICTIONARY_BY_LENGTH[length] || [];
            }
            return window.WEBTOYS_DICTIONARY_BY_LENGTH;
        };
        
        // Allow games to fetch this via postMessage
        window.addEventListener('message', function(e) {
            if (e.data === 'GET_DICTIONARY') {
                e.source.postMessage({
                    type: 'DICTIONARY_RESPONSE',
                    dictionary: window.WEBTOYS_DICTIONARY,
                    dictionaryByLength: window.WEBTOYS_DICTIONARY_BY_LENGTH
                }, '*');
            }
        });
    </script>
</body>
</html>`;

        // Store in Supabase as a special app
        const { data, error } = await supabase
            .from('wtaf_content')
            .upsert({
                user_slug: 'public',
                app_slug: 'toybox-dictionary',
                html_content: dictionaryHTML,
                original_prompt: 'WebtoysOS Shared Dictionary - ENABLE word list for word games',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_slug,app_slug'
            });

        if (error) {
            console.error('❌ Error uploading dictionary:', error);
            process.exit(1);
        }

        console.log('✅ Dictionary uploaded successfully!');
        console.log('📍 Dictionary URL: https://webtoys.ai/public/toybox-dictionary');
        console.log('\n📝 Next steps:');
        console.log('1. Update Word Grid to fetch from this dictionary');
        console.log('2. Update Anagram Rush to fetch from this dictionary');
        console.log('3. Games can load it via fetch() or iframe postMessage');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the upload
uploadDictionary();