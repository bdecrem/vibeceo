#!/usr/bin/env node

const https = require('https');

async function generateOGImage(user, app) {
  return new Promise((resolve, reject) => {
    const url = `https://theaf.us/api/generate-og-cached?user=${user}&app=${app}`;
    console.log(`🎨 Generating OG image for ${user}/${app}...`);
    console.log(`📍 API URL: ${url}`);
    
    const start = Date.now();
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - start;
        try {
          const result = JSON.parse(data);
          console.log(`⏱️  Response time: ${elapsed}ms`);
          
          if (result.success && result.image_url) {
            console.log(`✅ SUCCESS!`);
            console.log(`🖼️  Image URL: ${result.image_url}`);
            console.log(`⚡ Status: ${result.cached ? 'Already cached' : 'Newly generated'}`);
            console.log(`💾 Database: ${result.database_updated ? 'Updated' : 'Not updated'}`);
            resolve(result);
          } else {
            console.log(`❌ FAILED: ${result.error || 'Unknown error'}`);
            resolve(result);
          }
        } catch (error) {
          console.log(`💥 Parse error: ${error.message}`);
          console.log(`📄 Raw response: ${data}`);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.log(`🔌 Network error: ${error.message}`);
      reject(error);
    });
  });
}

// Generate OG for the crimson jaguar page
generateOGImage('bart', 'crimson-jaguar-jumping')
  .then(result => {
    console.log('\n🎯 NEXT STEPS:');
    if (result.success) {
      console.log('✅ Check Supabase → wtaf_content table → og_image_url column');
      console.log('✅ You should now see the image URL for bart/crimson-jaguar-jumping');
    } else {
      console.log('❌ Something went wrong - check the API endpoint');
    }
  })
  .catch(error => {
    console.error('💥 Script failed:', error.message);
  }); 