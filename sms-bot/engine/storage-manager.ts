import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, COLORS, ANIMALS, ACTIONS, WTAF_DOMAIN, WEB_APP_URL } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';
import { generateFunSlug, injectSupabaseCredentials, replaceAppTableId, fixZadAppId, autoFixCommonIssues } from './shared/utils.js';

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
 * Generate unique app slug for this user - ATOMIC VERSION
 * This fixes the race condition by checking uniqueness at insert time
 */
export async function generateUniqueAppSlug(userSlug: string): Promise<string> {
    const maxAttempts = 10; // Reduced from 50 since we have 16.8M combinations
    
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        const appSlug = generateFunSlug();
        
        // Test insert with ON CONFLICT to atomically check uniqueness
        try {
            const { data, error } = await getSupabaseClient()
                .from('wtaf_content')
                .select('id')
                .eq('user_slug', userSlug)
                .eq('app_slug', appSlug);
                
            if (error) {
                logWarning(`Error checking slug uniqueness: ${error.message}`);
                continue;
            }
            
            if (!data || data.length === 0) {
                logSuccess(`Generated unique app slug: ${appSlug} for user: ${userSlug} (attempt ${attempts + 1})`);
                return appSlug;
            }
            
            logWithTimestamp(`🔄 Slug collision attempt ${attempts + 1}: ${appSlug}`);
        } catch (error) {
            logWarning(`Error checking slug uniqueness: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    // With 16.8M combinations, we should NEVER reach this point
    // If we do, something is seriously wrong with the database
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const fallbackSlug = `${generateFunSlug()}-${timestamp}`;
    logError(`🚨 CRITICAL: Reached fallback slug generation after ${maxAttempts} attempts!`);
    logError(`🚨 This should be impossible with 16.8M combinations - check database health`);
    logWarning(`Using emergency fallback slug: ${fallbackSlug}`);
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
        
        // Replace API endpoint URL with actual image URL (handle both regular apps and meme placeholders)
        const apiEndpointUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
        const memeePlaceholderUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=MEME_PLACEHOLDER`;
        
        let updatedHTML = currentData.html_content.replace(apiEndpointUrl, actualImageUrl);
        // Also handle meme placeholders (for meme apps)
        updatedHTML = updatedHTML.replace(memeePlaceholderUrl, actualImageUrl);
        
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
 * Generate OpenGraph image for a WTAF app
 * @param userSlug - User's slug
 * @param appSlug - App's slug  
 * @param memeImageUrl - Optional: For memes, use this image instead of generating new one
 * @returns The actual image URL or null if failed
 */
export async function generateOGImage(userSlug: string, appSlug: string, memeImageUrl?: string): Promise<string | null> {
    try {
        // For memes: Use the provided meme image directly (skip API generation)
        if (memeImageUrl) {
            logWithTimestamp(`🖼️ Using meme image as OpenGraph image: ${memeImageUrl}`);
            return memeImageUrl;
        }

        // For regular apps: Use the API to generate/get cached image
        const apiUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
        logWithTimestamp(`🖼️ Generating OG image via API: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            logError(`❌ Failed to generate OG image: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        
        if (data.success && data.image_url) {
            logSuccess(`✅ OG image generated successfully: ${data.image_url}`);
            return data.image_url;
        } else {
            logError(`❌ OG image generation failed: ${data.error || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        logError(`❌ Error generating OG image: ${error}`);
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
    
    // Check if this uses API calls (skip credential injection)
    const usesApiCalls = code.includes('fetch(\'/api/admin/');
    
    // Check if this is minimal test (skip auto-fix)
    const isMinimalTest = originalPrompt.includes('ADMIN_TEST_MARKER');
    
    // Check if this is ZAD test (skip auto-fix)
    const isZadTest = originalPrompt.includes('ZAD_TEST_MARKER');
    
    // Check if this is ZAD API (comprehensive template with API conversion)
    const isZadApi = originalPrompt.includes('ZAD_API_MARKER');
    
    // Check if this is natural ZAD request (comprehensive template with API conversion)
    const isNaturalZad = originalPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');
    
    // Check if this code uses ZAD-style helper functions (auto-detect)
    // BUT: Skip auto-detection for ZAD test (use direct API calls instead)
    const usesZadHelpers = !isZadTest && (/\bawait\s+save\s*\(/.test(code) || /\bawait\s+load\s*\(/.test(code) ||
                          /\bsave\s*\(/.test(code) || /\bload\s*\(/.test(code) ||
                          /\bsaveEntry\s*\(/.test(code) || /\bloadEntries\s*\(/.test(code) ||
                          /\bsaveData\s*\(/.test(code) || /\bloadData\s*\(/.test(code));
    
    if (usesApiCalls) {
        logWithTimestamp("🔗 API-based app detected: Skipping Supabase credentials injection");
        // Skip credential injection for any app using API calls
    } else {
        // COMMENTED OUT: Old WTAF natural supabase credentials + auto-fix process + no helpers
        // This was the original path for natural ZAD requests before API conversion
        // if (!isNaturalZad) {
        //     // Inject Supabase credentials into HTML (only for direct Supabase apps)
        //     code = injectSupabaseCredentials(code, SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY);
        // }
        
        // NEW: All non-API apps that aren't natural ZAD get Supabase credentials
        if (!isNaturalZad) {
            // Inject Supabase credentials into HTML (only for direct Supabase apps)
            code = injectSupabaseCredentials(code, SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY);
        }
    }
    
    // Convert Supabase calls to API calls for ZAD API apps OR natural ZAD requests
    if (isZadApi || isNaturalZad) {
        if (isZadApi) {
            logWithTimestamp("🚀 ZAD API: Converting Supabase calls to API calls");
        } else {
            logWithTimestamp("🎨 Natural ZAD: Converting Supabase calls to API calls");
        }
        code = await convertSupabaseToApiCalls(code);
    }
    
    // Inject ZAD helper functions for ZAD test apps OR auto-detected ZAD-style code OR ZAD API apps OR natural ZAD requests
    if (isZadTest || usesZadHelpers || isZadApi || isNaturalZad) {
        if (isZadTest) {
            logWithTimestamp("🧪 ZAD TEST: Injecting helper functions");
        } else if (isZadApi) {
            logWithTimestamp("🚀 ZAD API: Injecting helper functions");
        } else if (isNaturalZad) {
            logWithTimestamp("🎨 Natural ZAD: Injecting helper functions");
        } else {
            logWithTimestamp("🔍 AUTO-DETECTED ZAD-STYLE CODE: Injecting helper functions");
        }
        // Note: We'll inject the UUID after we get it from the database
        code = await injectZadHelperFunctions(code);
    }
    
    if (isMinimalTest || usesApiCalls || isZadTest || usesZadHelpers || isZadApi || isNaturalZad) {
        if (isMinimalTest) {
            logWithTimestamp("🧪 MINIMAL TEST: Skipping auto-fix processing");
        }
        if (isZadTest) {
            logWithTimestamp("🧪 ZAD TEST: Skipping auto-fix processing");
        }
        if (isZadApi) {
            logWithTimestamp("🚀 ZAD API: Skipping auto-fix processing (prevents breaking API calls)");
        }
        if (isNaturalZad) {
            logWithTimestamp("🎨 Natural ZAD: Skipping auto-fix processing (prevents breaking API calls)");
        }
        if (usesZadHelpers && !isZadTest && !isZadApi && !isNaturalZad) {
            logWithTimestamp("🔍 AUTO-DETECTED ZAD CODE: Skipping auto-fix processing");
        }
        if (usesApiCalls) {
            logWithTimestamp("🔗 API-BASED APP: Skipping auto-fix processing (prevents breaking fetch calls)");
        }
        // Skip auto-fix for minimal test OR ZAD test OR ZAD API OR natural ZAD OR auto-detected ZAD OR any API-based app
    } else {
        // Auto-fix common JavaScript issues before deployment (only for direct Supabase apps)
        code = autoFixCommonIssues(code);
    }
    
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
        // Detect if this is a ZAD app
        const isZadApp = code.includes('wtaf_zero_admin_collaborative');
        
        if (isZadApp) {
            logWithTimestamp(`🤝 ZAD app detected - setting type to 'ZAD'`);
        }
        
        // Check if user has hide_default setting enabled
        let shouldHideByDefault = false;
        if (senderPhone) {
            try {
                const { getHideDefault } = await import('../lib/subscribers.js');
                shouldHideByDefault = await getHideDefault(senderPhone) || false;
                if (shouldHideByDefault) {
                    logWithTimestamp(`👻 User has hide_default=true - setting Forget=true for new page`);
                }
            } catch (error) {
                logWarning(`Error checking hide_default setting: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const data = {
            user_id: userId,
            user_slug: userSlug,
            app_slug: appSlug,
            coach: coach,
            sender_phone: senderPhone,
            original_prompt: originalPrompt,
            html_content: code, // Save initial HTML without UUID replacement
            status: 'published',
            type: isZadApp ? 'ZAD' : null, // Set type to 'ZAD' if ZAD app detected
            Forget: shouldHideByDefault // Hide by default if user has hide_default enabled
        };
        
        let { data: savedData, error } = await getSupabaseClient()
            .from('wtaf_content')
            .insert(data)
            .select('id')
            .single();
            
        // Handle constraint violations gracefully (race condition protection)
        if (error?.code === '23505') { // PostgreSQL unique constraint violation
            logWarning(`🔄 Database race condition detected: ${error.message}`);
            logWarning(`Using emergency timestamp suffix to guarantee uniqueness...`);
            
            // Use timestamp suffix for immediate uniqueness (no more retries)
            const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
            const emergencySlug = `${generateFunSlug()}-${timestamp}`;
            const newData = { ...data, app_slug: emergencySlug };
            
            const retryResult = await getSupabaseClient()
                .from('wtaf_content')
                .insert(newData)
                .select('id')
                .single();
                
            if (retryResult.error || !retryResult.data) {
                logError(`Emergency retry failed: ${retryResult.error?.message || 'No data returned'}`);
                return { appSlug: null, publicUrl: null, uuid: null };
            }
            
            logWarning(`⚠️ Used emergency slug due to race condition: ${emergencySlug}`);
            if (isZadApp) {
                logWithTimestamp(`🤝 ZAD type preserved in emergency retry: ${emergencySlug}`);
            }
            // Update variables for normal processing flow
            appSlug = emergencySlug;
            savedData = retryResult.data;
            error = null; // Clear the error since retry succeeded
        }
            
        if (error || !savedData) {
            logError(`Error saving to Supabase: ${error?.message || 'No data returned'}`);
            return { appSlug: null, publicUrl: null, uuid: null };
        }
        
        const contentUuid = savedData.id;
        logWithTimestamp(`🆔 Generated UUID for app: ${contentUuid}`);
        
        // Inject UUID into ZAD helper functions if they were added
        if (isZadTest || usesZadHelpers || isZadApi || isNaturalZad) {
            logWithTimestamp(`🔗 Injecting UUID ${contentUuid} into ZAD helper functions`);
            code = await injectZadUuidIntoHelpers(code, contentUuid);
        }
        
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
    
    // Auto-fix common JavaScript issues before deployment
    code = autoFixCommonIssues(code);
    
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
        
        // Auto-fix common JavaScript issues before updating
        newHtml = autoFixCommonIssues(newHtml);
        
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

/**
 * Inject UUID into existing ZAD helper functions - SIMPLIFIED VERSION
 */
async function injectZadUuidIntoHelpers(html: string, uuid: string): Promise<string> {
    try {
        logWithTimestamp(`🔧 SIMPLIFIED UUID INJECTION: Starting injection of UUID ${uuid}`);
        
        // SIMPLIFIED APPROACH: Replace the getAppId function with hardcoded UUID return
        // This is more reliable than complex pattern matching
        const newGetAppIdFunction = `function getAppId() {
    console.log('🆔 ZAD getAppId() called, returning UUID:', '${uuid}');
    return '${uuid}';
}`;
        
        // Replace ANY getAppId function definition with our hardcoded version
        if (html.includes('function getAppId()')) {
            // More robust regex to match the entire function including nested braces
            html = html.replace(
                /function getAppId\(\) \{[\s\S]*?\n\}/g,
                newGetAppIdFunction
            );
            logWithTimestamp(`🔧 SIMPLIFIED UUID INJECTION: Replaced getAppId function with hardcoded UUID`);
        } else {
            // If no getAppId function found, add it after the helper functions comment
            if (html.includes('console.log(\'🚀 Loading ZAD Helper Functions')) {
                html = html.replace(
                    'console.log(\'🚀 Loading ZAD Helper Functions',
                    `${newGetAppIdFunction}

console.log('🚀 Loading ZAD Helper Functions`
                );
                logWithTimestamp(`🔧 SIMPLIFIED UUID INJECTION: Added getAppId function with hardcoded UUID`);
            } else {
                // Final fallback: inject before closing script tag
                if (html.includes('</script>')) {
                    html = html.replace('</script>', `
${newGetAppIdFunction}
</script>`);
                    logWithTimestamp(`🔧 SIMPLIFIED UUID INJECTION: Added getAppId function as fallback`);
                }
            }
        }
        
        // Also add window.APP_ID assignment for double safety
        const windowAssignment = `
// SIMPLIFIED UUID INJECTION: Set window.APP_ID for backup
window.APP_ID = '${uuid}';
console.log('🆔 SIMPLIFIED UUID INJECTION: window.APP_ID set to:', '${uuid}');
`;
        
        if (html.includes('console.log(\'🚀 Loading ZAD Helper Functions')) {
            html = html.replace(
                'console.log(\'🚀 Loading ZAD Helper Functions',
                `${windowAssignment}
console.log('🚀 Loading ZAD Helper Functions`
            );
        }
        
        logWithTimestamp(`🔧 SIMPLIFIED UUID INJECTION: Successfully injected UUID ${uuid} into ZAD helper functions`);
        return html;
        
    } catch (error) {
        logError(`🔧 SIMPLIFIED UUID INJECTION: Failed to inject UUID: ${error instanceof Error ? error.message : String(error)}`);
        return html; // Return original HTML if injection fails
    }
}

/**
 * Inject ZAD helper functions into HTML for ZAD test apps
 */
async function injectZadHelperFunctions(html: string): Promise<string> {
    try {
        logWithTimestamp("🔄 Injecting ZAD helper functions (inline version)...");
        
        // Create minimal inline version of essential ZAD helper functions
        const helperScript = `<script>
// ZAD Helper Functions - Inline version for test apps
console.log('🚀 Loading ZAD Helper Functions (inline)...');

// Auth state - Use existing global currentUser or create zadCurrentUser
let zadCurrentUser = (typeof currentUser !== 'undefined') ? currentUser : null;
let authInitialized = false;

// Get app ID from window.APP_ID (set by system) - ENHANCED DEBUG VERSION
function getAppId() {
    console.log('🔍 ZAD getAppId() called');
    console.log('🔍 window.APP_ID is:', window.APP_ID);
    console.log('🔍 typeof window.APP_ID:', typeof window.APP_ID);
    
    if (window.APP_ID) {
        console.log('✅ ZAD getAppId() returning UUID:', window.APP_ID);
        return window.APP_ID;
    } else {
        console.error('❌ ZAD getAppId() ERROR: window.APP_ID is not set! Returning unknown-app');
        return 'unknown-app';
    }
}

                // Get participant ID - prompt if not in current session
                function getParticipantId() {
                    let participantId = localStorage.getItem('zad_participant_id');
                    if (!participantId) {
                        const username = prompt('Enter your name:') || 'Anonymous';
                        participantId = username.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 6);
                        localStorage.setItem('zad_participant_id', participantId);
                        localStorage.setItem('zad_username', username);
                    }
                    return participantId;
                }

                // Get username from current session
                function getUsername() {
                    return localStorage.getItem('zad_username') || 'Anonymous';
                }

                // Initialize authentication (simplified)
                function initAuth() {
                    console.log('🔐 Initializing authentication...');
                    if (authInitialized) return;
                    authInitialized = true;
                    
                    // Clear any previous session data (force fresh login)
                    localStorage.removeItem('zad_participant_id');
                    localStorage.removeItem('zad_username');
                    
                    // For test apps, prompt for user and set up session
                    zadCurrentUser = {
                        username: getUsername(),
                        participantId: getParticipantId()
                    };
                    
                    console.log('✅ Authentication ready:', zadCurrentUser);
                }

// Save data to ZAD API
async function save(type, data) {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        const zadData = {
            app_id: app_id,
            participant_id: participant_id,
            participant_data: {
                userLabel: username,
                username: username
            },
            action_type: type,
            content_data: {
                ...data,
                timestamp: data.timestamp || Date.now(),
                author: data.author || username
            }
        };
        
        console.log('🔄 Saving to ZAD API:', { type, data: zadData });
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zadData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(\`Save failed: \${errorData.error || response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Saved successfully:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Save error:', error);
        alert(\`Failed to save: \${error.message}\`);
        throw error;
    }
}

// Phase 1 Authentication Backend Helper Functions
// These call the backend API with specific action types

// Backend Helper 1: Check Available Slots
async function checkAvailableSlots() {
    try {
        const app_id = getAppId();
        
        console.log('🔍 Calling backend checkAvailableSlots for app:', app_id);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'check_slots',
                content_data: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Check slots failed: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Backend checkAvailableSlots result:', result.slots);
        
        return result.slots;
        
    } catch (error) {
        console.error('❌ Check slots error:', error);
        alert(\`Failed to check available slots: \${error.message}\`);
        return { totalSlots: 5, usedSlots: 0, availableSlots: 5, availableLabels: [], usedLabels: [], isFull: false };
    }
}

// Backend Helper 2: Generate User Credentials
async function generateUser() {
    try {
        const app_id = getAppId();
        
        console.log('🎲 Calling backend generateUser for app:', app_id);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'generate_user',
                content_data: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Generate user failed: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Backend generateUser result:', result);
        
        if (!result.success) {
            alert(result.error || 'Failed to generate user');
            return null;
        }
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Generate user error:', error);
        alert(\`Failed to generate user: \${error.message}\`);
        return null;
    }
}

// Backend Helper 3: Register User
async function registerUser(userLabel, passcode, participantId) {
    try {
        const app_id = getAppId();
        
        console.log('📝 Calling backend registerUser for app:', app_id, 'user:', userLabel);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'register_user',
                content_data: {
                    userLabel: userLabel,
                    passcode: passcode,
                    participantId: participantId
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Register user failed: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Backend registerUser result:', result);
        
        if (!result.success) {
            alert(result.result?.error || 'Registration failed');
            return { success: false, error: result.result?.error };
        }
        
        return result.result;
        
    } catch (error) {
        console.error('❌ Register user error:', error);
        alert(\`Registration failed: \${error.message}\`);
        return { success: false, error: error.message };
    }
}

// Backend Helper 4: Authenticate User
async function authenticateUser(userLabel, passcode) {
    try {
        const app_id = getAppId();
        
        console.log('🔐 Calling backend authenticateUser for app:', app_id, 'user:', userLabel);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'authenticate_user',
                content_data: {
                    userLabel: userLabel,
                    passcode: passcode
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Authentication failed: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Backend authenticateUser result:', result);
        
        if (!result.success) {
            alert(result.result?.error || 'Authentication failed');
            return { success: false, error: result.result?.error };
        }
        
        return result.result;
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        alert(\`Authentication failed: \${error.message}\`);
        return { success: false, error: error.message };
    }
}

// Backend Helper Function Test: greet(name)
// This demonstrates how backend helper functions work - all logic happens on server
async function greet(name) {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        console.log('🤖 Calling backend greet function for:', name);
        
        // Simple client call - all logic happens on backend
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                participant_id: participant_id,
                participant_data: { userLabel: username, username: username },
                action_type: 'greet',
                content_data: { name: name }
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Greet failed: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Backend greet function result:', result);
        
        // Return the backend-generated greeting
        return result.greeting;
        
    } catch (error) {
        console.error('❌ Greet error:', error);
        alert(\`Greet failed: \${error.message}\`);
        return 'Error generating greeting';
    }
}

// Load data from ZAD API
async function load(type) {
    try {
        const app_id = getAppId();
        
        console.log('🔄 Loading from ZAD API:', { app_id, type });
        
        const url = \`/api/zad/load?app_id=\${encodeURIComponent(app_id)}&action_type=\${encodeURIComponent(type)}\`;
        console.log('🔍 ZAD load URL:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(\`Load failed: \${errorData.error || response.statusText}\`);
        }
        
        const data = await response.json();
        console.log('✅ Loaded successfully:', data);
        
        // Transform ZAD data back to simple format
        return data.map(item => ({
            id: item.id,
            ...item.content_data,
            author: item.content_data.author || item.participant_data?.username || 'Unknown',
            created_at: item.created_at
        }));
        
    } catch (error) {
        console.error('❌ Load error:', error);
        alert(\`Failed to load: \${error.message}\`);
        return [];
    }
}

// Make functions globally available
window.initAuth = initAuth;
window.save = save;
window.load = load;
window.getAppId = getAppId;
window.getParticipantId = getParticipantId;
window.getUsername = getUsername;
window.greet = greet; // Add greet function to window object
window.checkAvailableSlots = checkAvailableSlots;
window.generateUser = generateUser;
window.registerUser = registerUser;
window.authenticateUser = authenticateUser;

console.log('🚀 ZAD Helper Functions loaded successfully');
console.log('Available functions: initAuth(), save(type, data), load(type), greet(name)');
console.log('🔑 Phase 1 Auth functions: checkAvailableSlots(), generateUser(), registerUser(label, code, id), authenticateUser(label, code)');
</script>`;
        
        // Inject before closing </head> tag, or before first <script> tag if no </head>
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${helperScript}\n</head>`);
        } else if (html.includes('<script>')) {
            html = html.replace('<script>', `${helperScript}\n<script>`);
        } else {
            // Fallback: add at the end of the HTML
            html = html.replace('</html>', `${helperScript}\n</html>`);
        }
        
        logWithTimestamp("🧪 ZAD helper functions injected successfully (inline version)");
        return html;
        
    } catch (error) {
        logError(`Failed to inject ZAD helper functions: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback: return original HTML if injection fails
        return html;
    }
}

/**
 * Convert Supabase calls to API calls for ZAD API apps
 * This enables using the comprehensive template with API-based architecture
 */
export async function convertSupabaseToApiCalls(html: string): Promise<string> {
    try {
        logWithTimestamp("🔄 Converting Supabase calls to API calls for ZAD API app...");
        
        // Pattern 1: INSERT operations (handles multiline)
        // supabase.from('wtaf_zero_admin_collaborative').insert({...}) -> await save('type', {...})
        html = html.replace(
            /await\s+supabase\.from\(['"`]wtaf_zero_admin_collaborative['"`]\)\.insert\(\{[\s\S]*?\}\)/g,
            (match) => {
                logWithTimestamp("🔄 Converting INSERT operation to save() call");
                // Extract action_type if present, otherwise use 'data'
                const actionTypeMatch = match.match(/action_type:\s*['"`]([^'"`]+)['"`]/);
                const actionType = actionTypeMatch ? actionTypeMatch[1] : 'data';
                
                // Extract content_data if present, otherwise use the whole object
                const contentMatch = match.match(/content_data:\s*\{([\s\S]*?)\}/);
                if (contentMatch) {
                    return `await save('${actionType}', {${contentMatch[1].trim()}})`;
                } else {
                    // Extract the object content
                    const objectMatch = match.match(/insert\(\{([\s\S]*?)\}\)/);
                    if (objectMatch) {
                        return `await save('${actionType}', {${objectMatch[1].trim()}})`;
                    }
                }
                return `await save('${actionType}', {})`;
            }
        );
        
        // Pattern 2: SELECT operations (handles multiline)
        // supabase.from('wtaf_zero_admin_collaborative').select('*').eq('app_id', app_id) -> await load('data')
        html = html.replace(
            /const\s*\{\s*data\s*\}\s*=\s*await\s+supabase\.from\(['"`]wtaf_zero_admin_collaborative['"`]\)[\s\S]*?\.select\([^)]+\)[\s\S]*?\.eq\(['"`]app_id['"`][^)]+\)[\s\S]*?;/g,
            (match) => {
                logWithTimestamp("🔄 Converting SELECT operation to load() call");
                // Extract action_type if present
                const actionTypeMatch = match.match(/\.eq\(['"`]action_type['"`],\s*['"`]([^'"`]+)['"`]\)/);
                const actionType = actionTypeMatch ? actionTypeMatch[1] : 'data';
                return `const data = await load('${actionType}');`;
            }
        );
        
        // Pattern 3: Simple SELECT operations without destructuring
        html = html.replace(
            /await\s+supabase\.from\(['"`]wtaf_zero_admin_collaborative['"`]\)[\s\S]*?\.select\([^)]+\)[\s\S]*?\.eq\(['"`]app_id['"`][^)]+\)[\s\S]*?;/g,
            (match) => {
                logWithTimestamp("🔄 Converting simple SELECT operation to load() call");
                const actionTypeMatch = match.match(/\.eq\(['"`]action_type['"`],\s*['"`]([^'"`]+)['"`]\)/);
                const actionType = actionTypeMatch ? actionTypeMatch[1] : 'data';
                return `await load('${actionType}');`;
            }
        );
        
        // Pattern 4: UPDATE operations (handles multiline)
        // supabase.from('wtaf_zero_admin_collaborative').update({...}).eq('id', id) -> await save('data', {...})
        html = html.replace(
            /await\s+supabase\.from\(['"`]wtaf_zero_admin_collaborative['"`]\)\.update\(\{[\s\S]*?\}\)[\s\S]*?\.eq\([^)]+\)/g,
            (match) => {
                logWithTimestamp("🔄 Converting UPDATE operation to save() call");
                const objectMatch = match.match(/update\(\{([\s\S]*?)\}\)/);
                const content = objectMatch ? objectMatch[1].trim() : '';
                return `await save('data', {${content}})`;
            }
        );
        
        // Pattern 5: Remove Supabase CDN script tag
        html = html.replace(
            /<script\s+src\s*=\s*['"`][^'"`]*supabase[^'"`]*['"`][^>]*>\s*<\/script>\s*/g,
            ''
        );
        
        // Pattern 6: Remove Supabase client imports and initialization
        html = html.replace(
            /import\s+\{[^}]*createClient[^}]*\}\s+from\s+['"`]@supabase\/supabase-js['"`];?\s*/g,
            ''
        );
        
        html = html.replace(
            /const\s+supabase\s*=\s*createClient\([^)]+\);\s*/g,
            ''
        );
        
        // Pattern 7: Remove Supabase client initialization with nested object notation
        html = html.replace(
            /const\s+supabase\s*=\s*supabase\.createClient\([^)]+\);\s*/g,
            ''
        );
        
        // Pattern 8: Remove any Supabase URL/key references
        html = html.replace(
            /const\s+SUPABASE_URL\s*=\s*['"`][^'"`]+['"`];\s*/g,
            ''
        );
        
        html = html.replace(
            /const\s+SUPABASE_ANON_KEY\s*=\s*['"`][^'"`]+['"`];\s*/g,
            ''
        );
        
        // Pattern 9: Remove Initialize Supabase client comments
        html = html.replace(
            /\/\/\s*Initialize Supabase client\s*\n?/g,
            ''
        );
        
        logWithTimestamp("🔄 Supabase to API conversion completed successfully");
        return html;
        
    } catch (error) {
        logError(`Failed to convert Supabase calls to API calls: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback: return original HTML if conversion fails
        return html;
    }
}