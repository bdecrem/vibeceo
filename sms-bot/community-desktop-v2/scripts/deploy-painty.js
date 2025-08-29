import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployPainty() {
    try {
        console.log('📎 Deploying PAINTY paint app to database...');
        
        // Read the HTML content
        const htmlPath = join(__dirname, '..', 'painty.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        
        // Check if app already exists
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'painty')
            .single();
        
        if (existing) {
            console.log('📝 Updating existing PAINTY app...');
            // Update existing record
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString(),
                    original_prompt: 'PAINTY - Simple paint application for WebtoysOS with canvas drawing, colors, brush sizes, save/load functionality using ZAD API'
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'painty');
            
            if (error) throw error;
        } else {
            console.log('🆕 Creating new PAINTY app...');
            // Insert new record
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'painty',
                    html_content: htmlContent,
                    original_prompt: 'PAINTY - Simple paint application for WebtoysOS with canvas drawing, colors, brush sizes, save/load functionality using ZAD API',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
        }
        
        console.log('✅ PAINTY deployed successfully!');
        console.log('🌐 Available at: https://webtoys.ai/public/painty');
        console.log('🔧 Local test: http://localhost:3000/public/painty');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

deployPainty();