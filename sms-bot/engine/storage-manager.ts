import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, COLORS, ANIMALS, ACTIONS, WTAF_DOMAIN, WEB_APP_URL } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';
import { generateFunSlug, injectSupabaseCredentials, replaceAppTableId, fixZadAppId } from './shared/utils.js';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    return supabase;
}

/**
 * Generate unique app slug for this user
 * Extracted from monitor.py generate_unique_app_slug function
 */
export async function generateUniqueAppSlug(userSlug: string): Promise<string> {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // Generate random 3-part slug
        const appSlug = generateFunSlug();
        
        // Check if this user already has an app with this slug
        try {
            const { data, error } = await getSupabaseClient()
                .from('wtaf_content')
                .select('id')
                .eq('user_slug', userSlug)
                .eq('app_slug', appSlug);
                
            if (error) {
                logWarning(`Error checking app slug uniqueness: ${error.message}`);
                attempts++;
                continue;
            }
            
            if (!data || data.length === 0) { // No existing record found
                logSuccess(`Generated unique app slug: ${appSlug} for user: ${userSlug}`);
                return appSlug;
            }
        } catch (error) {
            logWarning(`Error checking app slug uniqueness: ${error instanceof Error ? error.message : String(error)}`);
            // Continue to next attempt
        }
        
        attempts++;
        logWithTimestamp(`🔄 App slug collision attempt ${attempts}: ${appSlug}`);
    }
    
    // Fallback: add timestamp to guarantee uniqueness
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const fallbackSlug = `${generateFunSlug()}-${timestamp}`;
    logWarning(`Using fallback app slug: ${fallbackSlug}`);
    return fallbackSlug;
}

/**
 * Update saved HTML content with actual OG image URL (after generation)
 * This replaces the API endpoint URL with the actual Supabase Storage URL
 */
export async function updateOGImageInHTML(userSlug: string, appSlug: string, actualImageUrl: string): Promise<boolean> {
    try {
        logWithTimestamp(`🔄 Updating HTML with actual OG image URL...`);
        
        // Get current HTML content
        const { data: currentData, error: fetchError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', userSlug)
            .eq('app_slug', appSlug)
            .single();
            
        if (fetchError || !currentData) {
            logError(`Failed to fetch current HTML: ${fetchError?.message}`);
            return false;
        }
        
        // Replace API endpoint URL with actual image URL
        const apiEndpointUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
        const updatedHTML = currentData.html_content.replace(apiEndpointUrl, actualImageUrl);
        
        // Update the database with corrected HTML
        const { error: updateError } = await getSupabaseClient()
            .from('wtaf_content')
            .update({ 
                html_content: updatedHTML,
                og_image_url: actualImageUrl,
                og_image_cached_at: new Date().toISOString()
            })
            .eq('user_slug', userSlug)
            .eq('app_slug', appSlug);
            
        if (updateError) {
            logError(`Failed to update HTML: ${updateError.message}`);
            return false;
        }
        
        logSuccess(`✅ Updated HTML with actual OG image URL: ${actualImageUrl}`);
        return true;
        
    } catch (error) {
        logError(`Error updating OG image in HTML: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Generate cached OG image for the app - matches Python monitor.py workflow
 * This calls the API and returns the actual Supabase Storage URL (not the API endpoint)
 */
export async function generateOGImage(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🖼️ Generating OG image for: ${userSlug}/${appSlug}`);
        
        const ogApiUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
        logWithTimestamp(`🔗 Calling OG API: ${ogApiUrl}`);
        
        const response = await fetch(ogApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            logWarning(`❌ OG generation API failed with status: ${response.status}`);
            logWarning(`Response text: ${await response.text()}`);
            return null;
        }
        
        const data = await response.json();
        logWithTimestamp(`📋 OG API response: ${JSON.stringify(data, null, 2)}`);
        
        if (data.success && data.image_url) {
            if (data.cached) {
                logWithTimestamp(`⚡ Using cached OG image (${data.image_url.length > 50 ? data.image_url.substring(0, 50) + '...' : data.image_url})`);
            } else {
                logWithTimestamp(`📥 Downloaded and uploaded new OG image to Supabase Storage`);
            }
            logSuccess(`✅ Generated OG image: ${data.image_url}`);
            return data.image_url;
        } else {
            logWarning(`❌ OG generation API returned error: ${data.error || 'Unknown error'}`);
            return null;
        }
        
    } catch (error) {
        logError(`❌ Error generating OG image: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Get user ID from sms_subscribers table
 * Helper function for database operations
 */
async function getUserId(userSlug: string): Promise<string | null> {
    try {
        const { data, error } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('id')
            .eq('slug', userSlug);
            
        if (error) {
            logError(`Error finding user: ${error.message}`);
            return null;
        }
        
        if (!data || data.length === 0) {
            logError(`User not found with slug: ${userSlug}`);
            return null;
        }
        
        const userId = data[0].id;
        logSuccess(`Found user_id: ${userId} for slug: ${userSlug}`);
        return userId;
    } catch (error) {
        logError(`Error finding user: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Save HTML content to Supabase database
 * Extracted from monitor.py save_code_to_supabase function
 * PARTY TRICK: Email detection happens via HTML content analysis (no extra columns needed)
 */
export async function saveCodeToSupabase(
    code: string, 
    coach: string, 
    userSlug: string, 
    senderPhone: string | null, 
    originalPrompt: string, 
    adminTableId: string | null = null,
    skipUuidReplacement: boolean = false
): Promise<{ appSlug: string | null; publicUrl: string | null; uuid: string | null }> {
    logWithTimestamp(`💾 Starting save_code_to_supabase: coach=${coach}, user_slug=${userSlug}, admin_table_id=${adminTableId}, skip_uuid=${skipUuidReplacement}`);
    logWithTimestamp(`🔍 DUPLICATE DEBUG: save_code_to_supabase called from ${originalPrompt.slice(0, 50)}...`);
    
    // For admin pages, use the admin_table_id as the app_slug
    let appSlug;
    if (adminTableId) {
        appSlug = `admin-${adminTableId}`;
        logWithTimestamp(`📊 Using admin app_slug: ${appSlug}`);
    } else {
        // Generate unique app slug for this user
        appSlug = await generateUniqueAppSlug(userSlug);
    }
    
    // Get user_id from sms_subscribers table
    const userId = await getUserId(userSlug);
    if (!userId) {
        return { appSlug: null, publicUrl: null, uuid: null };
    }
    
    // Inject OpenGraph tags into HTML
    const publicUrl = `${WTAF_DOMAIN}/${userSlug}/${appSlug}`;
    
    // Inject Supabase credentials into HTML
    code = injectSupabaseCredentials(code, SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY);
    
    // Use fallback OG image URL initially - will be updated after OG generation
    const ogImageUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
    const ogTags = `<title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${publicUrl}" />
    <meta name="twitter:card" content="summary_large_image" />`;
    
    // Insert OG tags after <head> tag
    if (code.includes('<head>')) {
        code = code.replace('<head>', `<head>\n    ${ogTags}`);
    }
    
    // Save to Supabase FIRST to get the UUID
    try {
        const data = {
            user_id: userId,
            user_slug: userSlug,
            app_slug: appSlug,
            coach: coach,
            sender_phone: senderPhone,
            original_prompt: originalPrompt,
            html_content: code, // Save initial HTML without UUID replacement
            status: 'published'
        };
        
        let { data: savedData, error } = await getSupabaseClient()
            .from('wtaf_content')
            .insert(data)
            .select('id')
            .single();
            
        // Handle constraint violations gracefully (race condition protection)
        if (error?.code === '23505') { // PostgreSQL unique constraint violation
            logWarning(`🔄 Database race condition detected: ${error.message}`);
            logWarning(`Regenerating unique slug for user ${userSlug}...`);
            
            // Generate a new unique slug and try again
            const newAppSlug = await generateUniqueAppSlug(userSlug);
            const newData = { ...data, app_slug: newAppSlug };
            
            const retryResult = await getSupabaseClient()
                .from('wtaf_content')
                .insert(newData)
                .select('id')
                .single();
                
            if (retryResult.error || !retryResult.data) {
                logError(`Retry failed: ${retryResult.error?.message || 'No data returned'}`);
                return { appSlug: null, publicUrl: null, uuid: null };
            }
            
            logSuccess(`✅ Race condition resolved with new slug: ${newAppSlug}`);
            // Update variables for normal processing flow
            appSlug = newAppSlug;
            savedData = retryResult.data;
            error = null; // Clear the error since retry succeeded
        }
            
        if (error || !savedData) {
            logError(`Error saving to Supabase: ${error?.message || 'No data returned'}`);
            return { appSlug: null, publicUrl: null, uuid: null };
        }
        
        const contentUuid = savedData.id;
        logWithTimestamp(`🆔 Generated UUID for app: ${contentUuid}`);
        
        // For admin pages, skip UUID replacement since it was already done with main app's UUID
        // For stackdb requests, also skip since UUID was already set to origin app's UUID
        if (!adminTableId && !skipUuidReplacement) {
            // Only replace APP_TABLE_ID for normal app creation
            code = replaceAppTableId(code, contentUuid);
            
            // Fix ZAD APP_ID generation to be deterministic (for collaborative apps)
            if (code.includes('wtaf_zero_admin_collaborative')) {
                logWithTimestamp(`🤝 ZAD app detected - fixing APP_ID generation with UUID`);
                code = fixZadAppId(code, contentUuid);
            }
        } else if (skipUuidReplacement) {
            logWithTimestamp(`🔄 Stackdb page - skipping UUID replacement (already configured with origin app UUID)`);
        } else {
            logWithTimestamp(`📊 Admin page - skipping UUID replacement (already configured with main app UUID)`);
        }
        
        // Update the HTML content with the UUID-injected version
        const { error: updateError } = await getSupabaseClient()
            .from('wtaf_content')
            .update({ html_content: code })
            .eq('id', contentUuid);
            
        if (updateError) {
            logError(`Error updating HTML with UUID: ${updateError.message}`);
            return { appSlug: null, publicUrl: null, uuid: null };
        }
        
        logSuccess(`✅ Saved to Supabase with secure UUID: /wtaf/${userSlug}/${appSlug}`);
        if (skipUuidReplacement) {
            logWithTimestamp(`🔒 APP_ID in HTML preserved with origin app UUID (stackdb)`);
        } else {
            logWithTimestamp(`🔒 APP_ID in HTML set to secure UUID: ${contentUuid}`);
        }
        return { appSlug, publicUrl, uuid: contentUuid };
        
    } catch (error) {
        logError(`Error saving to Supabase: ${error instanceof Error ? error.message : String(error)}`);
        return { appSlug: null, publicUrl: null, uuid: null };
    }
}

/**
 * Save code to legacy file system (for non-WTAF content)
 * Extracted from monitor.py save_code_to_file function
 */
export async function saveCodeToFile(
    code: string, 
    coach: string, 
    slug: string, 
    webOutputDir: string
): Promise<{ filename: string | null; publicUrl: string | null }> {
    const filename = `${slug}.html`;
    logWithTimestamp(`💾 Starting save_code_to_file: coach=${coach}, slug=${slug}`);
    
    const publicUrl = `${WEB_APP_URL}/lab/${filename}`;
    
    // Inject Supabase credentials into HTML
    code = injectSupabaseCredentials(code, SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY);
    
    // Inject OpenGraph tags into HTML  
    const ogImageUrl = `${WEB_APP_URL}/api/generate-og-cached?user=lab&app=${slug}`;
    const ogTags = `<title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${publicUrl}" />
    <meta name="twitter:card" content="summary_large_image" />`;
    
    // Insert OG tags after <head> tag
    if (code.includes('<head>')) {
        code = code.replace('<head>', `<head>\n    ${ogTags}`);
    }
    
    const filepath = join(webOutputDir, filename);

    try {
        await writeFile(filepath, code, 'utf8');
        logSuccess(`Saved HTML to: ${filepath}`);
        return { filename, publicUrl };
    } catch (error) {
        logError(`Error writing file: ${error instanceof Error ? error.message : String(error)}`);
        return { filename: null, publicUrl: null };
    }
}

/**
 * Create required directories
 * Extracted from monitor.py directory creation logic
 */
export async function createRequiredDirectories(
    processedDir: string, 
    claudeOutputDir: string, 
    webOutputDir: string, 
    watchDirs: string[]
): Promise<boolean> {
    logWithTimestamp("📁 Creating required directories...");
    
    try {
        // Create all required directories
        const directories = [processedDir, claudeOutputDir, webOutputDir, ...watchDirs];
        
        for (const dir of directories) {
            try {
                if (!existsSync(dir)) {
                    await mkdir(dir, { recursive: true });
                }
                logSuccess(`Created/verified: ${dir}`);
            } catch (error) {
                logError(`Error creating directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }
        
        logSuccess("All directories created successfully");
        return true;
    } catch (error) {
        logError(`Error creating directories: ${error instanceof Error ? error.message : String(error)}`);
        logError(`Current working directory: ${process.cwd()}`);
        throw error;
    }
}

/**
 * Update existing page in Supabase (for EDIT commands)
 */
export async function updatePageInSupabase(userSlug: string, appSlug: string, newHtml: string): Promise<boolean> {
    try {
        logWithTimestamp(`🔄 Updating page in Supabase: ${userSlug}/${appSlug}`);
        
        const { error } = await getSupabaseClient()
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', userSlug)
            .eq('app_slug', appSlug);
        
        if (error) {
            logError(`Failed to update page ${userSlug}/${appSlug}: ${error.message}`);
            return false;
        }
        
        logSuccess(`✅ Updated page ${userSlug}/${appSlug} in Supabase`);
        return true;
        
    } catch (error) {
        logError(`Error updating page ${userSlug}/${appSlug}: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}