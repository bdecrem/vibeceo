import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../../.env.local') });

async function testCreationsAPI() {
    console.log('🔍 Testing user-creations API endpoint...');
    
    const ngrokUrl = 'https://theaf-web.ngrok.io'; // Your ngrok URL
    const userSlug = 'bart';
    const apiUrl = `${ngrokUrl}/api/user-creations?user_slug=${userSlug}&page=1&limit=20`;
    
    console.log(`📡 Making request to: ${apiUrl}`);
    
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        
        console.log(`✅ API Response received`);
        console.log(`📊 Total apps: ${data.apps?.length || 0}`);
        console.log(`📄 Pagination: Page ${data.pagination?.page || 1} of ${data.pagination?.totalPages || 1}`);
        console.log(`🔢 Total count: ${data.pagination?.totalCount || 0}`);
        
        // Check if lavender-bee-noticing is in the first 20 results
        const targetApp = data.apps?.find((app: any) => app.app_slug === 'lavender-bee-noticing');
        
        if (targetApp) {
            console.log(`\n🎯 Found lavender-bee-noticing in first 20 results:`);
            console.log(`   - Position: ${data.apps.indexOf(targetApp) + 1} of ${data.apps.length}`);
            console.log(`   - Created: ${targetApp.created_at}`);
            console.log(`   - Forget: ${targetApp.Forget}`);
            console.log(`   - Fave: ${targetApp.Fave}`);
        } else {
            console.log(`\n❌ lavender-bee-noticing NOT found in first 20 results`);
            console.log(`📋 First 5 apps in results:`);
            data.apps?.slice(0, 5).forEach((app: any, index: number) => {
                console.log(`   ${index + 1}. ${app.app_slug} (${app.created_at})`);
            });
        }
        
        // Check if there are any cache headers
        console.log(`\n🔧 Response headers:`);
        console.log(`   Cache-Control: ${response.headers.get('cache-control') || 'none'}`);
        console.log(`   ETag: ${response.headers.get('etag') || 'none'}`);
        console.log(`   Last-Modified: ${response.headers.get('last-modified') || 'none'}`);
        
    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

testCreationsAPI(); 