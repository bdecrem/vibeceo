#!/usr/bin/env node

/**
 * DEBUG: ZAD Builder Prompt Tracer
 * 
 * Shows EXACTLY what prompt is sent to Builder GPT for ZAD remix requests.
 * This will help identify where extra instructions are coming from.
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock callClaudeAPI to intercept prompts instead of actually calling Claude
let interceptedSystemPrompt = '';
let interceptedUserPrompt = '';
let interceptedModel = '';

async function debugZadBuilderPrompt() {
    console.log("🔍 DEBUG: ZAD Builder Prompt Tracer");
    console.log("=" + "=".repeat(60));
    
    // Test input that should trigger ZAD remix
    const testInput = "build a chat for Warriors team";
    console.log(`📥 Test Input: "${testInput}"`);
    console.log();
    
    try {
        // STEP 1: Run classifier to get ZAD_INSTRUCTION
        console.log("1️⃣ STEP 1: Running classifier...");
        const classifierConfig = {
            classifierModel: "gpt-4o",
            classifierMaxTokens: 500,
            classifierTemperature: 0.1
        };
        
        const expandedPrompt = await generateCompletePrompt(testInput, classifierConfig);
        console.log(`📤 Classifier output length: ${expandedPrompt.length} chars`);
        
        // Check if ZAD remix was detected
        const hasZadRemix = expandedPrompt.includes('ZAD_REMIX_INSTRUCTION:');
        console.log(`🎨 ZAD Remix detected: ${hasZadRemix ? '✅ YES' : '❌ NO'}`);
        
        if (hasZadRemix) {
            // Extract the instruction
            const instructionMatch = expandedPrompt.match(/ZAD_REMIX_INSTRUCTION:\s*(.+)/);
            const instruction = instructionMatch ? instructionMatch[1].trim() : 'NOT FOUND';
            console.log(`🎯 Extracted Instruction: "${instruction}"`);
        }
        
        console.log("\n📋 Full Classifier Output:");
        console.log("-".repeat(80));
        console.log(expandedPrompt);
        console.log("-".repeat(80));
        
        // STEP 2: Now trace what gets sent to Builder
        console.log("\n2️⃣ STEP 2: Tracing Builder prompt construction...");
        
        // Import and patch the wtaf-processor to intercept Claude calls
        const { callClaude } = await import('../engine/wtaf-processor.js');
        
        // Monkey patch the callClaudeAPI function to intercept prompts
        const processorModule = await import('../engine/wtaf-processor.js');
        
        // Create builder config
        const builderConfig = {
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 8192,
            temperature: 0.3
        };
        
        console.log("🔧 Attempting to call Builder (will intercept prompt)...");
        
        // We need to intercept at the source. Let me trace through the ZAD remix code path
        if (hasZadRemix) {
            await traceZadRemixPath(expandedPrompt, builderConfig, testInput);
        }
        
    } catch (error) {
        console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

async function traceZadRemixPath(userPrompt: string, config: any, testInput: string) {
    console.log("\n🎨 TRACING ZAD REMIX CODE PATH...");
    console.log("-".repeat(60));
    
    // Extract the instruction from userPrompt (same logic as wtaf-processor.ts)
    const instructionMatch = userPrompt.match(/ZAD_REMIX_INSTRUCTION:\s*(.+)/);
    const classifierInstruction = instructionMatch ? instructionMatch[1].trim() : (() => { throw new Error("ZAD_REMIX_INSTRUCTION detected but no instruction found - classifier parsing error"); })();
    
    console.log(`📝 Step 1: Extracted classifier instruction: "${classifierInstruction}"`);
    
    // Load ZAD minimal template (same logic as wtaf-processor.ts)
    try {
        // Use minimal template for surgical edits to avoid overwhelming Builder GPT
        const zadTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Chat</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; text-align: center; margin-bottom: 20px; }
        p { text-align: center; color: #666; }
    </style>
</head>
<body>
    <h1 id="mainTitle">WTAChat</h1>
    <p>A simple chat interface for your team</p>
</body>
</html>`;
        
        console.log(`📄 Step 2: ZAD template loaded (${zadTemplate.length} chars)`);
        console.log(`📄 Template preview: ${zadTemplate.slice(0, 200)}...`);
        
        // Load ZAD remix builder prompt (same logic as wtaf-processor.ts)
        const builderPath = join(__dirname, '..', '..', 'content', 'builder-zad-remix.json');
        const builderContent = await readFile(builderPath, 'utf8');
        const zadRemixBuilder = JSON.parse(builderContent);
        
        console.log(`🔧 Step 3: ZAD remix builder loaded`);
        console.log(`🔧 System prompt: "${zadRemixBuilder.content}"`);
        
        // Construct the exact user prompt (same logic as wtaf-processor.ts lines 313-318)
        const remixUserPrompt = `${classifierInstruction}

${zadTemplate}

Do NOT rewrite the code. Do not make other changes. KEEP EVERYTHING ELSE THE SAME.`;
        
        console.log("\n🎯 FINAL PROMPTS SENT TO BUILDER:");
        console.log("=" + "=".repeat(80));
        console.log("🤖 SYSTEM PROMPT:");
        console.log(zadRemixBuilder.content);
        console.log("\n👤 USER PROMPT:");
        console.log(remixUserPrompt);
        console.log("=" + "=".repeat(80));
        
        // Analyze the prompts
        console.log("\n🔍 PROMPT ANALYSIS:");
        console.log(`✅ System prompt length: ${zadRemixBuilder.content.length} chars`);
        console.log(`✅ User prompt length: ${remixUserPrompt.length} chars`);
        console.log(`✅ Contains surgical instruction: ${remixUserPrompt.includes(classifierInstruction) ? 'YES' : 'NO'}`);
        console.log(`✅ Contains preservation warning: ${remixUserPrompt.includes('Do NOT rewrite') ? 'YES' : 'NO'}`);
        console.log(`✅ Contains full template: ${remixUserPrompt.includes('<!DOCTYPE html>') ? 'YES' : 'NO'}`);
        
        // Check for any extra instructions that might cause rebuilding
        const extraInstructions = [];
        if (remixUserPrompt.includes('WTAF')) extraInstructions.push('WTAF branding');
        if (remixUserPrompt.includes('design')) extraInstructions.push('design instructions');
        if (remixUserPrompt.includes('create') || remixUserPrompt.includes('build')) extraInstructions.push('creation verbs');
        if (remixUserPrompt.includes('app')) extraInstructions.push('app terminology');
        
        if (extraInstructions.length > 0) {
            console.log(`⚠️  Potential pollution detected: ${extraInstructions.join(', ')}`);
        } else {
            console.log(`✅ No obvious prompt pollution detected`);
        }
        
        // Save full prompts to file for detailed analysis
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = `logs/zad-builder-prompts-${timestamp}.txt`;
        
        const fullOutput = `ZAD BUILDER PROMPT DEBUG
========================

Test Input: "${testInput}"
Classifier Instruction: "${classifierInstruction}"

SYSTEM PROMPT:
${zadRemixBuilder.content}

USER PROMPT:
${remixUserPrompt}

ANALYSIS:
- System prompt length: ${zadRemixBuilder.content.length} chars
- User prompt length: ${remixUserPrompt.length} chars
- Contains surgical instruction: ${remixUserPrompt.includes(classifierInstruction)}
- Contains preservation warning: ${remixUserPrompt.includes('Do NOT rewrite')}
- Template length: ${zadTemplate.length} chars
`;
        
        await import('fs/promises').then(({ writeFile }) => writeFile(outputFile, fullOutput));
        console.log(`💾 Full prompts saved to: ${outputFile}`);
        
    } catch (error) {
        console.error("❌ Error in ZAD remix tracing:", error instanceof Error ? error.message : String(error));
    }
}

// Run the debug
debugZadBuilderPrompt(); 