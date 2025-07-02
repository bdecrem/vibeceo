import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface TrendingApp {
  user_slug: string;
  app_slug: string;
  prompt: string;
  created_at: string;
  remixes: number;
  index: number; // Position on trending page
}

interface WorkflowOptions {
  selectedItems?: number[]; // If specified, only process these indices
  skipExisting?: boolean; // Skip apps that already have OG images
  dryRun?: boolean; // Preview what would be done without actually doing it
}

async function fetchTrendingApps(): Promise<TrendingApp[]> {
  try {
    console.log('📡 Fetching trending apps...');
    
    // Fetch from your trending API
    const response = await fetch('https://theaf-web.ngrok.io/api/trending-wtaf');
    if (!response.ok) {
      throw new Error(`Failed to fetch trending: ${response.status}`);
    }
    
    const data = await response.json();
    const apps = data.apps || [];
    
    console.log(`✅ Found ${apps.length} trending apps`);
    
    // Convert to our format with index numbers
    return apps.map((app: any, index: number) => ({
      user_slug: app.user_slug,
      app_slug: app.app_slug,
      prompt: app.original_prompt || app.prompt || '',
      created_at: app.created_at,
      remixes: app.remix_count || 0,
      index: index + 1 // 1-based indexing for user convenience
    }));
    
  } catch (error) {
    console.error('❌ Failed to fetch trending apps:', error.message);
    throw error;
  }
}

async function generateOGImageForApp(userSlug: string, appSlug: string): Promise<string | null> {
  try {
    console.log(`🎨 Generating OG image for ${userSlug}/${appSlug}...`);
    
    // Get the app HTML from database
    const { data: appData, error } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (error || !appData) {
      throw new Error(`App not found in database: ${userSlug}/${appSlug}`);
    }
    
    // Save HTML to a temporary file for the ChatGPT script
    const tempHtmlPath = path.join(__dirname, '../../experiments/chatgpt/temp-source.html');
    await fs.writeFile(tempHtmlPath, appData.html_content);
    
    // Modify the ChatGPT script to use our temp file
    const chatgptScriptPath = path.join(__dirname, '../../experiments/chatgpt');
    
    // Run the ChatGPT OG generation script
    console.log('🤖 Running ChatGPT OG generation...');
    const { stdout, stderr } = await execAsync('node generate-og.js', {
      cwd: chatgptScriptPath,
      env: { ...process.env, INPUT_FILE: 'temp-source.html' }
    });
    
    // Read the generated image URL
    const ogUrlPath = path.join(chatgptScriptPath, 'og-image-url.txt');
    const imageUrl = await fs.readFile(ogUrlPath, 'utf-8');
    
    // Clean up temp file
    await fs.unlink(tempHtmlPath);
    
    console.log(`✅ Generated OG image: ${imageUrl.substring(0, 50)}...`);
    return imageUrl.trim();
    
  } catch (error) {
    console.error(`❌ Failed to generate OG image for ${userSlug}/${appSlug}:`, error.message);
    return null;
  }
}

async function downloadAndUploadImage(imageUrl: string, userSlug: string, appSlug: string): Promise<string | null> {
  try {
    console.log(`📥 Downloading and uploading image for ${userSlug}/${appSlug}...`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    console.log(`📁 Downloaded image (${imageBuffer.byteLength} bytes)`);
    
    // Upload to Supabase Storage
    const storageFileName = `${userSlug}-${appSlug}.png`;
    const { error: uploadError } = await supabase.storage
      .from('og-images')
      .upload(storageFileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('og-images')
      .getPublicUrl(storageFileName);
    
    console.log(`☁️ Uploaded to Supabase Storage: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error(`❌ Failed to upload image for ${userSlug}/${appSlug}:`, error.message);
    return null;
  }
}

async function updateDatabaseAndMetaTags(userSlug: string, appSlug: string, ogImageUrl: string): Promise<boolean> {
  try {
    console.log(`🔄 Updating database and meta tags for ${userSlug}/${appSlug}...`);
    
    // Update database with OG image URL
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        og_image_url: ogImageUrl,
        og_image_cached_at: new Date().toISOString()
      })
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug);
    
    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }
    
    console.log(`✅ Updated database with OG URL`);
    
    // Run meta tags fix script
    const fixScriptPath = path.join(__dirname, '../dist/scripts/fix-og-meta-tags.js');
    const { stdout } = await execAsync(`node ${fixScriptPath} ${userSlug} ${appSlug}`, {
      cwd: path.join(__dirname, '../../')
    });
    
    console.log(`✅ Meta tags processed`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to update database/meta tags for ${userSlug}/${appSlug}:`, error.message);
    return false;
  }
}

async function processApp(app: TrendingApp, options: WorkflowOptions): Promise<boolean> {
  const { user_slug, app_slug, index } = app;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 Processing App #${index}: ${user_slug}/${app_slug}`);
  console.log(`📝 Prompt: "${app.prompt.substring(0, 80)}${app.prompt.length > 80 ? '...' : ''}"`);
  console.log(`${'='.repeat(60)}`);
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN - Would process this app but not making actual changes');
    return true;
  }
  
  // Check if app already has OG image and we're skipping existing
  if (options.skipExisting) {
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('og_image_url')
      .eq('user_slug', user_slug)
      .eq('app_slug', app_slug)
      .single();
    
    if (existing?.og_image_url) {
      console.log('⏭️ Skipping - app already has OG image');
      return true;
    }
  }
  
  try {
    // Step 1: Generate OG image using ChatGPT script
    const generatedImageUrl = await generateOGImageForApp(user_slug, app_slug);
    if (!generatedImageUrl) {
      console.log('❌ Failed at step 1: OG image generation');
      return false;
    }
    
    // Step 2: Download and upload to Supabase
    const supabaseImageUrl = await downloadAndUploadImage(generatedImageUrl, user_slug, app_slug);
    if (!supabaseImageUrl) {
      console.log('❌ Failed at step 2: Upload to Supabase');
      return false;
    }
    
    // Step 3: Update database and fix meta tags
    const metaTagsSuccess = await updateDatabaseAndMetaTags(user_slug, app_slug, supabaseImageUrl);
    if (!metaTagsSuccess) {
      console.log('❌ Failed at step 3: Database/meta tags update');
      return false;
    }
    
    console.log(`✅ Successfully processed ${user_slug}/${app_slug}`);
    console.log(`🌐 Final OG URL: ${supabaseImageUrl}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${user_slug}/${app_slug}:`, error.message);
    return false;
  }
}

async function runTrendingOGWorkflow(options: WorkflowOptions = {}) {
  console.log('🚀 TRENDING OG WORKFLOW STARTING');
  console.log(`⚙️ Options:`, {
    selectedItems: options.selectedItems || 'ALL',
    skipExisting: options.skipExisting || false,
    dryRun: options.dryRun || false
  });
  
  try {
    // Fetch trending apps
    const trendingApps = await fetchTrendingApps();
    
    // Filter apps based on selection
    let appsToProcess = trendingApps;
    if (options.selectedItems && options.selectedItems.length > 0) {
      appsToProcess = trendingApps.filter(app => options.selectedItems!.includes(app.index));
      console.log(`🎯 Selected ${appsToProcess.length} apps: ${options.selectedItems.join(', ')}`);
    } else {
      console.log(`🎯 Processing ALL ${appsToProcess.length} trending apps`);
    }
    
    if (appsToProcess.length === 0) {
      console.log('❌ No apps to process');
      return;
    }
    
    // Show preview of what will be processed
    console.log('\n📋 APPS TO PROCESS:');
    appsToProcess.forEach(app => {
      console.log(`  ${app.index}. ${app.user_slug}/${app.app_slug} - "${app.prompt.substring(0, 60)}..."`);
    });
    
    // Process each app
    let successCount = 0;
    let failCount = 0;
    
    for (const app of appsToProcess) {
      const success = await processApp(app, options);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay between apps to be nice to APIs
      if (!options.dryRun) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 WORKFLOW COMPLETE');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${successCount + failCount}`);
    console.log(`${'='.repeat(60)}`);
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🚀 TRENDING OG WORKFLOW

Automatically generates custom OG images for trending WTAF apps using ChatGPT + your upload pipeline.

USAGE:
  npm run trending-og-workflow [options]

OPTIONS:
  --all                    Process ALL trending apps (default)
  --items 1,3,5,11,13     Process only these trending items (by number)
  --skip-existing         Skip apps that already have OG images  
  --dry-run              Preview what would be done without actually doing it
  --help                 Show this help

EXAMPLES:
  # Process all trending apps
  npm run trending-og-workflow

  # Process only items 1, 3, 5, 11, and 13
  npm run trending-og-workflow --items 1,3,5,11,13

  # Preview what would be done for all apps
  npm run trending-og-workflow --dry-run

  # Process all apps but skip ones that already have OG images
  npm run trending-og-workflow --skip-existing

WHAT IT DOES:
  1. Fetches current trending apps from /api/trending-wtaf  
  2. For each selected app:
     a) Generates custom OG image using ChatGPT analysis
     b) Downloads and uploads image to Supabase Storage
     c) Updates database with og_image_url
     d) Fixes HTML meta tags if needed
  3. Reports success/failure for each app

REQUIREMENTS:
  • OPENAI_API_KEY in .env.local
  • ChatGPT OG generation script working
  • Supabase credentials configured
    `);
    process.exit(0);
  }
  
  const options: WorkflowOptions = {
    skipExisting: args.includes('--skip-existing'),
    dryRun: args.includes('--dry-run')
  };
  
  // Parse --items parameter
  const itemsIndex = args.findIndex(arg => arg === '--items');
  if (itemsIndex !== -1 && args[itemsIndex + 1]) {
    const itemsStr = args[itemsIndex + 1];
    options.selectedItems = itemsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    console.log(`🎯 Selected items: ${options.selectedItems.join(', ')}`);
  }
  
  await runTrendingOGWorkflow(options);
}

main(); 