import { readFileSync } from 'fs';
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

async function updateHabitTracker() {
    console.log('🔄 Updating habit tracker app...');
    
    // Read the corrected HTML file
    const htmlFilePath = join(__dirname, '../../experiments/zad/wtaf-make-me-a-habit-tracker-app-called-three-thin-2025-07-08T22-33-12-207Z.html');
    const htmlContent = readFileSync(htmlFilePath, 'utf-8');
    
    console.log(`📄 Read HTML file: ${htmlContent.length} characters`);
    
    // Update the existing habit tracker record
    const { data, error } = await supabase
        .from('wtaf_content')
        .update({
            html_content: htmlContent,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'bart')
        .eq('app_slug', 'habit-tracker')
        .select();
    
    if (error) {
        console.error('❌ Error updating habit tracker:', error);
        return;
    }
    
    console.log('✅ Habit tracker updated successfully!');
    console.log('📝 Updated record:', data);
    
    // Generate new OG image
    console.log('🎨 Generating new OG image...');
    const ogResponse = await fetch('https://theaf-web.ngrok.io/api/generate-og-cached?user=bart&app=habit-tracker');
    
    if (ogResponse.ok) {
        const ogData = await ogResponse.json();
        console.log('🖼️ New OG image:', ogData.image_url);
    } else {
        console.log('⚠️ OG image generation failed, but update was successful');
    }
    
    console.log('🚀 Live at: https://theaf-web.ngrok.io/bart/habit-tracker');
}

updateHabitTracker(); 