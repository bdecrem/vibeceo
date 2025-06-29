#!/usr/bin/env node

/**
 * Delete Cached OG Image
 * 
 * Deletes a specific cached OG image from Supabase Storage to force regeneration
 * with the new custom styling logic.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from sms-bot directory
dotenv.config({ path: join(__dirname, '../.env.local') });

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('❌ Usage: node delete-cached-og.js <user_slug> <app_slug>');
    console.error('   Example: node delete-cached-og.js bart turquoise-rabbit-exploring');
    process.exit(1);
}

const [userSlug, appSlug] = args;

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deleteCachedOG() {
    console.log('🗑️  Starting OG Image Cache Deletion');
    console.log(`🎯 Target: ${userSlug}/${appSlug}`);
    console.log('==========================================');
    
    try {
        const fileName = `${userSlug}-${appSlug}.png`;
        console.log(`📋 Deleting cached file: ${fileName}`);
        
        // Delete from Supabase Storage
        const { data, error } = await supabase.storage
            .from('og-images')
            .remove([fileName]);
        
        if (error) {
            console.error('❌ Error deleting cached OG image:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Successfully deleted cached OG image!');
        console.log(`📋 File ${fileName} removed from og-images bucket`);
        console.log('🔄 Next time this page is shared, it will generate a new custom OG image');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the deletion
deleteCachedOG(); 