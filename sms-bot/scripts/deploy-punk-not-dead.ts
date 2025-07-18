#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Required environment variables missing:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Configuration
const USER_SLUG = 'bart';
const WTAF_DOMAIN = process.env.WTAF_DOMAIN || 'https://wtaf.me';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://theaf-web.ngrok.io';

/**
 * Generate a random 3-part app slug (color-animal-action format)
 */
function generateFunSlug(): string {
  const colors = ['crimson', 'azure', 'golden', 'violet', 'emerald', 'copper', 'silver', 'ruby', 'sapphire', 'jade'];
  const animals = ['rabbit', 'eagle', 'wolf', 'fox', 'bear', 'lion', 'tiger', 'shark', 'dragon', 'phoenix'];
  const actions = ['exploring', 'jumping', 'running', 'flying', 'dancing', 'singing', 'climbing', 'diving', 'soaring', 'racing'];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  return `${color}-${animal}-${action}`;
}

/**
 * Generate a unique app slug for the user
 */
async function generateUniqueAppSlug(userSlug: string): Promise<string> {
  const maxAttempts = 50;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const appSlug = generateFunSlug();

    // Check if this user already has an app with this slug
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug);

    if (error) {
      console.warn(`⚠️ Error checking app slug uniqueness: ${error.message}`);
      attempts++;
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`✅ Generated unique app slug: ${appSlug} for user: ${userSlug}`);
      return appSlug;
    }

    attempts++;
    console.log(`🔄 App slug collision attempt ${attempts}: ${appSlug}`);
  }

  // Fallback: add timestamp to guarantee uniqueness
  const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const fallbackSlug = `${generateFunSlug()}-${timestamp}`;
  console.log(`🆘 Using fallback app slug: ${fallbackSlug}`);
  return fallbackSlug;
}

/**
 * Get user ID from sms_subscribers table
 */
async function getUserId(userSlug: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('id')
      .eq('slug', userSlug)
      .single();

    if (error || !data) {
      console.error(`❌ User not found with slug: ${userSlug}`);
      return null;
    }

    console.log(`✅ Found user_id: ${data.id} for slug: ${userSlug}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Error finding user: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Deploy the punk-not-dead app to WTAF
 */
async function deployPunkNotDead(): Promise<void> {
  console.log('🎸 DEPLOYING PUNK NOT DEAD TO WTAF');
  console.log('═'.repeat(50));

  try {
    // 1. Read the HTML file
    const htmlPath = path.join(__dirname, '../../punk-not-dead.html');
    
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML file not found: ${htmlPath}`);
    }

    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    console.log(`📁 Read HTML file: ${htmlPath} (${htmlContent.length} characters)`);

    // 2. Get user ID
    const userId = await getUserId(USER_SLUG);
    if (!userId) {
      throw new Error(`Failed to get user ID for ${USER_SLUG}`);
    }

    // 3. Generate unique app slug
    const appSlug = await generateUniqueAppSlug(USER_SLUG);
    const publicUrl = `${WTAF_DOMAIN}/${USER_SLUG}/${appSlug}`;
    const ogImageUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${USER_SLUG}&app=${appSlug}`;

    console.log(`🎯 App slug: ${appSlug}`);
    console.log(`🌐 Public URL: ${publicUrl}`);

    // 4. Replace placeholders in HTML
    htmlContent = htmlContent
      .replace('PLACEHOLDER_PUBLIC_URL', publicUrl)
      .replace('PLACEHOLDER_OG_IMAGE_URL', ogImageUrl);

    console.log(`🔄 Updated HTML with real URLs`);

    // 5. Insert into wtaf_content table
    const data = {
      user_id: userId,
      user_slug: USER_SLUG,
      app_slug: appSlug,
      coach: 'manual', // Manual deployment
      sender_phone: null, // Not from SMS
      original_prompt: 'PUNK NOT DEAD - Manual deployment of punk aesthetic page',
      html_content: htmlContent,
      status: 'published',
      type: 'web' // Standard web page
    };

    const { data: savedData, error } = await supabase
      .from('wtaf_content')
      .insert(data)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save to database: ${error.message}`);
    }

    console.log(`✅ Saved to Supabase with ID: ${savedData.id}`);
    console.log(`📱 Public URL: ${publicUrl}`);
    console.log(`🎨 OG Image will be generated at: ${ogImageUrl}`);

    console.log('\n🎉 PUNK NOT DEAD successfully deployed to WTAF!');
    console.log(`🔗 View at: ${publicUrl}`);

  } catch (error) {
    console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  deployPunkNotDead();
} 