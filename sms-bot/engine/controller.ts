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
import { extractCodeBlocks, injectSubmissionUuid, replaceAppTableId } from './shared/utils.js';
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
        builderModel: 'gpt-4o',    // Games might work better with GPT?
        builderMaxTokens: 16000,
        builderTemperature: 0.3
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

1. Public page form submission using API endpoint:
try {
  const response = await fetch('/api/form/submit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
      formData: formData,
      adminToken: ADMIN_TOKEN,
      app_id: 'APP_TABLE_ID'
    })
  })
  const result = await response.json()
  if (!result.success) throw new Error('Submission failed')
  // Show success message
  // Admin URL available as: result.adminUrl
} catch (error) {
  console.error('Error:', error)
  alert('Submission failed. Please try again.')
}

2. Admin page data loading using API endpoint:
try {
  const response = await fetch(\`/api/form/submissions?token=\${ADMIN_TOKEN}&app_id=APP_TABLE_ID\`)
  const result = await response.json()
  if (result.error) throw new Error(result.error)
  const data = result.submissions
  // Display data in table
} catch (error) {
  console.error('Error:', error)
  alert('Failed to load submissions')
}

3. CSV Export (manual implementation):
const csvContent = 'Name,Email,Message\\\\n' + data.map(row => 
  \\\`\\\${row.submission_data.name || ''},\\\${row.submission_data.email || ''},\\\${row.submission_data.message || ''}\\\`
).join('\\\\n')
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'submissions.csv'
a.click()

Replace 'ADMIN_TOKEN' with a unique admin token for this app.
The admin URL and token will be provided from the form submission response.

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
    
    // 🔧 ADMIN OVERRIDE: Check for --admin flag to force admin processing
    let forceAdminPath = false;
    if (userPrompt && userPrompt.includes('--admin')) {
        logWithTimestamp("🔧 ADMIN OVERRIDE DETECTED: Forcing admin classification");
        // Clean the prompt by removing the admin flag
        userPrompt = userPrompt.replace(/--admin\s*/g, '').trim();
        forceAdminPath = true;
        logWithTimestamp(`🔧 Cleaned prompt: ${userPrompt.slice(0, 50)}...`);
    }
    
    // 🗄️ STACKDB: Check for --stackdb flag (process BEFORE other stack commands)
    let isStackDBRequest = false;
    if (userPrompt && (userPrompt.startsWith('--stackdb ') || userPrompt.startsWith('wtaf --stackdb '))) {
        logWithTimestamp("🗄️ STACKDB DETECTED: Processing with live database connection approach");
        
        // Import stackdb functions dynamically
        const { processStackDBRequest } = await import('./stackables-manager.js');
        
        const stackResult = await processStackDBRequest(userSlug, userPrompt);
        
        if (!stackResult.success) {
            logError(`❌ Invalid stackdb command format`);
            await sendFailureNotification("stackdb-format", senderPhone);
            return false;
        }
        
        const { userRequest, appUuid: originAppUuid, enhancedPrompt } = stackResult;
        
        if (!enhancedPrompt || !originAppUuid) {
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
        
        // ⚡ CRITICAL FIX: Use ORIGIN app UUID for live data connection (not new app UUID)
        logWithTimestamp(`🔄 Replacing app_id with origin app UUID: ${originAppUuid}`);
        const codeWithUuid = replaceAppTableId(code, originAppUuid);
        
        // Deploy stackdb result with skipUuidReplacement=true to prevent double replacement
        const deployResult = await saveCodeToSupabase(codeWithUuid, coach || "unknown", userSlug, senderPhone, userRequest || "stackdb request", null, true);
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
        const { parseStackDataCommand, loadStackedDataContent, buildEnhancedDataPrompt } = await import('./stackables-manager.js');
        
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
        
        // Load HTML content (includes ownership verification)
        const htmlContent = await loadRemixHTMLContent(userSlug, appSlug);
        if (htmlContent === null) {
            logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
            await sendFailureNotification("remix-ownership", senderPhone);
            return false;
        }
        
        // Build remix prompt with HTML template
        const enhancedPrompt = buildRemixPrompt(userRequest, htmlContent);
        
        // Load remix system prompt
        const remixPromptPath = join(__dirname, '..', 'content', 'remix-gpt-prompt.txt');
        const remixSystemPrompt = await readFile(remixPromptPath, 'utf8');
        logWithTimestamp(`📄 Remix system prompt loaded: ${remixSystemPrompt.length} characters`);
        
        // Send directly to Claude with remix prompt (bypass wtaf-processor entirely)
        logWithTimestamp("🚀 Sending remix request directly to Claude (using remix approach)");
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
        const code = extractCodeBlocks(result);
        if (!code.trim()) {
            logWarning("No code block found in remix response.");
            await sendFailureNotification("no-code", senderPhone);
            return false;
        }
        
        // Deploy remix result
        const deployResult = await saveCodeToSupabase(code, "remix", userSlug, senderPhone, userRequest || "remix request");
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
    
    // 🧱 STACKABLES: Check for --stack flag to use HTML template approach
    let isStackablesRequest = false;
    if (userPrompt && (userPrompt.startsWith('--stack ') || userPrompt.startsWith('wtaf --stack '))) {
        logWithTimestamp("🧱 STACKABLES DETECTED: Processing with HTML template approach");
        
        // Import stackables functions dynamically
        const { parseStackCommand, loadStackedHTMLContent, buildEnhancedPrompt } = await import('./stackables-manager.js');
        
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
        
        // Step 1: Generate complete prompt with config (including admin override)
        logWithTimestamp(`🔧 Generating complete prompt from: ${userPrompt.slice(0, 50)}...`);
        
        // For games, classifier config is not needed since games skip the classifier entirely
        const classifierConfig = configType === 'game' ? {
            classifierModel: 'gpt-4o', // Default fallback (not used for games)
            classifierMaxTokens: 600,
            classifierTemperature: 0.7,
            classifierTopP: 1,
            classifierPresencePenalty: 0.3,
            classifierFrequencyPenalty: 0,
            forceAdminOverride: forceAdminPath
        } : {
            classifierModel: (config as any).classifierModel || 'gpt-4o',
            classifierMaxTokens: (config as any).classifierMaxTokens || 600,
            classifierTemperature: (config as any).classifierTemperature || 0.7,
            classifierTopP: (config as any).classifierTopP || 1,
            classifierPresencePenalty: (config as any).classifierPresencePenalty || 0.3,
            classifierFrequencyPenalty: (config as any).classifierFrequencyPenalty || 0,
            forceAdminOverride: forceAdminPath
        };
        
        const completePrompt = await generateCompletePrompt(userPrompt, classifierConfig);
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
            
            // Dynamic WTAF Design System injection - load only for standard web pages
            let designSystemContent = null;
            const isSpecializedRequest = completePrompt.includes('ADMIN_DUAL_PAGE_REQUEST:') || 
                                       completePrompt.includes('ZAD_COMPREHENSIVE_REQUEST:') ||
                                       completePrompt.includes('--stack') ||
                                       completePrompt.includes('--remix') ||
                                       completePrompt.includes('--stackdb') ||
                                       completePrompt.includes('--stackdata');
            
            if (!isSpecializedRequest && configType === 'creation') {
                designSystemContent = await loadWtafDesignSystem();
                if (designSystemContent) {
                    logWithTimestamp("🎨 Dynamic WTAF Design System loaded for standard web page");
                } else {
                    logWarning("⚠️ WTAF Design System failed to load - proceeding without brand guidelines");
                }
            }
            
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
                const publicResult = await saveCodeToSupabase(
                    publicHtml.trim(), 
                    coach || "unknown", 
                    userSlug, 
                    senderPhone, 
                    userPrompt
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
                        `Admin dashboard for ${userPrompt}`, 
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
                const result = await saveCodeToSupabase(code, coach || "unknown", userSlug, senderPhone, userPrompt);
                publicUrl = result.publicUrl;
                if (result.uuid) {
                    logWithTimestamp(`📱 Single-page app deployed with UUID: ${result.uuid}`);
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
            
            // Load HTML content (includes ownership verification)
            const htmlContent = await loadRemixHTMLContent(userSlug, appSlug);
            if (htmlContent === null) {
                logError(`❌ You don't own app '${appSlug}' or it doesn't exist`);
                await sendFailureNotification("remix-ownership", senderPhone);
                return false;
            }
            
            // Build remix prompt with HTML template
            const enhancedPrompt = buildRemixPrompt(userRequest, htmlContent);
            
            // Load remix system prompt
            const remixPromptPath = join(__dirname, '..', 'content', 'remix-gpt-prompt.txt');
            const remixSystemPrompt = await readFile(remixPromptPath, 'utf8');
            logWithTimestamp(`📄 Remix system prompt loaded: ${remixSystemPrompt.length} characters`);
            
            // Send directly to Claude with remix prompt (dedicated remix approach)
            logWithTimestamp("🚀 Sending remix request directly to Claude (using dedicated remix approach)");
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
            const code = extractCodeBlocks(result);
            if (!code.trim()) {
                logWarning("No code block found in remix response.");
                await sendFailureNotification("no-code", senderPhone);
                return false;
            }
            
            // Deploy remix result
            const deployResult = await saveCodeToSupabase(code, "remix", userSlug, senderPhone, userRequest || "remix request");
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