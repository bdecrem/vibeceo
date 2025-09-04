#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDesktopApps() {
    try {
        console.log('🧹 Cleaning up desktop apps...');
        
        // Apps to remove
        const appsToRemove = [
            'Kwords', 'T3st', 'BRAT', 'Paint', 'bdPAINT', 
            'Text Editor', 'Pa1nt', 'brushez', 'Magic 8-Ball', 
            'Wednesday', 'Tired', 'Fortune Cookie', 'Bartword', 
            'Burt', 'Mood Ring'
        ];
        
        // Fetch current desktop config
        const { data: configs, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('*');
            
        if (fetchError) {
            console.error('❌ Failed to fetch desktop config:', fetchError);
            return;
        }
        
        if (!configs || configs.length === 0) {
            console.log('ℹ️ No desktop configurations found');
            return;
        }
        
        // Update each config
        for (const config of configs) {
            const currentRegistry = config.app_registry || [];
            const filteredRegistry = currentRegistry.filter(app => 
                !appsToRemove.includes(app.name)
            );
            
            const removedCount = currentRegistry.length - filteredRegistry.length;
            
            if (removedCount > 0) {
                const { error: updateError } = await supabase
                    .from('wtaf_desktop_config')
                    .update({ 
                        app_registry: filteredRegistry,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', config.id);
                    
                if (updateError) {
                    console.error(`❌ Failed to update config ${config.id}:`, updateError);
                } else {
                    console.log(`✅ Removed ${removedCount} apps from config ${config.id}`);
                    console.log(`   Apps remaining: ${filteredRegistry.map(a => a.name).join(', ')}`);
                }
            } else {
                console.log(`ℹ️ No matching apps to remove in config ${config.id}`);
            }
        }
        
        console.log('✨ Desktop cleanup complete!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

cleanupDesktopApps().then(() => process.exit(0));