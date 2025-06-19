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
import { generateCompletePrompt, callClaude } from './ai-client.js';
import { 
    saveCodeToSupabase, 
    saveCodeToFile, 
    createRequiredDirectories 
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
 * System prompt with all technical requirements
 * Extracted from monitor.py system prompt
 */
const SYSTEM_PROMPT = `🚨🚨🚨 ABSOLUTE TOP PRIORITY 🚨🚨🚨
🚨🚨🚨 READ THIS FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

IF YOU SEE "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->" IN THE USER'S REQUEST:
YOU MUST CREATE EXACTLY TWO COMPLETE HTML PAGES
SEPARATED BY THAT EXACT DELIMITER
NEVER CREATE JUST ONE PAGE
THIS IS NON-NEGOTIABLE

🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨

You are a senior designer at a luxury digital agency. Create exactly what the user requests using premium design standards.

REQUIRED DESIGN ELEMENTS:
- 4 floating emojis with mouse parallax effects
- Animated gradient background (15s ease infinite)
- Glass morphism containers with backdrop-filter blur
- Space Grotesk font for headlines, Inter for body text
- Mobile-responsive design
- Professional color palette
- Luxury aesthetic with sophisticated copy

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

6. Floating emojis with parallax:
<span class="emoji-1" data-value="2">🎉</span>
<span class="emoji-2" data-value="3">✨</span>
<span class="emoji-3" data-value="1">🥂</span>
<span class="emoji-4" data-value="4">🗼</span>

7. Parallax effect:
document.addEventListener('mousemove', (e) => {
  document.querySelectorAll('.floating-emojis span').forEach((elem) => {
    const speed = elem.getAttribute('data-value')
    const x = (e.clientX * speed) / 100
    const y = (e.clientY * speed) / 100
    elem.style.transform = \`translateX(\${x}px) translateY(\${y}px)\`
  })
})

Use 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' exactly as placeholders.
Replace 'APP_TABLE_ID' with a unique identifier for this app.

Return complete HTML wrapped in \`\`\`html code blocks.`;

/**
 * Process WTAF creation workflow
 * Main workflow extracted from monitor.py execute_gpt4o function
 */
async function processWtafRequest(processingPath, fileData, requestInfo) {
    logWithTimestamp("🚀 STARTING WTAF PROCESSING WORKFLOW");
    logWithTimestamp(`📖 Processing file: ${processingPath}`);
    
    const { senderPhone, userSlug, userPrompt } = fileData;
    const { coach, cleanPrompt } = requestInfo;
    
    try {
        // Step 1: Generate complete prompt (Prompt 1 → Prompt 2)
        logWithTimestamp(`🔧 Generating complete prompt from: ${userPrompt.slice(0, 50)}...`);
        const completePrompt = await generateCompletePrompt(userPrompt);
        logWithTimestamp(`🔧 Complete prompt generated: ${completePrompt.slice(0, 100) || 'None'}...`);
        
        // Step 2: Send complete prompt to Claude (Prompt 2)
        logWithTimestamp("🚀 PROMPT 2: Sending complete prompt to Claude...");
        logWithTimestamp(`🔧 Complete prompt being sent to Claude: ${completePrompt.slice(-300)}`); // Last 300 chars
        
        const result = await callClaude(SYSTEM_PROMPT, completePrompt);
        
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
            
            // Send notification
            if (publicUrl) {
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
        logError(`WTAF processing error: ${error.message}`);
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
        logError(`Failed to create directories: ${error.message}`);
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
                } else {
                    logWarning(`Unknown request type: ${requestInfo.type}`);
                    success = false;
                }
            } catch (processingError) {
                logError(`Processing error: ${processingError.message}`);
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
        logError(`Controller loop error: ${error.message}`);
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

// Start the controller
if (import.meta.url === `file://${process.argv[1]}`) {
    mainControllerLoop().catch(error => {
        logError(`Fatal error: ${error.message}`);
        process.exit(1);
    });
} 