import { COLORS, ANIMALS, ACTIONS } from './config.js';
import { logWithTimestamp } from './logger.js';

/**
 * Generate fun slug for apps
 * Extracted from monitor.py generate_fun_slug function
 */
export function generateFunSlug(): string {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    return `${color}-${animal}-${action}`;
}

/**
 * Extract code blocks from AI response
 * Extracted from monitor.py extract_code_blocks function
 */
export function extractCodeBlocks(text: string): string {
    // First try to extract content between ```html and ``` markers (most specific)
    let matches = text.match(/```html\s*([\s\S]*?)```/g);
    if (matches) {
        logWithTimestamp(`✅ Found ${matches.length} HTML code block(s)`);
        
        // Handle dual-page output: combine multiple HTML blocks with delimiter
        if (matches.length > 1) {
            // Look for delimiter between code blocks
            const delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->';
            if (text.includes(delimiter)) {
                logWithTimestamp("🔗 Detected dual-page output with delimiter - combining blocks");
                // Extract content from the matches (remove ```html and ```)
                const block1 = matches[0].replace(/```html\s*/, '').replace(/```$/, '');
                const block2 = matches[1].replace(/```html\s*/, '').replace(/```$/, '');
                return block1 + '\n' + delimiter + '\n' + block2;
            } else {
                logWithTimestamp("⚠️ Multiple HTML blocks found but no delimiter - using first block");
                return matches[0].replace(/```html\s*/, '').replace(/```$/, '');
            }
        } else {
            // Single HTML block - check if it contains the delimiter INSIDE
            const singleBlock = matches[0].replace(/```html\s*/, '').replace(/```$/, '');
            const delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->';
            if (singleBlock.includes(delimiter)) {
                logWithTimestamp("🔗 Detected dual-page output with delimiter INSIDE single code block");
                return singleBlock; // Return the whole block containing both pages
            } else {
                // Single page - return as normal
                return singleBlock;
            }
        }
    }
    
    // Try to find content between ```HTML and ``` markers (case insensitive)
    matches = text.match(/```HTML\s*([\s\S]*?)```/g);
    if (matches) {
        logWithTimestamp("✅ Found code block with HTML language specifier");
        return matches[0].replace(/```HTML\s*/, '').replace(/```$/, '');
    }
        
    // Try with just backticks and no language
    matches = text.match(/```\s*([\s\S]*?)```/g);
    if (matches) {
        logWithTimestamp("✅ Found code block without language specifier");
        return matches[0].replace(/```\s*/, '').replace(/```$/, '');
    }
    
    // Last resort: check if the text starts with <!DOCTYPE html> or <html>
    if (/^\s*<!DOCTYPE html>|^\s*<html>/i.test(text)) {
        logWithTimestamp("✅ Found raw HTML without code blocks");
        return text;
    }
        
    logWithTimestamp("⚠️ No code block or HTML found in response");
    logWithTimestamp(`📋 Response preview (first 100 chars): ${text.slice(0, 100)}`);
    return "";
}

/**
 * Inject Supabase credentials into HTML placeholders
 * Extracted from monitor.py inject_supabase_credentials function
 */
export function injectSupabaseCredentials(html: string, supabaseUrl: string, supabaseAnonKey?: string): string {
    let anonKey = supabaseAnonKey;
    if (!anonKey) {
        // Check for other common key variable names
        anonKey = process.env.SUPABASE_PUBLIC_KEY || '';
        if (!anonKey) {
            // Last resort: Use service key (not ideal but allows forms to work)
            anonKey = process.env.SUPABASE_SERVICE_KEY || '';
            logWithTimestamp("⚠️ Using SUPABASE_SERVICE_KEY for frontend (should use SUPABASE_ANON_KEY)");
        }
    }
    
    // Replace standard placeholders
    html = html.replace(/YOUR_SUPABASE_URL/g, supabaseUrl);
    html = html.replace(/YOUR_SUPABASE_ANON_KEY/g, anonKey);
    
    // More robust replacement for cases where Claude doesn't use exact placeholders
    // Look for createClient calls with empty or placeholder API keys
    html = html.replace(
        /createClient\(\s*['"]([^'"]+)['"],\s*['"]["']?\s*\)/g,
        `createClient('${supabaseUrl}', '${anonKey}')`
    );
    
    // Also handle cases where URL might be missing
    html = html.replace(
        /createClient\(\s*['"]["'],?\s*['"]([^'"]*)['"]?\s*\)/g,
        `createClient('${supabaseUrl}', '${anonKey}')`
    );
    
    logWithTimestamp(`🔑 Injected Supabase credentials: URL=${supabaseUrl.slice(0, 20)}..., Key=${anonKey.slice(0, 10)}...`);
    
    return html;
}

/**
 * Replace APP_TABLE_ID placeholder with actual app_slug
 * Extracted from monitor.py save_code_to_supabase function
 */
export function replaceAppTableId(html: string, appSlug: string): string {
    html = html.replace(/'APP_TABLE_ID'/g, `'${appSlug}'`);
    html = html.replace(/"APP_TABLE_ID"/g, `"${appSlug}"`);
    logWithTimestamp(`🔧 Replaced APP_TABLE_ID with: ${appSlug}`);
    return html;
}

type RequestType = 'game' | 'app';

/**
 * Detect request type from user prompt
 * Extracted from monitor.py detect_request_type function
 */
export function detectRequestType(userPrompt: string): RequestType {
    const promptLower = userPrompt.toLowerCase();
    
    // Game keywords
    const gameKeywords: readonly string[] = ['game', 'pong', 'tetris', 'snake', 'tic-tac-toe', 'memory game', 
                         'quiz', 'trivia', 'puzzle', 'arcade', 'solitaire', 'blackjack',
                         'breakout', 'flappy', 'platformer', 'shooter', 'racing', 'cards'];
    
    // Use word boundary matching to avoid false positives
    // Check for game keywords
    for (const keyword of gameKeywords) {
        // Use word boundaries for single words, exact match for phrases
        if (keyword.includes(' ')) {
            if (promptLower.includes(keyword)) {
                return 'game';
            }
        } else {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            if (regex.test(promptLower)) {
                return 'game';
            }
        }
    }
    
    // Everything else is an app (with data collection by default)
    return 'app';
} 