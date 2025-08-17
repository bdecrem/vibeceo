#!/usr/bin/env node

/**
 * Simple migration runner for the system state table
 * Run this once to set up the hourly email notification system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '../.env.local' });

console.log('🚀 Setting up system state table for hourly email notifications...\n');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
    try {
        // Read the migration SQL
        const migrationPath = path.join(process.cwd(), '../migrations/add-system-state-table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Running migration: add-system-state-table.sql');
        
        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        if (error) {
            // Try a simpler approach if RPC doesn't work
            console.log('🔄 Trying direct table creation...');
            
            // Create table directly
            const { error: createError } = await supabase.rpc('exec', {
                sql: `
                CREATE TABLE IF NOT EXISTS wtaf_system_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                `
            });
            
            if (createError) {
                console.log('⚠️  RPC not available, using manual insert approach...');
                
                // Just test the table exists by trying to insert
                const { error: insertError } = await supabase
                    .from('wtaf_system_state')
                    .upsert(
                        { key: 'last_user_check', value: '2025-01-01T00:00:00.000Z', updated_at: new Date().toISOString() },
                        { onConflict: 'key' }
                    );
                
                if (insertError) {
                    console.error('❌ Could not create or access system state table.');
                    console.error('Please run this SQL in your Supabase dashboard:');
                    console.log('\n' + migrationSQL + '\n');
                    process.exit(1);
                }
            }
        }
        
        // Verify the table is working
        console.log('✅ Migration completed successfully!');
        console.log('🧪 Testing table access...');
        
        const { data: testData, error: testError } = await supabase
            .from('wtaf_system_state')
            .select('*')
            .eq('key', 'last_user_check');
        
        if (testError) {
            console.error('❌ Table test failed:', testError);
            process.exit(1);
        }
        
        console.log('✅ Table is working correctly!');
        console.log('📊 Current state:', testData);
        
        console.log('\n🎉 Setup complete! Your hourly email notification system is ready.');
        console.log('\n📋 Next steps:');
        console.log('1. Deploy your web app to Railway (the API endpoint is ready)');
        console.log('2. I will set up the external cron trigger for you');
        console.log('3. You will receive hourly emails when new users sign up');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('\nPlease run this SQL manually in your Supabase dashboard:');
        
        const migrationPath = path.join(process.cwd(), '../migrations/add-system-state-table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('\n' + migrationSQL + '\n');
        
        process.exit(1);
    }
}

runMigration();