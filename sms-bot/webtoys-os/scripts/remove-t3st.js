#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from sms-bot/.env.local
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function removeT3st() {
    // Get current desktop config
    const { data: config, error: fetchError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .single();

    if (fetchError) {
        console.error('Error fetching config:', fetchError);
        return;
    }

    // Remove T3st from app registry
    const appRegistry = config.app_registry || [];
    const before = appRegistry.length;
    const filteredRegistry = appRegistry.filter(app => 
        app.id !== 't3st' && app.id !== 't3xt'
    );
    const after = filteredRegistry.length;

    // Remove T3st from icon positions
    const iconPositions = config.icon_positions || {};
    delete iconPositions['t3st'];
    delete iconPositions['t3xt'];

    // Update config
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: filteredRegistry,
            icon_positions: iconPositions
        })
        .eq('desktop_version', 'webtoys-os-v3');

    if (updateError) {
        console.error('Error updating config:', updateError);
    } else {
        console.log('✅ T3st/T3xt app removed from desktop');
        console.log(`Apps before: ${before}, Apps after: ${after}`);
    }
}

removeT3st().catch(console.error);