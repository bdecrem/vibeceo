#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { join, basename } from 'path';
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
import { extractCodeBlocks } from './shared/utils.js';
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
    sendFailureNotification 
} from './notification-client.js';
import { 
    watchForFiles, 
    moveProcessedFile 
} from './file-watcher.js';

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
        classifierMaxTokens: 1000,
        classifierTemperature: 0.7,
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
        classifierModel: 'gpt-4o',
        classifierMaxTokens: 1000,
        classifierTemperature: 0.8,
        builderModel: 'gpt-4o',    // Games might work better with GPT?
        builderMaxTokens: 16000,
        builderTemperature: 0.8
    }
} as const;

/**
 * System prompt for creating new WTAF apps
 * TECHNICAL REQUIREMENTS ONLY - Design/brand requirements come from app-tech-spec.json cookbook
 */
const CREATION_SYSTEM_PROMPT = `🚨🚨🚨 ABSOLUTE TOP PRIORITY 🚨🚨🚨
🚨🚨🚨 READ THIS FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

IF YOU SEE "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->" IN THE USER'S REQUEST:
YOU MUST CREATE EXACTLY TWO COMPLETE HTML PAGES
SEPARATED BY THAT EXACT DELIMITER
NEVER CREATE JUST ONE PAGE
THIS IS NON-NEGOTIABLE

🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨

You are creating exactly what the user requests. Follow the WTAF Cookbook & Style Guide provided in the user message for all design and brand requirements.

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
 * Edit system prompt - exact copy from working prompts/edits.json
 */
const EDIT_SYSTEM_PROMPT = `You are an expert web developer and UI/UX designer tasked with editing an existing HTML page based on specific user instructions.

Your role is to:
1. Carefully analyze the existing HTML structure, styling, and functionality
2. Make precise edits according to the user's instructions
3. Preserve the overall design integrity unless specifically asked to change it
4. Maintain all existing functionality that isn't being modified
5. Ensure the changes integrate seamlessly with the existing code
6. Return ONLY the complete modified HTML wrapped in \`\`\`html code blocks

IMPORTANT GUIDELINES:
- Keep the same overall layout and structure unless specifically requested to change it
- Preserve existing CSS classes and IDs unless they conflict with requested changes
- Maintain responsive design principles
- Ensure all interactive elements continue to work properly
- If the request is unclear, make the most logical interpretation
- Focus on clean, maintainable code
- Test-worthy: ensure the modified page will render and function correctly

Return the complete, modified HTML page wrapped in \`\`\`html and \`\`\` tags. Do not include explanations or comments outside the code blocks.`;

/**
 * Process WTAF creation workflow
 * Main workflow extracted from monitor.py execute_gpt4o function
 */
async function processWtafRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
    logWithTimestamp("🚀 STARTING WTAF PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing file: ${processingPath}`);
    
    const { senderPhone, userSlug, userPrompt } = fileData;
    const { coach, cleanPrompt } = requestInfo;
    
    try {
        // Determine request configuration based on content type
        const isGameRequest = userPrompt.toLowerCase().includes('game') || 
                             userPrompt.toLowerCase().includes('pong') ||
                             userPrompt.toLowerCase().includes('puzzle') ||
                             userPrompt.toLowerCase().includes('arcade');
        
        const configType = isGameRequest ? 'game' : 'creation';
        const config = REQUEST_CONFIGS[configType];
        
        logWithTimestamp(`🎯 Using ${configType} configuration`);
        logWithTimestamp(`🤖 Models: Classifier=${config.classifierModel || 'N/A'}, Builder=${config.builderModel}`);
        
        // Step 1: Generate complete prompt with config
        logWithTimestamp(`🔧 Generating complete prompt from: ${userPrompt.slice(0, 50)}...`);
        const completePrompt = await generateCompletePrompt(userPrompt, {
            classifierModel: config.classifierModel || 'gpt-4o',
            classifierMaxTokens: config.classifierMaxTokens || 1000,
            classifierTemperature: config.classifierTemperature || 0.7
        });
        logWithTimestamp(`🔧 Complete prompt generated: ${completePrompt.slice(0, 100) || 'None'}...`);
        
        // Step 2: Send complete prompt to Claude with config
        logWithTimestamp("🚀 PROMPT 2: Sending complete prompt to Claude...");
        logWithTimestamp(`🔧 Complete prompt being sent to Claude: ${completePrompt.slice(-300)}`); // Last 300 chars
        
        const result = await callClaude(CREATION_SYSTEM_PROMPT, completePrompt, {
            model: config.builderModel,
            maxTokens: config.builderMaxTokens,
            temperature: config.builderTemperature
        });
        
        // Step 3: Save Claude output to file
        const outputFile = join(CLAUDE_OUTPUT_DIR, `output_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`);
        await writeFile(outputFile, result, 'utf8');
        logWithTimestamp(`💾 Claude output saved to: ${outputFile}`);
        
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
                    coach, 
                    userSlug, 
                    senderPhone, 
                    userPrompt
                );
                
                if (publicResult.appSlug && publicResult.publicUrl) {
                    publicUrl = publicResult.publicUrl;
                    
                    // Deploy admin page with admin prefix
                    const adminResult = await saveCodeToSupabase(
                        adminHtml.trim(), 
                        coach, 
                        userSlug, 
                        senderPhone, 
                        `Admin dashboard for ${userPrompt}`, 
                        publicResult.appSlug
                    );
                    
                    if (adminResult.publicUrl) {
                        adminUrl = adminResult.publicUrl;
                        isDualPage = true;
                    }
                }
            } else {
                // Single page deployment
                logWithTimestamp(`📱 Single-page app - deploying one page`);
                const result = await saveCodeToSupabase(code, coach, userSlug, senderPhone, userPrompt);
                publicUrl = result.publicUrl;
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
                
                await sendSuccessNotification(publicUrl, adminUrl, senderPhone);
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
            const result = await saveCodeToFile(code, coach, requestInfo.slug, WEB_OUTPUT_DIR);
            
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
                
                await sendSuccessNotification(result.publicUrl, null, senderPhone);
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
 * Process EDIT workflow
 * Handles edit-* files created by handlers.ts EDIT command
 */
async function processEditRequest(processingPath: string, fileData: any, requestInfo: any): Promise<boolean> {
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
        
        const result = await callClaude(EDIT_SYSTEM_PROMPT, editPrompt, {
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
        
        // Update the existing page in Supabase
        const { updatePageInSupabase } = await import('./storage-manager.js');
        const success = await updatePageInSupabase(userSlug, editTarget, modifiedCode);
        
        if (success) {
            // Get the URL for notification - include user slug for correct WTAF path
            const pageUrl = `${WTAF_DOMAIN.replace(/^https?:\/\//, '')}/${userSlug}/${editTarget}`;
            await sendSuccessNotification(pageUrl, null, senderPhone);
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
 * Main controller loop
 * Replaces monitor.py monitor_loop function
 */
async function mainControllerLoop() {
    logStartupInfo(WEB_APP_URL, WTAF_DOMAIN, WEB_OUTPUT_DIR);
    
    // Create required directories
    try {
        await createRequiredDirectories(PROCESSED_DIR, CLAUDE_OUTPUT_DIR, WEB_OUTPUT_DIR, WATCH_DIRS);
    } catch (error) {
        logError(`Failed to create directories: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
    
    logWithTimestamp("🌀 WTAF Engine running...");
    logWithTimestamp(`👀 Watching directories: ${WATCH_DIRS.join(', ')}`);
    
    try {
        // Start file monitoring
        for await (const fileInfo of watchForFiles()) {
            const { processingPath, fileData, requestInfo } = fileInfo;
            
            logWithTimestamp(`🚨 Processing new request: ${requestInfo.type.toUpperCase()}`);
            
            let success = false;
            
            try {
                if (requestInfo.type === 'wtaf' || requestInfo.type === 'code') {
                    success = await processWtafRequest(processingPath, fileData, requestInfo);
                } else if (requestInfo.type === 'edit') {
                    success = await processEditRequest(processingPath, fileData, requestInfo);
                } else {
                    logWarning(`Unknown request type: ${requestInfo.type}`);
                    success = false;
                }
            } catch (processingError) {
                logError(`Processing error: ${processingError instanceof Error ? processingError.message : String(processingError)}`);
                success = false;
            }
            
            // Move processed file to final location
            await moveProcessedFile(processingPath, success);
            
            if (success) {
                logSuccess(`Successfully processed and moved file`);
            } else {
                logError(`Failed to process file`);
            }
        }
    } catch (error) {
        logError(`Controller loop error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logWithTimestamp("🛑 Received SIGINT. Shutting down gracefully...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    logWithTimestamp("🛑 Received SIGTERM. Shutting down gracefully...");
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