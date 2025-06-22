#!/usr/bin/env node

/**
 * WTAF COMPLETE FLOW DEBUGGER
 * 
 * Shows the entire processing flow:
 * 1. User input
 * 2. What we send to classifier
 * 3. What classifier returns
 * 4. What we send to builder  
 * 5. What builder returns
 * 
 * Usage: node debug-complete-flow.js "your wtaf request here"
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import { generateCompletePrompt, callClaude } from '../engine/wtaf-processor.js';
import { buildClassifierPrompt } from '../engine/classifier-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugCompleteFlow(userInput: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = join(__dirname, '..', 'logs', `debug-flow-${timestamp}.txt`);
    
    let debugOutput = '';
    
    function log(content: string) {
        console.log(content);
        debugOutput += content + '\n';
    }
    
    log("╔" + "═".repeat(100) + "╗");
    log("║" + " ".repeat(35) + "WTAF COMPLETE FLOW DEBUGGER" + " ".repeat(36) + "║");
    log("╚" + "═".repeat(100) + "╝");
    log(`Timestamp: ${new Date().toISOString()}`);
    log(`User Input: "${userInput}"`);
    log("");
    
    try {
        // STEP 1: USER INPUT
        log("🔸 STEP 1: USER INPUT");
        log("=" + "=".repeat(60));
        log(userInput);
        log("");
        
        // STEP 2: WHAT WE SEND TO CLASSIFIER
        log("🔸 STEP 2: WHAT WE SEND TO CLASSIFIER");
        log("=" + "=".repeat(60));
        
        const classifierPrompt = await buildClassifierPrompt();
        if (!classifierPrompt || !('content' in classifierPrompt)) {
            log("❌ Failed to build classifier prompt");
            return;
        }
        
        log("CLASSIFIER SYSTEM PROMPT:");
        log("-" + "-".repeat(40));
        log(classifierPrompt.content as string);
        log("");
        
        log("CLASSIFIER USER MESSAGE:");
        log("-" + "-".repeat(40));
        log(userInput);
        log("");
        
        // STEP 3: WHAT CLASSIFIER RETURNS
        log("🔸 STEP 3: WHAT CLASSIFIER RETURNS");
        log("=" + "=".repeat(60));
        
        const classifierOutput = await generateCompletePrompt(userInput, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 1000,
            classifierTemperature: 0.7
        });
        
        log(classifierOutput);
        log("");
        
        // STEP 4: WHAT WE SEND TO BUILDER
        log("🔸 STEP 4: WHAT WE SEND TO BUILDER");
        log("=" + "=".repeat(60));
        
        // Load builder system prompt
        const builderAppPath = join(__dirname, '..', 'content', 'builder-app.json');
        const builderContent = await readFile(builderAppPath, 'utf8');
        const builderPrompt = JSON.parse(builderContent);
        const builderSystemPrompt = builderPrompt.content;
        
        log("BUILDER SYSTEM PROMPT:");
        log("-" + "-".repeat(40));
        log(builderSystemPrompt);
        log("");
        
        // Load WTAF Cookbook
        const cookbookPath = join(__dirname, '..', 'content', 'app-tech-spec.json');
        const cookbookContent = await readFile(cookbookPath, 'utf8');
        const cookbook = JSON.parse(cookbookContent);
        
        // Build the cookbook text (same format as wtaf-processor.ts)
        const wtafCookbook = `
WTAF COOKBOOK & STYLE FUCKGUIDE:

BRAND IDENTITY: ${cookbook.wtaf_design_system_prompt}

WRITING STYLE: ${cookbook.writing_style.name}
${cookbook.writing_style.description}
Elements: ${cookbook.writing_style.elements.join(', ')}

COPY GUIDELINES:
- Big Attitude: ${cookbook.writing_style.copy_guidelines.big_attitude}
- Punchy Weird: ${cookbook.writing_style.copy_guidelines.punchy_weird}
- Hyper Specific: ${cookbook.writing_style.copy_guidelines.hyper_specific}
- Textable: ${cookbook.writing_style.copy_guidelines.textable}

DESIGN EXTENSIONS: ${cookbook.design_system_extensions.poolsuite_additions.join(', ')}

LAYOUT ARCHETYPES: ${cookbook.layout_variants.archetypes.join(' | ')}

🚨 NON-NEGOTIABLE REQUIREMENTS:
${cookbook.wtaf_content_mandates.non_negotiable_requirements.map((item: string) => item).join('\n')}

REQUIRED CONTENT:
${cookbook.wtaf_content_mandates.required_additions.map((item: string) => `- ${item}`).join('\n')}
${cookbook.wtaf_content_mandates.mouse_parallax_required ? `- Mouse Parallax: ${cookbook.wtaf_content_mandates.mouse_parallax_required}` : ''}

INTERACTION RULES: ${cookbook.wtaf_content_mandates.interaction_rules.join(', ')}

TECHNICAL FRAMEWORK:
- Fonts: ${cookbook.technical_framework.fonts}
- Floating Emojis: ${cookbook.technical_framework.floating_emojis}

BRAND REMINDER: ${cookbook.brand_reminder}
        `;
        
        const builderUserPrompt = classifierOutput + '\n\n' + wtafCookbook.trim();
        
        log("BUILDER USER PROMPT:");
        log("-" + "-".repeat(40));
        log(builderUserPrompt);
        log("");
        
        // STEP 5: WHAT BUILDER RETURNS
        log("🔸 STEP 5: WHAT BUILDER RETURNS");
        log("=" + "=".repeat(60));
        
        const builderOutput = await callClaude(builderSystemPrompt, builderUserPrompt, {
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 8192,
            temperature: 0.7
        });
        
        log(builderOutput);
        log("");
        
        // SUMMARY
        log("🔸 PROCESSING SUMMARY");
        log("=" + "=".repeat(60));
        log(`✅ Input processed: "${userInput}"`);
        log(`✅ Classifier detected: ${classifierOutput.includes('ZERO_ADMIN_DATA: true') ? 'ZAD' : classifierOutput.includes('EMAIL_NEEDED: true') ? 'EMAIL' : classifierOutput.includes('data_collection') ? 'DATA_COLLECTION' : 'STANDARD'}`);
        log(`✅ Builder output length: ${builderOutput.length} characters`);
        log(`✅ Contains HTML: ${builderOutput.includes('<!DOCTYPE html>') ? 'YES' : 'NO'}`);
        log(`✅ Debug file saved: ${outputFile}`);
        
        // Save to file
        await writeFile(outputFile, debugOutput, 'utf8');
        
    } catch (error) {
        log("❌ ERROR: " + (error instanceof Error ? error.message : String(error)));
        await writeFile(outputFile, debugOutput, 'utf8');
    }
}

// Get user input from command line
const userInput = process.argv[2];
if (!userInput) {
    console.log("Usage: node debug-complete-flow.js \"your wtaf request here\"");
    console.log("Example: node debug-complete-flow.js \"build a chat page for me and my friend\"");
    process.exit(1);
}

debugCompleteFlow(userInput).catch(console.error); 