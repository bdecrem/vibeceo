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

async function checkPageStatus() {
    console.log('🔍 Checking page status in database...');
    
    const appSlug = 'lavender-bee-noticing';
    
    // Query the specific page
    const { data: pageData, error } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('app_slug', appSlug);
    
    if (error) {
        console.error('❌ Error querying database:', error);
        return;
    }
    
    if (!pageData || pageData.length === 0) {
        console.log(`❌ No page found with app_slug: ${appSlug}`);
        return;
    }
    
    console.log(`📄 Found ${pageData.length} page(s) with app_slug: ${appSlug}`);
    
    pageData.forEach((page, index) => {
        console.log(`\n--- Page ${index + 1} ---`);
        console.log(`ID: ${page.id}`);
        console.log(`User: ${page.user_slug}`);
        console.log(`App: ${page.app_slug}`);
        console.log(`Status: ${page.status}`);
        console.log(`Forget: ${page.Forget}`);
        console.log(`Fave: ${page.Fave}`);
        console.log(`Created: ${page.created_at}`);
        console.log(`Updated: ${page.updated_at}`);
        console.log(`Prompt: ${page.original_prompt?.substring(0, 100)}...`);
    });
    
    // Also check what the user-creations API would return
    const userSlug = pageData[0]?.user_slug;
    if (userSlug) {
        console.log(`\n🔍 Checking what user-creations API would return for user: ${userSlug}`);
        
        // Query exactly like the API does
        const { data: userPages, error: userError } = await supabase
            .from('wtaf_content')
            .select('id, app_slug, user_slug, Forget, Fave, status')
            .eq('user_slug', userSlug)
            .eq('status', 'published')
            .or('Forget.is.null,Forget.eq.false')
            .order('created_at', { ascending: false });
        
        if (userError) {
            console.error('❌ Error querying user pages:', userError);
        } else {
            console.log(`📄 User has ${userPages?.length || 0} visible pages:`);
            userPages?.forEach(page => {
                const isTarget = page.app_slug === appSlug;
                console.log(`  ${isTarget ? '👉' : '  '} ${page.app_slug} (Forget: ${page.Forget}, Fave: ${page.Fave})`);
            });
            
            const targetPage = userPages?.find(page => page.app_slug === appSlug);
            if (targetPage) {
                console.log(`\n✅ Target page IS included in user-creations query`);
            } else {
                console.log(`\n❌ Target page is NOT included in user-creations query`);
            }
        }
    }
}

checkPageStatus(); 