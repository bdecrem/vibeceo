import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPublicStreetBuilder() {
    try {
        console.log('🏗️ Creating public street builder app...');
        
        // Read the HTML file
        const htmlPath = path.join(__dirname, 'public-street-builder.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        console.log('📄 Read HTML file successfully');
        
        // Prepare the data for insertion
        const appData = {
            user_slug: 'bart',
            app_slug: 'street-builder', 
            html_content: htmlContent,
            original_prompt: 'Create a public collaborative street builder where people can generate AI buildings and add them to a shared virtual street',
            status: 'published',
            coach: 'claude-sonnet-4-20250514',
            created_at: new Date().toISOString(),
            og_image_url: null // Will be generated automatically when accessed
        };
        
        console.log('📝 Prepared app data:', {
            user_slug: appData.user_slug,
            app_slug: appData.app_slug,
            status: appData.status
        });
        
        // Check if app already exists
        const { data: existing, error: checkError } = await supabase
            .from('wtaf_content')
            .select('id, user_slug, app_slug')
            .eq('user_slug', appData.user_slug)
            .eq('app_slug', appData.app_slug)
            .single();
            
        if (existing) {
            console.log('⚠️ App already exists, updating...');
            
            const { data, error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: appData.html_content,
                    original_prompt: appData.original_prompt,
                    status: appData.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
                
            if (error) {
                throw error;
            }
            
            console.log('✅ Successfully updated public street builder app!');
            console.log('🌐 App URL: https://wtaf.me/bart/street-builder');
            console.log('🎭 Demo URL: https://wtaf.me/bart/street-builder?demo=true');
            
        } else {
            console.log('🆕 Creating new app...');
            
            const { data, error } = await supabase
                .from('wtaf_content')
                .insert([appData])
                .select()
                .single();
                
            if (error) {
                throw error;
            }
            
            console.log('✅ Successfully created public street builder app!');
            console.log('📊 App data:', data);
            console.log('🌐 App URL: https://wtaf.me/bart/street-builder');
            console.log('🎭 Demo URL: https://wtaf.me/bart/street-builder?demo=true');
        }
        
        console.log('\n🎉 Public Street Builder is now live!');
        console.log('   - Users can visit the app and immediately start building');
        console.log('   - Demo mode provides instant access with no authentication');
        console.log('   - Each building shows the creator\'s name');
        console.log('   - AI-generated architecture using DALL-E 3');
        console.log('   - Real-time collaboration via ZAD system');
        
    } catch (error) {
        console.error('❌ Error creating public street builder:', error);
        process.exit(1);
    }
}

// Run the script
createPublicStreetBuilder();