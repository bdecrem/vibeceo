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
    if (!supabaseAnonKey) {
        // Check for other common key variable names
        const publicKey = process.env.SUPABASE_PUBLIC_KEY || '';
        if (publicKey) {
            supabaseAnonKey = publicKey;
        } else {
            // Last resort: Use service key (not ideal but allows forms to work)
            supabaseAnonKey = process.env.SUPABASE_SERVICE_KEY || '';
            logWithTimestamp("⚠️ Using SUPABASE_SERVICE_KEY for frontend (should use SUPABASE_ANON_KEY)");
        }
    }
    
    // Replace standard placeholders
    html = html.replace(/YOUR_SUPABASE_URL/g, supabaseUrl);
    html = html.replace(/YOUR_SUPABASE_ANON_KEY/g, supabaseAnonKey);
    
    // More robust replacement for cases where Claude doesn't use exact placeholders
    // Look for createClient calls with empty or placeholder API keys
    html = html.replace(
        /createClient\(\s*['"]([^'"]+)['"],\s*['"]["']?\s*\)/g,
        `createClient('${supabaseUrl}', '${supabaseAnonKey}')`
    );
    
    // Also handle cases where URL might be missing
    html = html.replace(
        /createClient\(\s*['"]["'],?\s*['"]([^'"]*)['"]?\s*\)/g,
        `createClient('${supabaseUrl}', '${supabaseAnonKey}')`
    );
    
    logWithTimestamp(`🔑 Injected Supabase credentials: URL=${supabaseUrl.slice(0, 20)}..., Key=${supabaseAnonKey.slice(0, 10)}...`);
    
    return html;
}

/**
 * Replace APP_TABLE_ID placeholder with actual app_slug
 * Uses regex to catch ANY app_id value Claude generates, not just specific placeholders
 */
export function replaceAppTableId(html: string, appSlug: string): string {
    // Replace standard placeholder first
    html = html.replace(/'APP_TABLE_ID'/g, `'${appSlug}'`);
    html = html.replace(/"APP_TABLE_ID"/g, `"${appSlug}"`);
    
    // Use regex to replace ANY hardcoded app_id values in Supabase calls
    // Pattern: .eq('app_id', 'any_value') -> .eq('app_id', 'uuid')
    html = html.replace(/\.eq\(\s*['"]app_id['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `.eq('app_id', '${appSlug}')`);
    
    // Pattern: app_id: 'any_value' -> app_id: 'uuid'  
    html = html.replace(/app_id\s*:\s*['"][^'"]*['"]/g, `app_id: '${appSlug}'`);
    
    logWithTimestamp(`🔧 Replaced ANY app_id values with: ${appSlug}`);
    return html;
}

/**
 * Inject submission UUID for admin pages
 * Admin pages use their own UUID for the page, but main app's UUID for data operations
 */
export function injectSubmissionUuid(html: string, submissionUuid: string): string {
    // Replace standard placeholder
    html = html.replace(/'APP_TABLE_ID'/g, `'${submissionUuid}'`);
    html = html.replace(/"APP_TABLE_ID"/g, `"${submissionUuid}"`);
    
    // Use regex to replace any hardcoded app_id values in Supabase calls
    // Pattern: .eq('app_id', 'any_value') -> .eq('app_id', 'uuid')
    html = html.replace(/\.eq\(\s*['"]app_id['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `.eq('app_id', '${submissionUuid}')`);
    
    // Pattern: app_id: 'any_value' -> app_id: 'uuid'
    html = html.replace(/app_id\s*:\s*['"][^'"]*['"]/g, `app_id: '${submissionUuid}'`);
    
    logWithTimestamp(`📊 Admin page configured to use submission UUID: ${submissionUuid}`);
    return html;
}

/**
 * Fix ZAD APP_ID generation to use actual UUID
 * ZAD apps need the real wtaf_content.id UUID so users can connect to each other
 */
export function fixZadAppId(html: string, appUuid: string): string {
    // Replace ANY APP_ID assignment with the actual UUID
    // This ensures all users connecting to the same ZAD app use the same UUID
    
    // Pattern 1: const APP_ID = 'test1'; (builder template placeholder)
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"]test\d*['"];?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 2: const APP_ID = 'any_string';
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 3: let APP_ID = 'any_string';
    html = html.replace(
        /let\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `let APP_ID = '${appUuid}';`
    );
    
    // Pattern 4: var APP_ID = 'any_string';
    html = html.replace(
        /var\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `var APP_ID = '${appUuid}';`
    );
    
    // Pattern 5: const APP_ID = 'PREFIX_' + Math.random()... (random generation)
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"][^'"]*['"][\s]*\+[\s]*Math\.random\(\)\.toString\(36\)\.substr\(2,\s*\d+\)\s*;?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 5b: More general random generation patterns
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"][^'"]*['"][\s]*\+[\s]*Math\.random\(\)[^;]+;?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 6: let/var APP_ID with random generation
    html = html.replace(
        /(let|var)\s+APP_ID\s*=\s*['"][^'"]*['"]\s*\+\s*Math\.random\(\)[^;]+;?/g,
        `let APP_ID = '${appUuid}';`
    );
    
    // Pattern 7: Direct usage in Supabase calls with random generation
    html = html.replace(
        /app_id:\s*['"][^'"]*['"][\s]*\+[\s]*Math\.random\(\)[^,}]+/g,
        `app_id: '${appUuid}'`
    );
    
    // Pattern 8: .eq('app_id', 'any_value') calls in Supabase queries
    html = html.replace(
        /\.eq\(\s*['"]app_id['"]\s*,\s*['"][^'"]*['"]\s*\)/g,
        `.eq('app_id', '${appUuid}')`
    );
    
    // Pattern 9: Any remaining hardcoded app_id values in database calls
    // Use RegExp constructor to properly handle UUID in the negative lookahead
    const escapedUuid = appUuid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const appIdRegex = new RegExp(`app_id:\\s*['"](?!${escapedUuid})[^'"]*['"](?!\\s*\\+)`, 'g');
    html = html.replace(appIdRegex, `app_id: '${appUuid}'`);
    
    logWithTimestamp(`🤝 Fixed ZAD APP_ID to use actual UUID: ${appUuid}`);
    return html;
}

/**
 * Detect request type from user prompt
 * Extracted from monitor.py detect_request_type function
 */
export function detectRequestType(userPrompt: string): 'game' | 'app' {
    const promptLower = userPrompt.toLowerCase();
    
    // Game keywords
    const gameKeywords = ['game', 'pong', 'tetris', 'snake', 'tic-tac-toe', 'memory game', 
                         'arcade', 'solitaire', 'blackjack', 'breakout', 'flappy', 'platformer'];
    
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

/**
 * Strip existing OG (Open Graph) tags from HTML
 * Prevents duplicate OG images when remixing apps
 */
export function stripOGTags(html: string): string {
    logWithTimestamp('🧹 Stripping existing OG tags from HTML to prevent duplicates');
    
    // Remove Open Graph meta tags
    html = html.replace(/<meta\s+property\s*=\s*["']og:[^"']*["'][^>]*>/gi, '');
    
    // Remove Twitter Card meta tags
    html = html.replace(/<meta\s+name\s*=\s*["']twitter:[^"']*["'][^>]*>/gi, '');
    
    // Remove generic title tag (will be replaced with new one)
    html = html.replace(/<title[^>]*>.*?<\/title>/gi, '');
    
    // Clean up any multiple consecutive newlines left by removal
    html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    logWithTimestamp('✅ Existing OG tags stripped successfully');
    return html;
} 

/**
 * Fix ZAD API calls to use actual UUID instead of placeholder
 * ZAD API apps need the real wtaf_content.id UUID so users can connect to each other
 */
export function fixZadApiCalls(html: string, appUuid: string): string {
    // Replace ANY APP_ID assignment with the actual UUID for API-based ZADs
    // This ensures all users connecting to the same ZAD app use the same UUID
    
    // Pattern 1: const APP_ID = 'test1'; (builder template placeholder)
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"]test\d*['"];?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 2: const APP_ID = 'any_string';
    html = html.replace(
        /const\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `const APP_ID = '${appUuid}';`
    );
    
    // Pattern 3: let APP_ID = 'any_string';
    html = html.replace(
        /let\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `let APP_ID = '${appUuid}';`
    );
    
    // Pattern 4: var APP_ID = 'any_string';
    html = html.replace(
        /var\s+APP_ID\s*=\s*['"][^'"]*['"];?/g,
        `var APP_ID = '${appUuid}';`
    );
    
    // Pattern 5: API URL parameters with placeholder app_id
    // Replace app_id query parameters in API calls
    html = html.replace(
        /app_id['"]\s*,\s*['"][^'"]*['"]/g,
        `app_id', '${appUuid}'`
    );
    
    // Pattern 6: JSON body app_id values in API calls
    html = html.replace(
        /app_id:\s*['"][^'"]*['"]/g,
        `app_id: '${appUuid}'`
    );
    
    logWithTimestamp(`🤝 Fixed ZAD API calls to use actual UUID: ${appUuid}`);
    return html;
}

/**
 * Auto-fix common issues in generated HTML/JavaScript code
 * Prevents common errors that break ZAD apps completely
 * Based on zad-tuner.cjs autoFixCommonIssues function
 */
export function autoFixCommonIssues(html: string): string {
    logWithTimestamp('🔧 Running auto-fix for common issues...');
    let fixed = html;
    let fixesApplied = 0;
    
    // Fix 1: Make showNewUserScreen async
    if (fixed.includes('showNewUserScreen()') && !fixed.includes('async function showNewUserScreen()')) {
        fixed = fixed.replace(
            /function showNewUserScreen\(\)/g,
            'async function showNewUserScreen()'
        );
        if (fixed !== html) {
            fixesApplied++;
            logWithTimestamp('🔧 Fixed: Made showNewUserScreen async');
        }
    }
    
    // Fix 2: Fix APP_ID to correct value (catch common wrong values)
    const wrongAppIds = ['hello_world_generator', 'hello_world_gen', 'test_app', 'sample_app'];
    wrongAppIds.forEach(wrongId => {
        if (fixed.includes(`'${wrongId}'`)) {
            // This will be handled by existing replaceAppTableId function later
            logWithTimestamp(`⚠️ Warning: Found hardcoded APP_ID '${wrongId}' - will be corrected by UUID injection`);
        }
    });
    
    // Fix 3: Warning about userLabel query issues
    if (fixed.includes('userLabel') && fixed.includes('.eq(') && fixed.includes('.single()')) {
        logWithTimestamp('⚠️ Warning: userLabel query detected - ensure proper error handling for missing users');
    }
    
    // Fix 4: Remove duplicate variable declarations (NEW FIX from memory)
    const duplicateCurrentUserMatches = fixed.match(/let currentUser = null;/g);
    if (duplicateCurrentUserMatches && duplicateCurrentUserMatches.length > 1) {
        logWithTimestamp(`🔧 Found ${duplicateCurrentUserMatches.length} duplicate 'let currentUser = null;' declarations`);
        
        // Split into lines, find first occurrence, remove duplicates
        const lines = fixed.split('\n');
        let firstOccurrenceFound = false;
        
        const fixedLines = lines.map(line => {
            if (line.includes('let currentUser = null;')) {
                if (!firstOccurrenceFound) {
                    firstOccurrenceFound = true;
                    return line; // Keep the first occurrence
                } else {
                    return ''; // Remove duplicate occurrences
                }
            }
            return line;
        });
        
        fixed = fixedLines.join('\n');
        // Clean up any extra empty lines
        fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        fixesApplied++;
        logWithTimestamp('🔧 Fixed: Removed duplicate currentUser declaration');
    }
    
    // Fix 5: Fix malformed escaped quotes in JavaScript strings (NEW FIX for iframe srcDoc issues)
    // Pattern: 'SQUAD\\'S becomes 'SQUAD\'S (malformed) → should be 'SQUAD\\'S or "SQUAD'S"
    const malformedQuotePattern = /'[^']*\\'[^']*'/g;
    const malformedQuotes = fixed.match(malformedQuotePattern);
    if (malformedQuotes && malformedQuotes.length > 0) {
        logWithTimestamp(`🔧 Found ${malformedQuotes.length} malformed escaped quote(s) in strings`);
        
        // Fix malformed escape sequences in strings
        // Convert 'text\\'s more' to "text's more" (use double quotes to avoid escaping)
        fixed = fixed.replace(/'([^']*)\\'([^']*)'/g, '"$1\'$2"');
        
        // Also fix any remaining backslash-quote issues
        fixed = fixed.replace(/\\'/g, "'");
        
        fixesApplied++;
        logWithTimestamp('🔧 Fixed: Corrected malformed escaped quotes in JavaScript strings');
    }
    
    // Additional duplicate variable pattern fixes
    const duplicatePatterns = [
        /let userState = null;/g,
        /let appState = null;/g,
        /const supabase = /g
    ];
    
    duplicatePatterns.forEach((pattern, index) => {
        const matches = fixed.match(pattern);
        if (matches && matches.length > 1) {
            const patternName = ['userState', 'appState', 'supabase'][index];
            logWithTimestamp(`🔧 Found ${matches.length} duplicate '${patternName}' declarations`);
            
            // For each pattern, keep only the first occurrence
            const lines = fixed.split('\n');
            let firstFound = false;
            
            const fixedLines = lines.map(line => {
                if (pattern.test(line)) {
                    if (!firstFound) {
                        firstFound = true;
                        return line; // Keep first occurrence
                    } else {
                        return ''; // Remove duplicates
                    }
                }
                return line;
            });
            
            fixed = fixedLines.join('\n');
            fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');
            
            fixesApplied++;
            logWithTimestamp(`🔧 Fixed: Removed duplicate ${patternName} declaration`);
        }
    });
    
    if (fixesApplied > 0) {
        logWithTimestamp(`✅ Auto-fix completed: ${fixesApplied} issue(s) fixed`);
    } else {
        logWithTimestamp('✅ Auto-fix completed: No issues found');
    }
    
    return fixed;
} 