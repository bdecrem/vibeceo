#!/usr/bin/env node

import { writeFile, readFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
    WEB_APP_URL, 
    WTAF_DOMAIN, 
    WEB_OUTPUT_DIR, 
    CLAUDE_OUTPUT_DIR,
    PROCESSED_DIR,
    WATCH_DIRS
} from './shared/config.js';
import { 
    logStartupInfo, 
    logWithTimestamp, 
    logSuccess, 
    logError, 
    logWarning 
} from './shared/logger.js';
import { extractCodeBlocks, injectSubmissionUuid, replaceAppTableId, replaceOriginAppSlug } from './shared/utils.js';
import { generateCompletePrompt, callClaude, type ClassifierConfig, type BuilderConfig } from './wtaf-processor.js';
import { 
    saveCodeToSupabase, 
    saveCodeToFile, 
    createRequiredDirectories,
    generateOGImage,
    updateOGImageInHTML 
} from './storage-manager.js';

import {
    sendSuccessNotification,
    sendFailureNotification,
    sendConfirmationSms
} from './notification-client.js';
import { 
    watchForFiles, 
    moveProcessedFile 
} from './file-watcher.js';
import { ANTHROPIC_API_KEY } from './shared/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to determine the next modification number for remix chains
 * Parses "modification 1:", "modification 2:" patterns to find the highest number
 */
function getNextModificationNumber(originalPrompt: string): number {
    const modificationPattern = /modification (\d+):/g;
    let highestNumber = 0;
    let match;
    
    while ((match = modificationPattern.exec(originalPrompt)) !== null) {
        const modNumber = parseInt(match[1], 10);
        if (modNumber > highestNumber) {
            highestNumber = modNumber;
        }
    }
    
    return highestNumber + 1;
}

/**
 * Call Claude API directly for stackables (bypass wtaf-processor)
 * Simple Claude call without complex builder logic
 */
async function callClaudeDirectly(systemPrompt: string, userPrompt: string, config: { model: string; maxTokens: number; temperature: number }): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not found in environment");
    }
    
    logWithTimestamp(`🤖 Calling Claude directly: ${config.model} with ${config.maxTokens} tokens`);
    logWithTimestamp(`📋 System prompt length: ${systemPrompt.length} characters`);
    logWithTimestamp(`📤 User prompt length: ${userPrompt.length} characters`);
    
    const headers: Record<string, string> = {
        "x-api-key": ANTHROPIC_API_KEY!,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    };
    
    const payload = {
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
    };
    
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const result = data.content[0].text;
        
        logWithTimestamp(`✅ Claude response received: ${result.length} characters`);
        return result;
        
    } catch (error) {
        logError(`Claude API call failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Load WTAF Design System dynamically when needed
 * Returns parsed JSON content for injection into builder prompts
 */
async function loadWtafDesignSystem(): Promise<string | null> {
    try {
        const designSystemPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
        const content = await readFile(designSystemPath, 'utf8');
        
        logWithTimestamp("🎨 WTAF Design System loaded dynamically");
        return content; // Return raw JSON - let the AI figure out how to use it
    } catch (error) {
        logWarning(`Error loading WTAF design system: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * REQUEST CONFIGURATIONS
 * Controller (Restaurant Manager) decides business requirements:
 * - What type of request is this?
 * - Which model and settings should be used?
 * - What are the token limits and temperature?
 * 
 * Processor (Chef) executes with provided config and handles fallbacks.
 */
const REQUEST_CONFIGS = {
    creation: {
        classifierModel: 'gpt-4o',
        classifierMaxTokens: 600,
        classifierTemperature: 0.7,
        classifierTopP: 1,
        classifierPresencePenalty: 0.3,
        classifierFrequencyPenalty: 0,
        builderModel: 'claude-3-5-sonnet-20241022',
        builderMaxTokens: 8192,
        builderTemperature: 0.7
    },
    edit: {
        builderModel: 'claude-3-5-sonnet-20241022',
        builderMaxTokens: 4096,  // Edits typically need less
        builderTemperature: 0.5   // More conservative for edits
    },
    game: {
        // GPT-4 settings (commented out for easy reversion):
        // builderModel: 'gpt-4-1106-preview',  // Latest GPT-4 Turbo model (aka GPT-4.1)
        // builderMaxTokens: 4096,              // Maximum supported by this model
        // builderTemperature: 0.2,             // Prioritizes accuracy and determinism
        // builderTopP: 0.1                     // Narrow sampling distribution for predictable output
        
        // Claude settings:
        builderModel: 'claude-3-5-sonnet-20241022',  // Using Claude Sonnet for games
        builderMaxTokens: 8192,                      // Claude supports more tokens
        builderTemperature: 0.25                     // Lower temperature for more deterministic game generation
    },
    zad: {
        classifierModel: 'gpt-4o',
        classifierMaxTokens: 600,
        classifierTemperature: 0.7,
        classifierTopP: 1,
        classifierPresencePenalty: 0.3,
        classifierFrequencyPenalty: 0,
        builderModel: 'claude-3-5-sonnet-20241022',  // From test script
        builderMaxTokens: 8000,                      // From test script (higher for complete apps)
        builderTemperature: 0.2                      // From test script (more focused)
    }
} as const;

/**
 * System prompt for creating new WTAF apps
 * TECHNICAL REQUIREMENTS ONLY - Design/brand requirements injected dynamically from app-tech-spec.json
 */
const CREATION_SYSTEM_PROMPT = `🚨🚨🚨 ABSOLUTE TOP PRIORITY 🚨🚨🚨
🚨🚨🚨 READ THIS FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

IF YOU SEE "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->" IN THE USER'S REQUEST:
YOU MUST CREATE EXACTLY TWO COMPLETE HTML PAGES
SEPARATED BY THAT EXACT DELIMITER
NEVER CREATE JUST ONE PAGE
THIS IS NON-NEGOTIABLE

🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨

You are creating exactly what the user requests. Follow the WTAF Design System & Style Guide provided in the user message for all design and brand requirements.

📧 EMAIL PLACEHOLDER SYSTEM:
IF YOU SEE "EMAIL_NEEDED: true" IN THE USER MESSAGE METADATA:
- Use [CONTACT_EMAIL] as placeholder in ALL email contexts
- Examples: 
  * Contact links: <a href="mailto:[CONTACT_EMAIL]">Email me: [CONTACT_EMAIL]</a>
  * Contact info: "Questions? Email us at [CONTACT_EMAIL]"
  * Business contact: "Hire me: [CONTACT_EMAIL]"
- NEVER use fake emails like "example@email.com" or "your-email@domain.com"
- ALWAYS use the exact placeholder [CONTACT_EMAIL] - this will be replaced later

TECHNICAL REQUIREMENTS FOR APPS WITH FORMS:

1. EXACT Supabase Integration (use these exact placeholders):
const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

2. Public page form submission with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions').insert({
    app_id: 'APP_TABLE_ID',
    submission_data: formData
  })
  if (error) throw error
  // Show success message
} catch (error) {
  console.error('Error:', error)
  alert('Submission failed. Please try again.')
}

3. Admin page fetch with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions')
    .select('*')
    .eq('app_id', 'APP_TABLE_ID')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Display data in table
} catch (error) {
  console.error('Error:', error)
  alert('Failed to load submissions')
}

4. CSV Export (manual implementation):
const csvContent = 'Name,Email,Message\\n' + data.map(row => 
  \`\${row.submission_data.name || ''},\${row.submission_data.email || ''},\${row.submission_data.message || ''}\`
).join('\\n')
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'submissions.csv'
a.click()

5. Required script tag:
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

Use 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' exactly as placeholders.
Replace 'APP_TABLE_ID' with a unique identifier for this app.

Return complete HTML wrapped in \`\`\`html code blocks.`;

/**
 * Load EDIT system prompt from edits.json file
 */
async function loadEditSystemPrompt(): Promise<string> {
    try {
        const { readFile } = await import('fs/promises');
        const { join } = await import('path');
        const editsPath = join(__dirname, '..', 'content', 'edits.json');
        const editsContent = await readFile(editsPath, 'utf8');
        const editsConfig = JSON.parse(editsContent);
        return editsConfig.content;
    } catch (error) {
        logWarning(`Failed to load edits.json: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to basic prompt
        return `You are an expert web developer tasked with editing HTML pages. Make only the requested changes while preserving all existing functionality. Return ONLY the complete modified HTML wrapped in \`\`\`html code blocks.`;
    }
}

/**
 * Process WTAF creation workflow
 * Main workflow extracted from monitor.py execute_gpt4o function
 */
export async function processWtafRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
    logWithTimestamp("🚀 STARTING WTAF PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing file: ${processingPath}`);
    
    let { senderPhone, userSlug, userPrompt } = fileData;
    const { coach, cleanPrompt } = requestInfo;
    
    // Store the original user input before any processing for database storage
    const originalUserInput = userPrompt;
    
    // 🔧 ADMIN OVERRIDE: Check for --admin flag to force admin processing
    let forceAdminPath = false;
    let isMinimalTest = false;
    if (userPrompt && userPrompt.includes('--admin-test')) {
        logWithTimestamp("🧪 ADMIN-TEST OVERRIDE DETECTED: Using minimal test builder");
        // Clean the prompt by removing the admin-test flag
        userPrompt = userPrompt.replace(/--admin-test\s*/g, '').trim();
        forceAdminPath = true;
        isMinimalTest = true;
        logWithTimestamp(`🧪 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    } else if (userPrompt && userPrompt.includes('--admin')) {
        logWithTimestamp("🔧 ADMIN OVERRIDE DETECTED: Forcing admin classification");
        // Clean the prompt by removing the admin flag
        userPrompt = userPrompt.replace(/--admin\s*/g, '').trim();
        forceAdminPath = true;
        logWithTimestamp(`🔧 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    }
    
    // 🧪 ZAD TEST: Check for --zad-test flag to force simple ZAD test processing
    let isZadTest = false;
    if (userPrompt && userPrompt.includes('--zad-test')) {
        logWithTimestamp("🧪 ZAD-TEST OVERRIDE DETECTED: Using simple ZAD test builder");
        // Clean the prompt by removing the zad-test flag
        userPrompt = userPrompt.replace(/--zad-test\s*/g, '').trim();
        isZadTest = true;
        logWithTimestamp(`🧪 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    }
    
    // 🚀 ZAD API: Check for --zad-api flag to force comprehensive ZAD with API conversion
    let isZadApi = false;
    if (userPrompt && userPrompt.includes('--zad-api')) {
        logWithTimestamp("🚀 ZAD-API OVERRIDE DETECTED: Using comprehensive ZAD builder with API conversion");
        // Clean the prompt by removing the zad-api flag
        userPrompt = userPrompt.replace(/--zad-api\s*/g, '').trim();
        isZadApi = true;
        logWithTimestamp(`🚀 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    }
    
    // 🎵 MUSIC: Check for --music flag to force music app generation
    let isMusicRequest = false;
    if (userPrompt && (userPrompt.includes('--music '))) {
        logWithTimestamp("🎵 MUSIC OVERRIDE DETECTED: Using music app builder");
        // Clean the prompt by removing the music flag
        userPrompt = userPrompt.replace(/--music\s*/g, '').trim();
        isMusicRequest = true;
        logWithTimestamp(`🎵 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    }
    
    // 🗄️ STACKDB: Check for --stackdb flag (process BEFORE other stack commands)
    let isStackDBRequest = false;
    if (userPrompt && (userPrompt.startsWith('--stackdb ') || userPrompt.startsWith('wtaf --stackdb '))) {
        logWithTimestamp("🗄️ STACKDB DETECTED: Processing with live database connection approach");
        
        // Import stackdb functions dynamically
        const { checkDegenRole, processStackDBRequest } = await import('./stackables-manager.js');
        
        // Check DEGEN role first
        const hasDegenRole = await checkDegenRole(userSlug);
        if (!hasDegenRole) {
            logError(`❌ User ${userSlug} does not have DEGEN role - stackdb requires DEGEN access`);
            await sendFailureNotification("stackdb-permission", senderPhone);
            return false;
        }
        
        const stackResult = await processStackDBRequest(userSlug, userPrompt);
        
        if (!stackResult.success) {
            logError(`❌ Invalid stackdb command format`);
            await sendFailureNotification("stackdb-format", senderPhone);
            return false;
        }
        
        const { userRequest, appSlug: originAppSlug, appUuid: originAppUuid, enhancedPrompt } = stackResult;
        
        if (!enhancedPrompt || !originAppUuid || !originAppSlug) {
            logError(`❌ You don't own app or stackdb processing failed`);
            await sendFailureNotification("stackdb-ownership", senderPhone);
            return false;
        }
        
        // Load stackdb system prompt
        logWithTimestamp("📄 Loading stackdb system prompt");
        const stackdbPromptPath = join(__dirname, '..', 'content', 'stackdb-gpt-prompt.txt');
        const stackdbSystemPrompt = await readFile(stackdbPromptPath, 'utf8');
        logWithTimestamp(`📄 Stackdb system prompt loaded: ${stackdbSystemPrompt.length} characters`);
        
        // Send directly to Claude with stackdb prompt (bypass wtaf-processor entirely)
        logWithTimestamp("🚀 Sending stackdb request directly to Claude (bypassing wtaf-processor)");
        const config = REQUEST_CONFIGS.creation;
        const result = await callClaudeDirectly(stackdbSystemPrompt, enhancedPrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Continue with normal deployment workflow
        const outputFile = join(CLAUDE_OUTPUT_DIR, `stackdb_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Stackdb output saved to: ${outputFile}`);
        
        // Extract code blocks and deploy normally
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in stackdb response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // ⚡ CRITICAL FIX: Use ORIGIN app slug for live data connection (wtaf_submissions uses origin_app_slug column)
        logWithTimestamp(`🔄 Replacing ORIGIN_APP_SLUG with origin app slug: ${originAppSlug}`);
        const codeWithSlug = replaceOriginAppSlug(code, originAppSlug);
        
        // Deploy stackdb result with skipUuidReplacement=true to prevent double replacement
        const deployResult = await saveCodeToSupabase(codeWithSlug, coach || "unknown", userSlug, senderPhone, userRequest || "stackdb request", null, true);
        if (deployResult.publicUrl) {
            // Generate OG image
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const appSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for stackdb: ${userSlug}/${appSlug}`);
                const actualImageUrl = await generateOGImage(userSlug, appSlug);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, appSlug, actualImageUrl);
                    logSuccess(`✅ Updated stackdb HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for stackdb: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            const needsEmail = code.includes('[CONTACT_EMAIL]');
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
            logWithTimestamp("🎉 STACKDB PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
            return true;
        } else {
            logError("Failed to deploy stackdb content");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
    }

    // 🗃️ STACKDATA: Check for --stackdata flag (process BEFORE stackables)
    let isStackDataRequest = false;
    if (userPrompt && (userPrompt.startsWith('--stackdata ') || userPrompt.startsWith('wtaf --stackdata '))) {
        logWithTimestamp("🗃️ STACKDATA DETECTED: Processing with submission data approach");
        
        // Import stackdata functions dynamically
        const { checkDegenRole, parseStackDataCommand, loadStackedDataContent, buildEnhancedDataPrompt } = await import('./stackables-manager.js');
        
        // Check DEGEN role first
        const hasDegenRole = await checkDegenRole(userSlug);
        if (!hasDegenRole) {
            logError(`❌ User ${userSlug} does not have DEGEN role - stackdata requires DEGEN access`);
            await sendFailureNotification("stackdata-permission", senderPhone);
            return false;
        }
        
        // Parse the stackdata command
        const parsed = parseStackDataCommand(userPrompt);
        if (!parsed) {
            logError(`❌ Invalid stackdata command format`);
            await sendFailureNotification("stackdata-format", senderPhone);
            return false;
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🗃️ Stackdata request: ${appSlug} → "${userRequest}"`);
        
        // Load names from submission data (includes ownership verification)
        const names = await loadStackedDataContent(userSlug, appSlug);
        if (names === null) {
            logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
            await sendFailureNotification("stackdata-ownership", senderPhone);
            return false;
        }
        
        // Build enhanced prompt with names data + WTAF design system
        const enhancedPrompt = await buildEnhancedDataPrompt(userRequest, names);
        
        // Load stacker system prompt (same as stackables for now)
        const stackerPromptPath = join(__dirname, '..', 'content', 'stacker-gpt-prompt.txt');
        const stackerSystemPrompt = await readFile(stackerPromptPath, 'utf8');
        logWithTimestamp(`📄 Stackdata system prompt loaded: ${stackerSystemPrompt.length} characters`);
        
        // Send directly to Claude with stacker prompt (bypass wtaf-processor entirely)
        logWithTimestamp("🚀 Sending stackdata request directly to Claude (bypassing wtaf-processor)");
        const config = REQUEST_CONFIGS.creation;
        const result = await callClaudeDirectly(stackerSystemPrompt, enhancedPrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Continue with normal deployment workflow
        const outputFile = join(CLAUDE_OUTPUT_DIR, `stackdata_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Stackdata output saved to: ${outputFile}`);
        
        // Extract code blocks and deploy normally
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in stackdata response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Deploy stackdata result
        const deployResult = await saveCodeToSupabase(code, coach || "unknown", userSlug, senderPhone, userRequest || "stackdata request");
        if (deployResult.publicUrl) {
            // Generate OG image
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const appSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for stackdata: ${userSlug}/${appSlug}`);
                const actualImageUrl = await generateOGImage(userSlug, appSlug);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, appSlug, actualImageUrl);
                    logSuccess(`✅ Updated stackdata HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for stackdata: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            const needsEmail = code.includes('[CONTACT_EMAIL]');
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
            logWithTimestamp("🎉 STACKDATA PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
            return true;
        } else {
            logError("Failed to deploy stackdata content");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
    }
    
    // 📧 STACKEMAIL: Check for --stackemail flag to send emails to app submitters
    if (userPrompt && (userPrompt.startsWith('--stackemail ') || userPrompt.startsWith('wtaf --stackemail '))) {
        logWithTimestamp("📧 STACKEMAIL DETECTED: Processing email to app submitters");
        
        // Import stackemail functions dynamically
        const { checkDegenRole, parseStackEmailCommand, loadSubmissionEmails } = await import('./stackables-manager.js');
        const { sendToCustomEmailList } = await import('../lib/email/sendgrid.js');
        
        // Check DEGEN role first
        const hasDegenRole = await checkDegenRole(userSlug);
        if (!hasDegenRole) {
            logError(`❌ User ${userSlug} does not have DEGEN role - stackemail requires DEGEN access`);
            await sendFailureNotification("stackemail-permission", senderPhone);
            return false;
        }
        
        // Parse the stackemail command
        const parsed = parseStackEmailCommand(userPrompt);
        if (!parsed) {
            logError(`❌ Invalid stackemail command format`);
            await sendFailureNotification("stackemail-format", senderPhone);
            return false;
        }
        
        const { appSlug, emailMessage } = parsed;
        logWithTimestamp(`📧 Stackemail request: ${appSlug} → "${emailMessage}"`);
        
        // Load email addresses from submission data (includes ownership verification)
        const emails = await loadSubmissionEmails(userSlug, appSlug);
        if (emails === null) {
            logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
            await sendFailureNotification("stackemail-ownership", senderPhone);
            return false;
        }
        
        if (emails.length === 0) {
            logError(`❌ No email submissions found for app '${appSlug}'`);
            await sendFailureNotification("stackemail-no-emails", senderPhone);
            return false;
        }
        
        // Send emails to all submitters
        logWithTimestamp(`📧 Sending stackemail to ${emails.length} recipients...`);
        const emailResult = await sendToCustomEmailList(emails, emailMessage, appSlug);
        
        if (emailResult.success) {
            logWithTimestamp("🎉 STACKEMAIL PROCESSING COMPLETE!");
            logWithTimestamp(`📧 Sent to ${emailResult.sentCount} recipients, ${emailResult.failedCount} failed`);
            
            // Send SMS confirmation to user
            const confirmationMessage = `📧 Email sent to ${emailResult.sentCount} people who submitted to ${appSlug}!${emailResult.failedCount > 0 ? ` (${emailResult.failedCount} failed)` : ''}`;
            await sendConfirmationSms(confirmationMessage, senderPhone);
            return true;
        } else {
            logError("Failed to send stackemail");
            await sendFailureNotification("stackemail-send", senderPhone);
            return false;
        }
    }
    
    // 🎨 REMIX: Check for --remix flag to remix existing apps
    if (userPrompt && (userPrompt.startsWith('--remix ') || userPrompt.startsWith('wtaf --remix '))) {
        logWithTimestamp("🎨 REMIX DETECTED: Processing with remix approach");
        
        // Import remix functions dynamically
        const { parseRemixCommand, loadRemixHTMLContent, buildRemixPrompt } = await import('./stackables-manager.js');
        
        // Parse the remix command
        const parsed = parseRemixCommand(userPrompt);
        if (!parsed) {
            logError(`❌ Invalid remix command format`);
            await sendFailureNotification("remix-format", senderPhone);
            return false;
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🎨 Remix request: ${appSlug} → "${userRequest}"`);
        
        // Check if the target app is a ZAD app
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        const { data: appInfo, error: appError } = await supabase
            .from('wtaf_content')
            .select('type')
            .eq('app_slug', appSlug)
            .single();
        
        const isZadApp = appInfo?.type === 'ZAD';
        if (isZadApp) {
            logWithTimestamp(`🤝 Target app is a ZAD app - will use ZAD remix approach`);
        }
        
        // Check if the target app is a game
        const isGameApp = appInfo?.type === 'GAME';
        if (isGameApp) {
            logWithTimestamp(`🎮 Target app is a GAME - will use game remix approach`);
        }
        
        // Load HTML content (includes ownership verification)
        const htmlContent = await loadRemixHTMLContent(userSlug, appSlug);
        if (htmlContent === null) {
            logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
            await sendFailureNotification("remix-ownership", senderPhone);
            return false;
        }
        
        let remixSystemPrompt: string;
        let enhancedPrompt: string;
        let combinedPromptForStorage: string; // For database storage
        
        if (isZadApp) {
            // FRESH ZAD GENERATION: Load original prompt and create new ZAD app
            // This bypasses surgical editing entirely and uses proven ZAD creation
            
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
            
            // Load original prompt from database
            const { data: originalData, error: originalError } = await supabase
                .from('wtaf_content')
                .select('original_prompt')
                .eq('app_slug', appSlug)
                .single();
            
            if (originalError || !originalData?.original_prompt) {
                logError(`❌ Could not load original prompt for ${appSlug}: ${originalError?.message}`);
                await sendFailureNotification("remix-original-prompt", senderPhone);
                return false;
            }
            
            const originalPrompt = originalData.original_prompt;
            logWithTimestamp(`📋 Original prompt loaded: "${originalPrompt}"`);
            logWithTimestamp(`🎨 Remix request: "${userRequest}"`);
            
            // Create combined prompt for storage with modification numbering
            const modificationNumber = getNextModificationNumber(originalPrompt);
            combinedPromptForStorage = `${originalPrompt}. modification ${modificationNumber}: ${userRequest}`;
            logWithTimestamp(`📜 Combined prompt for lineage: "${combinedPromptForStorage}"`);
            
            // Use ZAD builder system with dual requirements
            const zadBuilderPath = join(__dirname, '..', 'content', 'builder-zad-comprehensive.txt');
            const zadBuilderRules = await readFile(zadBuilderPath, 'utf8');
            
            remixSystemPrompt = zadBuilderRules;
            
            enhancedPrompt = `The user is requesting that you do this: "${originalPrompt}" and added "${userRequest}".`;
            
            logWithTimestamp(`📄 FRESH ZAD GENERATION: Original ZAD builder + two clarifying lines`);
        } else if (appInfo?.type === 'GAME') {
            // For games, use the game-specific remix approach with JavaScript preservation
            const { buildGameRemixPrompt } = await import('./stackables-manager.js');
            enhancedPrompt = buildGameRemixPrompt(userRequest, htmlContent);
            const gameRemixPromptPath = join(__dirname, '..', 'content', 'remix-games-prompt.txt');
            remixSystemPrompt = await readFile(gameRemixPromptPath, 'utf8');
            logWithTimestamp(`🎮 Game remix prompt loaded: ${remixSystemPrompt.length} characters`);
            
            // For games, just use the user request
            combinedPromptForStorage = userRequest || "remix request";
        } else {
            // For regular WTAF apps, use the standard remix approach
            enhancedPrompt = buildRemixPrompt(userRequest, htmlContent);
            const remixPromptPath = join(__dirname, '..', 'content', 'remix-gpt-prompt.txt');
            remixSystemPrompt = await readFile(remixPromptPath, 'utf8');
            logWithTimestamp(`📄 Standard remix prompt loaded: ${remixSystemPrompt.length} characters`);
            
            // For regular WTAF apps, just use the user request
            combinedPromptForStorage = userRequest || "remix request";
        }
        
        // Send directly to Claude with appropriate prompt
        logWithTimestamp(`🚀 Sending ${isZadApp ? 'ZAD' : isGameApp ? 'game' : 'standard'} remix request directly to Claude`);
        const config = REQUEST_CONFIGS.creation;
        
        // For ZAD remixes, try to use maximum possible tokens
        const maxTokens = isZadApp ? 8192 : config.builderMaxTokens;
        
        const result = await callClaudeDirectly(remixSystemPrompt, enhancedPrompt, {
            model: config.builderModel,
            maxTokens: maxTokens,
            temperature: config.builderTemperature
        });
        
        // Continue with normal deployment workflow
        const outputFile = join(CLAUDE_OUTPUT_DIR, `remix_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Remix output saved to: ${outputFile}`);
        
        // Extract code blocks from Claude's response
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in remix response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Deploy remix result
        const deployResult = await saveCodeToSupabase(code, "remix", userSlug, senderPhone, combinedPromptForStorage);
        if (deployResult.publicUrl) {
            // Generate OG image
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const newAppSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for remix: ${userSlug}/${newAppSlug}`);
                const actualImageUrl = await generateOGImage(userSlug, newAppSlug);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, newAppSlug, actualImageUrl);
                    logSuccess(`✅ Updated remix HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for remix: ${error instanceof Error ? error.message : String(error)}`);
            }

            // 🔗 SOCIAL UPDATES: Handle remix social features
            try {
                if (deployResult.uuid) {
                    logWithTimestamp(`🔗 Processing social updates for remix...`);
                    const { handleRemixSocialUpdates, getAppInfoForRemix } = await import('./social-manager.js');
                    
                    // Get original app info
                    const originalAppInfo = await getAppInfoForRemix(appSlug);
                    if (originalAppInfo) {
                        const socialSuccess = await handleRemixSocialUpdates(
                            appSlug, // original app slug
                            originalAppInfo.userSlug, // original creator
                            deployResult.uuid, // new remix app UUID
                            userSlug, // person doing the remix
                            userRequest // remix instructions
                        );
                        
                        if (socialSuccess) {
                            logSuccess(`🎉 Social updates completed: remix count incremented, lineage tracked, auto-follow created`);
                        } else {
                            logWarning(`⚠️ Some social updates failed, but remix deployed successfully`);
                        }
                    } else {
                        logWarning(`⚠️ Could not find original app info for social updates`);
                    }
                } else {
                    logWarning(`⚠️ No UUID returned from deployment, skipping social updates`);
                }
            } catch (error) {
                logWarning(`Social updates failed: ${error instanceof Error ? error.message : String(error)}`);
                // Don't fail the entire remix for social update issues
            }
            
            const needsEmail = code.includes('[CONTACT_EMAIL]');
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
            logWithTimestamp("🎉 REMIX PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
            return true;
        } else {
            logError("Failed to deploy remix content");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
    }
    
    // 🤝 STACKZAD: Check for --stackzad flag to create ZAD apps with shared data
    if (userPrompt && (userPrompt.startsWith('--stackzad ') || userPrompt.startsWith('wtaf --stackzad '))) {
        logWithTimestamp("🤝 STACKZAD DETECTED: Processing ZAD app with shared data access");
        
        // Import stackzad functions dynamically
        const { checkDegenRole, processStackZadRequest } = await import('./stackables-manager.js');
        
        // Check DEGEN role first
        const hasDegenRole = await checkDegenRole(userSlug);
        if (!hasDegenRole) {
            logError(`❌ User ${userSlug} does not have DEGEN role - stackzad requires DEGEN access`);
            await sendFailureNotification("stackzad-permission", senderPhone);
            return false;
        }
        
        const stackZadResult = await processStackZadRequest(userSlug, userPrompt);
        
        if (!stackZadResult.success) {
            logError(`❌ Invalid stackzad command format or ownership issue`);
            await sendFailureNotification("stackzad-format", senderPhone);
            return false;
        }
        
        const { userRequest, sourceAppUuid, enhancedPrompt, dataStructureAnalysis, sampleDataSection } = stackZadResult;
        
        if (!enhancedPrompt || !sourceAppUuid) {
            logError(`❌ You don't own the source ZAD app or stackzad processing failed`);
            await sendFailureNotification("stackzad-ownership", senderPhone);
            return false;
        }
        
        // Send directly to Claude with stackzad-specific system prompt (bypass wtaf-processor entirely)
        logWithTimestamp("🚀 Sending stackzad request directly to Claude with stackzad system prompt (bypassing wtaf-processor)");
        
        // Load stackzad-specific system prompt and replace placeholders
        const stackzadTemplatePath = join(__dirname, '..', 'content', 'stackzad-system-prompt.txt');
        let stackzadSystemPrompt = await readFile(stackzadTemplatePath, 'utf8');
        
        // Replace placeholders with actual data directly
        stackzadSystemPrompt = stackzadSystemPrompt.replace('{USER_REQUEST}', userRequest || 'admin interface');
        stackzadSystemPrompt = stackzadSystemPrompt.replace('{DATA_STRUCTURE_ANALYSIS}', 
            dataStructureAnalysis || 'No data structure analysis available');
        stackzadSystemPrompt = stackzadSystemPrompt.replace('{SAMPLE_DATA}', 
            sampleDataSection || 'No sample data available');
            
        logWithTimestamp(`📄 Stackzad system prompt loaded and configured: ${stackzadSystemPrompt.length} characters`);
        
        const config = REQUEST_CONFIGS.creation;
        const result = await callClaudeDirectly(stackzadSystemPrompt, enhancedPrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Continue with normal deployment workflow
        const outputFile = join(CLAUDE_OUTPUT_DIR, `stackzad_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Stackzad output saved to: ${outputFile}`);
        
        // Extract code blocks and deploy normally
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in stackzad response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // ⚡ CRITICAL: Inject SHARED_DATA_UUID for data access while keeping app's own UUID
        logWithTimestamp(`🔄 Injecting SHARED_DATA_UUID for shared data access: ${sourceAppUuid}`);
        
        // Inject the shared data UUID as a separate variable (not replacing APP_ID)
        const sharedDataInjection = `\n// STACKZAD: Shared data configuration\nwindow.SHARED_DATA_UUID = '${sourceAppUuid}';\nconsole.log('🤝 STACKZAD: Using shared data from app:', window.SHARED_DATA_UUID);\n`;
        
        // Find where to inject (after window.APP_ID or at start of first script tag)
        let codeWithSharedUuid = code;
        if (code.includes('window.APP_ID')) {
            // Inject right after window.APP_ID line
            codeWithSharedUuid = code.replace(
                /(window\.APP_ID\s*=\s*['"][^'"]+['"];?)/,
                `$1${sharedDataInjection}`
            );
        } else if (code.includes('<script>')) {
            // Inject at the beginning of the first script tag
            codeWithSharedUuid = code.replace(
                '<script>',
                `<script>${sharedDataInjection}`
            );
        } else {
            logWarning('Could not find suitable injection point for SHARED_DATA_UUID');
        }
        
        // Deploy stackzad result WITHOUT skipUuidReplacement so it gets its own APP_ID
        // Let saveCodeToSupabase handle validation using the normal ZAD pipeline
        const deployResult = await saveCodeToSupabase(codeWithSharedUuid, coach || "unknown", userSlug, senderPhone, userRequest || "stackzad request", null, false);
        if (deployResult.publicUrl) {
            // Generate OG image
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const newAppSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for stackzad: ${userSlug}/${newAppSlug}`);
                const actualImageUrl = await generateOGImage(userSlug, newAppSlug);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, newAppSlug, actualImageUrl);
                    logSuccess(`✅ Updated stackzad HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for stackzad: ${error instanceof Error ? error.message : String(error)}`);
            }

            const needsEmail = code.includes('[CONTACT_EMAIL]');
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
            logWithTimestamp("🎉 STACKZAD PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
            logWithTimestamp(`🤝 Shared data access to ZAD app UUID: ${sourceAppUuid}`);
            return true;
        } else {
            logError("Failed to deploy stackzad content");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
    }
    
    // 🧱 STACKABLES: Check for --stack flag to use HTML template approach
    let isStackablesRequest = false;
    if (userPrompt && (userPrompt.startsWith('--stack ') || userPrompt.startsWith('wtaf --stack '))) {
        logWithTimestamp("🧱 STACKABLES DETECTED: Processing with HTML template approach");
        
        // Import stackables functions dynamically
        const { checkDegenRole, parseStackCommand, loadStackedHTMLContent, buildEnhancedPrompt } = await import('./stackables-manager.js');
        
        // Check DEGEN role first
        const hasDegenRole = await checkDegenRole(userSlug);
        if (!hasDegenRole) {
            logError(`❌ User ${userSlug} does not have DEGEN role - stack requires DEGEN access`);
            await sendFailureNotification("stack-permission", senderPhone);
            return false;
        }
        
        // Parse the stack command
        const parsed = parseStackCommand(userPrompt);
        if (!parsed) {
            logError(`❌ Invalid stack command format`);
            await sendFailureNotification("stackables-format", senderPhone);
            return false;
        }
        
        const { appSlug, userRequest } = parsed;
        logWithTimestamp(`🧱 Stack request: ${appSlug} → "${userRequest}"`);
        
        // Load HTML content (includes ownership verification)
        const htmlContent = await loadStackedHTMLContent(userSlug, appSlug);
        if (htmlContent === null) {
            logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
            await sendFailureNotification("stackables-ownership", senderPhone);
            return false;
        }
        
        // Build enhanced prompt with HTML template
        const enhancedPrompt = buildEnhancedPrompt(userRequest, htmlContent);
        
        // Load stacker system prompt
        const stackerPromptPath = join(__dirname, '..', 'content', 'stacker-gpt-prompt.txt');
        const stackerSystemPrompt = await readFile(stackerPromptPath, 'utf8');
        logWithTimestamp(`📄 Stacker system prompt loaded: ${stackerSystemPrompt.length} characters`);
        
        // Send directly to Claude with stacker prompt (bypass wtaf-processor entirely)
        logWithTimestamp("🚀 Sending stackables request directly to Claude (bypassing wtaf-processor)");
        const config = REQUEST_CONFIGS.creation;
        const result = await callClaudeDirectly(stackerSystemPrompt, enhancedPrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Continue with normal deployment workflow
        const outputFile = join(CLAUDE_OUTPUT_DIR, `stackables_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Stackables output saved to: ${outputFile}`);
        
        // Extract code blocks and deploy normally
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in stackables response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Deploy stackables result
        const deployResult = await saveCodeToSupabase(code, coach || "unknown", userSlug, senderPhone, userRequest || "stackables request");
        if (deployResult.publicUrl) {
            // Generate OG image
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const appSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for stackables: ${userSlug}/${appSlug}`);
                const actualImageUrl = await generateOGImage(userSlug, appSlug);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, appSlug, actualImageUrl);
                    logSuccess(`✅ Updated stackables HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for stackables: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            const needsEmail = code.includes('[CONTACT_EMAIL]');
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
            logWithTimestamp("🎉 STACKABLES PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
            return true;
        } else {
            logError("Failed to deploy stackables content");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
    }
    
    try {
        // Determine request configuration based on content type
        const isGameRequest = userPrompt.toLowerCase().includes('game') || 
                             userPrompt.toLowerCase().includes('pong') ||
                             userPrompt.toLowerCase().includes('puzzle') ||
                             userPrompt.toLowerCase().includes('arcade');
        
        // Determine config type based on basic request analysis
        // ZAD detection will happen in the classifier step
        let configType: keyof typeof REQUEST_CONFIGS;
        if (isGameRequest) {
            configType = 'game';
        } else {
            configType = 'creation';  // Default to creation, classifier will determine if ZAD is needed
        }
        
        const config = REQUEST_CONFIGS[configType];
        
        logWithTimestamp(`🎯 Using ${configType} configuration`);
        logWithTimestamp(`🤖 Models: Classifier=${(config as any).classifierModel || 'N/A'}, Builder=${config.builderModel}`);
        
        // Step 1: Load WTAF Design System BEFORE generating complete prompt
        logWithTimestamp(`🎨 Loading WTAF Design System for prompt generation...`);
        const designSystemForPrompt = await loadWtafDesignSystem();
        if (designSystemForPrompt) {
            logWithTimestamp("🎨 WTAF Design System loaded for prompt generation");
        } else {
            logWarning("⚠️ WTAF Design System failed to load for prompt generation");
        }
        
        // Step 2: Generate complete prompt with config (including admin override and design system)
        logWithTimestamp(`🔧 Generating complete prompt from: ${userPrompt.slice(0, 50)}...`);
        
        // For games, classifier config is not needed since games skip the classifier entirely
        const classifierConfig = configType === 'game' ? {
            classifierModel: 'gpt-4o', // Default fallback (not used for games)
            classifierMaxTokens: 600,
            classifierTemperature: 0.7,
            classifierTopP: 1,
            classifierPresencePenalty: 0.3,
            classifierFrequencyPenalty: 0,
            forceAdminOverride: forceAdminPath,
            designSystem: designSystemForPrompt || undefined
        } : {
            classifierModel: (config as any).classifierModel || 'gpt-4o',
            classifierMaxTokens: (config as any).classifierMaxTokens || 600,
            classifierTemperature: (config as any).classifierTemperature || 0.7,
            classifierTopP: (config as any).classifierTopP || 1,
            classifierPresencePenalty: (config as any).classifierPresencePenalty || 0.3,
            classifierFrequencyPenalty: (config as any).classifierFrequencyPenalty || 0,
            forceAdminOverride: forceAdminPath,
            designSystem: designSystemForPrompt || undefined
        };
        
        // Add marker for minimal test if needed
        let promptToProcess = userPrompt;
        if (isMinimalTest) {
            promptToProcess = userPrompt + ' ADMIN_TEST_MARKER';
            logWithTimestamp("🧪 Added ADMIN_TEST_MARKER to prompt for minimal processing");
        }
        
        // Add marker for ZAD test if needed
        if (isZadTest) {
            promptToProcess = userPrompt + ' ZAD_TEST_MARKER';
            logWithTimestamp("🧪 Added ZAD_TEST_MARKER to prompt for simple ZAD processing");
        }
        
        // Add marker for ZAD API if needed
        if (isZadApi) {
            promptToProcess = userPrompt + ' ZAD_API_MARKER';
            logWithTimestamp("🚀 Added ZAD_API_MARKER to prompt for comprehensive ZAD with API conversion");
        }
        
        // Add marker for Music if needed
        if (isMusicRequest) {
            promptToProcess = userPrompt + ' MUSIC_MARKER';
            logWithTimestamp("🎵 Added MUSIC_MARKER to prompt for music app generation");
        }
        
        const completePrompt = await generateCompletePrompt(promptToProcess, classifierConfig);
        logWithTimestamp(`🔧 Complete prompt generated: ${completePrompt.slice(0, 100) || 'None'}...`);
        
        let result: string;
        
        // Check if generateCompletePrompt returned final HTML (ZAD template)
        if (completePrompt.startsWith('```html')) {
            logWithTimestamp("🤝 ZAD template detected - skipping AI builder stage entirely");
            result = completePrompt; // Use the template directly, no AI call needed
        } else {
            // PARTY TRICK: Email detection happens via HTML content analysis later
            
            // Step 2: Send complete prompt to Claude with config
            logWithTimestamp("🚀 PROMPT 2: Sending complete prompt to Claude...");
            logWithTimestamp(`🔧 Complete prompt being sent to Claude: ${completePrompt.slice(-300)}`); // Last 300 chars
            
            // WTAF Design System is now loaded earlier and passed through classifierConfig
            // Use the design system that was loaded before prompt generation
            let designSystemContent = designSystemForPrompt;
            
            result = await callClaude(CREATION_SYSTEM_PROMPT, completePrompt, {
                model: config.builderModel,
                maxTokens: config.builderMaxTokens,
                temperature: config.builderTemperature,
                designSystem: designSystemContent || undefined
            });
        }
        
        // Step 3: Save output to file for debugging
        const outputFile = join(CLAUDE_OUTPUT_DIR, `output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        if (completePrompt.startsWith('```html')) {
            logWithTimestamp(`💾 ZAD template output saved to: ${outputFile}`);
        } else {
            logWithTimestamp(`💾 Claude output saved to: ${outputFile}`);
        }
        
        // Step 4: Extract code blocks
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Step 5: Deploy the content
        if (userSlug) {
            // Use Supabase save function for WTAF content
            logWithTimestamp(`🎯 Using Supabase save for user_slug: ${userSlug}`);
            
            // Check if Claude generated dual pages by looking for the delimiter
            const delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->';
            logWithTimestamp(`🔍 Checking for delimiter in code (length: ${code.length} chars)`);
            logWithTimestamp(`🔍 Code preview: ${code.slice(0, 200)}...`);
            
            let isDualPage = false;
            let publicUrl = null;
            let adminUrl = null;
            
            if (code.includes(delimiter)) {
                logWithTimestamp(`📊 Dual-page app detected - deploying both pages`);
                
                // Split HTML on the delimiter
                const [publicHtml, adminHtml] = code.split(delimiter, 2);
                logWithTimestamp(`✂️ Split HTML into public (${publicHtml.length} chars) and admin (${adminHtml.length} chars) pages`);
                
                // Deploy public page (normal app)
                // Determine the coach type for database storage
                const coachType = configType === 'game' ? 'game' : (coach || "unknown");
                
                const publicResult = await saveCodeToSupabase(
                    publicHtml.trim(), 
                    coachType, 
                    userSlug, 
                    senderPhone, 
                    originalUserInput
                );
                
                if (publicResult.appSlug && publicResult.publicUrl && publicResult.uuid) {
                    publicUrl = publicResult.publicUrl;
                    
                    // Configure admin page to use main app's UUID for data operations
                    const adminHtmlWithMainUuid = injectSubmissionUuid(adminHtml.trim(), publicResult.uuid);
                    logWithTimestamp(`🔗 Admin page configured to use main app UUID: ${publicResult.uuid}`);
                    
                    // Deploy admin page with admin prefix
                    const adminResult = await saveCodeToSupabase(
                        adminHtmlWithMainUuid, 
                        coach || "unknown", 
                        userSlug, 
                        senderPhone, 
                        `Admin dashboard for ${originalUserInput}`, 
                        publicResult.appSlug
                    );
                    
                    if (adminResult.publicUrl) {
                        adminUrl = adminResult.publicUrl;
                        isDualPage = true;
                        logWithTimestamp(`✅ Dual-page setup complete:`);
                        logWithTimestamp(`   📱 Main app: ${publicUrl} (UUID: ${publicResult.uuid})`);
                        logWithTimestamp(`   📊 Admin page: ${adminUrl} (UUID: ${adminResult.uuid})`);
                        logWithTimestamp(`   💾 Data storage: Uses main app UUID ${publicResult.uuid}`);
                    }
                }
            } else {
                // Single page deployment
                logWithTimestamp(`📱 Single-page app - deploying one page`);
                
                // Determine the coach type for database storage
                const coachType = configType === 'game' ? 'game' : (coach || "unknown");
                
                const result = await saveCodeToSupabase(code, coachType, userSlug, senderPhone, originalUserInput);
                publicUrl = result.publicUrl;
                if (result.uuid) {
                    logWithTimestamp(`📱 Single-page app deployed with UUID: ${result.uuid}`);
                    if (configType === 'game') {
                        logWithTimestamp(`🎮 Game app will be stored with type: 'GAME'`);
                    }
                }
            }
            
            // Generate OG image and update HTML BEFORE sending SMS (like Python monitor.py)
            if (publicUrl) {
                try {
                    // Extract app slug from URL for OG generation
                    const urlParts = publicUrl.split('/');
                    const appSlug = urlParts[urlParts.length - 1];
                    
                    logWithTimestamp(`🖼️ Generating OG image for: ${userSlug}/${appSlug}`);
                    const actualImageUrl = await generateOGImage(userSlug, appSlug);
                    
                    if (actualImageUrl) {
                        logSuccess(`✅ Generated OG image: ${actualImageUrl}`);
                        // Update the saved HTML with the actual image URL
                        const updateSuccess = await updateOGImageInHTML(userSlug, appSlug, actualImageUrl);
                        if (updateSuccess) {
                            logSuccess(`✅ Updated HTML with correct OG image URL`);
                        } else {
                            logWarning(`⚠️ Failed to update HTML with OG image URL`);
                        }
                    } else {
                        logWarning(`⚠️ OG generation failed, keeping fallback URL`);
                    }
                } catch (error) {
                    logWarning(`OG generation failed: ${error instanceof Error ? error.message : String(error)}`);
                }
                
                // PARTY TRICK: Check if page needs email completion (simplified detection)
                const needsEmail = code.includes('[CONTACT_EMAIL]');
                await sendSuccessNotification(publicUrl, adminUrl, senderPhone, needsEmail);
                logWithTimestamp("=" + "=".repeat(79));
                logWithTimestamp("🎉 WTAF PROCESSING COMPLETE!");
                logWithTimestamp(`🌐 Final URL: ${publicUrl}`);
                if (adminUrl) {
                    logWithTimestamp(`📊 Admin URL: ${adminUrl}`);
                }
                logWithTimestamp("=" + "=".repeat(79));
                return true;
            } else {
                logError("Failed to save content");
                await sendFailureNotification("database", senderPhone);
                return false;
            }
        } else {
            // Use legacy file save for non-WTAF content
            logWithTimestamp(`📁 Using legacy file save for non-WTAF content`);
            const result = await saveCodeToFile(code, coach || "unknown", requestInfo.slug, WEB_OUTPUT_DIR);
            
            if (result.publicUrl) {
                // Generate OG image for legacy files too (before SMS)
                try {
                    logWithTimestamp(`🖼️ Generating OG image for legacy file: lab/${requestInfo.slug}`);
                    const actualImageUrl = await generateOGImage("lab", requestInfo.slug);
                    
                    if (actualImageUrl) {
                        logSuccess(`✅ Generated OG image for legacy file: ${actualImageUrl}`);
                        // Note: Legacy files don't get HTML updates since they're file-based, not database-based
                        logWithTimestamp(`📝 Legacy files use API endpoint in meta tags (file-based storage)`);
                    } else {
                        logWarning(`⚠️ OG generation failed for legacy file`);
                    }
                } catch (error) {
                    logWarning(`OG generation failed: ${error instanceof Error ? error.message : String(error)}`);
                }
                
                await sendSuccessNotification(result.publicUrl, null, senderPhone, false);
                logWithTimestamp("=" + "=".repeat(79));
                logWithTimestamp("🎉 LEGACY PROCESSING COMPLETE!");
                logWithTimestamp(`🌐 Final URL: ${result.publicUrl}`);
                logWithTimestamp("=" + "=".repeat(79));
                return true;
            } else {
                logError("Failed to save content");
                await sendFailureNotification("database", senderPhone);
                return false;
            }
        }
        
    } catch (error) {
        logError(`WTAF processing error: ${error instanceof Error ? error.message : String(error)}`);
        await sendFailureNotification("generic", senderPhone);
        return false;
    }
}

/**
 * Process MEME request workflow
 * Generates memes using OpenAI GPT + DALL-E and saves to Supabase
 */
export async function processMemeRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
    logWithTimestamp("🎨 STARTING MEME PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing file: ${processingPath}`);
    
    const { senderPhone, userSlug, userPrompt } = fileData;
    
    try {
        // Import meme processor dynamically
        const { processMemeRequest } = await import('./meme-processor.js');
        
        // Load meme configuration
        const memeConfigPath = join(__dirname, '..', 'content', 'meme-config.json');
        const memeConfigContent = await readFile(memeConfigPath, 'utf8');
        const memeConfig = JSON.parse(memeConfigContent);
        
        const config = {
            model: memeConfig.meme_generation.content_model,
            maxTokens: memeConfig.meme_generation.content_max_tokens,
            temperature: memeConfig.meme_generation.content_temperature
        };
        
        logWithTimestamp(`🎨 Using meme config: ${config.model}, ${config.maxTokens} tokens, temp ${config.temperature}`);
        
        // Process the meme request
        const result = await processMemeRequest(userPrompt, userSlug, config);
        
        if (!result.success || !result.html) {
            logError(`Meme generation failed: ${result.error}`);
            await sendFailureNotification("meme-generation", senderPhone);
            return false;
        }
        
        // Save meme HTML to Supabase with type='MEME'
        const deployResult = await saveCodeToSupabase(
            result.html, 
            "meme-generator", 
            userSlug, 
            senderPhone, 
            userPrompt,
            null, // no admin table ID
            false // don't skip UUID replacement
        );
        
        if (deployResult.publicUrl && deployResult.uuid) {
            // Update the wtaf_content entry to set type='MEME' and store meme metadata + fix URL
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = await import('./shared/config.js');
                const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
                
                // Update the HTML to inject the correct URL
                const updatedHTML = result.html!.replace(
                    'window.MEME_URL = null;',
                    `window.MEME_URL = "${deployResult.publicUrl}";`
                );
                
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({ 
                        type: 'MEME',
                        html_content: updatedHTML, // Update HTML with correct URL
                        submission_data: {
                            meme_text: userPrompt,
                            top_text: result.memeContent?.topText,
                            bottom_text: result.memeContent?.bottomText,
                            theme: result.memeContent?.theme,
                            image_url: result.imageUrl
                        }
                    })
                    .eq('id', deployResult.uuid);
                
                if (updateError) {
                    logWarning(`Failed to update meme metadata: ${updateError.message}`);
                } else {
                    logSuccess(`✅ Updated wtaf_content with type='MEME', metadata, and correct URL`);
                }
            } catch (error) {
                logWarning(`Error updating meme metadata: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            // Generate OG image for the meme (use the meme image itself)
            try {
                const urlParts = deployResult.publicUrl.split('/');
                const appSlug = urlParts[urlParts.length - 1];
                logWithTimestamp(`🖼️ Generating OG image for meme: ${userSlug}/${appSlug}`);
                // For memes: Use the composite meme image as the OpenGraph image
                const actualImageUrl = await generateOGImage(userSlug, appSlug, result.imageUrl);
                if (actualImageUrl) {
                    await updateOGImageInHTML(userSlug, appSlug, actualImageUrl);
                    logSuccess(`✅ Updated meme HTML with OG image URL`);
                }
            } catch (error) {
                logWarning(`OG generation failed for meme: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, false);
            logWithTimestamp("=" + "=".repeat(79));
            logWithTimestamp("🎉 MEME PROCESSING COMPLETE!");
            logWithTimestamp(`🌐 Meme URL: ${deployResult.publicUrl}`);
            logWithTimestamp("=" + "=".repeat(79));
            return true;
        } else {
            logError("Failed to save meme to database");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
        
    } catch (error) {
        logError(`Meme processing failed: ${error instanceof Error ? error.message : String(error)}`);
        await sendFailureNotification("meme-generation", senderPhone);
        return false;
    }
}

/**
 * Process EDIT workflow
 * Handles edit-* files created by handlers.ts EDIT command
 */
export async function processEditRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
    logWithTimestamp("🎨 STARTING EDIT PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing edit file: ${processingPath}`);
    
    const { senderPhone, userPrompt } = fileData;
    
    try {
        // Parse EDIT file format (from degen_commands.ts)
        const lines = fileData.rawContent.split('\n');
        let editTarget = null;
        let editInstructions = null;
        let originalHtml = null;
        let userSlug = null;
        
        // Parse the file structure
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('USER_SLUG:')) {
                userSlug = lines[i].replace('USER_SLUG:', '').trim();
            }
            if (lines[i].startsWith('EDIT_TARGET:')) {
                editTarget = lines[i].replace('EDIT_TARGET:', '').trim();
            }
            if (lines[i].startsWith('EDIT_INSTRUCTIONS:')) {
                editInstructions = lines[i].replace('EDIT_INSTRUCTIONS:', '').trim();
            }
            if (lines[i] === 'ORIGINAL_HTML:') {
                originalHtml = lines.slice(i + 1).join('\n');
                break;
            }
        }
        
        if (!userSlug || !editTarget || !editInstructions || !originalHtml) {
            logError("Invalid EDIT file format - missing user_slug, target, instructions, or HTML");
            await sendFailureNotification("invalid-edit", senderPhone);
            return false;
        }
        
        logWithTimestamp(`🎯 Edit target: ${editTarget}`);
        logWithTimestamp(`📝 Edit instructions: ${editInstructions.slice(0, 50)}...`);
        logWithTimestamp(`📏 Original HTML length: ${originalHtml.length} chars`);
        logWithTimestamp(`📝 Original HTML preview: ${originalHtml.slice(0, 100)}...`);
        
        // Create edit prompt for Claude
        const editPrompt = `Please modify the following HTML code according to these instructions: "${editInstructions}"

IMPORTANT REQUIREMENTS:
- Keep all existing functionality intact
- Only modify what's requested in the instructions
- Maintain the same overall structure and design aesthetic
- Return ONLY the complete modified HTML wrapped in \`\`\`html code blocks
- Do not add explanatory text outside the code block

Original HTML:
${originalHtml}`;

        logWithTimestamp(`📏 Edit prompt length: ${editPrompt.length} chars`);
        logWithTimestamp(`📝 Edit prompt preview: ${editPrompt.slice(0, 200)}...`);

        // Send to Claude with edit configuration
        const config = REQUEST_CONFIGS.edit;
        logWithTimestamp(`🎯 Using edit configuration`);
        logWithTimestamp(`🤖 Model: ${config.builderModel} (${config.builderMaxTokens} tokens)`);
        
        // Load the enhanced edit system prompt (includes ZAD detection)
        const editSystemPrompt = await loadEditSystemPrompt();
        
        const result = await callClaude(editSystemPrompt, editPrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Extract code blocks
        const modifiedCode = extractCodeBlocks(result);
        if (!modifiedCode.trim()) {
            logWarning("No code block found in edit response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Check if this is a ZAD page and validate response
        const isZadPage = originalHtml.includes('wtaf_zero_admin_collaborative');
        if (isZadPage) {
            logWithTimestamp("🔍 ZAD page detected - validating response for shortcuts");
            
            // Check for forbidden shortcuts in ZAD responses
            const forbiddenPatterns = [
                '<!-- Original',
                '<!-- Rest of',
                '<!-- JavaScript remains',
                '/* Original',
                '/* Rest of',
                '...',
                'remains unchanged',
                'remains exactly the same',
                'unchanged content'
            ];
            
            const hasShortcuts = forbiddenPatterns.some(pattern => 
                modifiedCode.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (hasShortcuts) {
                logError("🚨 ZAD VALIDATION FAILED: Claude used forbidden shortcuts");
                logError("📝 Response contained abbreviated content instead of full HTML");
                await sendFailureNotification("zad-validation", senderPhone);
                return false;
            }
            
            // Check that response is reasonably complete (should be similar length to original)
            const originalLength = originalHtml.length;
            const responseLength = modifiedCode.length;
            const lengthRatio = responseLength / originalLength;
            
            if (lengthRatio < 0.8) {
                logError(`🚨 ZAD VALIDATION FAILED: Response too short (${responseLength} vs ${originalLength} chars)`);
                logError("📝 Response appears to be abbreviated, rejecting");
                await sendFailureNotification("zad-validation", senderPhone);
                return false;
            }
            
            logSuccess("✅ ZAD validation passed - response appears complete");
        }
        
        // Update the existing page in Supabase
        const { updatePageInSupabase } = await import('./storage-manager.js');
        const success = await updatePageInSupabase(userSlug, editTarget, modifiedCode);
        
        if (success) {
            // Get the URL for notification - include user slug for correct WTAF path
            const pageUrl = `${WTAF_DOMAIN.replace(/^https?:\/\//, '')}/${userSlug}/${editTarget}`;
            await sendSuccessNotification(pageUrl, null, senderPhone, false);
            logSuccess(`✅ Edit completed successfully: ${pageUrl}`);
            return true;
        } else {
            logError("Failed to update page in database");
            await sendFailureNotification("database", senderPhone);
            return false;
        }
        
    } catch (error) {
        logError(`Edit processing error: ${error instanceof Error ? error.message : String(error)}`);
        await sendFailureNotification("generic", senderPhone);
        return false;
    }
}

/**
 * Process REMIX workflow
 * Handles remix-* files created by handlers.ts REMIX command
 * Extracts the stack command and processes it using stackables system
 */
export async function processRemixRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
    logWithTimestamp("🎨 STARTING REMIX PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing remix file: ${processingPath}`);
    
    const { senderPhone } = fileData;
    
    try {
        // Parse REMIX file format (from degen_commands.ts)
        const lines = fileData.rawContent.split('\n');
        let remixCommand = null;
        let userSlug = null;
        let originalRequest = null;
        
        // Parse the file structure
        for (const line of lines) {
            if (line.startsWith('USER_SLUG:')) {
                userSlug = line.replace('USER_SLUG:', '').trim();
            }
            if (line.startsWith('REMIX_COMMAND:')) {
                remixCommand = line.replace('REMIX_COMMAND:', '').trim();
            }
            if (line.startsWith('ORIGINAL_REQUEST:')) {
                originalRequest = line.replace('ORIGINAL_REQUEST:', '').trim();
            }
        }
        
        if (!userSlug || !remixCommand || !originalRequest) {
            logError("Invalid REMIX file format - missing user_slug, remix_command, or original_request");
            await sendFailureNotification("invalid-remix", senderPhone);
            return false;
        }
        
        logWithTimestamp(`🎯 REMIX command: ${remixCommand}`);
        logWithTimestamp(`👤 User slug: ${userSlug}`);
        logWithTimestamp(`📝 Original request: ${originalRequest}`);
        
        // Process the remix command using the new remix system
        // The remix command is formatted as: --remix target-slug remix instructions
        if (remixCommand.startsWith('--remix ') || remixCommand.startsWith('wtaf --remix ')) {
            logWithTimestamp("🎨 REMIX using new remix system");
            
            // Import remix functions dynamically
            const { parseRemixCommand, loadRemixHTMLContent, buildRemixPrompt } = await import('./stackables-manager.js');
            
            // Parse the remix command
            const parsed = parseRemixCommand(remixCommand);
            if (!parsed) {
                logError(`❌ Invalid remix command format in remix: ${remixCommand}`);
                await sendFailureNotification("remix-format", senderPhone);
                return false;
            }
            
            const { appSlug, userRequest } = parsed;
            logWithTimestamp(`🎨 Remix request: ${appSlug} → "${userRequest}"`);
            
            // Check if the target app is a ZAD app
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
            const { data: appInfo, error: appError } = await supabase
                .from('wtaf_content')
                .select('type')
                .eq('app_slug', appSlug)
                .single();
            
            const isZadApp = appInfo?.type === 'ZAD';
            const isGameApp = appInfo?.type === 'GAME';
            
            if (isZadApp) {
                logWithTimestamp(`🤝 Target app is a ZAD app - will use ZAD remix approach`);
            }
            if (isGameApp) {
                logWithTimestamp(`🎮 Target app is a GAME - will use game remix approach`);
            }
            
            // Load HTML content (includes ownership verification)
            const htmlContent = await loadRemixHTMLContent(userSlug, appSlug);
            if (htmlContent === null) {
                logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
                await sendFailureNotification("remix-ownership", senderPhone);
                return false;
            }
            
            let remixSystemPrompt: string;
            let enhancedPrompt: string;
            let combinedPromptForStorage: string; // For database storage
            
            if (isZadApp) {
                // FRESH ZAD GENERATION: Load original prompt and create new ZAD app
                // This bypasses surgical editing entirely and uses proven ZAD creation
                
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
                
                // Load original prompt from database
                const { data: originalData, error: originalError } = await supabase
                    .from('wtaf_content')
                    .select('original_prompt')
                    .eq('app_slug', appSlug)
                    .single();
                
                if (originalError || !originalData?.original_prompt) {
                    logError(`❌ Could not load original prompt for ${appSlug}: ${originalError?.message}`);
                    await sendFailureNotification("remix-original-prompt", senderPhone);
                    return false;
                }
                
                const originalPrompt = originalData.original_prompt;
                logWithTimestamp(`📋 Original prompt loaded: "${originalPrompt}"`);
                logWithTimestamp(`🎨 Remix request: "${userRequest}"`);
                
                // Create combined prompt for storage with modification numbering
                const modificationNumber = getNextModificationNumber(originalPrompt);
                combinedPromptForStorage = `${originalPrompt}. modification ${modificationNumber}: ${userRequest}`;
                logWithTimestamp(`📜 Combined prompt for lineage: "${combinedPromptForStorage}"`);
                
                // Use ZAD builder system with dual requirements
                const zadBuilderPath = join(__dirname, '..', 'content', 'builder-zad-comprehensive.txt');
                const zadBuilderRules = await readFile(zadBuilderPath, 'utf8');
                
                remixSystemPrompt = zadBuilderRules;
                
                enhancedPrompt = `The user is requesting that you do this: "${originalPrompt}" and added "${userRequest}".`;
                
                logWithTimestamp(`📄 FRESH ZAD GENERATION: Original ZAD builder + two clarifying lines`);
            } else if (isGameApp) {
                // For games, use the game-specific remix approach with JavaScript preservation
                const { buildGameRemixPrompt } = await import('./stackables-manager.js');
                enhancedPrompt = buildGameRemixPrompt(userRequest, htmlContent);
                const gameRemixPromptPath = join(__dirname, '..', 'content', 'remix-games-prompt.txt');
                remixSystemPrompt = await readFile(gameRemixPromptPath, 'utf8');
                logWithTimestamp(`🎮 Game remix prompt loaded: ${remixSystemPrompt.length} characters`);
                
                // For games, just use the user request
                combinedPromptForStorage = userRequest || "remix request";
            } else {
                // For regular WTAF apps, use the standard remix approach
                enhancedPrompt = buildRemixPrompt(userRequest, htmlContent);
                const remixPromptPath = join(__dirname, '..', 'content', 'remix-gpt-prompt.txt');
                remixSystemPrompt = await readFile(remixPromptPath, 'utf8');
                logWithTimestamp(`📄 Standard remix prompt loaded: ${remixSystemPrompt.length} characters`);
                
                // For regular WTAF apps, just use the user request
                combinedPromptForStorage = userRequest || "remix request";
            }
            
            // Send directly to Claude with appropriate prompt
            logWithTimestamp(`🚀 Sending ${isZadApp ? 'ZAD' : isGameApp ? 'game' : 'standard'} remix request directly to Claude`);
            const config = REQUEST_CONFIGS.creation;
            const result = await callClaudeDirectly(remixSystemPrompt, enhancedPrompt, {
                model: config.builderModel,
                maxTokens: config.builderMaxTokens,
                temperature: config.builderTemperature
            });
            
            // Continue with normal deployment workflow
            const outputFile = join(CLAUDE_OUTPUT_DIR, `remix_output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
            await writeFile(outputFile, result, 'utf8');
            logWithTimestamp(`💾 Remix output saved to: ${outputFile}`);
            
            // Extract code blocks and deploy normally
            let code = extractCodeBlocks(result);
            if (!code.trim()) {
                logWarning("No code block found in remix response.");
                await sendFailureNotification("no-code", senderPhone);
                return false;
            }
            
            // POST-PROCESSING FIX: For game remixes, check for JavaScript placeholders and inject original code
            if (isGameApp && htmlContent) {
                logWithTimestamp(`🔧 Checking for JavaScript placeholders in game remix...`);
                
                // Common placeholder patterns that Claude uses
                const placeholderPatterns = [
                    /\/\/ All JavaScript code remains unchanged/gi,
                    /\/\/ All JavaScript code stays identical/gi,
                    /\/\/ JavaScript remains exactly the same/gi,
                    /\/\/ \[Rest of JavaScript code remains exactly the same\]/gi,
                    /<!-- JavaScript remains exactly the same -->/gi,
                    /\[ALL JAVASCRIPT CODE REMAINS EXACTLY THE SAME AS IN THE ORIGINAL FILE\]/gi
                ];
                
                // Check if any placeholders exist
                const hasPlaceholders = placeholderPatterns.some(pattern => pattern.test(code));
                
                if (hasPlaceholders) {
                    logWithTimestamp(`⚠️ Found JavaScript placeholders - injecting original JavaScript`);
                    
                    // Extract all script sections from original HTML
                    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
                    const originalScripts: string[] = [];
                    let scriptMatch;
                    
                    while ((scriptMatch = scriptRegex.exec(htmlContent)) !== null) {
                        const scriptContent = scriptMatch[1].trim();
                        if (scriptContent && !scriptContent.match(/^\/\/.*remains/i)) {
                            originalScripts.push(scriptContent);
                        }
                    }
                    
                    if (originalScripts.length > 0) {
                        logWithTimestamp(`📜 Found ${originalScripts.length} script sections in original`);
                        
                        // Replace placeholder scripts with original scripts
                        let scriptIndex = 0;
                        code = code.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
                            // Check if this script contains a placeholder
                            const isPlaceholder = placeholderPatterns.some(pattern => pattern.test(content));
                            
                            if (isPlaceholder && scriptIndex < originalScripts.length) {
                                logWithTimestamp(`✅ Replacing placeholder script ${scriptIndex + 1} with original`);
                                const replacement = `<script>\n${originalScripts[scriptIndex]}\n</script>`;
                                scriptIndex++;
                                return replacement;
                            }
                            
                            return match; // Keep non-placeholder scripts as-is
                        });
                        
                        logSuccess(`🎮 Successfully injected ${scriptIndex} original JavaScript sections`);
                    } else {
                        logWarning(`⚠️ No original JavaScript found to inject`);
                    }
                } else {
                    logWithTimestamp(`✅ No JavaScript placeholders detected - remix appears complete`);
                }
            }
            
            // Deploy remix result
            const deployResult = await saveCodeToSupabase(code, "remix", userSlug, senderPhone, combinedPromptForStorage);
            if (deployResult.publicUrl) {
                // Generate OG image
                try {
                    const urlParts = deployResult.publicUrl.split('/');
                    const newAppSlug = urlParts[urlParts.length - 1];
                    logWithTimestamp(`🖼️ Generating OG image for remix: ${userSlug}/${newAppSlug}`);
                    const actualImageUrl = await generateOGImage(userSlug, newAppSlug);
                    if (actualImageUrl) {
                        await updateOGImageInHTML(userSlug, newAppSlug, actualImageUrl);
                        logSuccess(`✅ Updated remix HTML with OG image URL`);
                    }
                } catch (error) {
                    logWarning(`OG generation failed for remix: ${error instanceof Error ? error.message : String(error)}`);
                }

                // 🔗 SOCIAL UPDATES: Handle remix social features
                try {
                    if (deployResult.uuid) {
                        logWithTimestamp(`🔗 Processing social updates for remix...`);
                        const { handleRemixSocialUpdates, getAppInfoForRemix } = await import('./social-manager.js');
                        
                        // Get original app info
                        const originalAppInfo = await getAppInfoForRemix(appSlug);
                        if (originalAppInfo) {
                            const socialSuccess = await handleRemixSocialUpdates(
                                appSlug, // original app slug
                                originalAppInfo.userSlug, // original creator
                                deployResult.uuid, // new remix app UUID
                                userSlug, // person doing the remix
                                userRequest // remix instructions
                            );
                            
                            if (socialSuccess) {
                                logSuccess(`🎉 Social updates completed: remix count incremented, lineage tracked, auto-follow created`);
                            } else {
                                logWarning(`⚠️ Some social updates failed, but remix deployed successfully`);
                            }
                        } else {
                            logWarning(`⚠️ Could not find original app info for social updates`);
                        }
                    } else {
                        logWarning(`⚠️ No UUID returned from deployment, skipping social updates`);
                    }
                } catch (error) {
                    logWarning(`Social updates failed: ${error instanceof Error ? error.message : String(error)}`);
                    // Don't fail the entire remix for social update issues
                }
                
                const needsEmail = code.includes('[CONTACT_EMAIL]');
                await sendSuccessNotification(deployResult.publicUrl, null, senderPhone, needsEmail);
                logWithTimestamp("🎉 REMIX PROCESSING COMPLETE!");
                logWithTimestamp(`🌐 Final URL: ${deployResult.publicUrl}`);
                return true;
            } else {
                logError("Failed to deploy remix content");
                await sendFailureNotification("database", senderPhone);
                return false;
            }
        } else {
            logError(`❌ Unsupported remix command format: ${remixCommand} (expected --remix format)`);
            await sendFailureNotification("remix-unsupported", senderPhone);
            return false;
        }
        
    } catch (error) {
        logError(`Remix processing error: ${error instanceof Error ? error.message : String(error)}`);
        await sendFailureNotification("generic", senderPhone);
        return false;
    }
}

/**
 * Main controller loop with worker pool
 * Replaces monitor.py monitor_loop function with concurrent processing
 */
async function mainControllerLoop() {
    logStartupInfo(WEB_APP_URL, WTAF_DOMAIN, WEB_OUTPUT_DIR);
    
    // WTAF Design System will be loaded dynamically when needed for standard web pages
    
    // Create required directories
    try {
        await createRequiredDirectories(PROCESSED_DIR, CLAUDE_OUTPUT_DIR, WEB_OUTPUT_DIR, WATCH_DIRS);
    } catch (error) {
        logError(`Failed to create directories: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
    
    // Import worker pool and batch processing
    const { WorkerPool } = await import('./worker-pool.js');
    const { getAllUnprocessedFilesBatch } = await import('./file-watcher.js');
    const { BATCH_CHECK_INTERVAL } = await import('./shared/config.js');
    
    // Initialize worker pool
    const workerPool = new WorkerPool();
    globalWorkerPool = workerPool; // Store for shutdown handling
    await workerPool.start();
    
    logWithTimestamp("🌀 WTAF Engine running with worker pool...");
    logWithTimestamp(`👀 Watching directories: ${WATCH_DIRS.join(', ')}`);
    
    let loopCount = 0;
    
    try {
        // Main monitoring loop
        while (true) {
            loopCount++;
            
            // Log status every 10 loops
            if (loopCount % 10 === 1) {
                const status = workerPool.getStatus();
                logWithTimestamp(`🔄 Loop #${loopCount} - Workers: ${status.availableWorkers}/${status.workerCount} available, Queue: ${status.queuedTasks}, Active: ${status.activeTasks}`);
            }
            
            try {
                // Get all pending files as tasks
                const tasks = await getAllUnprocessedFilesBatch();
                
                if (tasks.length > 0) {
                    logWithTimestamp(`📋 Found ${tasks.length} files to process`);
                    workerPool.addTasks(tasks);
                } else {
                    if (loopCount % 10 === 1) {
                        logWithTimestamp(`📭 No new files found in ${WATCH_DIRS.join(', ')}`);
                    }
                }
                
            } catch (batchError) {
                logError(`Error getting batch tasks: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
            }
            
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, BATCH_CHECK_INTERVAL * 1000));
        }
        
    } catch (error) {
        logError(`Controller loop error: ${error instanceof Error ? error.message : String(error)}`);
        
        // Cleanup worker pool on error
        await workerPool.stop();
        process.exit(1);
    }
}

// Global worker pool reference for shutdown
let globalWorkerPool: any = null;

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logWithTimestamp("🛑 Received SIGINT. Shutting down gracefully...");
    if (globalWorkerPool) {
        await globalWorkerPool.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logWithTimestamp("🛑 Received SIGTERM. Shutting down gracefully...");
    if (globalWorkerPool) {
        await globalWorkerPool.stop();
    }
    process.exit(0);
});

// Export the main function for use by start-engine script
export { mainControllerLoop };

// Start the controller if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    mainControllerLoop().catch(error => {
        logError(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}