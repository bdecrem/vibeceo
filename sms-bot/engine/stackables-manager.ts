import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Supports both "wtaf --stack" and "--stack" formats
 */
export function parseStackCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stack app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stack\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stack app-slug user request here" format (direct SMS format)
    match = input.match(/^--stack\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
    return {
        appSlug: match[1],
        userRequest: match[2]
    };
}
    
    return null;
}



/**
 * Load HTML content from Supabase (simple template approach)
 * Returns the raw HTML content to use as a template
 */
export async function loadStackedHTMLContent(userSlug: string | null, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`📡 Loading HTML content from Supabase`);
        logWithTimestamp(`Looking for app_slug: "${appSlug}"`);
        
        // For PUBLIC apps, skip ownership check
        if (userSlug === null) {
            logWithTimestamp(`🌐 Loading PUBLIC app (no ownership check)`);
            
            // Load PUBLIC app directly
            const { data: publicApp, error: publicError } = await getSupabaseClient()
                .from('wtaf_content')
                .select('html_content')
                .eq('app_slug', appSlug)
                .eq('type', 'PUBLIC')
                .single();
                
            if (publicError || !publicApp) {
                logError(`PUBLIC app not found: ${appSlug}`);
                return null;
            }
            
            logSuccess(`✅ Loaded PUBLIC app HTML content`);
            return publicApp.html_content;
        }
        
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
        logWithTimestamp(`User ID: "${userId}"`);
        
        // First try to load as owned app
        const { data: ownedApp, error: ownedError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('html_content')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (ownedApp && ownedApp.html_content) {
            logSuccess(`✅ Owned app HTML content loaded: ${ownedApp.html_content.length} characters`);
            return ownedApp.html_content;
        }
        
        // If not owned, check if it's a PUBLIC ZAD app
        logWithTimestamp(`🌐 User doesn't own '${appSlug}' - checking if it's a PUBLIC ZAD app`);
        
        const { data: publicApp, error: publicError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('html_content, type')
            .eq('app_slug', appSlug)
            .eq('type', 'ZAD')
            .single();
        
        if (publicError || !publicApp || !publicApp.html_content) {
            logWarning(`App '${appSlug}' not found, not accessible, or not a ZAD app`);
            return null;
        }
        
        // Check if it's a PUBLIC ZAD by looking for unlimited user access
        if (publicApp.html_content.includes('window.currentUser = \'all_users\'')) {
            logSuccess(`✅ PUBLIC ZAD app HTML content loaded: ${publicApp.html_content.length} characters`);
            return publicApp.html_content;
        } else {
            logWarning(`App '${appSlug}' exists but is not PUBLIC (not accessible)`);
            return null;
        }
        
    } catch (error) {
        logError(`Error loading HTML content: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Build enhanced prompt with user request + HTML template (simple approach)
 * Matches the exact logic from test-stackables.cjs
 */
export function buildEnhancedPrompt(userRequest: string, htmlContent: string | null): string {
    logWithTimestamp(`🔧 Building enhanced prompt`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`HTML content included: ${htmlContent ? 'YES' : 'NO'}`);
    
    let prompt = userRequest;
    
    if (htmlContent && htmlContent.trim()) {
        prompt += `\n\nHTML to use as template:\n\`\`\`html\n${htmlContent}\n\`\`\``;
    }
    
    logWithTimestamp(`Final prompt length: ${prompt.length} characters`);
    
    return prompt;
}

/**
 * Parse stackdata command from user input (clone of parseStackCommand)
 * Extracts app slug and cleaned user request
 * Supports both "wtaf --stackdata" and "--stackdata" formats
 */
export function parseStackDataCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stackdata app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stackdata\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackdata app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackdata\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Load submission data from wtaf_submissions table and extract names
 * Returns array of names from people who submitted to the app
 */
export async function loadStackedDataContent(userSlug: string, appSlug: string): Promise<string[] | null> {
    try {
        logWithTimestamp(`📊 Loading submission data from wtaf_submissions for stackdata`);
        logWithTimestamp(`Looking for app submissions to: "${appSlug}"`);
        
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
        logWithTimestamp(`User ID: "${userId}"`);
        
        // First verify the user owns this app and get its UUID
        const { data: appData, error: appError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (appError || !appData) {
            logWarning(`App '${appSlug}' not found or not owned by ${userSlug}`);
            return null;
        }
        
        const appUuid = appData.id;
        logWithTimestamp(`🆔 App UUID for submissions lookup: ${appUuid}`);
        
        // Now load submissions for this app using the UUID
        const { data: submissions, error: submissionError } = await getSupabaseClient()
            .from('wtaf_submissions')
            .select('submission_data')
            .eq('app_id', appUuid)
            .order('created_at', { ascending: false });
        
        if (submissionError) {
            logError(`Error loading submissions: ${submissionError.message}`);
            return null;
        }
        
        if (!submissions || submissions.length === 0) {
            logWithTimestamp(`⚠️ No submissions found for app '${appSlug}'`);
            return [];
        }
        
        // Extract names from submission data
        const names: string[] = [];
        submissions.forEach((submission, index) => {
            try {
                const data = submission.submission_data;
                if (data && typeof data === 'object') {
                    // Look for common name fields
                    const name = data.name || data.Name || data.full_name || data.fullName || 
                                data.firstName || data.first_name || data.username || data.email;
                    if (name && typeof name === 'string') {
                        names.push(name.trim());
                        logWithTimestamp(`  📝 Submission ${index + 1}: Found name "${name}"`);
                    }
                }
            } catch (error) {
                logWithTimestamp(`  ⚠️ Submission ${index + 1}: Could not parse data`);
            }
        });
        
        // Remove duplicates and empty names
        const uniqueNames = Array.from(new Set(names.filter(name => name.length > 0)));
        
        logSuccess(`✅ Extracted ${uniqueNames.length} unique names from ${submissions.length} submissions`);
        logWithTimestamp(`📋 Names found: ${uniqueNames.slice(0, 5).join(', ')}${uniqueNames.length > 5 ? '...' : ''}`);
        
        return uniqueNames;
        
    } catch (error) {
        logError(`Error loading submission data for stackdata: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Build enhanced prompt for stackdata with names from submissions + WTAF design system
 * Takes user request and array of names, creates prompt for Claude
 */
export async function buildEnhancedDataPrompt(userRequest: string, names: string[] | null): Promise<string> {
    logWithTimestamp(`🔧 Building enhanced prompt for stackdata`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`Names included: ${names ? names.length : 0}`);
    
    let prompt = userRequest;
    
    // Add available data structure
    if (names && names.length > 0) {
        prompt += `\n\nAvailable data from app submissions:\nNames: ${names.join(', ')}\n\nUse this data to fulfill the user's request. Create whatever the user is asking for, populated with these real names from the submission data.`;
    } else {
        prompt += `\n\nNote: No submission data found for this app. Create the app structure the user requested but use placeholder names since no real data is available.`;
    }
    
    // Load and add WTAF design system
    try {
        const appTechSpecPath = join(__dirname, '..', 'content', 'app-tech-spec.json');
        const appTechSpecContent = await readFile(appTechSpecPath, 'utf8');
        const appTechSpec = JSON.parse(appTechSpecContent);
        
        prompt += `\n\nWTAF STYLE GUIDE & DESIGN SYSTEM:\n${JSON.stringify(appTechSpec, null, 2)}`;
        logWithTimestamp(`📖 Added app-tech-spec.json to stackdata prompt`);
    } catch (error) {
        logWarning(`Failed to load app-tech-spec.json for stackdata: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    logWithTimestamp(`Final stackdata prompt length: ${prompt.length} characters`);
    
    return prompt;
}

/**
 * Process stackdata request end-to-end (reads submission names from wtaf_submissions)
 * Main function that orchestrates the entire stackdata workflow
 */
export async function processStackDataRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    names?: string[] | null;
    enhancedPrompt?: string; 
    error?: string 
}> {
    try {
        // Step 1: Parse the stackdata command
        const parsed = parseStackDataCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stackdata command format. Use: --stackdata app-slug your request here (or: wtaf --stackdata app-slug your request here)' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🗃️ Processing stackdata request: ${appSlug} → "${userRequest}"`);
        
        // Step 2: Load names from submission data (includes ownership verification)
        const names = await loadStackedDataContent(userSlug, appSlug);
        if (names === null) {
            return { 
                success: false, 
                error: `You don't own app '${appSlug}' or it doesn't exist` 
            };
        }
        
        // Step 3: Build enhanced prompt with names data + WTAF design system
        const enhancedPrompt = await buildEnhancedDataPrompt(userRequest, names);
        
        logSuccess(`✅ Stackdata request processed successfully`);
        return {
            success: true,
            userRequest,
            names,
            enhancedPrompt
        };
        
    } catch (error) {
        logError(`Error processing stackdata request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Parse stackemail command from user input
 * Extracts app slug and email message
 * Supports both "wtaf --stackemail" and "--stackemail" formats
 */
export function parseStackEmailCommand(input: string): { appSlug: string; emailMessage: string } | null {
    // Try "wtaf --stackemail app-slug email message here" format first
    let match = input.match(/^wtaf\s+--stackemail\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            emailMessage: match[2]
        };
    }
    
    // Try "--stackemail app-slug email message here" format (direct SMS format)
    match = input.match(/^--stackemail\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            emailMessage: match[2]
        };
    }
    
    return null;
}

/**
 * Load email addresses from submission data for stackemail
 * Returns array of email addresses from people who submitted to the app
 */
export async function loadSubmissionEmails(userSlug: string, appSlug: string): Promise<string[] | null> {
    try {
        logWithTimestamp(`📧 Loading submission emails for stackemail`);
        logWithTimestamp(`Looking for app submissions to: "${appSlug}"`);
        
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
        logWithTimestamp(`User ID: "${userId}"`);
        
        // First verify the user owns this app and get its UUID
        const { data: appData, error: appError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (appError || !appData) {
            logWarning(`App '${appSlug}' not found or not owned by ${userSlug}`);
            return null;
        }
        
        const appUuid = appData.id;
        logWithTimestamp(`🆔 App UUID for email lookup: ${appUuid}`);
        
        // Now load submissions for this app using the UUID
        const { data: submissions, error: submissionError } = await getSupabaseClient()
            .from('wtaf_submissions')
            .select('submission_data')
            .eq('app_id', appUuid)
            .order('created_at', { ascending: false });
        
        if (submissionError) {
            logError(`Error loading submissions: ${submissionError.message}`);
            return null;
        }
        
        if (!submissions || submissions.length === 0) {
            logWithTimestamp(`⚠️ No submissions found for app '${appSlug}'`);
            return [];
        }
        
        // Extract email addresses from submission data
        const emails: string[] = [];
        submissions.forEach((submission, index) => {
            try {
                const data = submission.submission_data;
                if (data && typeof data === 'object') {
                    // Look for email fields
                    const email = data.email || data.Email || data.emailAddress || data.email_address;
                    if (email && typeof email === 'string' && email.includes('@')) {
                        emails.push(email.trim());
                        logWithTimestamp(`  📧 Submission ${index + 1}: Found email "${email}"`);
                    }
                }
            } catch (error) {
                logWithTimestamp(`  ⚠️ Submission ${index + 1}: Could not parse data`);
            }
        });
        
        // Remove duplicates
        const uniqueEmails = Array.from(new Set(emails.filter(email => email.length > 0)));
        
        logSuccess(`✅ Extracted ${uniqueEmails.length} unique emails from ${submissions.length} submissions`);
        logWithTimestamp(`📧 Emails found: ${uniqueEmails.slice(0, 3).join(', ')}${uniqueEmails.length > 3 ? '...' : ''}`);
        
        return uniqueEmails;
        
    } catch (error) {
        logError(`Error loading submission emails: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Check if user has DEGEN role (required for stackemail)
 */
/**
 * Role hierarchy: admin > operator > degen > coder
 * Higher roles have all privileges of lower roles
 */
const ROLE_HIERARCHY = {
    admin: 4,
    operator: 3,
    degen: 2,
    coder: 1
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Check if user has a role at or above the required level
 */
export function hasRoleOrHigher(userRole: string | null, requiredRole: Role): boolean {
    if (!userRole || !(userRole in ROLE_HIERARCHY)) {
        return false;
    }
    
    const userLevel = ROLE_HIERARCHY[userRole as Role];
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    
    return userLevel >= requiredLevel;
}

export async function checkDegenRole(userSlug: string): Promise<boolean> {
    try {
        logWithTimestamp(`🔒 Checking DEGEN role for user: ${userSlug}`);
        
        const { data: userData, error: userError } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('role')
            .eq('slug', userSlug)
            .single();
            
        if (userError || !userData) {
            logError(`User not found: ${userSlug}`);
            return false;
        }
        
        // Check if user has degen role or higher (operator, admin)
        const hasDegenRole = hasRoleOrHigher(userData.role, 'degen');
        logWithTimestamp(`🔒 User ${userSlug} role: ${userData.role} | DEGEN access: ${hasDegenRole}`);
        
        return hasDegenRole;
        
    } catch (error) {
        logError(`Error checking DEGEN role: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Check if user has OPERATOR role (required for stackobjectify)
 */
export async function checkOperatorRole(userSlug: string): Promise<boolean> {
    try {
        logWithTimestamp(`🔒 Checking OPERATOR role for user: ${userSlug}`);
        
        const { data: userData, error: userError } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('role')
            .eq('slug', userSlug)
            .single();
            
        if (userError || !userData) {
            logError(`User not found: ${userSlug}`);
            return false;
        }
        
        // Check if user has operator role or higher (operator, admin)
        const hasOperatorRole = hasRoleOrHigher(userData.role, 'operator');
        logWithTimestamp(`🔒 User ${userSlug} role: ${userData.role} | OPERATOR access: ${hasOperatorRole}`);
        
        return hasOperatorRole;
        
    } catch (error) {
        logError(`Error checking OPERATOR role: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Check if user has elevated role (coder, degen, or admin)
 * These roles can remix ANY app in the system, not just their own
 */
export async function checkElevatedRole(userSlug: string): Promise<boolean> {
    try {
        logWithTimestamp(`🔒 Checking elevated role for user: ${userSlug}`);
        
        const { data: userData, error: userError } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('role')
            .eq('slug', userSlug)
            .single();
            
        if (userError || !userData) {
            logError(`User not found: ${userSlug}`);
            return false;
        }
        
        // Check if user has coder role or higher (coder, degen, operator, admin)
        const hasElevatedRole = hasRoleOrHigher(userData.role, 'coder');
        logWithTimestamp(`🔒 User ${userSlug} role: ${userData.role} | Elevated access: ${hasElevatedRole}`);
        
        return hasElevatedRole;
        
    } catch (error) {
        logError(`Error checking elevated role: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Process stackemail request end-to-end
 * Main function that orchestrates the entire stackemail workflow
 */
export async function processStackEmailRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    appSlug?: string;
    emailMessage?: string;
    emails?: string[];
    error?: string 
}> {
    try {
        // Step 1: Parse the stackemail command
        const parsed = parseStackEmailCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stackemail command format. Use: --stackemail app-slug your email message here' 
            };
        }
        
        const { appSlug, emailMessage } = parsed;
        logWithTimestamp(`📧 Processing stackemail request: ${appSlug} → "${emailMessage}"`);
        
        // Step 2: Load email addresses from submission data (includes ownership verification)
        const emails = await loadSubmissionEmails(userSlug, appSlug);
        if (emails === null) {
            return { 
                success: false, 
                error: `You don't own app '${appSlug}' or it doesn't exist` 
            };
        }
        
        if (emails.length === 0) {
            return { 
                success: false, 
                error: `No email submissions found for app '${appSlug}' - no one to email` 
            };
        }
        
        logSuccess(`✅ Stackemail request processed successfully`);
        return {
            success: true,
            appSlug,
            emailMessage,
            emails
        };
        
    } catch (error) {
        logError(`Error processing stackemail request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Parse stackdb command from user input
 * Extracts app slug and cleaned user request
 * Supports both "wtaf --stackdb" and "--stackdb" formats
 */
export function parseStackDBCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stackdb app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stackdb\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackdb app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackdb\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Get app UUID for stackdb (includes ownership verification)
 * Returns the app UUID needed for live Supabase queries
 */
export async function getAppUUIDForStackDB(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🗄️ Getting app UUID for stackdb`);
        logWithTimestamp(`Looking for app: "${appSlug}"`);
        
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
        logWithTimestamp(`User ID: "${userId}"`);
        
        // Verify the user owns this app and get its UUID
        const { data: appData, error: appError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (appError || !appData) {
            logWarning(`App '${appSlug}' not found or not owned by ${userSlug}`);
            return null;
        }
        
        const appUuid = appData.id;
        logWithTimestamp(`🆔 App UUID for stackdb: ${appUuid}`);
        
        logSuccess(`✅ App UUID retrieved for stackdb`);
        return appUuid;
        
    } catch (error) {
        logError(`Error getting app UUID for stackdb: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Build enhanced prompt for stackdb with app UUID for live Supabase queries + WTAF design system
 * Takes user request and app UUID, creates prompt for Claude to build dynamic app
 */
export async function buildEnhancedDBPrompt(userRequest: string, appUuid: string): Promise<string> {
    logWithTimestamp(`🔧 Building enhanced prompt for stackdb`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`Origin app UUID: ${appUuid} (will be injected post-processing)`);
    
    let prompt = userRequest;
    
    // Add dynamic data instructions (no specific UUIDs - post-processing will handle this)
    prompt += `\n\nBuild an app that reads LIVE DATA from Supabase wtaf_submissions table. Use standard Supabase patterns - the app_id will be configured automatically.`;
    
    // Load and add WTAF design system
    try {
        const appTechSpecPath = join(__dirname, '..', 'content', 'app-tech-spec.json');
        const appTechSpecContent = await readFile(appTechSpecPath, 'utf8');
        const appTechSpec = JSON.parse(appTechSpecContent);
        
        prompt += `\n\nWTAF STYLE GUIDE & DESIGN SYSTEM:\n${JSON.stringify(appTechSpec, null, 2)}`;
        logWithTimestamp(`📖 Added app-tech-spec.json to stackdb prompt`);
    } catch (error) {
        logWarning(`Failed to load app-tech-spec.json for stackdb: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    logWithTimestamp(`Final stackdb prompt length: ${prompt.length} characters`);
    
    return prompt;
}

/**
 * Process stackdb request end-to-end (creates dynamic Supabase-connected apps)
 * Main function that orchestrates the entire stackdb workflow
 */
export async function processStackDBRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    appSlug?: string;
    appUuid?: string;
    enhancedPrompt?: string; 
    error?: string 
}> {
    try {
        // Step 1: Parse the stackdb command
        const parsed = parseStackDBCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stackdb command format. Use: --stackdb app-slug your request here (or: wtaf --stackdb app-slug your request here)' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🗄️ Processing stackdb request: ${appSlug} → "${userRequest}"`);
        
        // Step 2: Get app UUID (includes ownership verification)
        const appUuid = await getAppUUIDForStackDB(userSlug, appSlug);
        if (appUuid === null) {
            return { 
                success: false, 
                error: `You don't own app '${appSlug}' or it doesn't exist` 
            };
        }
        
        // Step 3: Build enhanced prompt with app UUID for live data connection + WTAF design system
        const enhancedPrompt = await buildEnhancedDBPrompt(userRequest, appUuid);
        
        logSuccess(`✅ Stackdb request processed successfully`);
        return {
            success: true,
            userRequest,
            appSlug,  // ✅ Now include the app slug for origin_app_slug replacement
            appUuid,
            enhancedPrompt
        };
        
    } catch (error) {
        logError(`Error processing stackdb request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Process stackables request end-to-end (simple template approach)
 * Main function that orchestrates the entire stackables workflow
 */
export async function processStackablesRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    htmlContent?: string | null;
    enhancedPrompt?: string; 
    error?: string 
}> {
    try {
        // Step 1: Parse the stack command
        const parsed = parseStackCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stack command format. Use: --stack app-slug your request here (or: wtaf --stack app-slug your request here)' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🧱 Processing stackables request: ${appSlug} → "${userRequest}"`);
        
        // Step 2: Load HTML content from Supabase (includes ownership verification)
        const htmlContent = await loadStackedHTMLContent(userSlug, appSlug);
        if (htmlContent === null) {
            return { 
                success: false, 
                error: `You don't own app '${appSlug}' or it doesn't exist` 
            };
        }
        
        // Step 3: Build enhanced prompt with HTML template
        const enhancedPrompt = buildEnhancedPrompt(userRequest, htmlContent);
        
        logSuccess(`✅ Stackables request processed successfully`);
        return {
            success: true,
            userRequest,
            htmlContent,
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

/**
 * Parse remix command from user input
 * Extracts app slug and cleaned user request
 * Supports both "wtaf --remix" and "--remix" formats
 */
export function parseRemixCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --remix app-slug user request here" format first
    let match = input.match(/^wtaf\s+--remix\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--remix app-slug user request here" format (direct SMS format)
    match = input.match(/^--remix\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "wtaf --remix app-slug" format (clone without modifications)
    match = input.match(/^wtaf\s+--remix\s+([a-z0-9-]+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: "" // Empty request indicates clone
        };
    }
    
    // Try "--remix app-slug" format (clone without modifications)
    match = input.match(/^--remix\s+([a-z0-9-]+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: "" // Empty request indicates clone
        };
    }
    
    return null;
}

/**
 * Load HTML content from Supabase for remix
 * Returns the raw HTML content to use as a template for remixing
 * Elevated roles (coder/degen/admin) can remix ANY app, not just their own
 */
export async function loadRemixHTMLContent(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🎨 Loading HTML content for remix from Supabase`);
        logWithTimestamp(`Looking for app_slug: "${appSlug}"`);
        
        // Check if user has elevated role (coder/degen/admin)
        const hasElevatedRole = await checkElevatedRole(userSlug);
        
        if (hasElevatedRole) {
            // Elevated roles can remix ANY app - no ownership verification needed
            logWithTimestamp(`🔓 User ${userSlug} has elevated role - allowing remix of any app`);
            
            const { data: appData, error: appError } = await getSupabaseClient()
                .from('wtaf_content')
                .select('html_content')
                .eq('app_slug', appSlug)
                .single();
            
            if (appError || !appData) {
                logWarning(`App '${appSlug}' not found in system`);
                return null;
            }
            
            logSuccess(`✅ HTML content loaded for remix (elevated access): ${appData.html_content ? appData.html_content.length + ' characters' : 'null'}`);
            
            // Strip existing OG tags to prevent duplicates in remixed apps
            if (appData.html_content) {
                const { stripOGTags } = await import('./shared/utils.js');
                return stripOGTags(appData.html_content);
            }
            
            return appData.html_content;
            
        } else {
            // Regular users can only remix their own apps - verify ownership
            logWithTimestamp(`🔒 User ${userSlug} does not have elevated role - checking ownership`);
            
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
            logWithTimestamp(`User ID: "${userId}"`);
            
            // Load HTML content with ownership verification
            const { data: appData, error: appError } = await getSupabaseClient()
                .from('wtaf_content')
                .select('html_content')
                .eq('app_slug', appSlug)
                .eq('user_id', userId)
                .single();
            
            if (appError || !appData) {
                logWarning(`App '${appSlug}' not found or not owned by ${userSlug}`);
                return null;
            }
            
            logSuccess(`✅ HTML content loaded for remix (ownership verified): ${appData.html_content ? appData.html_content.length + ' characters' : 'null'}`);
            
            // Strip existing OG tags to prevent duplicates in remixed apps
            if (appData.html_content) {
                const { stripOGTags } = await import('./shared/utils.js');
                return stripOGTags(appData.html_content);
            }
            
            return appData.html_content;
        }
        
    } catch (error) {
        logError(`Error loading HTML content for remix: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Build remix prompt with user request + HTML template
 * Creates a remix-specific prompt for modifying existing designs
 */
export function buildRemixPrompt(userRequest: string, htmlContent: string | null): string {
    logWithTimestamp(`🎨 Building remix prompt`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`HTML content included: ${htmlContent ? 'YES' : 'NO'}`);
    
    let prompt = userRequest;
    
    if (htmlContent && htmlContent.trim()) {
        prompt += `\n\nHTML to use as template:\n\`\`\`html\n${htmlContent}\n\`\`\``;
    }
    
    logWithTimestamp(`Final remix prompt length: ${prompt.length} characters`);
    
    return prompt;
}

/**
 * Build game-specific remix prompt that preserves JavaScript
 * Creates a remix prompt with explicit instructions to preserve game logic
 */
export function buildGameRemixPrompt(userRequest: string, htmlContent: string | null): string {
    logWithTimestamp(`🎮 Building GAME remix prompt`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`HTML content included: ${htmlContent ? 'YES' : 'NO'}`);
    
    let prompt = `CRITICAL: This is a GAME remix request. You must preserve ALL JavaScript code exactly as it is.

User request: ${userRequest}

IMPORTANT RULES:
- If this is a visual change (fonts, colors, UI), ONLY modify CSS
- NEVER replace <script> sections with comments or placeholders
- NEVER remove or modify JavaScript game logic
- Return the complete HTML with ALL original JavaScript preserved character-for-character`;
    
    if (htmlContent && htmlContent.trim()) {
        prompt += `\n\nHTML to use as template:\n\`\`\`html\n${htmlContent}\n\`\`\``;
    }
    
    logWithTimestamp(`Final GAME remix prompt length: ${prompt.length} characters`);
    
    return prompt;
}

/**
 * Parse stackpublic command from user input (for PUBLIC ZAD apps)
 * Extracts source PUBLIC app slug and cleaned user request
 * Supports both "wtaf --stackpublic" and "--stackpublic" formats
 */
export function parseStackPublicCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stackpublic app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stackpublic\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackpublic app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackpublic\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Parse stackzad command from user input
 * Extracts source ZAD app slug and cleaned user request
 * Supports both "wtaf --stackzad" and "--stackzad" formats
 */
export function parseStackZadCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stackzad app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stackzad\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackzad app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackzad\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Get ZAD app UUID for stackzad (includes ownership verification)
 * Returns the app UUID needed for shared ZAD data access
 */
export async function getZadAppUUIDForStackZad(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🤝 Getting ZAD app UUID for stackzad`);
        logWithTimestamp(`Looking for ZAD app: "${appSlug}"`);
        
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
        logWithTimestamp(`User ID: "${userId}"`);
        
        // First, try to find a ZAD app owned by the user
        const { data: ownedApp, error: ownedError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id, type')
            .eq('app_slug', appSlug)
            .eq('user_id', userId)
            .single();
        
        if (ownedApp && ownedApp.type === 'ZAD') {
            // User owns this ZAD app
            const appUuid = ownedApp.id;
            logWithTimestamp(`🆔 User owns ZAD app - UUID for stackzad: ${appUuid}`);
            return appUuid;
        }
        
        // If user doesn't own it, check if it's a PUBLIC ZAD app
        logWithTimestamp(`🌐 User doesn't own '${appSlug}' - checking if it's a PUBLIC ZAD app`);
        
        // Check for PUBLIC ZAD apps (type='PUBLIC')
        const { data: publicApp, error: publicError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id, type')
            .eq('app_slug', appSlug)
            .eq('type', 'PUBLIC')
            .single();
        
        if (publicError || !publicApp) {
            logWarning(`App '${appSlug}' not found or not a PUBLIC app`);
            return null;
        }
        
        logWithTimestamp(`🌐 Found PUBLIC ZAD app '${appSlug}' - allowing stackzad access`);
        const appUuid = publicApp.id;
        logWithTimestamp(`🆔 PUBLIC ZAD app UUID for stackzad: ${appUuid}`);
        return appUuid;
        
    } catch (error) {
        logError(`Error getting ZAD app UUID for stackzad: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Get UUID for a PUBLIC app (type='PUBLIC')
 * For stackpublic commands - only works with PUBLIC apps
 */
export async function getPublicAppUUIDForStackPublic(appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🌐 Getting PUBLIC app UUID for stackpublic`);
        logWithTimestamp(`Looking for PUBLIC app: "${appSlug}"`);
        
        // Check for PUBLIC app (type='PUBLIC')
        const { data: publicApp, error: publicError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('app_slug, id, type')
            .eq('app_slug', appSlug)
            .eq('type', 'PUBLIC')
            .single();
        
        if (publicError || !publicApp) {
            logWarning(`App '${appSlug}' not found or not a PUBLIC app`);
            return null;
        }
        
        logWithTimestamp(`🌐 Found PUBLIC app '${appSlug}'`);
        const appUuid = publicApp.id;
        logWithTimestamp(`🆔 PUBLIC app UUID for stackpublic: ${appUuid}`);
        return appUuid;
        
    } catch (error) {
        logError(`Error getting PUBLIC app UUID: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Extract APP_ID from HTML content by parsing the hardcoded window.APP_ID assignment
 * This is much simpler and more accurate than database hunting
 */
export function extractAppIdFromHtml(htmlContent: string): string | null {
    try {
        logWithTimestamp(`🔍 Extracting APP_ID from HTML content`);
        
        // Look for window.APP_ID = 'uuid' pattern
        const appIdMatch = htmlContent.match(/window\.APP_ID\s*=\s*['"]([^'"]+)['"]/);
        
        if (appIdMatch && appIdMatch[1]) {
            const extractedUuid = appIdMatch[1];
            logWithTimestamp(`✅ Found APP_ID in HTML: ${extractedUuid}`);
            return extractedUuid;
        }
        
        // Fallback: look for it in getAppId() function return statement
        const getAppIdMatch = htmlContent.match(/function getAppId\(\)[^}]*return\s*['"]([^'"]+)['"]/);
        
        if (getAppIdMatch && getAppIdMatch[1]) {
            const extractedUuid = getAppIdMatch[1];
            logWithTimestamp(`✅ Found APP_ID in getAppId() function: ${extractedUuid}`);
            return extractedUuid;
        }
        
        logWarning(`❌ Could not find APP_ID in HTML content`);
        return null;
        
    } catch (error) {
        logError(`Error extracting APP_ID from HTML: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/* 
// ❌ COMMENTED OUT: Complex fork detection logic - replaced with simple HTML parsing
// This was over-engineered when the answer is right there in the HTML

/**
 * Smart fork detection: Find the UUID with the most data records
 * Checks the provided UUID and potential related UUIDs to find where the actual data lives
 */
/*
async function findDataRichUuid(initialUuid: string): Promise<{uuid: string, recordCount: number}> {
    try {
        logWithTimestamp(`🔍 Smart fork detection: Finding UUID with most data`);
        logWithTimestamp(`Initial UUID from URL: ${initialUuid}`);
        
        // First, check the provided UUID
        const { data: initialData, error: initialError } = await getSupabaseClient()
            .from('wtaf_zero_admin_collaborative')
            .select('id', { count: 'exact' })
            .eq('app_id', initialUuid);
            
        const initialCount = initialData?.length || 0;
        logWithTimestamp(`📊 Initial UUID ${initialUuid}: ${initialCount} records`);
        
        // If we have substantial data (>= 5 records), use this UUID
        if (initialCount >= 5) {
            logWithTimestamp(`✅ Initial UUID has substantial data (${initialCount} records), using it`);
            return { uuid: initialUuid, recordCount: initialCount };
        }
        
        // If little/no data, search for related UUIDs in wtaf_content table
        logWithTimestamp(`🔍 Initial UUID has limited data (${initialCount} records), searching for data-rich alternatives...`);
        
        // First get the user_slug for the initial UUID
        const { data: initialApp, error: initialAppError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('user_slug, app_slug')
            .eq('id', initialUuid)
            .single();
            
        if (initialAppError || !initialApp) {
            logWithTimestamp(`⚠️ Could not find initial app metadata, falling back to initial UUID`);
            return { uuid: initialUuid, recordCount: initialCount };
        }
        
        // Get apps with similar app_slug (forks of the same original app)
        const baseSlug = initialApp.app_slug.split('-').slice(0, -1).join('-'); // Remove last part (like random ID)
        const { data: contentRecords, error: contentError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('id, user_slug, app_slug')
            .eq('user_slug', initialApp.user_slug)
            .like('app_slug', `${baseSlug}%`)
            .limit(20);
            
        if (contentError || !contentRecords) {
            logWithTimestamp(`⚠️ Could not find related apps, falling back to initial UUID`);
            return { uuid: initialUuid, recordCount: initialCount };
        }
        
        // Check data count for each potential UUID
        const uuidCandidates: {uuid: string, recordCount: number}[] = [];
        
        for (const record of contentRecords) {
            if (record.id === initialUuid) continue; // Skip the one we already checked
            
            const { data, error } = await getSupabaseClient()
                .from('wtaf_zero_admin_collaborative')
                .select('id', { count: 'exact' })
                .eq('app_id', record.id);
                
            const count = data?.length || 0;
            if (count > 0) {
                uuidCandidates.push({ uuid: record.id, recordCount: count });
                logWithTimestamp(`📊 Alternative UUID ${record.id} (${record.app_slug}): ${count} records`);
            }
        }
        
        // Add the initial UUID to candidates
        uuidCandidates.push({ uuid: initialUuid, recordCount: initialCount });
        
        // Find the UUID with the most records
        const bestCandidate = uuidCandidates.reduce((best, current) => 
            current.recordCount > best.recordCount ? current : best
        );
        
        if (bestCandidate.uuid !== initialUuid) {
            logWithTimestamp(`🎯 Found data-rich alternative: ${bestCandidate.uuid} with ${bestCandidate.recordCount} records (vs ${initialCount})`);
        } else {
            logWithTimestamp(`✅ Initial UUID is still the best option with ${bestCandidate.recordCount} records`);
        }
        
        return bestCandidate;
        
    } catch (error) {
        logError(`Error in smart fork detection: ${error instanceof Error ? error.message : String(error)}`);
        logWithTimestamp(`🔄 Falling back to initial UUID: ${initialUuid}`);
        return { uuid: initialUuid, recordCount: 0 };
    }
}
*/

/**
 * Load sample data from ZAD app for structure analysis
 * Returns recent records from wtaf_zero_admin_collaborative for the given app_id
 * Now uses direct UUID (extracted from HTML) instead of complex fork detection
 */
export async function loadZadDataSample(appUuid: string): Promise<any[] | null> {
    try {
        logWithTimestamp(`📊 Loading ZAD data sample for structure analysis`);
        logWithTimestamp(`Using extracted App UUID: ${appUuid}`);
        
        // ✅ SIMPLIFIED: Use the UUID directly (no more fork detection needed)
        // This UUID should be the one extracted from the source app's HTML
        
        // Load recent data from wtaf_zero_admin_collaborative using the provided UUID
        const { data, error } = await getSupabaseClient()
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', appUuid)
            .order('created_at', { ascending: false })
            .limit(10); // Get up to 10 recent records for analysis
        
        if (error) {
            logError(`Error loading ZAD data sample: ${error.message}`);
            return null;
        }
        
        if (!data || data.length === 0) {
            logWithTimestamp(`⚠️ No data found in ZAD app ${appUuid} - will provide generic structure`);
            return [];
        }
        
        // Clean sensitive data and prepare for analysis
        const cleanedData = data.map(record => {
            // Remove system fields and keep content_data structure
            const { app_id, participant_id, participant_data, created_at, updated_at, ...cleanRecord } = record;
            return {
                id: record.id,
                action_type: record.action_type, // CRITICAL: Keep action_type for data type analysis
                ...record.content_data,
                author: record.content_data?.author || record.participant_data?.username || 'Unknown',
                created_at: record.created_at
            };
        });
        
        // Extract unique action types (data types) used in this app
        const actionTypes = [...new Set(data.map(record => record.action_type).filter(Boolean))];
        logSuccess(`✅ Loaded ${cleanedData.length} ZAD records for structure analysis`);
        logWithTimestamp(`📋 Sample data fields detected: ${Object.keys(cleanedData[0] || {}).join(', ')}`);
        logWithTimestamp(`🏷️ Data types found in source app: ${actionTypes.join(', ')}`);
        
        return cleanedData;
        
    } catch (error) {
        logError(`Error loading ZAD data sample: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Analyze ZAD data structure and generate field descriptions
 * Returns human-readable description of the data structure
 */
export function analyzeZadDataStructure(sampleData: any[]): string {
    if (!sampleData || sampleData.length === 0) {
        return "No existing data found - you'll be working with a fresh dataset.";
    }
    
    logWithTimestamp(`🔍 Analyzing data structure from ${sampleData.length} records`);
    
    // CRITICAL: Extract action_types (data types) used in the source app
    const actionTypes = [...new Set(sampleData.map(record => record.action_type).filter(Boolean))];
    logWithTimestamp(`🏷️ Analyzing action types: ${actionTypes.join(', ')}`);
    
    // Get all unique field names across all records
    const allFields = new Set<string>();
    sampleData.forEach(record => {
        Object.keys(record).forEach(field => allFields.add(field));
    });
    
    // Analyze field types and common values
    const fieldAnalysis: { [key: string]: { type: string; sample: any; description: string } } = {};
    
    Array.from(allFields).forEach(field => {
        const values = sampleData.map(record => record[field]).filter(v => v !== undefined && v !== null);
        
        if (values.length === 0) {
            fieldAnalysis[field] = { type: 'unknown', sample: null, description: 'Empty field' };
            return;
        }
        
        const firstValue = values[0];
        let type: string = typeof firstValue;
        let description = '';
        
        // Special field handling
        if (field === 'id') {
            description = 'Unique record identifier';
        } else if (field === 'author') {
            description = 'Username who created this record';
        } else if (field === 'created_at') {
            description = 'When the record was created';
        } else if (field.includes('image') || field.includes('Image')) {
            description = 'Image data (likely base64 encoded)';
        } else if (field.includes('color') || field.includes('Color')) {
            description = 'Color information';
        } else if (field.includes('title') || field.includes('Title') || field.includes('name') || field.includes('Name')) {
            description = 'Title or name field';
        } else if (Array.isArray(firstValue)) {
            type = 'array';
            description = `Array containing ${firstValue.length > 0 ? typeof firstValue[0] : 'unknown'} values`;
        } else if (typeof firstValue === 'string' && firstValue.startsWith('data:')) {
            description = 'Encoded data (likely image or file)';
        } else {
            description = `User-defined ${type} field`;
        }
        
        fieldAnalysis[field] = {
            type,
            sample: type === 'string' && firstValue.length > 50 ? `${firstValue.slice(0, 50)}...` : firstValue,
            description
        };
    });
    
    // Generate human-readable structure description
    let analysis = `DATA STRUCTURE ANALYSIS (${sampleData.length} sample records):\n\n`;
    
    // CRITICAL: Report the exact data types (action_types) used in save() calls
    if (actionTypes.length > 0) {
        analysis += `**IMPORTANT: DATA TYPES USED IN SOURCE APP**\n`;
        analysis += `The source app uses these exact data types in save() and load() calls:\n`;
        actionTypes.forEach(actionType => {
            const recordsOfType = sampleData.filter(r => r.action_type === actionType).length;
            analysis += `• '${actionType}' (${recordsOfType} records)\n`;
        });
        analysis += `\n**YOU MUST USE THESE EXACT DATA TYPES** in your save() and load() calls.\n`;
        analysis += `Example: await save('${actionTypes[0]}', data) and await load('${actionTypes[0]}')\n\n`;
    }
    
    analysis += `FIELD STRUCTURE:\n`;
    Object.entries(fieldAnalysis).forEach(([field, info]) => {
        if (field !== 'action_type') { // Don't show action_type as a content field
            analysis += `• ${field}: ${info.description}\n`;
            analysis += `  Type: ${info.type}, Sample: ${JSON.stringify(info.sample)}\n\n`;
        }
    });
    
    logWithTimestamp(`📋 Generated data structure analysis: ${Object.keys(fieldAnalysis).length} fields, ${actionTypes.length} data types`);
    
    return analysis;
}

/**
 * Build enhanced prompt for stackzad with shared ZAD app UUID and data structure analysis
 * Takes user request and extracted APP_ID from HTML, creates prompt for Claude to build ZAD app with shared data
 * Returns the prompt and extracted data for system prompt replacement
 */
export async function buildEnhancedZadPromptWithData(userRequest: string, extractedAppId: string): Promise<{
    enhancedPrompt: string;
    dataStructureAnalysis: string;
    sampleDataSection: string;
    dataRichUuid: string;
}> {
    logWithTimestamp(`🔧 Building enhanced prompt for stackzad`);
    logWithTimestamp(`User request: "${userRequest}"`);
    logWithTimestamp(`Using extracted APP_ID from source HTML: ${extractedAppId}`);
    
    let prompt = userRequest;
    let sampleDataSection = '';
    
    // ✅ SIMPLIFIED: Use the extracted APP_ID directly (no more fork detection needed)
    // This APP_ID was extracted from the source app's HTML and is the correct one for data access
    const dataRichUuid = extractedAppId;
    
    // Load and analyze actual data structure using the extracted APP_ID
    const sampleData = await loadZadDataSample(extractedAppId);
    const dataStructureAnalysis = analyzeZadDataStructure(sampleData || []);
    
    // Step 2: Load stackzad prompt template
    try {
        const stackzadTemplatePath = join(__dirname, '..', 'content', 'stackzad-prompt.txt');
        const stackzadTemplate = await readFile(stackzadTemplatePath, 'utf8');
        
        // Replace placeholders with actual data
        let templateWithData = stackzadTemplate
            .replace('{DATA_STRUCTURE_ANALYSIS}', dataStructureAnalysis);
        
        // Step 3: Add sample data for reference (max 3 records, cleaned)
        if (sampleData && sampleData.length > 0) {
            const sampleForPrompt = sampleData.slice(0, 3).map(record => {
                // Remove very long fields to keep prompt manageable
                const cleanedRecord: any = {};
                Object.entries(record).forEach(([key, value]) => {
                    if (typeof value === 'string' && value.length > 100) {
                        cleanedRecord[key] = `${value.slice(0, 100)}... [truncated]`;
                    } else {
                        cleanedRecord[key] = value;
                    }
                });
                return cleanedRecord;
            });
            
            sampleDataSection = `SAMPLE DATA (actual records from the source app):\n\`\`\`json\n${JSON.stringify(sampleForPrompt, null, 2)}\n\`\`\``;
        } else {
            sampleDataSection = 'No sample data available - working with empty dataset.';
        }
        
        templateWithData = templateWithData.replace('{SAMPLE_DATA}', sampleDataSection);
        
        prompt += `\n\n${templateWithData}\n\n`;
        logWithTimestamp(`📖 Added stackzad template from content file`);
        
    } catch (error) {
        logWarning(`Failed to load stackzad template: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to basic instructions if template loading fails
        prompt += `\n\nThis should be a ZAD app that shares data with an existing ZAD app.\n\n${dataStructureAnalysis}\n\n`;
    }
    
    // Note: ZAD template is now handled by dedicated stackzad system prompt
    logWithTimestamp(`📖 Stackzad enhanced prompt complete - system prompt will handle ZAD guidelines`);
    
    logWithTimestamp(`Final stackzad prompt length: ${prompt.length} characters`);
    
    return {
        enhancedPrompt: prompt,
        dataStructureAnalysis: dataStructureAnalysis,
        sampleDataSection: sampleDataSection,
        dataRichUuid: dataRichUuid
    };
}

/**
 * Process stackzad request end-to-end (creates ZAD apps that share data with existing ZAD apps)
 * Main function that orchestrates the entire stackzad workflow
 */
export async function processStackZadRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    sourceAppUuid?: string;
    enhancedPrompt?: string;
    dataStructureAnalysis?: string;
    sampleDataSection?: string;
    error?: string 
}> {
    try {
        // Step 1: Parse the stackzad command
        const parsed = parseStackZadCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stackzad command format. Use: --stackzad source-zad-app-slug your request here (or: wtaf --stackzad source-zad-app-slug your request here)' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🤝 Processing stackzad request: ${appSlug} → "${userRequest}"`);
        
        // Step 2: Get source ZAD app UUID (includes ownership and ZAD type verification)
        const sourceAppUuid = await getZadAppUUIDForStackZad(userSlug, appSlug);
        if (sourceAppUuid === null) {
            return { 
                success: false, 
                error: `ZAD app '${appSlug}' not found, not accessible, or not a ZAD app. You can only use your own ZAD apps or PUBLIC ZAD apps.` 
            };
        }
        
        // Step 3: Load HTML content from the source ZAD app
        const htmlContent = await loadStackedHTMLContent(userSlug, appSlug);
        if (!htmlContent) {
            return { 
                success: false, 
                error: `Could not load HTML content from ZAD app '${appSlug}'` 
            };
        }
        
        // Step 4: Extract the actual APP_ID from the HTML (this is the real data UUID)
        const extractedAppId = extractAppIdFromHtml(htmlContent);
        if (!extractedAppId) {
            return { 
                success: false, 
                error: `Could not extract APP_ID from source ZAD app HTML - malformed app` 
            };
        }
        
        logWithTimestamp(`✅ Extracted actual data APP_ID from HTML: ${extractedAppId}`);
        
        // Step 5: Build enhanced prompt with extracted APP_ID for accurate data access
        const { enhancedPrompt, dataStructureAnalysis, sampleDataSection, dataRichUuid } = await buildEnhancedZadPromptWithData(userRequest, extractedAppId);
        
        logSuccess(`✅ Stackzad request processed successfully`);
        logWithTimestamp(`🎯 Using extracted APP_ID for SHARED_DATA_UUID: ${dataRichUuid}`);
        return {
            success: true,
            userRequest,
            sourceAppUuid: dataRichUuid, // Use the extracted APP_ID for injection
            enhancedPrompt,
            dataStructureAnalysis,
            sampleDataSection
        };
        
    } catch (error) {
        logError(`Error processing stackzad request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Parse stackobjectify command from user input
 * Extracts source ZAD app slug and cleaned user request
 * Supports both "wtaf --stackobjectify" and "--stackobjectify" formats
 */
export function parseStackObjectifyCommand(input: string): { appSlug: string; userRequest: string } | null {
    // Try "wtaf --stackobjectify app-slug user request here" format first
    let match = input.match(/^wtaf\s+--stackobjectify\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackobjectify app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackobjectify\s+([a-z0-9-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Process stackobjectify request end-to-end (creates object pages from ZAD app data)
 * Main function that orchestrates the entire stackobjectify workflow
 */
export async function processStackObjectifyRequest(userSlug: string, stackCommand: string): Promise<{ 
    success: boolean; 
    userRequest?: string; 
    sourceAppSlug?: string;
    sourceAppUuid?: string;
    dataStructure?: any;
    enhancedPrompt?: string; 
    error?: string 
}> {
    try {
        // Step 1: Check if user has OPERATOR role
        const hasOperatorRole = await checkOperatorRole(userSlug);
        if (!hasOperatorRole) {
            return { 
                success: false, 
                error: 'You need OPERATOR role to use --stackobjectify command' 
            };
        }
        
        // Step 2: Parse the stackobjectify command
        const parsed = parseStackObjectifyCommand(stackCommand);
        if (!parsed) {
            return { 
                success: false, 
                error: 'Invalid stackobjectify command format. Use: --stackobjectify zad-app-slug your request here' 
            };
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`📄 Processing stackobjectify request: ${appSlug} → "${userRequest}"`);
        
        // Step 3: Get source ZAD app UUID (verify ownership and that it's a ZAD app)
        const sourceAppUuid = await getZadAppUUIDForStackZad(userSlug, appSlug);
        if (sourceAppUuid === null) {
            return { 
                success: false, 
                error: `ZAD app '${appSlug}' not found or not owned by you. You can only objectify your own ZAD apps.` 
            };
        }
        
        // Step 4: Load HTML content to extract APP_ID
        const htmlContent = await loadStackedHTMLContent(userSlug, appSlug);
        if (!htmlContent) {
            return { 
                success: false, 
                error: `Could not load HTML content from ZAD app '${appSlug}'` 
            };
        }
        
        // Step 5: Extract the actual APP_ID from the HTML
        const extractedAppId = extractAppIdFromHtml(htmlContent);
        if (!extractedAppId) {
            return { 
                success: false, 
                error: `Could not extract APP_ID from source ZAD app HTML` 
            };
        }
        
        // Step 6: Load and analyze ZAD data structure
        const sampleData = await loadZadDataSample(extractedAppId);
        const dataStructureAnalysis = analyzeZadDataStructure(sampleData || []);
        
        // Step 7: Build enhanced prompt for objectification
        let enhancedPrompt = userRequest;
        enhancedPrompt += `\n\nCREATE AN OBJECTIFIED VERSION OF A ZAD APP\n\n`;
        enhancedPrompt += `This is a special request to create object pages from existing ZAD app data.\n`;
        enhancedPrompt += `The user owns a ZAD app at ${userSlug}/${appSlug} and wants to create:\n`;
        enhancedPrompt += `1. An index page listing all objects from the ZAD data\n`;
        enhancedPrompt += `2. Individual pages for each object with unique URLs\n\n`;
        enhancedPrompt += `Source ZAD app (data source): ${userSlug}/${appSlug}\n`;
        enhancedPrompt += `IMPORTANT: This new app will have its OWN randomly generated slug\n`;
        enhancedPrompt += `Use window.location.pathname to get the actual URL - do NOT hardcode URLs\n\n`;
        enhancedPrompt += dataStructureAnalysis;
        
        // Add sample data if available
        if (sampleData && sampleData.length > 0) {
            const sampleForPrompt = sampleData.slice(0, 3).map(record => {
                const cleanedRecord: any = {};
                Object.entries(record).forEach(([key, value]) => {
                    if (typeof value === 'string' && value.length > 100) {
                        cleanedRecord[key] = `${value.slice(0, 100)}... [truncated]`;
                    } else {
                        cleanedRecord[key] = value;
                    }
                });
                return cleanedRecord;
            });
            
            enhancedPrompt += `\n\nSAMPLE DATA:\n\`\`\`json\n${JSON.stringify(sampleForPrompt, null, 2)}\n\`\`\``;
        }
        
        enhancedPrompt += `\n\nIMPORTANT: The LLM should figure out from the user's request and the data structure what objects to display and how to present them.`;
        
        logSuccess(`✅ Stackobjectify request processed successfully`);
        return {
            success: true,
            userRequest,
            sourceAppSlug: appSlug,
            sourceAppUuid: extractedAppId,
            dataStructure: sampleData,
            enhancedPrompt
        };
        
    } catch (error) {
        logError(`Error processing stackobjectify request: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}