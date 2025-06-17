#!/usr/bin/env node

const featuredPages = [
  'bart/amber-eagle-soaring',
  'bart/jade-fox-flying', 
  'bart/jade-lion-climbing',
  'bart/silver-tiger-building',
  'bart/pearl-whale-dreaming',
  'bart/sapphire-bear-flying',
  'bart/bronze-deer-running',
  'bart/emerald-elephant-exploring'
];

async function cacheOGImage(userSlug, appSlug) {
  try {
    console.log(`🎨 Caching OG for ${userSlug}/${appSlug}...`);
    
    const response = await fetch(`http://localhost:3000/api/generate-og-cached?user=${userSlug}&app=${appSlug}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${userSlug}/${appSlug} - ${data.cached ? 'Already cached' : 'Newly cached'}`);
    } else {
      console.log(`❌ ${userSlug}/${appSlug} - Error: ${data.error}`);
    }
    
    return data.success;
  } catch (error) {
    console.log(`💥 ${userSlug}/${appSlug} - Failed: ${error.message}`);
    return false;
  }
}

async function bulkCache() {
  console.log('🚀 Starting bulk OG image caching...\n');
  
  let successCount = 0;
  
  for (const page of featuredPages) {
    const [userSlug, appSlug] = page.split('/');
    const success = await cacheOGImage(userSlug, appSlug);
    
    if (success) successCount++;
    
    // Small delay between requests to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🎉 Bulk caching complete! ${successCount}/${featuredPages.length} pages cached successfully.`);
  console.log('📱 Your landing page should now load lightning fast!');
}

bulkCache().catch(console.error); 