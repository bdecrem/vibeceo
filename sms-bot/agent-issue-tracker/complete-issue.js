#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function completeIssue() {
    const { data } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('id', 2899)
        .single();
    
    const content = typeof data.content_data === 'string' 
        ? JSON.parse(data.content_data) 
        : data.content_data;
    
    content.status = 'completed';
    content.completedAt = new Date().toISOString();
    content.completedBy = 'Claude Code CLI';
    content.resolution = 'Created Text Editor app and added to desktop';
    
    await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({ content_data: JSON.stringify(content) })
        .eq('id', 2899);
    
    console.log('✅ Issue #16 marked as completed');
    console.log('📝 Resolution: Text Editor app created and deployed');
}

completeIssue();