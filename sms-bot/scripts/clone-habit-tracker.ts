import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Get current directory equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cloneHabitTracker() {
    console.log('🔄 Cloning habit tracker app...');
    
    // Get the original habit tracker
    const { data: original, error: fetchError } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', 'seb')
        .eq('app_slug', 'habit-tracker')
        .single();
    
    if (fetchError || !original) {
        console.error('❌ Error fetching original habit tracker:', fetchError);
        return;
    }
    
    console.log('📄 Found original habit tracker');
    
    // Generate new app slug
    const newAppSlug = `habit-tracker-clone-${Date.now()}`;
    
    // Create the clone
    const { data: clone, error: cloneError } = await supabase
        .from('wtaf_content')
        .insert({
            user_id: original.user_id,
            user_slug: 'bart', // Clone under bart user
            app_slug: newAppSlug,
            coach: original.coach,
            sender_phone: original.sender_phone,
            original_prompt: original.original_prompt + ' (CLONED)',
            html_content: original.html_content,
            status: 'published',
            feature: false,
            og_image_url: null, // Will be generated
            og_image_cached_at: null,
            email: original.email,
            Fave: original.Fave,
            Forget: original.Forget,
            remix_count: 0,
            is_remix: false,
            parent_app_id: original.id, // Link to parent
            is_featured: false,
            featured_at: null,
            last_remixed_at: null,
            type: original.type,
            total_descendants: 0
        })
        .select()
        .single();
    
    if (cloneError) {
        console.error('❌ Error creating clone:', cloneError);
        return;
    }
    
    console.log('✅ Clone created successfully!');
    console.log('📝 Clone record:', {
        id: clone.id,
        app_slug: clone.app_slug,
        created_at: clone.created_at
    });
    
    // Generate OG image for the clone
    console.log('🎨 Generating OG image for clone...');
    const ogResponse = await fetch(`https://theaf-web.ngrok.io/api/generate-og-cached?user=bart&app=${newAppSlug}`);
    
    if (ogResponse.ok) {
        const ogData = await ogResponse.json();
        console.log('🖼️ Clone OG image:', ogData.image_url);
        
        // Update the clone record with OG image URL
        await supabase
            .from('wtaf_content')
            .update({
                og_image_url: ogData.image_url,
                og_image_cached_at: new Date().toISOString()
            })
            .eq('id', clone.id);
    } else {
        console.log('⚠️ OG image generation failed, but clone was successful');
    }
    
    console.log('🚀 Clone live at:', `https://theaf-web.ngrok.io/bart/${newAppSlug}`);
    console.log('📋 App slug:', newAppSlug);
    
    return {
        id: clone.id,
        app_slug: newAppSlug,
        url: `https://theaf-web.ngrok.io/bart/${newAppSlug}`
    };
}

cloneHabitTracker(); 