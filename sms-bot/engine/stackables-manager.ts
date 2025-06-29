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
    let match = input.match(/^wtaf\s+--stack\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stack app-slug user request here" format (direct SMS format)
    match = input.match(/^--stack\s+([a-z-]+)\s+(.+)$/i);
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
export async function loadStackedHTMLContent(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`📡 Loading HTML content from Supabase`);
        logWithTimestamp(`Looking for app_slug: "${appSlug}"`);
        
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
        
        // Load HTML content
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
        
        logSuccess(`✅ HTML content loaded: ${appData.html_content ? appData.html_content.length + ' characters' : 'null'}`);
        return appData.html_content;
        
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
    let match = input.match(/^wtaf\s+--stackdata\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackdata app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackdata\s+([a-z-]+)\s+(.+)$/i);
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
        const appTechSpecPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
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
    let match = input.match(/^wtaf\s+--stackemail\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            emailMessage: match[2]
        };
    }
    
    // Try "--stackemail app-slug email message here" format (direct SMS format)
    match = input.match(/^--stackemail\s+([a-z-]+)\s+(.+)$/i);
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
        
        const hasDegenRole = userData.role === 'degen';
        logWithTimestamp(`🔒 User ${userSlug} role: ${userData.role} | DEGEN access: ${hasDegenRole}`);
        
        return hasDegenRole;
        
    } catch (error) {
        logError(`Error checking DEGEN role: ${error instanceof Error ? error.message : String(error)}`);
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
    let match = input.match(/^wtaf\s+--stackdb\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--stackdb app-slug user request here" format (direct SMS format)
    match = input.match(/^--stackdb\s+([a-z-]+)\s+(.+)$/i);
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
    let match = input.match(/^wtaf\s+--remix\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    // Try "--remix app-slug user request here" format (direct SMS format)
    match = input.match(/^--remix\s+([a-z-]+)\s+(.+)$/i);
    if (match) {
        return {
            appSlug: match[1],
            userRequest: match[2]
        };
    }
    
    return null;
}

/**
 * Load HTML content from Supabase for remix
 * Returns the raw HTML content to use as a template for remixing
 */
export async function loadRemixHTMLContent(userSlug: string, appSlug: string): Promise<string | null> {
    try {
        logWithTimestamp(`🎨 Loading HTML content for remix from Supabase`);
        logWithTimestamp(`Looking for app_slug: "${appSlug}"`);
        
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
        
        // Load HTML content
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
        
        logSuccess(`✅ HTML content loaded for remix: ${appData.html_content ? appData.html_content.length + ' characters' : 'null'}`);
        return appData.html_content;
        
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