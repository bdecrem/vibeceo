import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: './.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function addHabitTrackerToWTAF() {
    console.log('🎯 Adding Habit Tracker to WTAF system...');
    
    // Read the HTML file
    const htmlPath = './experiments/zad/wtaf-make-me-a-habit-tracker-app-called-three-thin-2025-07-08T22-33-12-207Z.html';
    
    if (!fs.existsSync(htmlPath)) {
        console.error('❌ HTML file not found:', htmlPath);
        return;
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    console.log('📄 HTML file loaded:', htmlContent.length, 'characters');
    
    // Define app metadata
    const userSlug = 'bart';
    const appSlug = 'habit-tracker';
    const originalPrompt = 'Make me a habit tracker app called "Three Things" where users can set 3 daily goals, track completion, see achievements in an emoji wall, and monitor weekly progress with celebrations.';
    
    // Check if app already exists
    const { data: existing } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .single();
    
    if (existing) {
        console.log('⚠️  App already exists. Updating...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                original_prompt: originalPrompt,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            return;
        }
        
        console.log('✅ Habit tracker updated successfully!');
        console.log(`🌐 Access at: https://theaf-web.ngrok.io/${userSlug}/${appSlug}`);
        
    } else {
        console.log('📝 Creating new app...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .insert({
                user_slug: userSlug,
                app_slug: appSlug,
                html_content: htmlContent,
                original_prompt: originalPrompt,
                status: 'published',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Insert failed:', error);
            return;
        }
        
        console.log('✅ Habit tracker added successfully!');
        console.log('📊 App ID:', data.id);
        console.log(`🌐 Access at: https://theaf-web.ngrok.io/${userSlug}/${appSlug}`);
    }
    
    // Generate OG image
    console.log('🖼️  Generating OG image...');
    try {
        const ogResponse = await fetch(`https://theaf-web.ngrok.io/api/generate-og-cached?user=${userSlug}&app=${appSlug}`);
        const ogData = await ogResponse.json();
        
        if (ogData.success) {
            console.log('✅ OG image generated:', ogData.image_url);
        } else {
            console.log('⚠️  OG image generation failed, but app is live');
        }
    } catch (error) {
        console.log('⚠️  OG image generation failed, but app is live');
    }
    
    console.log('\n🎉 DONE! Your habit tracker is now live on the WTAF system!');
}

// Run the script
addHabitTrackerToWTAF().catch(console.error); 