import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';

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
 * Parse stackable command from user input
 * Extracts app slug and cleaned user request
 */
export function parseStackCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Expected format: "wtaf --stack app-slug user request here"
    const match = input.match(/^wtaf\s+--stack\s+([a-z-]+)\s+(.+)$/i);
    if (!match) {
        return null;
    }
    
    return {
        appSlug: match[1],
        userRequest: match[2]
    };
}

/**
 * Verify user owns the specified app and get its UUID
 * Returns the app's UUID if ownership is verified, null otherwise
 */
export async function verifyOwnershipAndGetUUID(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🔍 Verifying ownership: ${userSlug} owns ${appSlug}`);
        
        // Get user_id from sms_subscribers table
        const { data: userData, error: userError } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('id')
            .eq('slug', userSlug)
            .single();
            
        if (userError || !userData) {
            logError(`User not found: ${userSlug}`);
            return null;
        }
        
        const userId = userData.id;
        
        // Check app ownership and get UUID
        const { data: appData, error: appError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('id, app_slug')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (appError || !appData) {
            logWarning(`App '${appSlug}' not found or not owned by ${userSlug}`);
            return null;
        }
        
        logSuccess(`✅ Ownership verified: ${userSlug} owns ${appSlug}`);
        logWithTimestamp(`🆔 App UUID: ${appData.id}`);
        return appData.id;
        
    } catch (error) {
        logError(`Error verifying ownership: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Load aesthetic data from submission tables using smart UUID/slug lookup
 * Preserves legacy data while using secure UUID for new apps
 */
export async function loadStackedAestheticData(contentUuid: string, appSlug: string): Promise<any> {
    try {
        logWithTimestamp(`📊 Loading aesthetic data using smart lookup...`);
        
        // Try new secure method first (UUID in wtaf_submissions)
        logWithTimestamp(`🔒 Primary lookup: Using secure UUID (${contentUuid})`);
        let { data: submissions, error: subError } = await getSupabaseClient()
            .from('wtaf_submissions')
            .select('submission_data, created_at')
            .eq('app_id', contentUuid)
            .order('created_at', { ascending: false })
            .limit(10); // Get more samples for better aesthetic analysis
        
        if (submissions && submissions.length > 0) {
            logSuccess(`✅ Found ${submissions.length} submissions using secure UUID method`);
            return extractAestheticPatterns(submissions, 'admin');
        }
        
        logWithTimestamp(`⚠️  No submissions found with secure UUID, trying legacy slug lookup for backward compatibility...`);
        
        // Fallback to legacy method (slug in wtaf_submissions)
        const { data: legacySubmissions, error: legacyError } = await getSupabaseClient()
            .from('wtaf_submissions')
            .select('submission_data, created_at')
            .eq('app_id', appSlug)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (legacySubmissions && legacySubmissions.length > 0) {
            logSuccess(`✅ Found ${legacySubmissions.length} submissions using legacy slug method`);
            return extractAestheticPatterns(legacySubmissions, 'admin');
        }
        
        // Try ZAD collaborative table (UUID first, then slug)
        logWithTimestamp(`🤝 Checking ZAD collaborative data...`);
        
        let { data: zadData } = await getSupabaseClient()
            .from('wtaf_zero_admin_collaborative')
            .select('participant_data, session_data, created_at')
            .eq('app_id', contentUuid)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (!zadData || zadData.length === 0) {
            // Try legacy slug for ZAD data
            const { data: legacyZadData } = await getSupabaseClient()
                .from('wtaf_zero_admin_collaborative')
                .select('participant_data, session_data, created_at')
                .eq('app_id', appSlug)
                .order('created_at', { ascending: false })
                .limit(10);
                
            zadData = legacyZadData || [];
        }
        
        if (zadData && zadData.length > 0) {
            logSuccess(`✅ Found ${zadData.length} ZAD collaborative entries`);
            return extractAestheticPatterns(zadData, 'zad');
        }
        
        // No data found - return default aesthetic
        logWithTimestamp(`⚠️  No aesthetic data found - using WTAF default style`);
        return {
            gradients: ["linear-gradient(45deg, #3F88FF, #6E7FFF)"],
            emojis: ["✨", "🌟", "💫"],
            colors: ["hsl(220, 100%, 60%)"],
            hasData: false,
            dataSource: 'default',
            sampleCount: 0
        };
        
    } catch (error) {
        logError(`Error loading aesthetic data: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Extract aesthetic patterns from submission data
 * Handles both admin submissions and ZAD collaborative data
 */
function extractAestheticPatterns(dataArray: any[], dataType: 'admin' | 'zad'): any {
    const aestheticData = {
        gradients: [] as string[],
        emojis: [] as string[],
        colors: [] as string[],
        themes: [] as string[],
        hasData: true,
        dataSource: dataType,
        sampleCount: dataArray.length
    };
    
    dataArray.forEach((entry, index) => {
        logWithTimestamp(`  📝 ${dataType.toUpperCase()} Entry ${index + 1}: ${JSON.stringify(entry).substring(0, 100)}...`);
        
        let data;
        if (dataType === 'admin') {
            data = entry.submission_data;
        } else {
            // ZAD data - extract from participant_data or session_data
            data = entry.participant_data || entry.session_data || {};
        }
        
        if (!data) return;
        
        // Extract gradients
        if (data.gradient) {
            aestheticData.gradients.push(data.gradient);
        }
        if (data.background && data.background.includes('gradient')) {
            aestheticData.gradients.push(data.background);
        }
        
        // Extract colors
        if (data.backgroundColor) {
            aestheticData.colors.push(data.backgroundColor);
        }
        if (data.color) {
            aestheticData.colors.push(data.color);
        }
        if (data.primaryColor) {
            aestheticData.colors.push(data.primaryColor);
        }
        
        // Extract emojis
        if (data.emojis) {
            if (Array.isArray(data.emojis)) {
                data.emojis.forEach((emoji: any) => {
                    const emojiText = typeof emoji === 'string' ? emoji : emoji.text;
                    if (emojiText && !aestheticData.emojis.includes(emojiText)) {
                        aestheticData.emojis.push(emojiText);
                    }
                });
            }
        }
        if (data.emoji && !aestheticData.emojis.includes(data.emoji)) {
            aestheticData.emojis.push(data.emoji);
        }
        
        // Extract themes or styles
        if (data.theme) {
            aestheticData.themes.push(data.theme);
        }
        if (data.style) {
            aestheticData.themes.push(data.style);
        }
    });
    
    // Remove duplicates and limit counts
    aestheticData.gradients = [...new Set(aestheticData.gradients)].slice(0, 5);
    aestheticData.colors = [...new Set(aestheticData.colors)].slice(0, 8);
    aestheticData.emojis = [...new Set(aestheticData.emojis)].slice(0, 12);
    aestheticData.themes = [...new Set(aestheticData.themes)].slice(0, 3);
    
    logWithTimestamp(`🎨 Extracted aesthetic patterns:`);
    logWithTimestamp(`   Gradients: ${aestheticData.gradients.length} unique`);
    logWithTimestamp(`   Colors: ${aestheticData.colors.length} unique`);
    logWithTimestamp(`   Emojis: ${aestheticData.emojis.length} unique`);
    logWithTimestamp(`   Themes: ${aestheticData.themes.length} unique`);
    
    return aestheticData;
}

/**
 * Enhance user prompt with inherited aesthetic data
 * Creates a rich prompt that guides the AI to use the same design DNA
 */
export function enhancePromptWithAesthetics(userRequest: string, aestheticData: any): string {
    let enhancedPrompt = `Build: ${userRequest}

AESTHETIC INHERITANCE FROM PREVIOUS APP:
`;

    if (aestheticData.hasData) {
        enhancedPrompt += `
🎨 INHERITED DESIGN DNA (${aestheticData.dataSource.toUpperCase()} data, ${aestheticData.sampleCount} samples):`;

        if (aestheticData.gradients.length > 0) {
            enhancedPrompt += `
- Color Gradients: ${aestheticData.gradients.join(', ')}`;
        }
        
        if (aestheticData.colors.length > 0) {
            enhancedPrompt += `
- Color Palette: ${aestheticData.colors.join(', ')}`;
        }
        
        if (aestheticData.emojis.length > 0) {
            enhancedPrompt += `
- Emoji Library: ${aestheticData.emojis.join(' ')}`;
        }
        
        if (aestheticData.themes.length > 0) {
            enhancedPrompt += `
- Style Themes: ${aestheticData.themes.join(', ')}`;
        }

        enhancedPrompt += `

CRITICAL INHERITANCE REQUIREMENTS:
1. Use the SAME color gradients and palette from the inherited design
2. Use emojis ONLY from the provided emoji library 
3. Maintain the same aesthetic "feel" and visual energy
4. Apply this design DNA to the new request while making it functional
5. Keep the visual style consistent with the original app's aesthetic DNA

The new app should feel like it belongs to the same design family as the original.`;
    } else {
        enhancedPrompt += `
⚠️  NO INHERITED DATA - using default WTAF aesthetic:
- Gradient: linear-gradient(45deg, #3F88FF, #6E7FFF)  
- Emojis: ✨ 🌟 💫
- Style: Clean, modern, tech-forward, slightly chaotic-chic

Use WTAF's signature style: premium but rebellious, clean but with personality.`;
    }
    
    enhancedPrompt += `

TECHNICAL REQUIREMENTS:
- Return complete HTML with embedded CSS and JavaScript
- Make it responsive and production-ready
- Include proper error handling for all interactive features
- Follow modern web development best practices`;

    return enhancedPrompt;
}

/**
 * Process stackables request end-to-end
 * Main function that orchestrates the entire stackables workflow
 */
export async function processStackablesRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    aestheticData?: any; 
    enhancedPrompt?: string; 
    error?: string 
}> {
    try {
        // Step 1: Parse the stack command
        const parsed = parseStackCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stack command format. Use: wtaf --stack app-slug your request here' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🧱 Processing stackables request: ${appSlug} → "${userRequest}"`);
        
        // Step 2: Verify ownership and get UUID
        const contentUuid = await verifyOwnershipAndGetUUID(userSlug, appSlug);
        if (!contentUuid) {
            return { 
                success: false, 
                error: `You don't own app '${appSlug}' or it doesn't exist` 
            };
        }
        
        // Step 3: Load aesthetic data with smart lookup
        const aestheticData = await loadStackedAestheticData(contentUuid, appSlug);
        
        // Step 4: Enhance prompt with aesthetic inheritance
        const enhancedPrompt = enhancePromptWithAesthetics(userRequest, aestheticData);
        
        logSuccess(`✅ Stackables request processed successfully`);
        return {
            success: true,
            userRequest,
            aestheticData,
            enhancedPrompt
        };
        
    } catch (error) {
        logError(`Error processing stackables request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
} 