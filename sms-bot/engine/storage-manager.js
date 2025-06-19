import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, COLORS, ANIMALS, ACTIONS, WTAF_DOMAIN, WEB_APP_URL } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';
import { generateFunSlug, injectSupabaseCredentials, replaceAppTableId } from './shared/utils.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate unique app slug for this user
 * Extracted from monitor.py generate_unique_app_slug function
 */
export async function generateUniqueAppSlug(userSlug) {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // Generate random 3-part slug
        const appSlug = generateFunSlug();
        
        // Check if this user already has an app with this slug
        try {
            const { data, error } = await supabase
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
            logWarning(`Error checking app slug uniqueness: ${error.message}`);
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
 * Get user ID from sms_subscribers table
 * Helper function for database operations
 */
async function getUserId(userSlug) {
    try {
        const { data, error } = await supabase
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
        logError(`Error finding user: ${error.message}`);
        return null;
    }
}

/**
 * Save HTML content to Supabase database
 * Extracted from monitor.py save_code_to_supabase function
 */
export async function saveCodeToSupabase(code, coach, userSlug, senderPhone, originalPrompt, adminTableId = null) {
    logWithTimestamp(`💾 Starting save_code_to_supabase: coach=${coach}, user_slug=${userSlug}, admin_table_id=${adminTableId}`);
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
        return { appSlug: null, publicUrl: null };
    }
    
    // Inject OpenGraph tags into HTML
    const publicUrl = `${WTAF_DOMAIN}/${userSlug}/${appSlug}`;
    
    // Inject Supabase credentials into HTML
    code = injectSupabaseCredentials(code, SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Replace APP_TABLE_ID placeholder with actual app_slug
    code = replaceAppTableId(code, appSlug);
    
    // Use fallback image URL for initial HTML - real OG image will be generated after save
    const ogImageUrl = `${WEB_APP_URL}/api/og-htmlcss?user=${userSlug}&app=${appSlug}`;
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
    
    // Save to Supabase
    try {
        const data = {
            user_id: userId,
            user_slug: userSlug,
            app_slug: appSlug,
            coach: coach,
            sender_phone: senderPhone,
            original_prompt: originalPrompt,
            html_content: code,
            status: 'published'
        };
        
        const { error } = await supabase
            .from('wtaf_content')
            .insert(data);
            
        if (error) {
            logError(`Error saving to Supabase: ${error.message}`);
            return { appSlug: null, publicUrl: null };
        }
        
        logSuccess(`Saved to Supabase: /wtaf/${userSlug}/${appSlug}`);
        return { appSlug, publicUrl };
        
    } catch (error) {
        logError(`Error saving to Supabase: ${error.message}`);
        return { appSlug: null, publicUrl: null };
    }
}

/**
 * Save code to legacy file system (for non-WTAF content)
 * Extracted from monitor.py save_code_to_file function
 */
export async function saveCodeToFile(code, coach, slug, webOutputDir) {
    const filename = `${slug}.html`;
    logWithTimestamp(`💾 Starting save_code_to_file: coach=${coach}, slug=${slug}`);
    
    const publicUrl = `${WEB_APP_URL}/lab/${filename}`;
    
    // Inject Supabase credentials into HTML
    code = injectSupabaseCredentials(code, SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Inject OpenGraph tags into HTML  
    const ogImageUrl = `${WEB_APP_URL}/api/og-htmlcss?app=${slug}`;
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
        logError(`Error writing file: ${error.message}`);
        return { filename: null, publicUrl: null };
    }
}

/**
 * Create required directories
 * Extracted from monitor.py directory creation logic
 */
export async function createRequiredDirectories(processedDir, claudeOutputDir, webOutputDir, watchDirs) {
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
                logError(`Error creating directory ${dir}: ${error.message}`);
                throw error;
            }
        }
        
        logSuccess("All directories created successfully");
        return true;
    } catch (error) {
        logError(`Error creating directories: ${error.message}`);
        logError(`Current working directory: ${process.cwd()}`);
        throw error;
    }
} 