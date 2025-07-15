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
 * UPDATED: Now handles both direct Supabase calls AND API call patterns
 */
export function replaceAppTableId(html: string, appSlug: string): string {
    // Replace standard placeholder first
    html = html.replace(/'APP_TABLE_ID'/g, `'${appSlug}'`);
    html = html.replace(/"APP_TABLE_ID"/g, `"${appSlug}"`);
    
    // NEW: Replace APP_TABLE_ID in API URL query parameters (works inside iframe HTML encoding)
    // Pattern: app_id=APP_TABLE_ID -> app_id=uuid (regardless of surrounding quotes)
    html = html.replace(/app_id=APP_TABLE_ID/g, `app_id=${appSlug}`);
    
    // NEW: Handle ANY hardcoded app_id value in URL query parameters
    // Pattern: app_id=any_hardcoded_value -> app_id=uuid (catch values like WTAF_CONTACT_FORM)
    // FIXED: Exclude template literal patterns to avoid breaking ${encodeURIComponent(app_id)} patterns
    html = html.replace(/app_id=([^'&\s\)${}]+)/g, `app_id=${appSlug}`);
    
    // NEW: Handle HTML entity encoded quotes in URL parameters
    // Pattern: app_id=&#x27;any_value&#x27; -> app_id=uuid (HTML entity encoded)
    html = html.replace(/app_id=&#x27;([^&#]+)&#x27;/g, `app_id=${appSlug}`);
    
    // NEW: Handle API fetch body patterns
    // Pattern: app_id: 'APP_TABLE_ID' -> app_id: 'uuid' (in JSON body)
    html = html.replace(/(['"]app_id['"]:\s*)['"]APP_TABLE_ID['"]/g, `$1'${appSlug}'`);
    
    // NEW: Handle hardcoded app_id values in API fetch body 
    // Pattern: app_id: 'any_hardcoded_value' -> app_id: 'uuid' (in JSON body)
    html = html.replace(/(['"]app_id['"]:\s*)['"][^'"]*['"]/g, `$1'${appSlug}'`);
    
    // NEW: Handle HTML entity encoded fetch calls
    // Pattern: fetch(&#x27;/api/admin/load?app_id=any_value&#x27;) -> fetch('/api/admin/load?app_id=uuid')
    html = html.replace(/fetch\(&#x27;\/api\/admin\/load\?app_id=([^&#&]+)[^&#]*&#x27;\)/g, `fetch('/api/admin/load?app_id=${appSlug}')`);
    // Pattern: fetch(&#x27;/api/admin/save&#x27;) with app_id in body
    html = html.replace(/fetch\(&#x27;\/api\/admin\/save&#x27;/g, `fetch('/api/admin/save'`);
    
    // Use regex to replace ANY hardcoded app_id values in Supabase calls
    // Pattern: .eq('app_id', 'any_value') -> .eq('app_id', 'uuid')
    html = html.replace(/\.eq\(\s*['"]app_id['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `.eq('app_id', '${appSlug}')`);
    
    // Pattern: app_id: 'any_value' -> app_id: 'uuid' (in Supabase object notation)
    html = html.replace(/app_id\s*:\s*['"][^'"]*['"]/g, `app_id: '${appSlug}'`);
    
    logWithTimestamp(`🔧 Replaced ANY app_id values (Supabase + API) with: ${appSlug}`);
    return html;
}

/**
 * Inject submission UUID for admin pages
 * Admin pages use their own UUID for the page, but main app's UUID for data operations
 * UPDATED: Now handles both direct Supabase calls AND API call patterns (like working minimal test)
 */
export function injectSubmissionUuid(html: string, submissionUuid: string): string {
    // Replace standard placeholder
    html = html.replace(/'APP_TABLE_ID'/g, `'${submissionUuid}'`);
    html = html.replace(/"APP_TABLE_ID"/g, `"${submissionUuid}"`);
    
    // NEW: Replace APP_TABLE_ID in API URL query parameters (same as replaceAppTableId)
    html = html.replace(/app_id=APP_TABLE_ID/g, `app_id=${submissionUuid}`);
    
    // NEW: Handle ANY hardcoded app_id value in URL query parameters
    html = html.replace(/app_id=([^'&\s\)]+)/g, `app_id=${submissionUuid}`);
    
    // NEW: Handle HTML entity encoded quotes in URL parameters
    // Pattern: app_id=&#x27;any_value&#x27; -> app_id=uuid (HTML entity encoded)
    html = html.replace(/app_id=&#x27;([^&#]+)&#x27;/g, `app_id=${submissionUuid}`);
    
    // NEW: Handle API fetch body patterns (same as working minimal test)
    // Pattern: app_id: 'APP_TABLE_ID' -> app_id: 'uuid' (in JSON body)
    html = html.replace(/(['"]app_id['"]:\s*)['"]APP_TABLE_ID['"]/g, `$1'${submissionUuid}'`);
    
    // NEW: Handle hardcoded app_id values in API fetch body 
    // Pattern: app_id: 'any_hardcoded_value' -> app_id: 'uuid' (in JSON body)
    html = html.replace(/(['"]app_id['"]:\s*)['"][^'"]*['"]/g, `$1'${submissionUuid}'`);
    
    // NEW: Handle HTML entity encoded fetch calls (same as replaceAppTableId)
    // Pattern: fetch(&#x27;/api/admin/load?app_id=any_value&#x27;) -> fetch('/api/admin/load?app_id=uuid')
    html = html.replace(/fetch\(&#x27;\/api\/admin\/load\?app_id=([^&#&]+)[^&#]*&#x27;\)/g, `fetch('/api/admin/load?app_id=${submissionUuid}')`);
    // Pattern: fetch(&#x27;/api/admin/save&#x27;) with app_id in body
    html = html.replace(/fetch\(&#x27;\/api\/admin\/save&#x27;/g, `fetch('/api/admin/save'`);
    
    // Use regex to replace any hardcoded app_id values in Supabase calls
    // Pattern: .eq('app_id', 'any_value') -> .eq('app_id', 'uuid')
    html = html.replace(/\.eq\(\s*['"]app_id['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `.eq('app_id', '${submissionUuid}')`);
    
    // Pattern: app_id: 'any_value' -> app_id: 'uuid'
    html = html.replace(/app_id\s*:\s*['"][^'"]*['"]/g, `app_id: '${submissionUuid}'`);
    
    logWithTimestamp(`📊 Admin page configured to use submission UUID (Supabase + API): ${submissionUuid}`);
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
    
    // Fix 4: Remove duplicate variable declarations
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
    
    // Fix 5: Fix malformed escaped quotes in JavaScript strings
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

/**
 * Auto-fix issues that are safe for API-based apps
 * Applies fixes: 1, 2, 3, 4, 5, 6, 7, 9, 10
 * Skips fixes: 8 (not needed for API apps)
 */
export function autoFixApiSafeIssues(html: string): string {
    logWithTimestamp('🔧 Running API-safe auto-fix...');
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
    
    // Fix 3: Improve API error handling (modified for API apps)
    const genericErrorPatterns = [
        // Convert generic console.log errors to user-friendly alerts
        { from: /console\.log\(error\)/g, to: 'alert("Operation failed: " + error.message)', desc: 'generic console.log error handling' },
        // Convert generic error handling to API-friendly patterns
        { from: /catch\s*\(\s*error\s*\)\s*\{\s*console\.error\(['"`]([^'"`]+)['"`],\s*error\);?\s*\}/g, to: 'catch (error) {\n        console.error(\'$1\', error);\n        alert(\'$1: \' + error.message);\n    }', desc: 'API error handling with user feedback' },
        // Improve generic error messages
        { from: /throw new Error\(['"`]([^'"`]+)['"`]\)/g, to: 'throw new Error(\'$1: \' + (error?.message || \'Unknown error\'))', desc: 'enhanced error messages' }
    ];
    
    let errorFixesApplied = 0;
    genericErrorPatterns.forEach(({from, to, desc}) => {
        const originalFixed = fixed;
        fixed = fixed.replace(from, to);
        if (fixed !== originalFixed) {
            errorFixesApplied++;
            logWithTimestamp(`🔧 Fixed: ${desc}`);
        }
    });
    
    if (errorFixesApplied > 0) {
        logWithTimestamp(`🔧 Applied ${errorFixesApplied} API error handling improvements`);
        fixesApplied += errorFixesApplied;
    }

    // Fix 4: Remove duplicate variable declarations
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
    
    // Fix 6 & 7: Remove duplicate userState and appState declarations
    const duplicatePatterns = [
        { pattern: /let userState = null;/g, name: 'userState' },
        { pattern: /let appState = null;/g, name: 'appState' }
    ];
    
    duplicatePatterns.forEach(({pattern, name}) => {
        const matches = fixed.match(pattern);
        if (matches && matches.length > 1) {
            logWithTimestamp(`🔧 Found ${matches.length} duplicate '${name}' declarations`);
            
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
            logWithTimestamp(`🔧 Fixed: Removed duplicate ${name} declaration`);
        }
    });
    
    // Fix 5: Smart quote fixing that avoids JSON contexts (API-safe version)
    const malformedQuotePattern = /'[^']*\\'[^']*'/g;
    const malformedQuotes = fixed.match(malformedQuotePattern);
    if (malformedQuotes && malformedQuotes.length > 0) {
        logWithTimestamp(`🔧 Found ${malformedQuotes.length} malformed escaped quote(s) in strings`);
        
        // Smart quote fixing that avoids JSON contexts
        const lines = fixed.split('\n');
        const fixedLines = lines.map(line => {
            // Skip lines that look like JSON in fetch calls, JSON.stringify, or similar
            if (line.includes('fetch(') || line.includes('JSON.stringify') || line.includes('body:') || line.includes('"Content-Type"')) {
                return line; // Leave JSON-related lines untouched
            }
            
            // Fix malformed escape sequences in regular JavaScript strings
            // Convert 'text\\'s more' to "text's more" (use double quotes to avoid escaping)
            return line.replace(/'([^']*)\\'([^']*)'/g, '"$1\'$2"');
        });
        
        fixed = fixedLines.join('\n');
        
        // Also fix any remaining backslash-quote issues outside of JSON contexts
        const nonJsonLines = fixed.split('\n').map(line => {
            if (line.includes('fetch(') || line.includes('JSON.stringify') || line.includes('body:') || line.includes('"Content-Type"')) {
                return line;
            }
            return line.replace(/\\'/g, "'");
        });
        
        fixed = nonJsonLines.join('\n');
        
        fixesApplied++;
        logWithTimestamp('🔧 Fixed: Corrected malformed escaped quotes (API-safe, avoids JSON contexts)');
    }

    // Fix 9: Clean up extra empty lines (already done above, but ensure it's clean)
    fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Fix 10: Fix _id vs id mismatch for ZAD API apps
    // ZAD API returns data with 'id' but Claude generates code expecting '_id' (Supabase convention)
    const idMismatchPatterns = [
        // Pattern 1: task._id in JavaScript expressions  
        { from: /(\w+)\._id(?=\s*[=!<>])/g, to: '$1.id', desc: 'object._id comparisons' },
        // Pattern 2: task._id in template literals
        { from: /\$\{(\w+)\._id\}/g, to: '${$1.id}', desc: 'template literal _id references' },
        // Pattern 3: item._id in find/filter operations
        { from: /(\w+)\s*=>\s*(\w+)\._id\s*===/g, to: '$1 => $2.id ===', desc: 'find/filter _id comparisons' },
        // Pattern 4: Generic _id property access
        { from: /\.\_id(?=\s*[;\)\],}])/g, to: '.id', desc: 'generic _id property access' }
    ];
    
    let idFixesApplied = 0;
    idMismatchPatterns.forEach(({from, to, desc}) => {
        const originalFixed = fixed;
        fixed = fixed.replace(from, to);
        if (fixed !== originalFixed) {
            idFixesApplied++;
            logWithTimestamp(`🔧 Fixed: ${desc}`);
        }
    });
    
    if (idFixesApplied > 0) {
        logWithTimestamp(`🔧 Applied ${idFixesApplied} _id → id fixes for ZAD API compatibility`);
        fixesApplied += idFixesApplied;
    }
    
    if (fixesApplied > 0) {
        logWithTimestamp(`✅ API-safe auto-fix completed: ${fixesApplied} issue(s) fixed`);
    } else {
        logWithTimestamp('✅ API-safe auto-fix completed: No issues found');
    }
    
    return fixed;
}